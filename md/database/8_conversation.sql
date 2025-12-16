-- =========================================================
-- 奇门遁甲Agent会话记录表结构
-- 用途：记录每个登录用户的提问、排盘结果、AI看盘的分析结果
-- 支持按项目归类，支持对话管理，支持软删除
-- =========================================================

-- =========================================================
-- 1. 清理历史定义（DROP IF EXISTS）
-- =========================================================

-- 删除视图和函数（如果存在）
DROP VIEW IF EXISTS agent_records_active CASCADE;
DROP FUNCTION IF EXISTS soft_delete_agent_record(UUID);
DROP FUNCTION IF EXISTS restore_agent_record(UUID);
DROP FUNCTION IF EXISTS update_agent_records_updated_at();
DROP FUNCTION IF EXISTS update_conversations_updated_at();

-- 删除索引（如果存在）
-- agent_records 表的索引
DROP INDEX IF EXISTS idx_agent_records_user_id;
DROP INDEX IF EXISTS idx_agent_records_project_id;
DROP INDEX IF EXISTS idx_agent_records_pan_id;
DROP INDEX IF EXISTS idx_agent_records_category;
DROP INDEX IF EXISTS idx_agent_records_created_at;
DROP INDEX IF EXISTS idx_agent_records_deleted_at;
DROP INDEX IF EXISTS idx_agent_records_user_project;
DROP INDEX IF EXISTS idx_agent_records_conversation_id;

-- conversations 表的索引
DROP INDEX IF EXISTS idx_conversations_user_id;
DROP INDEX IF EXISTS idx_conversations_project_id;
DROP INDEX IF EXISTS idx_conversations_pan_id;
DROP INDEX IF EXISTS idx_conversations_title;
DROP INDEX IF EXISTS idx_conversations_deleted_at;
DROP INDEX IF EXISTS idx_conversations_user_project;

-- 删除表（如果存在）- 注意顺序：先删子表，再删父表
DROP TABLE IF EXISTS agent_records CASCADE;
DROP TABLE IF EXISTS conversations CASCADE;

-- =========================================================
-- 2. 创建对话表：conversations（对话/会话主表）
-- =========================================================

CREATE TABLE conversations (
    -- 1. 主键 & 对外 UID
    id              BIGSERIAL PRIMARY KEY,                      -- 内部主键（自增）
    uid             UUID NOT NULL DEFAULT gen_random_uuid(),    -- 对外公开用的UID
    
    -- 2. 用户关联
    user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                                                    -- 关联用户表（登录用户）
    
    -- 3. 项目归类
    project_id      UUID REFERENCES projects(id) ON DELETE SET NULL,
                                                    -- 关联项目表，用于按项目归类
                                                    -- 可为 NULL（未归类）
    
    -- 4. 排盘结果关联（对话内的所有提问共享同一个排盘结果）
    pan_id          BIGINT REFERENCES qimen_pan(id) ON DELETE SET NULL,
                                                    -- 关联排盘结果表
                                                    -- 一个对话对应一个排盘结果
    pan_uid         UUID,                                      -- 排盘结果的 UID（冗余字段，便于查询）
    
    -- 5. 对话标题
    title           VARCHAR(200),                              -- 对话标题（用于检索）
                                                    -- 首次提问时自动生成，可手动修改
    
    -- 6. 时间信息
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),        -- 对话创建时间
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),        -- 对话更新时间
    deleted_at      TIMESTAMPTZ,                               -- 软删除时间（NULL表示未删除）
    
    -- 7. 状态与备注
    status          SMALLINT NOT NULL DEFAULT 1,               -- 状态：1=正常, 2=作废, 3=草稿
    remark          TEXT                                       -- 备注信息
);

-- =========================================================
-- 3. 创建主表：agent_records（Agent提问记录表）
-- =========================================================

