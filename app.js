const express = require('express');
const path = require('path');
const expressLayouts = require('express-ejs-layouts');
const indexRoutes = require('./routes/index');

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

// 静态资源 — CSS 禁用缓存
app.use('/css', express.static(path.join(__dirname, 'public', 'css'), {
  setHeaders: (res) => { res.set('Cache-Control', 'no-cache'); },
}));
app.use(express.static(path.join(__dirname, 'public')));

// 视图引擎
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.set('layout', 'layout');
app.use(expressLayouts);

// 路由
app.use('/', indexRoutes);

// 404
app.use((req, res) => {
  res.status(404).render('404', { title: '页面未找到' });
});

// 错误处理
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render('500', { title: '服务器错误' });
});

app.listen(PORT, HOST, () => {
  console.log(`博客服务已启动: http://${HOST}:${PORT}`);
});
