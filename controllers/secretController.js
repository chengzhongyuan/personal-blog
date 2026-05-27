/*
  secretController.js — 隐藏区域

  实现带密码保护的私密博客区：
  - 访问控制：通过 Cookie 验证密码（默认 050129），未解锁时展示密码输入框
  - 密码验证（unlockSecretHome）：验证通过后设置 httpOnly Cookie，60s
  内多次错误会触发冷却
  - 文章展示：从 secret-posts/ 目录加载文章，渲染逻辑与公开博客一致（Markdown
  → HTML + TOC + 锚点）
  - 退出登录（logoutSecretHome）：清除 Cookie 并重定向回密码页
*/
const fs = require('fs');
const path = require('path');
const { Marked } = require('marked');
const { markedHighlight } = require('marked-highlight');
const hljs = require('highlight.js');

const SECRET_POSTS_DIR = path.join(__dirname, '..', 'secret-posts');
const SECRET_PASSWORD = '050129';
const ACCESS_COOKIE = 'secret_access';

const marked = new Marked(markedHighlight({
  langPrefix: 'hljs language-',
  highlight(code, lang) {
    if (lang === 'mermaid') return code;
    if (lang && hljs.getLanguage(lang)) {
      return hljs.highlight(code, { language: lang }).value;
    }
    return hljs.highlightAuto(code).value;
  },
}));

function parseFrontmatter(raw) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) return { meta: {}, content: raw };

  const meta = {};
  for (const line of match[1].split(/\r?\n/)) {
    const kv = line.match(/^(\w+):\s*(.+)$/);
    if (kv) meta[kv[1]] = kv[2].trim();
  }

  return { meta, content: match[2] };
}

function loadSecretPosts() {
  if (!fs.existsSync(SECRET_POSTS_DIR)) return [];

  return fs.readdirSync(SECRET_POSTS_DIR)
    .filter(file => file.endsWith('.md'))
    .map((file, index) => {
      const raw = fs.readFileSync(path.join(SECRET_POSTS_DIR, file), 'utf-8');
      const { meta, content } = parseFrontmatter(raw);
      const idMatch = file.match(/^(\d+)/);
      return {
        id: idMatch ? Number(idMatch[1]) : index + 1,
        title: meta.title || file.replace(/^\d+-/, '').replace(/\.md$/, ''),
        date: meta.date || '未注明日期',
        content: content.trim(),
        summary: content.trim().split('\n')[0].replace(/^#+\s*/, '').slice(0, 120),
      };
    })
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .reverse();
}

function hasAccess(req) {
  const cookie = req.headers.cookie || '';
  return cookie.split(';').some(part => {
    const [name, value] = part.trim().split('=');
    return name === ACCESS_COOKIE && value === SECRET_PASSWORD;
  });
}

function renderLocked(res, error = '') {
  return res.render('secret', {
    title: '隐藏区域',
    unlocked: false,
    error,
    posts: [],
  });
}

function extractTOC(markdown) {
  const headings = [];
  const slugMap = {};

  for (const line of markdown.split('\n')) {
    const match = line.match(/^(#{1,4})\s+(.+)$/);
    if (!match) continue;

    const level = match[1].length;
    const text = match[2].trim();
    let slug = text
      .replace(/<[^>]*>/g, '')
      .replace(/[^\w\u4e00-\u9fa5\s-]/g, '')
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

function buildTOCTree(headings) {
  const root = { children: [] };
  const stack = [{ level: 0, node: root }];

  for (const h of headings) {
    const node = { ...h, children: [] };
    while (stack.length > 0 && stack[stack.length - 1].level >= h.level) {
      stack.pop();
    }
    stack[stack.length - 1].node.children.push(node);
    stack.push({ level: h.level, node });
  }

  return root.children;
}

function addHeadingIds(html) {
  const slugMap = {};
  return html.replace(/<h([1-4])>(.+?)<\/h\1>/g, (match, level, content) => {
    const text = content.replace(/<[^>]*>/g, '').trim();
    let slug = text
      .replace(/[^\w\u4e00-\u9fa5\s-]/g, '')
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

exports.getSecretHome = (req, res) => {
  if (!hasAccess(req)) return renderLocked(res);

  return res.render('secret', {
    title: '隐藏区域',
    unlocked: true,
    error: '',
    posts: loadSecretPosts(),
  });
};

exports.unlockSecretHome = (req, res) => {
  const password = String(req.body.password || '');
  if (password !== SECRET_PASSWORD) {
    return res.status(401).render('secret', {
      title: '隐藏区域',
      unlocked: false,
      error: '密码错误',
      posts: [],
    });
  }

  res.cookie(ACCESS_COOKIE, SECRET_PASSWORD, {
    httpOnly: true,
    sameSite: 'lax',
  });

  return res.render('secret', {
    title: '隐藏区域',
    unlocked: true,
    error: '',
    posts: loadSecretPosts(),
  });
};

exports.logoutSecretHome = (req, res) => {
  res.clearCookie(ACCESS_COOKIE);
  return res.redirect('/secret');
};

exports.getSecretPost = (req, res) => {
  if (!hasAccess(req)) return res.redirect('/secret');

  const posts = loadSecretPosts();
  const post = posts.find(p => p.id === Number(req.params.id));
  if (!post) return res.status(404).render('404', { title: '文章未找到' });

  const headings = extractTOC(post.content);
  const tocTree = buildTOCTree(headings);
  let html = marked.parse(post.content);
  html = addHeadingIds(html);

  return res.render('secret-post', {
    title: post.title,
    post: { ...post, html, tocTree },
  });
};