CREATE TABLE agent_records (
    -- 1. 主键 & 对外 UID
    id              BIGSERIAL PRIMARY KEY,                      -- 内部主键（自增）
    uid             UUID NOT NULL DEFAULT gen_random_uuid(),    -- 对外公开用的UID，用于API访问
    
    -- 2. 对话关联
    conversation_id BIGINT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
                                                    -- 关联对话表
                                                    -- 一个对话可以有多条提问记录
    
    -- 3. 用户关联（冗余字段，便于查询）
    user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                                                    -- 关联用户表（登录用户）
    
    -- 4. 项目归类（冗余字段，便于查询）
    project_id      UUID REFERENCES projects(id) ON DELETE SET NULL,
                                                    -- 关联项目表，用于按项目归类
                                                    -- 从 conversations 表冗余存储
    
    -- 5. 用户提问信息
    original_question TEXT,                                    -- 用户原始提问文本
    refined_question_json JSONB,                              -- 提炼后的结构化问题（JSON格式）
                                                    -- 包含：category_code, subcategory_code, 
                                                    -- reason, short_prompt_zh, extra 等
    question_category_code TEXT,                               -- 问题分类代码（一级分类）
                                                    -- 从 refined_question_json 提取，便于快速查询
    question_subcategory_code TEXT,                            -- 问题子分类代码（二级分类）
                                                    -- 从 refined_question_json 提取
    
    -- 6. 排盘结果关联（冗余字段，从对话继承）
    pan_id          BIGINT REFERENCES qimen_pan(id) ON DELETE SET NULL,
                                                    -- 关联排盘结果表（从 conversations 冗余）
                                                    -- 同一对话内的所有提问共享同一个 pan_id
    pan_uid         UUID,                                      -- 排盘结果的 UID（冗余字段，便于查询）
    
    -- 7. 本次提问的标题（用于在对话内区分不同提问）
    question_title  VARCHAR(200),                              -- 本次提问的简短标题
                                                    -- 用于对话内区分不同的提问
    
    -- 8. AI看盘分析结果
    ai_analysis     TEXT,                                      -- AI看盘的分析结果文本
    ai_analysis_metadata JSONB,                               -- AI分析相关的元数据
                                                    -- 例如：模型名称、token使用量、耗时等
    ai_analysis_status SMALLINT NOT NULL DEFAULT 0,           -- AI分析状态
                                                    -- 0=未分析, 1=分析中, 2=分析成功, 3=分析失败
    
    -- 9. 时间信息
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),        -- 记录创建时间
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),        -- 记录更新时间
    deleted_at      TIMESTAMPTZ,                               -- 软删除时间（NULL表示未删除）
    
    -- 10. 状态与备注
    status          SMALLINT NOT NULL DEFAULT 1,               -- 状态：1=正常, 2=作废, 3=草稿
    remark          TEXT                                       -- 备注信息
);

-- =========================================================
-- 4. 创建索引
-- =========================================================

-- ==================== conversations 表的索引 ====================

-- 用户维度查询：查询某个用户的所有对话
CREATE INDEX idx_conversations_user_id 
    ON conversations(user_id) 
    WHERE deleted_at IS NULL;

-- 项目维度查询：查询某个项目的所有对话
CREATE INDEX idx_conversations_project_id 
    ON conversations(project_id) 
    WHERE deleted_at IS NULL;

-- 排盘结果关联查询
CREATE INDEX idx_conversations_pan_id 
    ON conversations(pan_id) 
    WHERE deleted_at IS NULL;

-- 标题检索：支持按标题关键词搜索对话
CREATE INDEX idx_conversations_title 
    ON conversations USING gin(to_tsvector('simple', title))
    WHERE deleted_at IS NULL;

-- 软删除查询优化
CREATE INDEX idx_conversations_deleted_at 
    ON conversations(deleted_at) 
    WHERE deleted_at IS NOT NULL;

-- 用户+项目复合查询
CREATE INDEX idx_conversations_user_project 
    ON conversations(user_id, project_id, created_at DESC) 
    WHERE deleted_at IS NULL;

-- 对外 UID 全局唯一
ALTER TABLE conversations
    ADD CONSTRAINT uq_conversations_uid UNIQUE (uid);

