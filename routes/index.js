const express = require('express');
const router = express.Router();
const blogController = require('../controllers/blogController');
const interactionController = require('../controllers/interactionController');
const secretController = require('../controllers/secretController');

// 博客首页 - 文章列表
router.get('/', blogController.getHome);

// 文章详情页
router.get('/post/:id', blogController.getPost);

// 关于我页面
router.get('/about', blogController.getAbout);

router.get('/secret', secretController.getSecretHome);
router.post('/secret', secretController.unlockSecretHome);
router.post('/secret/logout', secretController.logoutSecretHome);
router.get('/secret/post/:id', secretController.getSecretPost);

// 互动 API — 点赞 & 评论
router.get('/api/post/:id/interactions', interactionController.getInteractions);
router.post('/api/post/:id/like', interactionController.toggleLike);
router.get('/api/post/:id/comments', interactionController.getComments);
router.post('/api/post/:id/comments', interactionController.addComment);

module.exports = router;
