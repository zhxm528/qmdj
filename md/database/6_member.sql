-- ===========================
-- 1. 会员等级表
-- ===========================
DROP TABLE IF EXISTS membership_level CASCADE;

CREATE TABLE membership_level (
    level_id       SERIAL PRIMARY KEY,
    level_code     VARCHAR(20) NOT NULL UNIQUE,   -- 如: SILVER / GOLD / DIAMOND
    level_name     VARCHAR(50) NOT NULL,          -- 如: 银卡 / 金卡 / 钻石卡
    min_points     INTEGER NOT NULL DEFAULT 0,    -- 达到该等级所需的最低积分
    max_points     INTEGER,                       -- 该等级上限积分(可选, 顶级可为NULL)
    discount_rate  NUMERIC(5,2) NOT NULL DEFAULT 1.00, -- 消费折扣, 1.00表示不打折
    created_at     TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 初始化三种等级（示例）
INSERT INTO membership_level (level_code, level_name, min_points, max_points, discount_rate)
VALUES 
('SILVER',  '银卡',    0,    9999,   1.00),
('GOLD',    '金卡', 10000,   49999,  0.95),
('DIAMOND', '钻石卡', 50000,  NULL,   0.90);


-- ===========================
-- 2. 会员基础信息表
-- ===========================
DROP TABLE IF EXISTS member CASCADE;

CREATE TABLE member (
    member_id      BIGSERIAL PRIMARY KEY,
    member_code    VARCHAR(50) UNIQUE,         -- 可选，内部会员编码
    full_name      VARCHAR(100),               -- 会员姓名
    mobile         VARCHAR(20),                -- 手机号
    email          VARCHAR(100),
    gender         CHAR(1),                    -- M/F 或其他
    birth_date     DATE,
    status         SMALLINT NOT NULL DEFAULT 1,    -- 1=正常, 0=停用/冻结
    level_id       INTEGER REFERENCES membership_level(level_id),
    total_points   INTEGER NOT NULL DEFAULT 0,     -- 历史累计积分
    available_points INTEGER NOT NULL DEFAULT 0,   -- 当前可用积分
    remark         TEXT,
    registered_at  TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_member_mobile ON member(mobile);
CREATE INDEX idx_member_level_id ON member(level_id);


-- ===========================
-- 3. 会员账户余额表（用于充值/消费）
-- ===========================
DROP TABLE IF EXISTS member_account CASCADE;

CREATE TABLE member_account (
    member_id       BIGINT PRIMARY KEY REFERENCES member(member_id) ON DELETE CASCADE,
    balance         NUMERIC(12,2) NOT NULL DEFAULT 0.00, -- 可用余额
    frozen_balance  NUMERIC(12,2) NOT NULL DEFAULT 0.00, -- 冻结余额(如退款中)
    updated_at      TIMESTAMP NOT NULL DEFAULT NOW()
);


-- ===========================
-- 4. 会员卡表（卡号管理）
-- ===========================
DROP TABLE IF EXISTS member_card CASCADE;

CREATE TABLE member_card (
    card_id        BIGSERIAL PRIMARY KEY,
    card_no        VARCHAR(50) NOT NULL UNIQUE,         -- 会员卡号
    member_id      BIGINT NOT NULL REFERENCES member(member_id) ON DELETE CASCADE,
    is_primary     BOOLEAN NOT NULL DEFAULT TRUE,       -- 是否主卡
    status         SMALLINT NOT NULL DEFAULT 1,         -- 1=正常,0=挂失/注销
    issued_at      TIMESTAMP NOT NULL DEFAULT NOW(),    -- 发卡时间
    expired_at     TIMESTAMP,                           -- 过期时间（可选）
    remark         TEXT
);

CREATE INDEX idx_member_card_member_id ON member_card(member_id);


-- ===========================
-- 5. 积分变动明细表（积分管理）
-- ===========================
DROP TABLE IF EXISTS points_transaction CASCADE;

CREATE TABLE points_transaction (
    points_txn_id    BIGSERIAL PRIMARY KEY,
    member_id        BIGINT NOT NULL REFERENCES member(member_id) ON DELETE CASCADE,
    card_id          BIGINT REFERENCES member_card(card_id),
    change_type      VARCHAR(30) NOT NULL,    -- EARN / REDEEM / ADJUST / EXPIRE 等
    change_points    INTEGER NOT NULL,        -- 正数：增加；负数：减少
    balance_after    INTEGER NOT NULL,        -- 变动后会员可用积分
    related_type     VARCHAR(30),            -- 关联类型: RECHARGE / CONSUMPTION / MANUAL 等
    related_id       BIGINT,                 -- 关联记录id（例如消费记录id）
    remark           TEXT,
    created_at       TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_points_txn_member_id ON points_transaction(member_id);
CREATE INDEX idx_points_txn_related ON points_transaction(related_type, related_id);


-- ===========================
-- 6. 充值记录表（充值管理）
-- ===========================
DROP TABLE IF EXISTS recharge_transaction CASCADE;

CREATE TABLE recharge_transaction (
    recharge_id      BIGSERIAL PRIMARY KEY,
    member_id        BIGINT NOT NULL REFERENCES member(member_id) ON DELETE CASCADE,
    card_id          BIGINT REFERENCES member_card(card_id),
    amount           NUMERIC(12,2) NOT NULL,        -- 充值金额
    bonus_points     INTEGER NOT NULL DEFAULT 0,    -- 赠送积分（如有）
    payment_method   VARCHAR(30) NOT NULL,          -- 支付方式: CASH/WECHAT/ALIPAY/CARD...
    status           SMALLINT NOT NULL DEFAULT 1,   -- 1=成功,0=失败,2=待支付,3=已退款等
    external_order_no VARCHAR(100),                 -- 第三方支付单号(可选)
    operator_id      VARCHAR(50),                   -- 操作员/收银员编号
    remark           TEXT,
    created_at       TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_recharge_member_id ON recharge_transaction(member_id);
CREATE INDEX idx_recharge_status ON recharge_transaction(status);


-- ===========================
-- 7. 消费记录表（消费管理）
-- ===========================
DROP TABLE IF EXISTS consumption_transaction CASCADE;

CREATE TABLE consumption_transaction (
    consumption_id    BIGSERIAL PRIMARY KEY,
    member_id         BIGINT NOT NULL REFERENCES member(member_id) ON DELETE CASCADE,
    card_id           BIGINT REFERENCES member_card(card_id),
    original_amount   NUMERIC(12,2) NOT NULL,        -- 原始消费金额
    discount_amount   NUMERIC(12,2) NOT NULL DEFAULT 0.00, -- 优惠金额（折扣/满减）
    payable_amount    NUMERIC(12,2) NOT NULL,        -- 实际应付金额
    paid_amount       NUMERIC(12,2) NOT NULL,        -- 实际支付金额（可能含现金+余额）
    pay_channel       VARCHAR(30) NOT NULL,          -- 支付渠道: BALANCE/CASH/WECHAT...
    status            SMALLINT NOT NULL DEFAULT 1,   -- 1=成功,0=作废/撤销
    points_used       INTEGER NOT NULL DEFAULT 0,    -- 本次消费使用积分
    points_earned     INTEGER NOT NULL DEFAULT 0,    -- 本次消费获得积分
    external_order_no VARCHAR(100),                  -- 外部订单号(如收银系统)
    remark            TEXT,
    created_at        TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_consumption_member_id ON consumption_transaction(member_id);
CREATE INDEX idx_consumption_status ON consumption_transaction(status);
CREATE INDEX idx_consumption_created_at ON consumption_transaction(created_at);


-- ===========================
-- 1. membership_level 会员等级表注释
-- ===========================
COMMENT ON TABLE membership_level IS '会员等级表：定义银卡、金卡、钻石卡等等级及对应积分区间、折扣规则';

COMMENT ON COLUMN membership_level.level_id      IS '主键，自增ID';
COMMENT ON COLUMN membership_level.level_code    IS '等级编码，如 SILVER / GOLD / DIAMOND，系统内部使用';
COMMENT ON COLUMN membership_level.level_name    IS '等级名称，如：银卡 / 金卡 / 钻石卡';
COMMENT ON COLUMN membership_level.min_points    IS '达到该等级所需的最低积分（含）';
COMMENT ON COLUMN membership_level.max_points    IS '该等级对应的积分上限（含）；最高等级可为 NULL，表示无上限';
COMMENT ON COLUMN membership_level.discount_rate IS '消费折扣系数，例如 1.00 不打折，0.95 打95折';
COMMENT ON COLUMN membership_level.created_at    IS '记录创建时间';
COMMENT ON COLUMN membership_level.updated_at    IS '记录最近更新时间';


-- ===========================
-- 2. member 会员基础信息表注释
-- ===========================
COMMENT ON TABLE member IS '会员基础信息表：保存会员个人信息、等级、积分等';

COMMENT ON COLUMN member.member_id         IS '主键，自增会员ID';
COMMENT ON COLUMN member.member_code       IS '会员内部编码，可用于迁移老系统会员号等，支持为空';
COMMENT ON COLUMN member.full_name         IS '会员姓名';
COMMENT ON COLUMN member.mobile            IS '会员手机号，用于登录或通知';
COMMENT ON COLUMN member.email             IS '会员邮箱地址';
COMMENT ON COLUMN member.gender            IS '性别：M=男，F=女，或其他自定义标记';
COMMENT ON COLUMN member.birth_date        IS '会员出生日期';
COMMENT ON COLUMN member.status            IS '会员状态：1=正常，0=停用/冻结';
COMMENT ON COLUMN member.level_id          IS '当前会员等级ID，关联 membership_level';
COMMENT ON COLUMN member.total_points      IS '会员历史累计获得的积分总数（不随抵扣减少）';
COMMENT ON COLUMN member.available_points  IS '会员当前可用积分余额';
COMMENT ON COLUMN member.remark            IS '备注信息';
COMMENT ON COLUMN member.registered_at     IS '会员注册时间';
COMMENT ON COLUMN member.updated_at        IS '会员记录最近更新时间';


-- ===========================
-- 3. member_account 会员账户余额表注释
-- ===========================
COMMENT ON TABLE member_account IS '会员账户余额表：记录会员储值余额及冻结金额';

COMMENT ON COLUMN member_account.member_id       IS '会员ID，关联 member.member_id，1:1 对应';
COMMENT ON COLUMN member_account.balance         IS '会员账户可用余额（可直接消费）';
COMMENT ON COLUMN member_account.frozen_balance  IS '会员账户冻结余额（如退款处理中、预授权等）';
COMMENT ON COLUMN member_account.updated_at      IS '账户余额最近更新时间';


-- ===========================
-- 4. member_card 会员卡表注释（卡号管理）
-- ===========================
COMMENT ON TABLE member_card IS '会员卡表：管理实体卡或虚拟卡卡号，与会员绑定';

COMMENT ON COLUMN member_card.card_id    IS '主键，自增卡ID';
COMMENT ON COLUMN member_card.card_no    IS '会员卡号，系统或线下卡号，唯一';
COMMENT ON COLUMN member_card.member_id  IS '所属会员ID，关联 member.member_id';
COMMENT ON COLUMN member_card.is_primary IS '是否为该会员主卡：TRUE=主卡，FALSE=附属卡';
COMMENT ON COLUMN member_card.status     IS '卡状态：1=正常，0=挂失/注销/停用';
COMMENT ON COLUMN member_card.issued_at  IS '发卡时间';
COMMENT ON COLUMN member_card.expired_at IS '卡片到期时间（可为空表示长期有效）';
COMMENT ON COLUMN member_card.remark     IS '卡片备注说明';


-- ===========================
-- 5. points_transaction 积分变动明细表注释
-- ===========================
COMMENT ON TABLE points_transaction IS '积分变动明细表：记录每一次积分增加或扣减';

COMMENT ON COLUMN points_transaction.points_txn_id   IS '主键，自增积分交易记录ID';
COMMENT ON COLUMN points_transaction.member_id       IS '会员ID，关联 member.member_id';
COMMENT ON COLUMN points_transaction.card_id         IS '涉及的会员卡ID（如有），关联 member_card.card_id';
COMMENT ON COLUMN points_transaction.change_type     IS '积分变动类型：如 EARN=获得、REDEEM=抵扣、ADJUST=人工调整、EXPIRE=过期';
COMMENT ON COLUMN points_transaction.change_points   IS '本次积分变动数量：正数为增加，负数为减少';
COMMENT ON COLUMN points_transaction.balance_after   IS '变动后会员可用积分余额';
COMMENT ON COLUMN points_transaction.related_type    IS '关联业务类型：如 RECHARGE=充值、CONSUMPTION=消费、MANUAL=人工等';
COMMENT ON COLUMN points_transaction.related_id      IS '关联业务记录ID：例如消费记录ID、充值记录ID等';
COMMENT ON COLUMN points_transaction.remark          IS '本次积分变动的备注说明';
COMMENT ON COLUMN points_transaction.created_at      IS '记录创建时间（积分变动时间）';


-- ===========================
-- 6. recharge_transaction 充值记录表注释
-- ===========================
COMMENT ON TABLE recharge_transaction IS '充值记录表：记录会员每次充值的金额、支付方式及状态';

COMMENT ON COLUMN recharge_transaction.recharge_id      IS '主键，自增充值记录ID';
COMMENT ON COLUMN recharge_transaction.member_id        IS '会员ID，关联 member.member_id';
COMMENT ON COLUMN recharge_transaction.card_id          IS '充值时使用的会员卡ID（如有），关联 member_card.card_id';
COMMENT ON COLUMN recharge_transaction.amount           IS '本次实际充值金额';
COMMENT ON COLUMN recharge_transaction.bonus_points     IS '因本次充值赠送的积分数量（如有活动）';
COMMENT ON COLUMN recharge_transaction.payment_method   IS '充值支付方式：如 CASH/WECHAT/ALIPAY/BANKCARD 等';
COMMENT ON COLUMN recharge_transaction.status           IS '充值状态：1=成功，0=失败，2=待支付，3=已退款等';
COMMENT ON COLUMN recharge_transaction.external_order_no IS '第三方支付平台订单号（如微信/支付宝订单号）';
COMMENT ON COLUMN recharge_transaction.operator_id      IS '操作员/收银员编号，用于审计';
COMMENT ON COLUMN recharge_transaction.remark           IS '充值备注说明';
COMMENT ON COLUMN recharge_transaction.created_at       IS '充值记录创建时间（通常为支付完成时间）';


-- ===========================
-- 7. consumption_transaction 消费记录表注释
-- ===========================
COMMENT ON TABLE consumption_transaction IS '消费记录表：记录会员每一次消费金额、折扣、支付、积分使用与获得等';

COMMENT ON COLUMN consumption_transaction.consumption_id   IS '主键，自增消费记录ID';
COMMENT ON COLUMN consumption_transaction.member_id        IS '会员ID，关联 member.member_id';
COMMENT ON COLUMN consumption_transaction.card_id          IS '消费时使用的会员卡ID（如有），关联 member_card.card_id';
COMMENT ON COLUMN consumption_transaction.original_amount  IS '消费原始金额（未打折前）';
COMMENT ON COLUMN consumption_transaction.discount_amount  IS '优惠金额（总优惠值，包括折扣、满减、券等）';
COMMENT ON COLUMN consumption_transaction.payable_amount   IS '应付金额 = 原始金额 - 优惠金额';
COMMENT ON COLUMN consumption_transaction.paid_amount      IS '实付金额（实际支付金额，可等于应付金额或存在抹零等）';
COMMENT ON COLUMN consumption_transaction.pay_channel      IS '支付渠道：如 BALANCE=余额、CASH=现金、WECHAT=微信、ALIPAY=支付宝等';
COMMENT ON COLUMN consumption_transaction.status           IS '消费记录状态：1=成功，0=作废/撤销';
COMMENT ON COLUMN consumption_transaction.points_used      IS '本次消费中抵扣使用的积分数量';
COMMENT ON COLUMN consumption_transaction.points_earned    IS '本次消费获得的积分数量';
COMMENT ON COLUMN consumption_transaction.external_order_no IS '外部业务订单号，例如POS/收银系统订单';
COMMENT ON COLUMN consumption_transaction.remark           IS '消费备注说明';
COMMENT ON COLUMN consumption_transaction.created_at       IS '消费发生时间（记录创建时间）';