-- ==================== agent_records 表的索引 ====================

-- 对话维度查询：查询某个对话内的所有提问记录
CREATE INDEX idx_agent_records_conversation_id 
    ON agent_records(conversation_id, created_at ASC) 
    WHERE deleted_at IS NULL;

-- 用户维度查询：查询某个用户的所有记录
CREATE INDEX idx_agent_records_user_id 
    ON agent_records(user_id) 
    WHERE deleted_at IS NULL;

-- 项目维度查询：查询某个项目的所有记录
CREATE INDEX idx_agent_records_project_id 
    ON agent_records(project_id) 
    WHERE deleted_at IS NULL;

-- 排盘结果关联查询
CREATE INDEX idx_agent_records_pan_id 
    ON agent_records(pan_id) 
    WHERE deleted_at IS NULL;

-- 分类维度查询：按问题分类查询
CREATE INDEX idx_agent_records_category 
    ON agent_records(question_category_code, question_subcategory_code) 
    WHERE deleted_at IS NULL;

-- 时间维度查询：按创建时间排序
CREATE INDEX idx_agent_records_created_at 
    ON agent_records(created_at DESC) 
    WHERE deleted_at IS NULL;

-- 软删除查询优化
CREATE INDEX idx_agent_records_deleted_at 
    ON agent_records(deleted_at) 
    WHERE deleted_at IS NOT NULL;

-- 用户+项目复合查询：查询某用户在某个项目下的记录
CREATE INDEX idx_agent_records_user_project 
    ON agent_records(user_id, project_id, created_at DESC) 
    WHERE deleted_at IS NULL;

-- 对外 UID 全局唯一
ALTER TABLE agent_records
    ADD CONSTRAINT uq_agent_records_uid UNIQUE (uid);

-- =========================================================
-- 5. 创建触发器：自动更新 updated_at
-- =========================================================

-- conversations 表的触发器函数
CREATE OR REPLACE FUNCTION update_conversations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_conversations_updated_at
    BEFORE UPDATE ON conversations
    FOR EACH ROW
    EXECUTE FUNCTION update_conversations_updated_at();

-- agent_records 表的触发器函数
CREATE OR REPLACE FUNCTION update_agent_records_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_agent_records_updated_at
    BEFORE UPDATE ON agent_records
    FOR EACH ROW
    EXECUTE FUNCTION update_agent_records_updated_at();

-- =========================================================
-- 6. 添加表注释和字段注释
-- =========================================================

-- conversations 表的注释
COMMENT ON TABLE conversations IS '对话表：管理用户的对话会话，每个对话对应一个排盘结果，可以包含多次提问';

COMMENT ON COLUMN conversations.id IS '主键：内部ID，自增';
COMMENT ON COLUMN conversations.uid IS '对外公开用的UUID，用于API访问';
COMMENT ON COLUMN conversations.user_id IS '用户ID，关联users表';
COMMENT ON COLUMN conversations.project_id IS '项目ID，关联projects表，用于按项目归类';
COMMENT ON COLUMN conversations.pan_id IS '排盘结果ID，关联qimen_pan表，对话内的所有提问共享此排盘结果';
COMMENT ON COLUMN conversations.pan_uid IS '排盘结果UID（冗余字段，便于查询）';
COMMENT ON COLUMN conversations.title IS '对话标题，用于检索和展示';
COMMENT ON COLUMN conversations.created_at IS '对话创建时间';
COMMENT ON COLUMN conversations.updated_at IS '对话更新时间（自动更新）';
COMMENT ON COLUMN conversations.deleted_at IS '软删除时间（NULL表示未删除）';
COMMENT ON COLUMN conversations.status IS '状态：1=正常, 2=作废, 3=草稿';
COMMENT ON COLUMN conversations.remark IS '备注信息';

-- agent_records 表的注释
COMMENT ON TABLE agent_records IS 'Agent提问记录表：记录用户在对话中的每次提问和AI分析结果';

