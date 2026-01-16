## 会员有效期（member_card.expired_at）规则与修改位置

本文件用于说明系统内“会员卡有效期”（`member_card.expired_at`）的设置与修改逻辑。

### 1. 自动兜底设置有效期（账户页读取时）
- 程序：`app/api/account/route.ts`
- 触发：访问账户信息接口时，若主卡 `expired_at` 为空。
- 逻辑：
  - 取会员 `registered_at`，若为空则取 `users.created_at`，仍为空则取当前时间。
  - 将 `expired_at` 设置为 `注册日期 + 36 个月`。
  - 立即写回 `member_card.expired_at`。

### 2. 消费记录延长有效期
- 程序：`app/api/admin/member/consumption_transaction/route.ts`
- 触发：新增消费记录且满足条件（存在 card_id，等级售价 > 0，实付金额 > 0）。
- 逻辑：
  - 按会员等级售价计算每天单价：`dailyPrice = sale_price / 31`。
  - 增加天数：`daysToAdd = ceil(paid_amount / dailyPrice)`。
  - 更新 `member_card.expired_at`：
    - 若原值为空：从 `NOW()` 开始计算。
    - 否则在原到期日基础上延长。
  - SQL：`expired_at = COALESCE(expired_at, NOW()) + (days || ' days')::interval`。

### 3. 后台会员卡维护与发卡设置
- 程序：`app/api/admin/member/member_card/route.ts`
- 触发：后台创建/更新会员卡，或执行发卡操作。
- 逻辑：
  - 创建/更新接口可直接写入 `expired_at`。
  - 发卡 PATCH：将 `issued_at` 设置为当天 00:00:00，并将
    `expired_at` 设置为“发卡日期 + 3650 天 23:59:59”。

### 4. 注册环节说明
- `app/api/register/route.ts` 创建用户与邮箱验证记录，同时需要执行发卡操作。
  - 逻辑：
  - 创建/更新接口可直接写入 `expired_at`。
  - 发卡 PATCH：将 `issued_at` 设置为当天 00:00:00，并将`expired_at` 设置为“发卡日期 + 3650 天23:59:59”。
- `app/api/member/route.ts` 自动创建 `member_card` 但不写 `expired_at`。
- 因此注册后第一次访问账户页时，会由 `app/api/account/route.ts` 进行默认有效期补齐。
