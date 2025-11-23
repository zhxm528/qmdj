-- 创建 users 表的 SQL 脚本
-- 执行此脚本以创建用户表
-- 注意：此脚本会先删除已存在的表和索引，然后重新创建

-- 删除索引（如果存在）
DROP INDEX IF EXISTS idx_users_membership_no;
DROP INDEX IF EXISTS idx_users_is_paid;
DROP INDEX IF EXISTS idx_users_last_paid_at;
DROP INDEX IF EXISTS idx_users_token;
DROP INDEX IF EXISTS idx_users_status;
DROP INDEX IF EXISTS idx_users_openid;
DROP INDEX IF EXISTS idx_users_email;

-- 删除表（如果存在）
-- 注意：删除表会同时删除所有相关的约束和索引
DROP TABLE IF EXISTS users CASCADE;

-- 创建 users 表
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(20) DEFAULT 'user',
  avatar VARCHAR(500),
  phone VARCHAR(20),
  address TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  openid VARCHAR(100),
  status VARCHAR(50) DEFAULT 'pending',
  token VARCHAR(128),
  is_email_verified BOOLEAN DEFAULT FALSE,
  membership_level VARCHAR(20),
  membership_no VARCHAR(50),
  is_paid BOOLEAN DEFAULT FALSE,
  last_paid_at TIMESTAMP
);

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_openid ON users(openid);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_token ON users(token);
CREATE INDEX IF NOT EXISTS idx_users_membership_no ON users(membership_no);
CREATE INDEX IF NOT EXISTS idx_users_is_paid ON users(is_paid);
CREATE INDEX IF NOT EXISTS idx_users_last_paid_at ON users(last_paid_at);

-- 添加唯一约束
ALTER TABLE users ADD CONSTRAINT users_email_unique UNIQUE (email);

-- 添加注释
COMMENT ON TABLE users IS '用户表';
COMMENT ON COLUMN users.id IS '用户ID，主键';
COMMENT ON COLUMN users.name IS '用户姓名';
COMMENT ON COLUMN users.email IS '用户邮箱，唯一';
COMMENT ON COLUMN users.password IS '加密后的密码';
COMMENT ON COLUMN users.role IS '用户角色，默认user';
COMMENT ON COLUMN users.avatar IS '用户头像URL';
COMMENT ON COLUMN users.phone IS '用户手机号';
COMMENT ON COLUMN users.address IS '用户地址';
COMMENT ON COLUMN users.created_at IS '创建时间';
COMMENT ON COLUMN users.updated_at IS '更新时间';
COMMENT ON COLUMN users.openid IS '第三方登录OpenID';
COMMENT ON COLUMN users.status IS '用户状态：pending-待验证，active-已激活';
COMMENT ON COLUMN users.token IS '邮箱确认用的随机Token（高熵、不可预测）';
COMMENT ON COLUMN users.is_email_verified IS '邮箱是否已验证';
COMMENT ON COLUMN users.membership_level IS '会员等级';
COMMENT ON COLUMN users.membership_no IS '会员号';
COMMENT ON COLUMN users.is_paid IS '是否付款';
COMMENT ON COLUMN users.last_paid_at IS '最后付款时间，格式yyyy-MM-dd HH:mm:ss';

