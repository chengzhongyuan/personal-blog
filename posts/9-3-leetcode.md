---
title: 3、删除有序数组中的重复项
date: 2026-5-20
category: 面试经典150题
---

# 难度：简单
# 一、题目以及思路
![unique_ptr](/images/leetcode/3.png)

# 二、题目解答

```c++
class Solution {
public:
    int removeDuplicates(vector<int>& nums) {

        // 特殊情况
        if(nums.size() == 0)
        {
            return 0;
        }

        int slow = 0;
        int fast = 1;

        while(fast < nums.size())
        {
            // 不重复
            if(nums[slow] != nums[fast])
            {
                slow++;
                nums[slow] = nums[fast];
            }
            // 这里无论是不是重复都必须向后移动
            fast++;
        }

        return slow + 1;
    }
};
```


# 三、面试中可能会遇到的问题


## 1. 为什么用快慢指针？

快指针 `fast` 遍历整个数组，慢指针 `slow` 指向不重复元素的最后一个位置。当 `nums[slow] != nums[fast]` 时，说明遇到了新元素，慢指针前移一位并将新元素放入该位置。遍历结束后，`[0, slow]` 就是去重后的结果，长度为 `slow + 1`。

## 2. 为什么比较 `nums[slow]` 和 `nums[fast]` 而不是 `nums[fast-1]`？

两种写法都是正确的。`nums[slow]` 始终是上一个已确认的不重复元素，`nums[fast]` 是当前待检查的元素。比较 `nums[slow] != nums[fast]` 的语义是"当前元素和上一个不重复元素不同"；比较 `nums[fast] != nums[fast-1]` 的语义是"当前元素和前一个元素不同"。两者等价是因为数组有序，`nums[slow]` 就是 `nums[fast-1]` 处的不重复值。

## 3. 为什么返回 `slow + 1`？

`slow` 是下标，数组长度 = 最后一个元素的下标 + 1。例如去重后数组为 `[1, 2, 3]`，`slow = 2`，返回 `3`。

## 4. 如果 `nums[slow] == nums[fast]` 时只移动 `fast`，不会丢元素吗？

不会。当元素重复时，说明当前 `fast` 指向的值已经在 `slow` 处存在，不需要保留，所以只移动 `fast` 跳过这个重复值，`slow` 不动等待下一个不重复的新元素。

## 5. 时间复杂度是多少？

**O(n)**。快指针 `fast` 遍历一遍数组，每个元素被访问一次。

## 6. 空间复杂度是多少？

**O(1)**。只使用了 `slow` 和 `fast` 两个额外变量，原地修改数组。

## 7. 如果数组为空会怎样？

`if(nums.size() == 0) return 0;` 提前处理边界情况。如果不加这个判断，`nums[0]` 和后续访问会越界。

## 8. 如果数组所有元素都相同会怎样？

`fast` 遍历时 `nums[slow] != nums[fast]` 始终为 false，`slow` 保持为 `0`，最终返回 `0 + 1 = 1`，只保留第一个元素。

## 9. 这题和"移除元素"的异同是什么？

相同点：都用快慢指针（双指针），原地修改，返回新长度，O(n) 时间 O(1) 空间。

不同点：移除元素的判断条件是"不等于给定值 val"，本题是"不等于慢指针指向的值"；移除元素的慢指针从 0 开始（可能第一个元素就是要移除的），本题慢指针从 0 开始但第一个元素一定保留，所以至少返回 1。
