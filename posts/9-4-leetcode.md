---
title: 4、多数元素
date: 2026-5-25
category: 面试经典150题
---

# 难度：简单
# 一、题目以及思路
![unique_ptr](/images/leetcode/4.png)

# 二、题目解答

```c++
class Solution {
public:
    int majorityElement(vector<int>& nums) {
        // 借鉴一命抵一命的形式去完成这个任务
        // 首先我们就需要一个候选人去完成这件事
        int candidate = 0;
        int counts = 0;
        // 循环遍历整个nums数组
        for(int num:nums)
        {
            if(counts == 0)
            {
                candidate = num;
            }
            if(num == candidate)
            {
                counts++;
            }
            else
            {
                counts--;
            }
        }
        return candidate;

};
```