COMMENT ON COLUMN agent_records.id IS '主键：内部ID，自增';
COMMENT ON COLUMN agent_records.uid IS '对外公开用的UUID，用于API访问';
COMMENT ON COLUMN agent_records.conversation_id IS '对话ID，关联conversations表，一个对话可以有多条提问记录';
COMMENT ON COLUMN agent_records.user_id IS '用户ID，关联users表（冗余字段，便于查询）';
COMMENT ON COLUMN agent_records.project_id IS '项目ID，关联projects表，用于按项目归类（冗余字段，便于查询）';
COMMENT ON COLUMN agent_records.original_question IS '用户原始提问文本';
COMMENT ON COLUMN agent_records.refined_question_json IS '提炼后的结构化问题JSON，包含分类、提炼问句、额外信息等';
COMMENT ON COLUMN agent_records.question_category_code IS '问题一级分类代码（冗余字段，便于快速查询）';
COMMENT ON COLUMN agent_records.question_subcategory_code IS '问题二级分类代码（冗余字段，便于快速查询）';
COMMENT ON COLUMN agent_records.pan_id IS '排盘结果ID，关联qimen_pan表（冗余字段，从conversations继承）';
COMMENT ON COLUMN agent_records.pan_uid IS '排盘结果UID（冗余字段，便于查询）';
COMMENT ON COLUMN agent_records.question_title IS '本次提问的简短标题，用于在对话内区分不同的提问';
COMMENT ON COLUMN agent_records.ai_analysis IS 'AI看盘的分析结果文本（每次提问都会生成新的分析结果）';
COMMENT ON COLUMN agent_records.ai_analysis_metadata IS 'AI分析相关的元数据（模型、token使用量、耗时等）';
COMMENT ON COLUMN agent_records.ai_analysis_status IS 'AI分析状态：0=未分析, 1=分析中, 2=分析成功, 3=分析失败';
COMMENT ON COLUMN agent_records.created_at IS '记录创建时间';
COMMENT ON COLUMN agent_records.updated_at IS '记录更新时间（自动更新）';
COMMENT ON COLUMN agent_records.deleted_at IS '软删除时间（NULL表示未删除）';
COMMENT ON COLUMN agent_records.status IS '状态：1=正常, 2=作废, 3=草稿';
COMMENT ON COLUMN agent_records.remark IS '备注信息';

-- =========================================================
-- 7. 创建视图：简化常用查询（排除已删除记录）
-- =========================================================

-- 对话视图
CREATE OR REPLACE VIEW conversations_active AS
SELECT 
    c.*,
    u.name AS user_name,
    u.email AS user_email,
    p.code AS project_code,
    p.name AS project_name,
    qp.uid AS pan_uid_verified,  -- 验证排盘UID
    qp.cast_time AS pan_cast_time,
    (SELECT COUNT(*) FROM agent_records ar 
     WHERE ar.conversation_id = c.id AND ar.deleted_at IS NULL) AS question_count,
    (SELECT MAX(ar.created_at) FROM agent_records ar 
     WHERE ar.conversation_id = c.id AND ar.deleted_at IS NULL) AS last_question_at
FROM conversations c
LEFT JOIN users u ON c.user_id = u.id
LEFT JOIN projects p ON c.project_id = p.id
LEFT JOIN qimen_pan qp ON c.pan_id = qp.id
WHERE c.deleted_at IS NULL;

COMMENT ON VIEW conversations_active IS '活跃的对话视图（排除已删除记录），包含关联信息和统计';

-- 提问记录视图
CREATE OR REPLACE VIEW agent_records_active AS
SELECT 
    ar.*,
    c.title AS conversation_title,  -- 对话标题
    c.pan_id AS conversation_pan_id,  -- 对话的排盘ID
    u.name AS user_name,
    u.email AS user_email,
    p.code AS project_code,
    p.name AS project_name,
    qp.uid AS pan_uid_verified,  -- 验证排盘UID
    qp.cast_time AS pan_cast_time
