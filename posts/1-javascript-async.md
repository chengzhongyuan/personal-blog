---
title: JavaScript 异步编程：从回调到 async/await
date: 2025-12-20
category: 自我心得
---

JavaScript 的异步编程经历了多次演变，从最早的回调函数到现在的 async/await，每一步都让代码更易读、更好维护。

## 演进历程

| 阶段 | 方案 | 痛点 |
|------|------|------|
| 回调时代 | callback | 回调地狱，错误处理困难 |
| ES2015 | Promise | 链式调用仍不够直观 |
| ES2017 | async/await | 几乎没有缺点 |

## 回调地狱示例

```javascript
// 回调嵌套 —— 难以阅读和维护
fs.readFile('/data/user.json', (err, user) => {
  if (err) throw err;
  fs.readFile('/data/posts/' + user.id + '.json', (err, posts) => {
    if (err) throw err;
    fs.readFile('/data/comments/' + posts[0].id + '.json', (err, comments) => {
      if (err) throw err;
      console.log(comments);
    });
  });
});
```

## async/await 改写

```javascript
async function loadComments() {
  try {
    const user = await fs.readFile('/data/user.json');
    const posts = await fs.readFile('/data/posts/' + user.id + '.json');
    const comments = await fs.readFile('/data/comments/' + posts[0].id + '.json');
    console.log(comments);
  } catch (err) {
    console.error('读取失败:', err);
  }
}
```

> 好的 API 设计让正确的写法成为唯一的写法。async/await 做到了这一点。

## 并行 vs 串行

```javascript
// 串行 —— 总耗时 = 任务1 + 任务2 + 任务3
const a = await fetchA();
const b = await fetchB();
const c = await fetchC();

// 并行 —— 总耗时 = 最慢的那个
const [a, b, c] = await Promise.all([fetchA(), fetchB(), fetchC()]);
```

理解异步是 JavaScript 进阶的必修课，掌握 async/await 会让你的代码质量提升一个档次。
![unique_ptr](/images/cpp-memory/unique-ptr.png)
