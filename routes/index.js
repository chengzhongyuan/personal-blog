const express = require('express');
const router = express.Router();
const blogController = require('../controllers/blogController');

// 博客首页 - 文章列表
router.get('/', blogController.getHome);

// 文章详情页
router.get('/post/:id', blogController.getPost);

// 关于我页面
router.get('/about', blogController.getAbout);

module.exports = router;
