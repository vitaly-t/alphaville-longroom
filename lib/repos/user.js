const sqlUser = require('../sql').user;
const sqlUserDetails = require('../sql').userDetails;

module.exports = (rep) => {
	return {
		join: (values, details) => {
			return rep.tx(t => {
				const q1 = t.one(sqlUser.join, values, user => user.user_id);
				const q2 = t.one(sqlUserDetails.add, details, user => user.user_id);
				return t.batch([q1, q2]);
			});
		},
		find: (id) => rep.oneOrNone('SELECT * FROM users WHERE user_id = $1', id)
	};
};
