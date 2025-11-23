-- 奇门排盘数据库表结构
-- 注意：此脚本会先删除已存在的索引和表，然后重新创建

-- 删除索引（如果存在）
DROP INDEX IF EXISTS idx_qimen_pan_pan_json_gin;
DROP INDEX IF EXISTS idx_qimen_pan_pan_hash;
DROP INDEX IF EXISTS idx_qimen_pan_category;
DROP INDEX IF EXISTS idx_qimen_pan_client;
DROP INDEX IF EXISTS idx_qimen_pan_cast_time;
DROP INDEX IF EXISTS idx_qimen_pan_business_key;
DROP INDEX IF EXISTS idx_qimen_pan_logic_key;
DROP INDEX IF EXISTS uq_qimen_pan_tech_hash;

-- 删除表（如果存在）
-- 注意：删除表会同时删除所有相关的约束和索引
DROP TABLE IF EXISTS qimen_pan CASCADE;

-- 创建表
CREATE TABLE qimen_pan (
    -- 1. 主键 & 对外 UID
    id              BIGSERIAL PRIMARY KEY,                      -- 内部主键（自增）
    uid             UUID NOT NULL DEFAULT gen_random_uuid(),    -- 对外公开用的UID
                                                               -- 例如 /api/pan/{uid}
    -- 2. 时间信息
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),         -- 写入数据库时间
    cast_time       TIMESTAMPTZ NOT NULL,                       -- 起局时间（阳历）
    timezone        TEXT NOT NULL DEFAULT 'Asia/Shanghai',      -- 时区（便于跨区使用）

    -- 3. 排盘参数（奇门本体）
    dun_type        SMALLINT NOT NULL,                          -- 遁：1=阳遁，2=阴遁
    ju_number       SMALLINT NOT NULL,                          -- 局数：1~9
    bureau_type     TEXT NOT NULL,                              -- 体系：如 'san_yuan', 'san_shi' 等
    method          TEXT NOT NULL,                              -- 排盘法/算法：如 'zirun_v1', 'feipan_v1'

    -- 4. 业务维度（谁问、问什么）
    client_id       BIGINT,                                     -- 关联“客户/用户表”的ID（可加外键）
    operator        TEXT,                                       -- 排盘人/操作者
    question        TEXT,                                       -- 问题简述
    category        TEXT,                                       -- 分类：'求财' '婚姻' '出行' 等

    -- 将 question 简单做一个 hash，方便做业务去重(选用)
    question_hash   TEXT GENERATED ALWAYS AS (
                        CASE 
                            WHEN question IS NULL OR length(trim(question)) = 0 
                            THEN NULL
                            ELSE md5(trim(question))
                        END
                    ) STORED,

    -- 5. 盘面 JSON（主体）
    pan_json        JSONB NOT NULL,                             -- 完整盘面（九宫、天盘地盘等）
    meta_json       JSONB,                                      -- 额外元数据/入参/调试信息

    -- 6. JSON schema 版本 & 内容哈希
    schema_version  INTEGER NOT NULL DEFAULT 1,                 -- JSON 结构版本
    pan_hash        TEXT GENERATED ALWAYS AS                    -- 盘面内容哈希（技术去重）
                        (md5(pan_json::text)) STORED,

    -- 7. “逻辑盘” key（同一起局条件视作同一盘）
    -- 建议在应用层按：时辰槽 + timezone + dun_type + ju_number + bureau_type + method 拼出来
    -- 例如：'2025-11-18_丁亥时|Asia/Shanghai|1|3|san_yuan|zirun_v1'
    logic_key       TEXT,                                       -- 同一起局条件的逻辑标识

    -- 8. 状态 & 备注
    status          SMALLINT NOT NULL DEFAULT 1,                -- 1=正常,2=作废,3=测试 等
    remark          TEXT                                        -- 批注/断语摘要/验证情况
);

-- 9. 唯一约束 & 常用索引

-- 对外 UID 全局唯一
ALTER TABLE qimen_pan
    ADD CONSTRAINT uq_qimen_pan_uid UNIQUE (uid);

-- 技术层面去重（可选）：
-- 同一体系 + 同一算法 + 完全一样的盘面，不允许重复入库
CREATE UNIQUE INDEX IF NOT EXISTS uq_qimen_pan_tech_hash
    ON qimen_pan (bureau_type, method, pan_hash);

-- 逻辑盘维度索引：同一起局条件的盘（不强制唯一，便于统计分析）
CREATE INDEX IF NOT EXISTS idx_qimen_pan_logic_key
    ON qimen_pan (logic_key);

-- 业务去重（可选，如果你希望强约束，可以用 UNIQUE）：
-- 同一客户 + 同一逻辑盘 + 同一问题 视为同一“问盘”
-- 这里先建普通索引，日后你确认要强去重再改 UNIQUE
CREATE INDEX IF NOT EXISTS idx_qimen_pan_business_key
    ON qimen_pan (client_id, logic_key, question_hash);

-- 时间维度：常用范围查询
CREATE INDEX IF NOT EXISTS idx_qimen_pan_cast_time
    ON qimen_pan (cast_time);

-- 客户维度查询
CREATE INDEX IF NOT EXISTS idx_qimen_pan_client
    ON qimen_pan (client_id);

-- 分类维度查询
CREATE INDEX IF NOT EXISTS idx_qimen_pan_category
    ON qimen_pan (category);

-- 盘内容哈希维度（快速查找“完全相同的盘”）
CREATE INDEX IF NOT EXISTS idx_qimen_pan_pan_hash
    ON qimen_pan (pan_hash);

-- JSONB 索引：如果将来会按盘面内容做复杂筛选（推荐）
CREATE INDEX IF NOT EXISTS idx_qimen_pan_pan_json_gin
    ON qimen_pan USING GIN (pan_json);

-- 如果你确定 JSON 里有 dayStem / hourStem 等字段，且常用来查，可以建额外函数索引
-- 例：按日干查询
-- CREATE INDEX IF NOT EXISTS idx_qimen_pan_day_stem
--     ON qimen_pan ((pan_json->>'dayStem'));

-- 按时干查询
-- CREATE INDEX IF NOT EXISTS idx_qimen_pan_hour_stem
--     ON qimen_pan ((pan_json->>'hourStem'));
