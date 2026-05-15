---
title: 个人博客使用指南——从写作到部署
date: 2025-05-15
---

这是一份完整的博客使用流程，涵盖本地写作、图片处理、版本管理和远程部署。

## 项目概览

- **技术栈**：Node.js + Express + EJS + Marked + Highlight.js
- **文章存储**：Markdown 文件（`posts/` 目录），带 frontmatter 元数据
- **部署方式**：Git + PM2，推送代码后服务器自动同步
- **特色功能**：暗色模式 / 代码行号 / 一键复制 / 图片灯箱 / 阅读进度条 / 自动目录

## 本地环境要求

```bash
node --version   # >= 16.x
npm --version    # >= 8.x
```

## 项目结构

```
my-blog/
├── app.js                    # Express 入口
├── package.json              # 依赖
├── ecosystem.config.js       # PM2 配置
├── controllers/
│   └── blogController.js     # 文章加载 / Markdown 渲染 / TOC 生成
├── routes/
│   └── index.js              # 路由：/, /post/:id, /about
├── views/
│   ├── layout.ejs            # 全局布局（头部/导航/页脚/JS）
│   ├── index.ejs             # 首页文章列表
│   ├── post.ejs              # 文章详情页（含 TOC）
│   ├── about.ejs             # 关于我
│   ├── 404.ejs               # 404 页面
│   └── 500.ejs               # 500 页面
├── posts/                    # ← 你的文章写在这里
│   ├── 1-javascript-async.md
│   ├── 2-git-cheatsheet.md
│   └── 7-blog-usage-guide.md
├── public/
│   ├── css/style.css         # 全局样式
│   └── images/               # ← 文章图片放这里
└── logs/                     # 运行日志
```

## 写文章

在 `posts/` 目录新建 `.md` 文件，文件名以数字 ID 开头：

```markdown
---
title: 你的文章标题
date: 2025-05-15
---

正文内容，支持标准 Markdown 语法。

## 二级标题

### 三级标题

- 列表
- 列表

> 引用文字

| 表格 | 内容 |
|------|------|
| 单元格 | 数据 |

```javascript
// 代码块自动高亮 + 行号 + 复制按钮
console.log('hello');
```
```

### 规则

- **文件名**：`{数字ID}-{英文slug}.md`，如 `8-react-hooks.md`。数字 ID 必须唯一
- **frontmatter**：`---` 包裹的 `title` 和 `date`，必填
- **排序**：按 `date` 倒序显示在首页
- **摘要**：首页自动取文章第一行作为摘要（最多 120 字）
- **目录**：自动提取 `##`、`###` 标题生成 TOC

## 图片

把图片放进 `public/images/`，文章中这样引用：

```markdown
![图片说明](/images/your-image.png)
```

支持子目录：`![说明](/images/cpp-memory/unique-ptr.png)`

点击图片会弹出全屏灯箱，按 `Esc` 关闭。

## 本地预览

```bash
# 安装依赖
npm install

# 开发模式（文件改动自动重启）
npm run dev

# 浏览器打开 http://localhost:3000
```

## 推送到 GitHub

```bash
git add .
git commit -m "新增文章：xxx"
git push origin master
```

## 服务器部署

### 首次部署

```bash
# SSH 登录
ssh zhongyuan@49.232.244.54

# 克隆仓库
git clone https://github.com/chengzhongyuan/personal-blog.git ~/my-blog
cd ~/my-blog

# 安装依赖
npm install

# 启动
nohup node app.js > logs/app.log 2>&1 &
```

### 更新文章

```bash
# 本地写完 push 后，SSH 到服务器：
ssh zhongyuan@49.232.244.54
cd ~/my-blog
git pull && pm2 reload my-blog
```

### PM2 日常管理

```bash
pm2 status              # 查看状态
pm2 logs my-blog        # 查看日志
pm2 reload my-blog      # 更新后重启
pm2 stop my-blog        # 停止
```

## 防火墙

确保云服务器安全组开放 3000 端口（TCP），否则外网无法访问。

访问地址：`http://49.232.244.54:3000`

## 自定义

- **关于我**：编辑 `views/about.ejs`
- **样式**：编辑 `public/css/style.css`（CSS 变量在 `:root` 中）
- **代码主题**：编辑 `style.css` 中 `.hljs-*` 相关样式
- **站点标题**：编辑 `views/layout.ejs` 中 `<title>` 标签

## 常见问题

### 文章没显示

1. 文件名是否以数字开头？
2. frontmatter 格式是否正确（`---` 包裹，冒号后有空格）？
3. 服务器是否 `git pull` 并重启了 Node 进程？

### 图片不显示

1. 图片是否在 `public/images/` 目录？
2. Markdown 中的路径是否以 `/images/` 开头？
3. 文件名大小写是否一致？
