const Promise = require('bluebird');

const repos = {
	user: require('../repos/user'),
	file: require('../repos/file'),
	post: require('../repos/post'),
	tag: require('../repos/tag'),
	tagToPost: require('../repos/tagToPost')
};

const options = {
	promiseLib: Promise,
	extend: obj => {
		obj.user = repos.user(obj, pgp);
		obj.file = repos.file(obj, pgp);
		obj.post = repos.post(obj, pgp);
		obj.tag = repos.tag(obj, pgp);
		obj.tagToPost = repos.tagToPost(obj, pgp);

		const origTxFn = obj.tx;

		obj.tx = function () {
			origTxFn((transaction) => {
				transaction.user = repos.user(transaction, pgp);
				transaction.file = repos.file(transaction, pgp);
				transaction.post = repos.post(transaction, pgp);
				transaction.tag = repos.tag(transaction, pgp);
				transaction.tagToPost = repos.tagToPost(transaction, pgp);
			});
		};
	}
};

const pgp = require('pg-promise')(options);

const db = pgp(process.env.DATABASE_URL + (process.env.DATABASE_SSL === 'true' ? '?ssl=true' : ''));

module.exports = {
	pgp,
	db
};
