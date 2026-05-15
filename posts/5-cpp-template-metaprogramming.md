---
title: C++ 模板元编程入门
date: 2025-11-05
category: C++
---

模板是 C++ 最强大的特性之一。模板元编程（TMP）让你在编译期完成计算，实现零运行时开销的抽象。

## 一个简单的模板函数

```cpp
#include <iostream>

// 泛型 max —— 适用于任何支持 > 的类型
template <typename T>
T max(T a, T b) {
    return a > b ? a : b;
}

int main() {
    std::cout << max(3, 7) << "\n";          // 7
    std::cout << max(3.14, 2.71) << "\n";    // 3.14
    std::cout << max(std::string("abc"), std::string("xyz")); // xyz
}
```

## 编译期计算：阶乘

```cpp
// 递归模板 —— 在编译期计算阶乘
template <unsigned int N>
struct Factorial {
    static constexpr unsigned int value = N * Factorial<N - 1>::value;
};

// 特化：递归终止条件
template <>
struct Factorial<0> {
    static constexpr unsigned int value = 1;
};

int main() {
    constexpr auto result = Factorial<5>::value;  // 编译期算出 120
    int arr[result];  // 可以用作数组大小！
}
```

## SFINAE 与类型萃取

```cpp
#include <type_traits>

// 只有整数类型才能调用这个函数
template <typename T>
typename std::enable_if<std::is_integral<T>::value, T>::type
clamp(T value, T min_val, T max_val) {
    if (value < min_val) return min_val;
    if (value > max_val) return max_val;
    return value;
}
```

| 特性 | 作用 | C++ 版本 |
|------|------|----------|
| `constexpr` | 编译期计算 | C++11 |
| `enable_if` | 条件启用模板 | C++11 |
| `if constexpr` | 编译期分支 | C++17 |
| `concepts` | 约束模板参数 | C++20 |

> 模板元编程就像给编译器写程序。你写的代码不直接运行，而是告诉编译器"帮我生成这段代码"。一开始会觉得反直觉，但一旦理解，你会爱上这种编程范式。

掌握模板不仅能写出更高效的代码，还能帮你读懂 STL 源码和现代 C++ 库的实现。