FROM agent_records ar
LEFT JOIN conversations c ON ar.conversation_id = c.id
LEFT JOIN users u ON ar.user_id = u.id
LEFT JOIN projects p ON ar.project_id = p.id
LEFT JOIN qimen_pan qp ON ar.pan_id = qp.id
WHERE ar.deleted_at IS NULL AND c.deleted_at IS NULL;

COMMENT ON VIEW agent_records_active IS '活跃的Agent提问记录视图（排除已删除记录），包含对话信息';

-- =========================================================
-- 8. 创建函数：软删除和恢复
-- =========================================================

-- 软删除对话（同时软删除对话内的所有提问记录）
CREATE OR REPLACE FUNCTION soft_delete_conversation(conversation_uid UUID)
RETURNS BOOLEAN AS $$
DECLARE
    affected_rows INTEGER;
BEGIN
    -- 先软删除对话内的所有提问记录
    UPDATE agent_records
    SET deleted_at = NOW(),
        updated_at = NOW()
    WHERE conversation_id = (
        SELECT id FROM conversations WHERE uid = conversation_uid AND deleted_at IS NULL
    )
      AND deleted_at IS NULL;
    
    -- 再软删除对话
    UPDATE conversations
    SET deleted_at = NOW(),
        updated_at = NOW()
    WHERE uid = conversation_uid 
      AND deleted_at IS NULL;
    
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    RETURN affected_rows > 0;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION soft_delete_conversation(UUID) IS '软删除对话及其所有提问记录';

-- 恢复对话（同时恢复对话内的所有提问记录）
CREATE OR REPLACE FUNCTION restore_conversation(conversation_uid UUID)
RETURNS BOOLEAN AS $$
DECLARE
    affected_rows INTEGER;
BEGIN
    -- 先恢复对话
    UPDATE conversations
    SET deleted_at = NULL,
        updated_at = NOW()
    WHERE uid = conversation_uid 
      AND deleted_at IS NOT NULL;
    
    -- 再恢复对话内的所有提问记录
    UPDATE agent_records
    SET deleted_at = NULL,
        updated_at = NOW()
    WHERE conversation_id = (
        SELECT id FROM conversations WHERE uid = conversation_uid
    )
      AND deleted_at IS NOT NULL;
    
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    RETURN affected_rows > 0;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION restore_conversation(UUID) IS '恢复对话及其所有提问记录';

-- 软删除单条提问记录
CREATE OR REPLACE FUNCTION soft_delete_agent_record(record_uid UUID)
RETURNS BOOLEAN AS $$
DECLARE
    affected_rows INTEGER;
BEGIN
    UPDATE agent_records
    SET deleted_at = NOW(),
        updated_at = NOW()
    WHERE uid = record_uid 
      AND deleted_at IS NULL;
    
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    RETURN affected_rows > 0;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION soft_delete_agent_record(UUID) IS '软删除Agent记录：将deleted_at设置为当前时间';

-- 恢复单条提问记录
CREATE OR REPLACE FUNCTION restore_agent_record(record_uid UUID)
RETURNS BOOLEAN AS $$
DECLARE
    affected_rows INTEGER;
BEGIN
    UPDATE agent_records
    SET deleted_at = NULL,
        updated_at = NOW()
    WHERE uid = record_uid 
      AND deleted_at IS NOT NULL;
    
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    RETURN affected_rows > 0;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION restore_agent_record(UUID) IS '恢复已删除的Agent记录：将deleted_at设置为NULL';

-- =========================================================
-- 9. 使用示例
-- =========================================================

