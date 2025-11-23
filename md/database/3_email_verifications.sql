-- 创建 email_verifications 表的 SQL 脚本
-- 执行此脚本以创建邮箱验证表
-- 注意：此脚本会先删除已存在的表和索引，然后重新创建

-- 删除索引（如果存在）
DROP INDEX IF EXISTS idx_email_verifications_token;
DROP INDEX IF EXISTS idx_email_verifications_user_id;
DROP INDEX IF EXISTS idx_email_verifications_status;

-- 删除表（如果存在）
-- 注意：删除表会同时删除所有相关的约束和索引
DROP TABLE IF EXISTS email_verifications CASCADE;

-- 创建 email_verifications 表
CREATE TABLE email_verifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  email VARCHAR(255) NOT NULL,
  token VARCHAR(128) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  expires_at TIMESTAMP NOT NULL,
  used_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_email_verifications_token ON email_verifications(token);
CREATE INDEX IF NOT EXISTS idx_email_verifications_user_id ON email_verifications(user_id);
CREATE INDEX IF NOT EXISTS idx_email_verifications_status ON email_verifications(status);

-- 添加注释
COMMENT ON TABLE email_verifications IS '邮箱验证表';
COMMENT ON COLUMN email_verifications.id IS '验证记录ID，主键';
COMMENT ON COLUMN email_verifications.user_id IS '用户ID，外键关联users表';
COMMENT ON COLUMN email_verifications.email IS '待验证的邮箱地址';
COMMENT ON COLUMN email_verifications.token IS '验证Token（高熵、不可预测）';
COMMENT ON COLUMN email_verifications.status IS '验证状态：pending-待验证，used-已使用，expired-已过期';
COMMENT ON COLUMN email_verifications.expires_at IS 'Token过期时间';
COMMENT ON COLUMN email_verifications.used_at IS 'Token使用时间';
COMMENT ON COLUMN email_verifications.created_at IS '创建时间';

