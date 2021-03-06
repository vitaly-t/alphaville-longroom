const sql = require('../sql').post;
const postsDbTransformation = require('../dbNormalizers/posts');

module.exports = (rep) => {
	return {
		selectAll: (options) => {
			if (!options) {
				options = {};
			}

			if (!options.limit) {
				options.limit = 30;
			}

			if (!options.offset) {
				options.offset = 0;
			}

			return rep.any(sql.selectAll, options)
				.then(postsDbTransformation.flatten)
				.then(postsDbTransformation.enrichWithPseudonyms);
		},
		selectById: (id) => rep.any(sql.selectById, {id: id})
				.then(postsDbTransformation.flatten)
				.then(postsDbTransformation.enrichWithPseudonyms),
		selectByUserId: (userId, options) => {
			if (!options) {
				options = {};
			}

			if (!options.limit) {
				options.limit = 30;
			}

			if (!options.offset) {
				options.offset = 0;
			}

			options.user_id = userId;

			return rep.any(sql.selectByUserId, options)
				.then(postsDbTransformation.flatten)
				.then(postsDbTransformation.enrichWithPseudonyms);
		},
		selectByTagId: (options) => {

			if (!options) {
				options = {};
			}

			if (!options.limit) {
				options.limit = 30;
			}

			if (!options.offset) {
				options.offset = 0;
			}

			return rep.any(sql.selectByTagId, options)
				.then(postsDbTransformation.flatten)
				.then(postsDbTransformation.enrichWithPseudonyms);

		},
		countAll: () => rep.one(sql.countAll).then(result => result.count),
		countByTagId: (tagId) => rep.one(sql.countByTagId, {tag_id:tagId}).then(result => result.count),
		countByUserId: (userId) => rep.one(sql.countByUserId, {user_id:userId}).then(result => result.count),
		delete: (id) => rep.none(sql.delete, {id: id}),
		insert: (values) => rep.one(sql.insert, values, result => result.id),
		publish: (id) => rep.none(sql.publish, {id: id})
	};
};
