# 注册成功初始化会员流程

注册成功这一下，其实就是一套"初始化会员"的流水线。

结合我们刚才的表结构，可以理解成：**至少 3 张表必须写入，另外 2 张表是视业务策略"可选写入"**。

我按"必需 / 常见可选"来讲，并给一些示意 SQL（不用你现在就实现，也方便你之后写触发器或服务逻辑）。

---

## 一、必需操作（推荐放在同一个事务里）

### 1. 选择初始会员等级（读 membership_level）

- 一般是**最低等级**（比如"银卡"）。
- 做法（示意）：

```sql
-- 示例：找出默认初始等级（比如 min_points 最小的）
SELECT level_id
FROM membership_level
ORDER BY min_points
LIMIT 1;
```

> 这一步只是**读** `membership_level`，注册时通常不需要插入或修改等级表。

---

### 2. 插入 member（会员基础信息）

- 这是整个体系的核心记录，必须插入。
- 典型字段初始化：
  - `full_name`, `mobile`, `email` 等：来自注册信息
  - `status`：1（正常）
  - `level_id`：上一步查到的初始等级
  - `total_points`：0
  - `available_points`：0

```sql
INSERT INTO member (
    member_code, full_name, mobile, email,
    gender, birth_date, status,
    level_id, total_points, available_points,
    remark
) VALUES (
    :member_code, :full_name, :mobile, :email,
    :gender, :birth_date, 1,
    :init_level_id, 0, 0,
    :remark
)
RETURNING member_id;
```

> 后面所有与账户、卡号、积分的表都要用这个 `member_id`。

---

### 3. 初始化余额账户：插入 member_account

- 每个会员一条记录，用于储值消费。
- 初始余额一般为 0、冻结金额为 0。

```sql
INSERT INTO member_account (
    member_id, balance, frozen_balance
) VALUES (
    :member_id, 0.00, 0.00
);
```

---

### 4. 生成并插入会员卡：member_card

- 如果你的业务是**"注册就发一张卡"**（实体或虚拟卡号），注册时就需要插入。
- 关键点：
  - `card_no`：按你的规则生成（序列号、前缀+时间戳等）
  - `is_primary`：TRUE
  - `status`：1 正常

```sql
INSERT INTO member_card (
    card_no, member_id, is_primary, status, issued_at
) VALUES (
    :card_no, :member_id, TRUE, 1, NOW()
)
RETURNING card_id;
```

> 如果你支持"一人多卡"，之后再新增副卡时再插入新行即可。

---

## 二、常见的可选操作（根据产品策略决定）

### 5. 注册赠送积分：写 points_transaction + 更新 member

如果你有"新会员注册赠送 100 积分"之类的活动，就要在注册流程尾部增加：

1. 更新 `member.available_points` / `total_points`
2. 插入一条 `points_transaction` 记录

示例（假设赠送 100 分）：

```sql
-- 1）更新会员积分余额
UPDATE member
SET
    total_points     = total_points + 100,
    available_points = available_points + 100,
    updated_at       = NOW()
WHERE member_id = :member_id;

-- 2）写积分变动明细
INSERT INTO points_transaction (
    member_id,
    card_id,
    change_type,
    change_points,
    balance_after,
    related_type,
    related_id,
    remark
) VALUES (
    :member_id,
    :card_id,               -- 没卡也可以为 NULL
    'EARN',                 -- 获得积分
    100,                    -- 本次变动
    :new_available_points,  -- 更新后的可用积分
    'REGISTER',             -- 自定义一个类型：注册赠送
    NULL,
    '新会员注册赠送积分'
);
```

> **关键原则**：每一次积分变更，都应该有一条 `points_transaction`，方便审计。

---

### 6. 注册赠送储值余额：写 member_account 和 recharge_transaction

有些系统会"注册送 ¥10 储值金"，那你还可以：

1. 更新 `member_account.balance`
2. 插入一条 `recharge_transaction`（记录来源是"系统赠送"）

```sql
-- 1）更新储值余额
UPDATE member_account
SET
    balance    = balance + 10.00,
    updated_at = NOW()
WHERE member_id = :member_id;

-- 2）写充值记录（系统赠送）
INSERT INTO recharge_transaction (
    member_id,
    card_id,
    amount,
    bonus_points,
    payment_method,
    status,
    external_order_no,
    operator_id,
    remark
) VALUES (
    :member_id,
    :card_id,
    10.00,          -- 赠送金额
    0,              -- 如不赠积分则为 0
    'SYSTEM_GIFT',  -- 支付方式：系统赠送
    1,              -- 成功
    NULL,
    'SYSTEM',       -- 操作员：系统
    '新会员注册赠送储值金'
);
```

> 这样未来对账时，可以区分"用户真实充值金额"和"系统赠送"。

---

## 三、事务边界（强烈建议）

以上所有步骤（2~6）建议放在**一个数据库事务**里执行：

- 任意一步失败 → 整个注册回滚：
  - 不会出现"会员有卡但没账户"
  - 也不会出现"有积分流水但会员表没加积分"

伪流程：

```sql
BEGIN;

-- 1. 查初始等级
-- 2. INSERT member
-- 3. INSERT member_account
-- 4. INSERT member_card
-- 5. 如有注册赠送积分 -> UPDATE member + INSERT points_transaction
-- 6. 如有注册赠送储值 -> UPDATE member_account + INSERT recharge_transaction

COMMIT;
-- 出错则 ROLLBACK;
```

---

## 四、总结一句话流程

**注册成功 → 最少要做：**

1. `member`：插入一条新会员记录，设置初始等级、积分 0
2. `member_account`：插一条余额记录（余额 0）
3. `member_card`：生成并绑定一张主卡（如果你的业务是"人必有卡"）

**如果有营销活动 → 还要：**

4. `points_transaction` + 更新 `member`：注册赠送积分
5. `recharge_transaction` + 更新 `member_account`：注册赠送储值金

---

## 扩展建议

如果你愿意，下一步我可以帮你把"注册时的一整套 SQL 事务流程"写成一个 PostgreSQL 的存储过程（例如 `create or replace function register_member(...) returns bigint`），让应用只调一个函数就完成所有初始化逻辑。
