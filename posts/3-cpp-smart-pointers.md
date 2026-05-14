---
title: C++ 智能指针完全解析
date: 2025-11-28
---

C++11 引入的智能指针彻底改变了 C++ 的内存管理方式。如果你的代码里还在写 `new` 和 `delete`，是时候升级了。

## 三种智能指针对比

| 类型 | 所有权 | 使用场景 |
|------|--------|----------|
| `std::unique_ptr` | 独占 | 绝大多数情况，优先使用 |
| `std::shared_ptr` | 共享 | 多个所有者、需要引用计数时 |
| `std::weak_ptr` | 弱引用 | 打破循环引用、缓存观察 |

## unique_ptr 用法

```cpp
#include <memory>
#include <iostream>

class Resource {
public:
    Resource() { std::cout << "资源已分配\n"; }
    ~Resource() { std::cout << "资源已释放\n"; }
    void use() { std::cout << "使用资源\n"; }
};

void demo() {
    // 创建 unique_ptr（推荐用 make_unique）
    auto ptr = std::make_unique<Resource>();
    ptr->use();

    // 转移所有权
    auto ptr2 = std::move(ptr);  // ptr 变为 nullptr

    // 离开作用域自动释放 —— 不需要 delete！
}
```

## shared_ptr 与循环引用陷阱

```cpp
struct Node {
    std::shared_ptr<Node> next;  // 应该用 weak_ptr！
    ~Node() { std::cout << "Node 析构\n"; }
};

// 两个节点互相引用，永远无法释放
auto a = std::make_shared<Node>();
auto b = std::make_shared<Node>();
a->next = b;
b->next = a;  // 循环引用 —— 内存泄漏！
```

> 能用 unique_ptr 就别用 shared_ptr。独占所有权覆盖 80% 的场景，引用计数有性能开销，而且容易写出循环引用。

## 最佳实践

| 规则 | 原因 |
|------|------|
| 优先 `make_unique` / `make_shared` | 异常安全 + 一次内存分配 |
| 避免裸 `new` / `delete` | 容易忘记释放或重复释放 |
| 用 `weak_ptr` 打破循环 | 不增加引用计数 |
| 传参用裸指针或引用 | 不转移所有权就不要传智能指针 |
