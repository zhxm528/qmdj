## 登录时会员等级降级规则

### 规则说明
- 位置：`app/api/auth/login/route.ts`
- 执行时机：密码校验通过后、设置 session 之前
- 逻辑：
  - 读取主卡 `member_card.expired_at`
  - 若 `now > expired_at + 24h`，则把 `member.level_id` 更新为
    `membership_level.level_code = 'SILVER'` 的等级
  - 未超过 24 小时则不做改动

### 可选策略（需明确规则）
- 没有有效期时是否降级
- 是否按当前等级做白名单
