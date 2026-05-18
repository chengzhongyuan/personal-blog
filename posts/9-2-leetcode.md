---
title: 2、移除元素
date: 2026-5-19
category: 面试经典150题
---
# 难度：简单
# 一、题目以及思路
![unique_ptr](/images/leetcode/2.png)

# 二、题目解答

```c++
class Solution {
public:
    int removeElement(vector<int>& nums, int val) {
        int k = 0;
        for (int i = 0; i < nums.size(); i++) {
            if (nums[i] != val) {
                nums[k] = nums[i];
                k++;
            }
        }
        return k;
    }
};
```


# 三、面试中可能会遇到的问题


## 1. 为什么用双指针（快慢指针）？

快指针 `i` 遍历整个数组，慢指针 `k` 记录下一个不等于 `val` 的元素应该放的位置。当 `nums[i] != val` 时，把它拷贝到 `nums[k]`，然后 `k` 前移。这样 `[0, k)` 区间始终是不等于 `val` 的元素，最终 `k` 就是结果长度。

## 2. 为什么元素顺序可以改变？

题目不要求保持原顺序，所以双指针从前往后覆盖是合法的。如果要保持相对顺序，双指针方案依然适用（`stable`），不会改变不等于 `val` 的元素之间的先后顺序。

## 3. 时间复杂度是多少？

**O(n)**。`n` 为数组长度，每个元素最多被访问一次。快指针遍历一遍数组，慢指针只在不等于 `val` 时才移动。

## 4. 空间复杂度是多少？

**O(1)**。只使用了 `k` 和 `i` 两个额外变量，原地修改数组，不需要额外空间。

## 5. 如果 `val` 不在数组中会怎样？

所有 `n` 个元素都不等于 `val`，快指针每走一步慢指针也跟着移动一位，相当于把每个元素原地拷贝一次，返回 `k = n`。

## 6. 如果数组全部是 `val` 会怎样？

快指针遍历整个数组，`if` 条件始终不成立，慢指针 `k` 一直为 `0`，返回 `k = 0`，数组内容不变（前 0 个元素为空）。

## 7. 有没有更优的写法（首尾双指针）？

当元素很少等于 `val` 时，可以用首尾双指针减少不必要的拷贝：头指针找 `val`，尾指针找非 `val`，交换后向中间靠拢。但对于一般情况，快慢指针已经足够简洁高效。

```c++
// 首尾双指针（减少拷贝次数）
int removeElement(vector<int>& nums, int val) {
    int left = 0, right = nums.size() - 1;
    while (left <= right) {
        if (nums[left] == val) {
            nums[left] = nums[right];
            right--;
        } else {
            left++;
        }
    }
    return left;
}
```