/*
-- 1. 创建新对话（首次提问时）
INSERT INTO conversations (
    user_id,
    project_id,
    pan_id,
    pan_uid,
    title,
    status
) VALUES (
    1,  -- 用户ID
    (SELECT id FROM projects WHERE code = 'qmdj'),  -- 项目ID
    123,  -- 排盘ID
    '550e8400-e29b-41d4-a716-446655440000'::uuid,  -- 排盘UID
    '今年工作运势如何',  -- 对话标题（从首次提问自动生成）
    1   -- 正常状态
) RETURNING id, uid;

-- 2. 在对话中添加提问记录（首次提问）
INSERT INTO agent_records (
    conversation_id,
    user_id,
    project_id,
    pan_id,
    pan_uid,
    original_question,
    refined_question_json,
    question_category_code,
    question_subcategory_code,
    question_title,
    ai_analysis,
    ai_analysis_status,
    status
) VALUES (
    (SELECT id FROM conversations WHERE uid = '...'::uuid),  -- 对话ID
    1,  -- 用户ID
    (SELECT id FROM projects WHERE code = 'qmdj'),  -- 项目ID
    123,  -- 排盘ID（与对话中的pan_id相同）
    '550e8400-e29b-41d4-a716-446655440000'::uuid,  -- 排盘UID
    '我想知道今年工作运势如何？',  -- 原始提问
    '{"category_code": "career_academic", "subcategory_code": "career_academic_work", "short_prompt_zh": "我今年工作运势如何", "extra": {"who": "本人", "time_scope": "今年内"}}'::jsonb,
    'career_academic',  -- 分类代码
    'career_academic_work',  -- 子分类代码
    '今年工作运势如何',  -- 本次提问标题
    '根据盘面分析，您今年的工作运势...',  -- AI分析结果
    2,  -- 分析成功
    1   -- 正常状态
);

-- 3. 在同一对话中添加第二次提问（排盘结果不变，只生成新的AI分析）
INSERT INTO agent_records (
    conversation_id,
    user_id,
    project_id,
    pan_id,
    pan_uid,
    original_question,
    refined_question_json,
    question_category_code,
    question_subcategory_code,
    question_title,
    ai_analysis,
    ai_analysis_status,
    status
) VALUES (
    (SELECT id FROM conversations WHERE uid = '...'::uuid),  -- 同一个对话ID
    1,  -- 用户ID
    (SELECT id FROM projects WHERE code = 'qmdj'),  -- 项目ID
    123,  -- 相同的排盘ID
    '550e8400-e29b-41d4-a716-446655440000'::uuid,  -- 相同的排盘UID
    '我想知道这个工作机会是否适合我？',  -- 新的提问
    '{"category_code": "career_academic", "subcategory_code": "career_academic_job_change", ...}'::jsonb,
    'career_academic',
    'career_academic_job_change',
    '这个工作机会是否适合我',  -- 新的提问标题
    '根据盘面分析，这个工作机会...',  -- 新的AI分析结果
    2,  -- 分析成功
    1   -- 正常状态
);

-- 4. 查询用户的所有对话（排除已删除）
SELECT * FROM conversations_active 
WHERE user_id = 1 
ORDER BY created_at DESC;

-- 5. 查询某项目下的所有对话
SELECT * FROM conversations_active 
WHERE project_code = 'qmdj'
ORDER BY created_at DESC;

-- 6. 查询对话内的所有提问记录
SELECT * FROM agent_records_active 
WHERE conversation_id = 1  -- 对话ID
ORDER BY created_at ASC;

-- 7. 按标题搜索对话（支持关键词搜索）
SELECT * FROM conversations_active 
WHERE title ILIKE '%工作%'  -- 或使用全文搜索
  AND user_id = 1
ORDER BY created_at DESC;

-- 8. 查询对话详情（包含对话信息和所有提问）
SELECT 
    c.*,
    json_agg(
        json_build_object(
            'id', ar.id,
            'uid', ar.uid,
            'question_title', ar.question_title,
            'original_question', ar.original_question,
            'ai_analysis', ar.ai_analysis,
            'created_at', ar.created_at
        ) ORDER BY ar.created_at ASC
    ) AS questions
FROM conversations_active c
LEFT JOIN agent_records_active ar ON ar.conversation_id = c.id
WHERE c.uid = '...'::uuid
GROUP BY c.id, c.uid, c.user_id, c.project_id, c.pan_id, c.pan_uid, 
         c.title, c.created_at, c.updated_at, c.status, c.remark,
         c.user_name, c.user_email, c.project_code, c.project_name,
         c.pan_uid_verified, c.pan_cast_time, c.question_count, c.last_question_at;

-- 9. 软删除对话（会同时软删除对话内的所有提问）
SELECT soft_delete_conversation('...'::uuid);

-- 10. 恢复对话（会同时恢复对话内的所有提问）
SELECT restore_conversation('...'::uuid);

-- 11. 软删除单条提问记录
SELECT soft_delete_agent_record('...'::uuid);

-- 12. 恢复单条提问记录
SELECT restore_agent_record('...'::uuid);

-- 13. 更新对话标题
UPDATE conversations 
SET title = '新标题', 
    updated_at = NOW()
WHERE uid = '...'::uuid 
  AND deleted_at IS NULL;

-- 14. 物理删除已软删除超过30天的记录（清理作业）
DELETE FROM agent_records 
WHERE deleted_at IS NOT NULL 
  AND deleted_at < NOW() - INTERVAL '30 days';

DELETE FROM conversations 
WHERE deleted_at IS NOT NULL 
  AND deleted_at < NOW() - INTERVAL '30 days';
*/


