'use strict';

const express = require('express');
const router = new express.Router();
const controllers = {
	create: require('../lib/controllers/create'),
	view: require('../lib/controllers/view'),
	delete: require('../lib/controllers/delete')
};
const userMiddleware = require('../lib/middlewares/user');

router.get('/write-post', controllers.create.getWriteAPostForm);
router.get('/upload-document', controllers.create.getUploadDocumentForm);
router.post('/create', controllers.create.post);

router.route('/:id')
	.get(userMiddleware, controllers.view)

router.route('/:id/delete').get(userMiddleware, controllers.delete);

module.exports = router;
