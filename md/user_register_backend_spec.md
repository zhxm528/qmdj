# 用户注册后台流程说明

适用范围：
- 站点账号注册（/api/register）
- 认证注册占位（/api/auth/register）
- 会员注册（/api/member/register）

## 1) 站点账号注册（/api/register）

入口：`app/api/register/route.ts`

后台操作：
- 校验必填参数：email、password
- 校验邮箱格式
- 校验密码长度（>= 6）
- 标准化邮箱（小写 + trim）
- 检查邮箱是否已存在（`lib/user.ts` -> `findUserByEmail`）
- 密码加密（bcrypt）
- 创建用户记录（`lib/user.ts` -> `createUser`）
  - users 表写入
  - status = 'pending'
  - is_email_verified = false
- 失效旧的邮箱验证记录（`lib/emailVerification.ts` -> `invalidateOldVerifications`）
- 创建新的邮箱验证记录（`lib/emailVerification.ts` -> `createEmailVerification`，默认 24 小时有效）
- 发送验证邮件（`lib/mailer.ts` -> `sendVerificationEmail`）
  - 邮件发送失败不影响注册流程，但会记录错误日志
- 返回注册成功结果与 user 基本信息

## 2) 认证注册占位（/api/auth/register）

入口：`app/api/auth/register/route.ts`

后台操作：
- 校验必填参数：email、password
- 校验密码长度（>= 6）
- 返回注册成功（无数据库写入）

说明：此接口为示例/占位，未实现真实存储逻辑。

## 3) 会员注册（/api/member/register）

入口：`app/api/member/register/route.ts`

后台操作（事务内）：
- 校验必填：手机号或邮箱至少一项
- 校验手机号格式（如提供）
- 校验邮箱格式（如提供）
- 读取最低会员等级（membership_level）
- 检查手机号/邮箱唯一性
- 生成并校验唯一 member_code
- 生成并校验唯一 card_no
- 写入 member 基础信息
- 初始化 member_account 余额账户
- 写入 member_card 会员卡
  - member_code：取 email 字段的前缀（@ 符号之前的部分）
  - level_id：默认为 2
  - total_points：默认为 200
  - available_points：默认为 200
- 可选：注册赠送积分
  - 更新 member 积分
  - 写入 points_transaction
- 可选：注册赠送储值金
  - 更新 member_account 余额
  - 写入 recharge_transaction
- 返回会员信息、卡信息与赠送结果

## 前端页面行为规则

### 注册成功后的页面行为
- 用户完成注册后，如果注册成功：
  - 显示注册成功提示框
  - 用户关闭提示框后，页面刷新并返回首页
- 如果注册失败：
  - 显示注册失败提示信息
  - 页面停留在注册页面，不进行跳转
  - 用户可以修改信息后重新提交

## 备注

- 站点账号注册与会员注册为两条独立流程。
- 前端普通注册页面使用的是 `/api/register`。
