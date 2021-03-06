"use strict";

const db = require('../services/db').db;
const pagination = require('../utils/pagination');
const postsDbTransformation = require('../dbNormalizers/posts');

const itemsPerPage = 30;

module.exports = function (req, res, next) {

	let page = 1;
	if (req.query.page) {
		page = parseInt(req.query.page);
	}

	if (!page || page < 1) {
		page = 1;
	}

	let userId = null;

	if (req.params.id) {
		userId = req.params.id;
	}

	db.post.countByUserId(userId).then(count => {

		const totalPages = Math.ceil(count / itemsPerPage);

		if (page > totalPages) {
			return next();
		}

		return db.post.selectByUserId(userId, {
			limit: itemsPerPage,
			offset: (page - 1) * itemsPerPage
		})
		.then(postsDbTransformation.groupByTime)
		.then(posts => {

			// console.log('posts: ', posts[0].items[0]);

			res.render('author', {
				title: posts[0].items[0].user.pseudonym + ' | Long Room | FT Alphaville',
				userPseudonym: posts[0].items[0].user.pseudonym,
				userSummary : posts[0].items[0].user_summary,
				posts: posts,
				pagination: pagination.getRenderConfig(page, totalPages, req)
			});

		});


	}).catch(err => {
		console.log('Error fetching the content', err);
		next(err);
	});


};
