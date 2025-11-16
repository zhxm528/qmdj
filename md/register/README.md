# 邮箱注册功能实现说明

## 已完成的工作

### 1. 数据库表结构
- 已创建 `md/database/users_table.sql` SQL 脚本
- 表结构包含：id, email, password, created_at, updated_at
- email 字段设置为唯一索引

### 2. 后端 API (`app/api/register/route.ts`)
- ✅ 邮箱格式验证
- ✅ 密码长度验证（至少6位）
- ✅ 邮箱唯一性检查
- ✅ 使用 bcryptjs 加密密码（salt rounds: 10）
- ✅ 插入用户到数据库
- ✅ 错误处理和响应

### 3. 前端页面 (`app/register/page.tsx`)
- ✅ 已更新 API 调用路径为 `/api/register`
- ✅ 改进错误提示显示

### 4. 依赖包
- ✅ 已添加 `bcryptjs` 和 `@types/bcryptjs` 到 package.json

## 使用步骤

### 1. 安装依赖
```bash
npm install
```

### 2. 创建数据库表
执行 SQL 脚本创建 users 表：
```bash
psql -U myuser -d mydatabase -f md/database/users_table.sql
```

或者直接在 PostgreSQL 客户端中执行 `md/database/users_table.sql` 文件中的 SQL 语句。

### 3. 配置数据库连接
确保 `.env.local` 文件中包含正确的数据库配置：
```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=mydatabase
DB_USER=myuser
DB_PASSWORD=mypassword
```

### 4. 测试注册功能
1. 访问 `/register` 页面
2. 输入邮箱、密码和确认密码
3. 点击注册按钮
4. 如果成功，会跳转到登录页面

## 功能特性

- ✅ 邮箱格式验证
- ✅ 密码长度验证（最少6位）
- ✅ 密码确认验证（前端）
- ✅ 邮箱唯一性检查
- ✅ 密码加密存储（bcryptjs）
- ✅ 错误处理和用户友好的提示信息

## 注意事项

- 密码使用 bcryptjs 加密，salt rounds 设置为 10
- 邮箱在存储前会转换为小写并去除空格
- 如果 users 表不存在，API 会返回明确的错误提示

