---
title: 5、轮转数组
date: 2026-5-29
category: 面试经典150题
---

# 难度：简单
# 一、题目以及思路
![unique_ptr](/images/leetcode/5.png)

# 二、题目解答


## 额外数组法
```c++
class Solution {
public:
    void rotate(vector<int>& nums, int k) {
        // 我们需要考虑当k大于数组数值的情况
        int n = nums.size();
        if (n == 0 || k % n == 0) return;
        k %= n;
        vector<int> left(nums.begin(), nums.begin() + n - k);
        vector<int> right(nums.begin() + n - k, nums.end());

        nums.clear();

        for(int x : right) nums.push_back(x);
        for(int x : left) nums.push_back(x);
    }
};
```

## 三次反转法

```c++
class Solution {
public:
    void rotate(vector<int>& nums, int k) {
        int n = nums.size();
        k %= n;

        reverse(nums.begin(), nums.end());
        reverse(nums.begin(), nums.begin() + k);
        reverse(nums.begin() + k, nums.end());
    }
};
```

