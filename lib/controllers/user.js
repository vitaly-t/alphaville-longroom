const qs = require('querystring');
const _ = require('lodash');
const request = require('request-promise');
const Promise = require('bluebird');
const userProfileApi = require('../services/userProfileApi');
const db = require('../services/db').db;
const crypto = require('../services/crypto');
const suds = require('../services/suds');

const authUrl = process.env['AUTHORIZE_PATH'];
const authParams = {
	response_type: 'token',
	client_id: process.env['AUTHORIZE_CLIENT_ID']
};

const checkActiveUser = (req) => {
	const { userUuid } = req;
	const secureSessionId = req.cookies[process.env['FT_SECURE_COOKIE_NAME']];
	const sessionId = req.cookies[process.env['FT_COOKIE_NAME']];

	if (!userUuid || !sessionId || !secureSessionId) {
		return;
	}
	return {
		userUuid,
		secureSessionId,
		sessionId
	};
};

const updatePseudonym = (sessionId, formData) => {
	let { pseudonym } = formData;
	return suds.setPseudonym(pseudonym, sessionId)
		.catch(err => {
			return {error: err.message};
		});
};

const getUserFormModel = (userUuid, access_token) => {
	return Promise.join(
		userProfileApi.getUserProfile(userUuid, access_token),
		suds.getPseudonym([userUuid]),
		(userProfile, pseudonym) => {
			userProfile.user = _.extend({}, userProfile.user, {pseudonym: pseudonym[userUuid]});
			return userProfile;
		}
	);
};

const addJoinRequest = (userProfile, formData) => {
	let {
		    id: user_id,
		    email,
			primaryTelephone: phone,
		    firstName: first_name,
		    lastName: last_name,
		    demographics: {
			    industry: {
				    description: industry
			    }
		    },
		    demographics: {
			    position: {
				    description: position
			    }
		    },
		    demographics: {
			    responsibility: {
				    description: responsibility
			    }
		    }
	    } = userProfile.user;

	let {
			location,
			description,
			summary
	    } = formData;

	return db.user.join({
		user_id,
		location,
		description,
		summary
	}, {
		user_id,
		email: email && crypto.encrypt(email),
		phone: phone && crypto.encrypt(phone),
		first_name: first_name && crypto.encrypt(first_name),
		last_name: last_name && crypto.encrypt(last_name),
		industry: industry && crypto.encrypt(industry),
		position: position && crypto.encrypt(position),
		responsibility: responsibility && crypto.encrypt(responsibility)
	});
};

const getAccessToken = (sessionId) => {
	const jar = request.jar();
	const cookie = request.cookie(`${process.env['FT_SECURE_COOKIE_NAME']}=${sessionId}`);
	jar.setCookie(cookie, authUrl);
	return request({
		uri: authUrl,
		headers: {
			'X-Skip-Access': process.env['SKIP_ACL_KEY']
		},
		qs: authParams,
		method: 'GET',
		resolveWithFullResponse: true,
		jar: jar
	}).then(authRes => {
		if (authRes.statusCode === 200) {
			const hashes = authRes.request.uri.href.split('#');
			/**
			 * {access_token: '', token_type: '', expires_in: ''}
			 * or
			 * {error: '', error_description: ''}
			 */
			const response = qs.parse(hashes[1]);
			if ('error' in response) {
				throw new Error(response.error_description);
			}
			return response;
		}
		throw new Error(authRes.statusText);
	});
};

const get = (req, res, next) => {

	const activeUserData = checkActiveUser(req);

	if (!activeUserData) {
		throw new Error('Invalid session');
	}

	const { userUuid, secureSessionId } = activeUserData;

	db.user.find(userUuid)
		.then(user => {
			if (user) {
				throw new Error('There is already a pending request for this user.');
			}
			return getAccessToken(secureSessionId);
		})
		.then(({ access_token }) => {
			return getUserFormModel(userUuid, access_token);
		})
		.then(userProfile => {
			return res.render('joinForm', userProfile);
		})
		.catch(next);


};

const join = (req, res, next) => {

	const { userUuid, secureSessionId, sessionId } = checkActiveUser(req, res);

	getAccessToken(secureSessionId)
		.then(({access_token}) => {
			return getUserFormModel(userUuid, access_token);
		})
		.then(userProfile => {
			if (!req.form.isValid) {
				res.render('joinForm',
					_.extend({}, userProfile, { errors: req.form.getErrors() }, { form: req.form })
				);
				return {};
			} else {
				return Promise.join(
					updatePseudonym(sessionId, req.body),
					addJoinRequest(userProfile, req.body),
					(pseudonymResponse, joinResponse) => ({pseudonymResponse, joinResponse, userProfile})
				);
			}
		})
		.then(({pseudonymResponse, joinResponse, userProfile})=> {
			if (pseudonymResponse && joinResponse) {
				if (pseudonymResponse.hasOwnProperty('error')) {
					return res.render('joinForm',
						_.extend(
							{},
							userProfile,
							{ errors: {pseudonym: [pseudonymResponse.error]} },
							{ form: req.form }
						)
					);
				}
				return res.redirect('/longroom/user/applied');
			}
		})
		.catch(err => {
			next(err);
		});

};

const applied = (req, res) => {
	return res.render('successJoin', {message: 'Thank you! Your request will be processed.'});
};

module.exports = {
	get,
	join,
	applied
};
