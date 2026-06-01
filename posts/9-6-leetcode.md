---
title: 6、买卖股票的最佳时机
date: 2026-6-1
category: 面试经典150题
---

# 难度：简单
# 一、题目以及思路
![unique_ptr](/images/leetcode/6.png)

# 二、题目解答


## 枚举法（时间复杂度过高）
```c++
class Solution {
public:
    int maxProfit(vector<int>& prices) {
        int max_price = 0;
        // 要找到最佳利润
        for (int i = 0; i < prices.size(); i++) {
            for (int j = i + 1; j < prices.size(); j++) {
                max_price = (max_price > prices[j] - prices[i])
                                ? max_price
                                : prices[j] - prices[i];
            }
        }
        return max_price;
    }
};
```

## 贪心算法

其实我们可以发现买卖股票的最佳时机一定是，在最小值那天买入，所以我们需要维护一个最小值
```c++
class Solution {
public:
    void rotate(vector<int>& nums, int k) {
        int min_price = prices[0];
        int max_profit = 0;
        for(int i = 1; i < prices.size(); i++)
        {
            max_profit = max(max_profit,
                             prices[i] - min_price);

            min_price = min(min_price,
                            prices[i]);
        }

    }
};
```

