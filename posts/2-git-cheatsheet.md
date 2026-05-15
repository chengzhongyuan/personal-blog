---
title: Git 常用命令速查表
date: 2025-12-10
category: 自我心得
---

Git 是每个程序员的必备技能。这篇文章整理了日常高频使用的命令，建议收藏备查。

## 仓库初始化

```bash
git init                    # 初始化新仓库
git clone https://github.com/user/repo.git   # 克隆远程仓库
git remote add origin <url>  # 关联远程仓库
```

## 日常提交流程

| 命令 | 作用 |
|------|------|
| `git status` | 查看工作区状态 |
| `git diff` | 查看具体改动内容 |
| `git add .` | 暂存所有修改 |
| `git commit -m "msg"` | 提交到本地仓库 |
| `git push origin main` | 推送到远程 |
| `git pull` | 拉取远程更新 |

## 分支操作

```bash
git branch feature-login           # 创建分支
git checkout feature-login         # 切换分支
git checkout -b feature-login      # 创建 + 切换（二合一）
git merge feature-login            # 合并分支到当前分支
git branch -d feature-login        # 删除已合并的分支
git push origin feature-login      # 推送分支到远程
```

## 撤销与回退

| 场景 | 命令 |
|------|------|
| 撤销工作区修改 | `git checkout -- file` |
| 撤销暂存区 | `git reset HEAD file` |
| 回退版本（保留改动） | `git reset --soft HEAD~1` |
| 回退版本（丢弃改动） | `git reset --hard HEAD~1` |
| 撤销某次提交 | `git revert <commit-id>` |

> 不要害怕 Git，你丢掉的代码 99% 都能找回来。真正危险的操作只有 `reset --hard` 和 `push --force`，用之前多确认一眼。
