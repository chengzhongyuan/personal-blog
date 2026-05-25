/*
  blogController.js — 博客主体

  处理公开博客的核心逻辑：
  - 文章加载：从 posts/ 目录读取 Markdown 文件，解析
  frontmatter（标题、日期、分类），按日期倒序排列
  - 首页渲染（getHome）：展示文章列表，按分类分组（自我心得、C++、Linux、面试
  经典150题），附带动画的点赞数和评论数
  - 文章详情页（getPost）：将 Markdown 渲染为 HTML（带语法高亮），生成树形 TOC
   目录，注入标题锚点 id
  - 关于页面（getAbout）：渲染关于我页面
*/
const fs = require('fs');
const path = require('path');
const { Marked } = require('marked');
const { markedHighlight } = require('marked-highlight');
const hljs = require('highlight.js');
const store = require('../utils/store');

const POSTS_DIR = path.join(__dirname, '..', 'posts');

// Markdown 渲染 + 代码语法高亮
const marked = new Marked(markedHighlight({
  langPrefix: 'hljs language-',
  highlight(code, lang) {
    // mermaid 图表不交给 highlight.js 处理
    if (lang === 'mermaid') return code;
    if (lang && hljs.getLanguage(lang)) {
      return hljs.highlight(code, { language: lang }).value;
    }
    return hljs.highlightAuto(code).value;
  },
}));

// 解析 frontmatter：--- 包裹的 key: value 元数据
function parseFrontmatter(raw) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) return { meta: {}, content: raw };

  const meta = {};
  const yaml = match[1];
  const lines = yaml.split(/\r?\n/);
  for (const line of lines) {
    const kv = line.match(/^(\w+):\s*(.+)$/);
    if (kv) meta[kv[1]] = kv[2].trim();
  }

  return { meta, content: match[2] };
}

// 从 posts/ 目录加载所有文章
function loadPosts() {
  const files = fs.readdirSync(POSTS_DIR)
    .filter(f => f.endsWith('.md'))
    .sort(); // 按文件名排序

  const posts = [];
  for (const file of files) {
    const raw = fs.readFileSync(path.join(POSTS_DIR, file), 'utf-8');
    const { meta, content } = parseFrontmatter(raw);

    // ID 取自文件名开头的数字，新文章只需文件名以数字开头即可
    const idMatch = file.match(/^(\d+)/);
    const id = idMatch ? Number(idMatch[1]) : posts.length + 1;

    posts.push({
      id,
      title: meta.title || file.replace(/^\d+-/, '').replace(/\.md$/, ''),
      date: meta.date || '未注明日期',
      category: meta.category || '',
      content: content.trim(),
    });
  }

  // 按日期倒序
  posts.sort((a, b) => new Date(b.date) - new Date(a.date));
  return posts;
}

// 从 Markdown 提取标题生成 TOC
function extractTOC(markdown) {
  const headings = [];
  const lines = markdown.split('\n');
  const slugMap = {};

  for (const line of lines) {
    const match = line.match(/^(#{1,4})\s+(.+)$/);
    if (!match) continue;
    const level = match[1].length;
    const text = match[2].trim();
    let slug = text
      .replace(/<[^>]*>/g, '')
      .replace(/[^\w一-鿿\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .toLowerCase();

    if (slugMap[slug] !== undefined) {
      slugMap[slug]++;
      slug = slug + '-' + slugMap[slug];
    } else {
      slugMap[slug] = 0;
    }

    headings.push({ level, text, slug });
  }
  return headings;
}

// 将扁平标题列表转为树形结构，用于折叠目录
function buildTOCTree(headings) {
  const root = { children: [] };
  const stack = [{ level: 0, node: root }];

  for (const h of headings) {
    const node = { ...h, children: [] };
    // 上浮直到找到父级（level 更小的节点）
    while (stack.length > 0 && stack[stack.length - 1].level >= h.level) {
      stack.pop();
    }
    stack[stack.length - 1].node.children.push(node);
    stack.push({ level: h.level, node });
  }

  return root.children;
}

// 给渲染后的 HTML 中的标题添加 id 属性
function addHeadingIds(html) {
  const slugMap = {};
  return html.replace(/<h([1-4])>(.+?)<\/h\1>/g, (match, level, content) => {
    const text = content.replace(/<[^>]*>/g, '').trim();
    let slug = text
      .replace(/[^\w一-鿿\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .toLowerCase();

    if (slugMap[slug] !== undefined) {
      slugMap[slug]++;
      slug = slug + '-' + slugMap[slug];
    } else {
      slugMap[slug] = 0;
    }

    const anchor = level === '2'
      ? ` <a class="heading-anchor" href="#${slug}" title="链接到此标题">#</a>`
      : '';

    return `<h${level} id="${slug}">${content}${anchor}</h${level}>`;
  });
}

// 博客首页 - 文章列表
exports.getHome = (req, res) => {
  const posts = loadPosts();
  const likes = store.readJSON('likes.json');
  const comments = store.readJSON('comments.json');
  const list = posts.map(p => ({
    id: p.id,
    title: p.title,
    date: p.date,
    category: p.category,
    summary: p.content.split('\n')[0].replace(/^#+\s*/, '').slice(0, 120),
    likeCount: (likes[String(p.id)] && likes[String(p.id)].count) || 0,
    commentCount: (comments[String(p.id)] && comments[String(p.id)].length) || 0,
  }));

  // 按分类分组，保持分类顺序
  const categoryOrder = ['自我心得', 'C++', 'Linux网络编程','Linux系统编程', '面试经典150题'];
  const groups = [];
  const seenCategories = new Set();

  for (const cat of categoryOrder) {
    const items = list.filter(p => p.category === cat);
    // 面试经典150题按编号正序（1→2→3），其他分类保持日期倒序
    if (cat === '面试经典150题') items.reverse();
    if (items.length > 0) {
      groups.push({ name: cat, posts: items });
      seenCategories.add(cat);
    }
  }
  // 其余未分类或不在预设分类中的
  const rest = list.filter(p => !seenCategories.has(p.category));
  if (rest.length > 0) {
    groups.push({ name: '', posts: rest });
  }

  res.render('index', { title: '我的博客', groups });
};

// 文章详情页
exports.getPost = (req, res) => {
  const posts = loadPosts();
  const post = posts.find(p => p.id === Number(req.params.id));
  if (!post) return res.status(404).render('404', { title: '文章未找到' });

  const headings = extractTOC(post.content);
  const tocTree = buildTOCTree(headings);
  let html = marked.parse(post.content);
  html = addHeadingIds(html);

  // 加载互动数据
  const likes = store.readJSON('likes.json');
  const comments = store.readJSON('comments.json');
  const postLikes = likes[String(post.id)] || { count: 0, ips: [] };
  const postComments = comments[String(post.id)] || [];

  res.render('post', {
    title: post.title,
    post: { ...post, html, tocTree },
    likeCount: postLikes.count,
    comments: postComments,
  });
};

// 关于我页面
exports.getAbout = (req, res) => {
  res.render('about', { title: '关于我' });
};
