/*
  interactionController.js — 互动功能

  处理点赞和评论的 API（纯 JSON 接口，不渲染页面）：
  - 点赞切换（toggleLike）：基于 IP 去重，同一 IP
  再次请求取消点赞，数据持久化到 likes.json
  - 评论发表（addComment）：支持匿名评论，作者名和内容有长度限制，生成唯一 ID
  和时间戳
  - 互动数据查询（getInteractions）：返回某篇文章的点赞状态、点赞数、评论列表
*/
const crypto = require('crypto');
const store = require('../utils/store');

const LIKES_FILE = 'likes.json';
const COMMENTS_FILE = 'comments.json';

// 生成唯一 ID
function uid() {
  return crypto.randomBytes(8).toString('hex');
}

// 点赞切换
exports.toggleLike = (req, res) => {
  const postId = String(req.params.id);
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const data = store.readJSON(LIKES_FILE);

  if (!data[postId]) {
    data[postId] = { count: 0, ips: [] };
  }

  const entry = data[postId];
  const idx = entry.ips.indexOf(ip);

  if (idx === -1) {
    entry.ips.push(ip);
    entry.count += 1;
    store.writeJSON(LIKES_FILE, data);
    return res.json({ liked: true, count: entry.count });
  } else {
    entry.ips.splice(idx, 1);
    entry.count = Math.max(0, entry.count - 1);
    store.writeJSON(LIKES_FILE, data);
    return res.json({ liked: false, count: entry.count });
  }
};

// 获取互动数据（点赞 + 评论）
exports.getInteractions = (req, res) => {
  const postId = String(req.params.id);
  const ip = req.ip || req.socket.remoteAddress || 'unknown';

  const likes = store.readJSON(LIKES_FILE);
  const comments = store.readJSON(COMMENTS_FILE);

  const likeEntry = likes[postId];
  const liked = likeEntry ? likeEntry.ips.includes(ip) : false;
  const likeCount = likeEntry ? likeEntry.count : 0;

  const postComments = comments[postId] || [];

  res.json({ liked, likeCount, comments: postComments });
};

// 获取评论列表
exports.getComments = (req, res) => {
  const postId = String(req.params.id);
  const comments = store.readJSON(COMMENTS_FILE);
  res.json({ comments: comments[postId] || [] });
};

// 添加评论
exports.addComment = (req, res) => {
  const postId = String(req.params.id);
  let { author, content } = req.body;

  if (!content || !content.trim()) {
    return res.status(400).json({ error: '评论内容不能为空' });
  }

  author = (author || '匿名').trim().slice(0, 50);
  content = content.trim().slice(0, 2000);

  const comments = store.readJSON(COMMENTS_FILE);
  if (!comments[postId]) {
    comments[postId] = [];
  }

  const comment = {
    id: uid(),
    author,
    content,
    date: new Date().toISOString(),
  };

  comments[postId].push(comment);
  store.writeJSON(COMMENTS_FILE, comments);

  res.status(201).json(comment);
};