-- =========================================================
-- 用户收藏对话表：conversation_favorites
-- 用途：
--   记录“某用户收藏了某个对话”的关系（user ⇄ conversation 多对多）
-- 设计要点：
--   1) (user_id, conversation_id) 唯一，防止重复收藏
--   2) 支持软取消收藏：deleted_at 非空表示已取消收藏（可选）
--   3) 建立部分索引（WHERE deleted_at IS NULL）提升“有效收藏”查询性能
-- =========================================================

DROP TABLE IF EXISTS conversation_favorites;

CREATE TABLE conversation_favorites (
  id              BIGSERIAL PRIMARY KEY,  -- 内部主键（自增）

  user_id         INTEGER NOT NULL
    REFERENCES users(id) ON DELETE CASCADE, -- 关联用户；用户删除则其收藏记录级联删除

  conversation_id BIGINT  NOT NULL
    REFERENCES conversations(id) ON DELETE CASCADE, -- 关联对话；对话删除则收藏记录级联删除

  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(), -- 收藏创建时间
  deleted_at      TIMESTAMPTZ                         -- 取消收藏时间（NULL=仍收藏；非NULL=已取消）
);

-- 约束：同一用户对同一对话只能收藏一次
ALTER TABLE conversation_favorites
  ADD CONSTRAINT uq_conversation_favorites_user_conv
  UNIQUE (user_id, conversation_id);

-- =========================================================
-- 索引：优化查询
--   1) 按用户拉取“已收藏对话列表”
--   2) 判断某对话是否被某用户收藏
-- 使用部分索引，仅覆盖“有效收藏”（deleted_at IS NULL）
-- =========================================================

CREATE INDEX idx_conversation_favorites_user_created
  ON conversation_favorites (user_id, created_at DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_conversation_favorites_user_conv
  ON conversation_favorites (user_id, conversation_id)
  WHERE deleted_at IS NULL;

-- =========================================================
-- 注释（表 & 字段）
-- =========================================================

COMMENT ON TABLE conversation_favorites IS
'用户收藏对话关系表：记录 user_id 收藏 conversation_id 的关系；(user_id, conversation_id) 唯一；deleted_at 用于软取消收藏。';

COMMENT ON COLUMN conversation_favorites.id IS
'内部主键（自增）';

COMMENT ON COLUMN conversation_favorites.user_id IS
'收藏者用户ID，关联 users(id)，用户删除则收藏记录级联删除';

COMMENT ON COLUMN conversation_favorites.conversation_id IS
'被收藏的对话ID，关联 conversations(id)，对话删除则收藏记录级联删除';

COMMENT ON COLUMN conversation_favorites.created_at IS
'收藏创建时间（点击收藏的时间）';

COMMENT ON COLUMN conversation_favorites.deleted_at IS
'取消收藏时间：NULL表示仍处于收藏状态；非NULL表示已取消收藏（软删除）';

