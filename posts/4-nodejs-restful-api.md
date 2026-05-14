---
title: 从零搭建 Node.js RESTful API
date: 2025-11-15
---

Express 是 Node.js 最流行的 Web 框架，用它搭建一个 RESTful API 只需要几分钟。

## 项目初始化

```bash
mkdir my-api && cd my-api
npm init -y
npm install express
```

## Hello World

```javascript
const express = require('express');
const app = express();

app.use(express.json());  // 解析 JSON 请求体

app.get('/api/hello', (req, res) => {
  res.json({ message: 'Hello World!' });
});

app.listen(3000, () => console.log('http://localhost:3000'));
```

## RESTful 路由设计

| 方法 | 路径 | 功能 |
|------|------|------|
| GET | /api/posts | 获取文章列表 |
| GET | /api/posts/:id | 获取单篇文章 |
| POST | /api/posts | 创建文章 |
| PUT | /api/posts/:id | 更新文章 |
| DELETE | /api/posts/:id | 删除文章 |

## 完整 CRUD 示例

```javascript
const posts = [];
let nextId = 1;

// 获取列表（支持分页）
app.get('/api/posts', (req, res) => {
  const { page = 1, size = 10 } = req.query;
  const start = (page - 1) * size;
  res.json({
    data: posts.slice(start, start + size),
    total: posts.length,
    page: Number(page),
    size: Number(size),
  });
});

// 获取详情
app.get('/api/posts/:id', (req, res) => {
  const post = posts.find(p => p.id === Number(req.params.id));
  post ? res.json(post) : res.status(404).json({ error: '文章不存在' });
});

// 创建
app.post('/api/posts', (req, res) => {
  const post = { id: nextId++, ...req.body, createdAt: new Date() };
  posts.push(post);
  res.status(201).json(post);
});
```

> API 设计的第一原则：站在调用者的角度思考。字段命名、错误信息、状态码，都要让前端开发者觉得"理所当然"。

## HTTP 状态码速查

| 状态码 | 含义 | 使用场景 |
|--------|------|----------|
| 200 | OK | GET/PUT 成功 |
| 201 | Created | POST 创建成功 |
| 204 | No Content | DELETE 成功 |
| 400 | Bad Request | 请求参数错误 |
| 404 | Not Found | 资源不存在 |
| 500 | Internal Error | 服务器内部错误 |
