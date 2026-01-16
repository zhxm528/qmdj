## 会员等级（member.level_id）变更规则

本文件说明系统内“会员等级”字段 `member.level_id` 的写入与更新逻辑。

### 1. 账户信息接口自动补齐默认等级
- 程序：`app/api/account/route.ts`
- 触发：访问账户信息时发现 `member.level_id` 为空
- 逻辑：
  - 查询 `membership_level` 中 `level_code = 'GOLD'` 的等级ID
  - 更新 `member.level_id` 为该等级ID

### 2. 站点注册流程创建会员时写入等级
- 程序：`app/api/register/route.ts`
- 触发：注册用户后，创建 `member` 记录
- 逻辑：
  - 选择 `membership_level` 中 `level_code = 'GOLD'` 的等级ID
  - 将该等级ID写入 `member.level_id`

### 3. 会员注册接口初始化等级
- 程序：`app/api/member/register/route.ts`
- 触发：调用会员注册接口创建 `member`
- 逻辑：
  - 默认使用 `initLevelId = 2`
  - 写入 `member.level_id`

### 4. 后台会员管理接口直接修改等级
- 程序：`app/api/admin/member/member/route.ts`
- 触发：后台新增/更新会员
- 逻辑：
  - 新增或更新时可直接传入 `level_id` 写入 `member.level_id`

### 5. 后台发卡流程同步更新会员等级
- 程序：`app/api/admin/member/member_card/route.ts`
- 触发：发卡 PATCH 时传入 `level_id`
- 逻辑：
  - 事务内更新 `member.level_id = level_id`
