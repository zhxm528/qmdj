-- =========================================
-- 0. 清理旧索引 & 旧表（如果存在）
-- =========================================

-- 先删自建索引（如果存在）
DROP INDEX IF EXISTS idx_qmdj_question_category_level_parent;
DROP INDEX IF EXISTS idx_qmdj_question_category_parent;

-- 再删表（会自动删除主键索引和唯一索引）
DROP TABLE IF EXISTS qmdj_question_category CASCADE;

-- =========================================
-- 1. 建表：qmdj_question_category
-- =========================================
CREATE TABLE qmdj_question_category (
    id          SERIAL PRIMARY KEY,  -- 主键，自增
    parent_id   INTEGER REFERENCES qmdj_question_category(id) ON DELETE SET NULL,
    -- 层级：1 = 一级类目, 2 = 二级细分
    level       SMALLINT NOT NULL CHECK (level IN (1, 2)),
    -- 英文代码，程序用，要求全局唯一
    code        TEXT NOT NULL UNIQUE,
    -- 中文名称（展示用）
    name_zh     TEXT NOT NULL,
    -- 英文名称（可选）
    name_en     TEXT,
    -- 描述（可选）
    description TEXT,
    -- 示例（可选，可存多句示例）
    examples    TEXT
);

-- =========================================
-- 2. 建索引
-- =========================================

-- 2.1 为 parent_id 建索引（常用：按父类查子类）
CREATE INDEX idx_qmdj_question_category_parent
    ON qmdj_question_category (parent_id);

-- 2.2 （可选）为 (level, parent_id) 建复合索引
-- 如果你的查询经常是：WHERE level = 2 AND parent_id = ?，建这个会更好
CREATE INDEX idx_qmdj_question_category_level_parent
    ON qmdj_question_category (level, parent_id);



-- =========================================
-- 插入一级类目数据（16 个）
-- =========================================
INSERT INTO qmdj_question_category (id, parent_id, level, code, name_zh, name_en, description, examples) VALUES
(1,  NULL, 1, 'overall_fortune',      '综合运势类',           'Overall fortune',
 '整体运势类问题，包括流年、流月、阶段性运势等。', 
 '例如：“今年整体运势如何？”、“未来三个月是宜进攻还是保守？”'),

(2,  NULL, 1, 'career_academic',      '事业 / 学业类',        'Career & academic',
 '关于工作、事业方向、求职跳槽、升职加薪、合伙创业、学业考试等。', 
 '例如：“现在适合换工作吗？”、“考研能不能上岸？”'),

(3,  NULL, 1, 'wealth_finance',       '财运 / 投资类',        'Wealth & finance',
 '关于财运趋势、赚钱方式、投资项目、交易买卖、债务债权等。', 
 '例如：“今年财运如何？”、“这只股票/这个项目能不能投？”'),

(4,  NULL, 1, 'love_marriage',        '感情 / 婚姻类',        'Love & marriage',
 '关于恋爱、婚姻、伴侣态度、分合离合、家庭情感关系等。', 
 '例如：“TA对我是不是认真的？”、“这段婚姻还能维持吗？”'),

(5,  NULL, 1, 'children_education',   '子女 / 教育类',        'Children & education',
 '关于生育、子女运势、子女教育规划、亲子关系等。', 
 '例如：“什么时候有孩子缘？”、“孩子适合走什么发展方向？”'),

(6,  NULL, 1, 'health_medical',       '健康 / 疾病类',        'Health & medical',
 '关于身体健康趋势、疾病轻重、就医选择、手术风险、恢复情况等。', 
 '例如：“这次生病严重吗？”、“这台手术适不适合现在做？”'),

(7,  NULL, 1, 'lawsuit_dispute',      '官司 / 纠纷类',        'Lawsuit & disputes',
 '关于诉讼官司、合同纠纷、投诉申诉、行政处罚等。', 
 '例如：“这场官司胜算多大？”、“这份合同对我有没有坑？”'),

(8,  NULL, 1, 'interpersonal_social', '人际 / 贵人小人类',   'Interpersonal & social',
 '关于上司同事下属关系、合作伙伴可信度、朋友真伪、贵人小人等。', 
 '例如：“领导对我怎么看？”、“身边有没有小人作祟？”'),

(9,  NULL, 1, 'travel_movement',      '出行 / 迁移类',        'Travel & movement',
 '关于短途出行、旅行、出差、搬家迁居、移民留学、路线抉择等。', 
 '例如：“这次出行是否顺利？”、“适不适合现在搬家/移民？”'),

(10, NULL, 1, 'property_fengshui',    '房产 / 风水类',        'Property & fengshui',
 '关于买房卖房、住宅风水、办公室/店铺选址、装修布局等。', 
 '例如：“这套房子适不适合买？”、“现在住的房子风水如何？”'),

(11, NULL, 1, 'search_lost',          '寻人 / 寻物类',        'Search & lost',
 '关于失物寻回、寻人问讯、对某人的现状和方位进行推测等。', 
 '例如：“丢的东西还能找回吗？”、“失联的这人现在情况如何？”'),

(12, NULL, 1, 'project_decision',     '项目 / 决策 / 竞争类', 'Project & decision',
 '关于项目可行性、投标竞标、谈判博弈、比赛竞争等。', 
 '例如：“这个项目适不适合现在启动？”、“这次投标中标概率多大？”'),

(13, NULL, 1, 'timing_selection',     '择日 / 时机类',        'Timing & selection',
 '关于选择吉日良辰、行动时机、开工停工等时间相关决策。', 
 '例如：“哪天适合搬家/开业？”、“现在动手好还是再等等好？”'),

(14, NULL, 1, 'spiritual_dream',      '灵修 / 梦境类',        'Spiritual & dreams',
 '关于梦境解析、修行路径、因缘因果等偏玄学方向的问题。', 
 '例如：“最近反复做同一个梦有什么提示？”'),

(15, NULL, 1, 'strategy_planning',    '战略 / 布局类',        'Strategy & planning',
 '偏传统军事/大局规划类，包括攻守策略、整体布局等（现代多类比用于大项目规划）。', 
 '例如：“整个项目应该走攻势还是守势布局？”'),

(16, NULL, 1, 'modern_innovation',    '现代创新类',           'Modern innovation',
 '关于互联网、自媒体、品牌打造、新技术方向、产品创新等现代延伸问题。', 
 '例如：“做某个自媒体赛道是否适合我？”、“搞AI/新技术方向合不合适？”');



-- =========================================
-- 插入二级细分类目数据
-- =========================================
INSERT INTO qmdj_question_category
    (id, parent_id, level, code, name_zh, name_en, description, examples)
VALUES
    -- 1. 综合运势类（overall_fortune，parent_id = 1）
    (17, 1, 2, 'overall_fortune_annual',   '流年运势',       'Annual fortune',
     '围绕某一整年的整体运势吉凶、机遇与压力。', 
     '例如：“2026年整体运势如何？”'),
    (18, 1, 2, 'overall_fortune_period',   '阶段运势',       'Period fortune',
     '某一阶段（数月/几年）的运势起伏与发展趋势。', 
     '例如：“未来三年适合创业还是打基础？”'),
    (19, 1, 2, 'overall_fortune_specific', '特定时段趋势',   'Specific time window',
     '指定起止时间段内整体吉凶与适宜/不宜事项。', 
     '例如：“接下来三个月整体顺利吗？”'),

    -- 2. 事业 / 学业类（career_academic，parent_id = 2）
    (20, 2, 2, 'career_academic_direction',       '事业方向',         'Career direction',
     '适合从事哪类行业、岗位，是走技术、管理、销售还是自主创业等。', 
     '例如：“我更适合走技术路线还是管理路线？”'),
    (21, 2, 2, 'career_academic_job_change',      '跳槽 / 换工作',     'Job change',
     '关于换工作时机、去A公司还是B公司、是否离职等。', 
     '例如：“现在适合离职吗？”、“去A公司还是B公司更好？”'),
    (22, 2, 2, 'career_academic_promotion',       '升职 / 加薪',       'Promotion & salary',
     '是否有升职加薪机会，争取空间多大。', 
     '例如：“今年有无升职加薪机会？”'),
    (23, 2, 2, 'career_academic_cooperation',     '合作 / 合伙',       'Cooperation & partnership',
     '与他人合伙创业、公司合作项目是否靠谱、有无风险。', 
     '例如：“和某某合伙开公司合适吗？”'),
    (24, 2, 2, 'career_academic_entrepreneurship','创业项目',         'Entrepreneurship project',
     '新创项目是否可行、成功概率与风险点。', 
     '例如：“现在启动这个创业项目合适吗？”'),
    (25, 2, 2, 'career_academic_study_direction', '学业方向',         'Study direction',
     '选择专业、学校、进修方向等学业规划。', 
     '例如：“适合读哪个专业？”、“要不要读研/读博？”'),
    (26, 2, 2, 'career_academic_exam_result',     '考试 / 录取',       'Exam & admission',
     '关于各类考试（中高考、考研、考公、资格证等）的通过率与录取前景。', 
     '例如：“这次考试能不能过？”、“考公上岸机会大吗？”'),

    -- 3. 财运 / 投资类（wealth_finance，parent_id = 3）
    (27, 3, 2, 'wealth_finance_trend',        '财运趋势',     'Wealth trend',
     '整体财运高低、破财与进财的可能性。', 
     '例如：“今年整体财运如何？”'),
    (28, 3, 2, 'wealth_finance_money_method', '求财方式',     'Ways to make money',
     '适合通过何种渠道/形式求财（打工、做生意、投资、偏财等）。', 
     '例如：“我适合做生意还是老老实实打工？”'),
    (29, 3, 2, 'wealth_finance_investment',   '投资项目',     'Investment project',
     '对某个具体投资标的（股票、基金、项目、房产等）的可行性判断。', 
     '例如：“现在入手这套投资房合适吗？”'),
    (30, 3, 2, 'wealth_finance_trade',        '买卖成交',     'Trade & deals',
     '买卖交易能否顺利成交，价格是否对己方有利。', 
     '例如：“这笔生意能不能谈成？”'),
    (31, 3, 2, 'wealth_finance_debt',         '债务 / 债权', 'Debt & receivables',
     '欠款能否要回、债务纠纷走向等。', 
     '例如：“对方欠我的钱能不能要回来？”'),
    (32, 3, 2, 'wealth_finance_risk',         '财务风险',     'Financial risk',
     '是否有破财、连带责任、财务坑等潜在风险。', 
     '例如：“这个投资会不会有很大风险？”'),

    -- 4. 感情 / 婚姻类（love_marriage，parent_id = 4）
    (33, 4, 2, 'love_marriage_single',             '单身择偶',       'Single & partner choice',
     '关于何时有正缘、目标对象适不适合发展等。', 
     '例如：“什么时候有正缘？”、“这个人适不适合长期发展？”'),
    (34, 4, 2, 'love_marriage_relationship',       '恋爱关系',       'Relationship status',
     '已经在谈的感情走向如何，稳定还是反复分合。', 
     '例如：“我们这段感情未来会怎样？”'),
    (35, 4, 2, 'love_marriage_partner_intention',  '对方态度',       'Partner intention',
     '对方是认真投入还是玩玩、是否另有心思。', 
     '例如：“TA对我是认真的还是随便玩玩？”'),
    (36, 4, 2, 'love_marriage_marriage_stability', '婚姻稳定性',     'Marriage stability',
     '婚姻是否稳固、有无外遇、感情基础如何。', 
     '例如：“婚姻里对方有没有外心？”'),
    (37, 4, 2, 'love_marriage_divorce',            '分手 / 离婚',     'Breakup & divorce',
     '分手/离婚是否会发生、后果利弊如何、是否有复合可能。', 
     '例如：“现在提出离婚对我有利吗？”'),
    (38, 4, 2, 'love_marriage_family',             '家庭情感',       'Family relationships',
     '与配偶、长辈、子女等家庭成员的情感关系发展。', 
     '例如：“婆媳矛盾以后会不会缓和？”'),

    -- 5. 子女 / 教育类（children_education，parent_id = 5）
    (39, 5, 2, 'children_education_fertility',       '怀孕 / 生育',     'Fertility',
     '是否有子女缘、怀孕是否顺利等。', 
     '例如：“什么时候有怀孕机会？”'),
    (40, 5, 2, 'children_education_child_fortune',   '子女运势',       'Child fortune',
     '子女整体运势、性格特点、未来发展潜力。', 
     '例如：“孩子以后的发展如何？”'),
    (41, 5, 2, 'children_education_child_education', '子女教育规划',   'Child education',
     '孩子适合怎样的教育方式、学校类型、专业方向等。', 
     '例如：“孩子适合走学术还是技术路线？”'),
    (42, 5, 2, 'children_education_parent_child',    '亲子关系',       'Parent-child relationship',
     '亲子之间的矛盾、沟通障碍、关系修复等。', 
     '例如：“孩子叛逆期该如何相处？”'),

    -- 6. 健康 / 疾病类（health_medical，parent_id = 6）
    (43, 6, 2, 'health_medical_trend',           '健康趋势',       'Health trend',
     '整体健康起伏、是否易生病或旧病复发（仅作趋势参考，不替代诊疗）。', 
     '例如：“近期身体状况如何？”'),
    (44, 6, 2, 'health_medical_disease_severity','疾病轻重',       'Disease severity',
     '本次疾病严重程度、发展快慢。（需配合医生意见）', 
     '例如：“这次病情是轻是重？”'),
    (45, 6, 2, 'health_medical_treatment_choice','诊疗选择',       'Treatment choice',
     '医院/科室/医生选择是否合适，要不要更换方案等。', 
     '例如：“要不要换一家医院治疗？”'),
    (46, 6, 2, 'health_medical_surgery_risk',    '手术风险',       'Surgery risk',
     '做手术的风险与成功率、时机是否合适。', 
     '例如：“现在做这台手术合适吗？”'),
    (47, 6, 2, 'health_medical_recuperation',    '康复 / 调养',     'Recuperation & recovery',
     '病后恢复速度、调养方式、是否适合某种养生路径。', 
     '例如：“术后恢复会不会很慢？”'),

    -- 7. 官司 / 纠纷类（lawsuit_dispute，parent_id = 7）
    (48, 7, 2, 'lawsuit_dispute_outcome',    '官司输赢',       'Lawsuit outcome',
     '诉讼案件的大致胜负倾向与走向。（不替代律师意见）', 
     '例如：“这场官司赢面多大？”'),
    (49, 7, 2, 'lawsuit_dispute_contract',   '合同纠纷',       'Contract disputes',
     '合同签订是否有不利条款、是否容易产生纠纷。', 
     '例如：“这份合同对我有没有明显风险？”'),
    (50, 7, 2, 'lawsuit_dispute_complaint',  '投诉 / 申诉',     'Complaint & appeal',
     '投诉、申诉、维权结果大致如何。', 
     '例如：“向监管部门投诉会有效果吗？”'),
    (51, 7, 2, 'lawsuit_dispute_regulatory', '行政 / 合规风险', 'Regulatory risk',
     '是否有被检查、处罚、合规风险的可能。', 
     '例如：“公司近期有无被处罚的风险？”'),

    -- 8. 人际 / 贵人小人类（interpersonal_social，parent_id = 8）
    (52, 8, 2, 'interpersonal_social_boss',               '上司关系',         'Boss relationship',
     '领导对自己的态度、信任度、是否愿意提携。', 
     '例如：“领导到底欣不欣赏我？”'),
    (53, 8, 2, 'interpersonal_social_colleague',          '同事关系',         'Colleague relationship',
     '同事之间是否和睦、有无明争暗斗、小人排挤。', 
     '例如：“部门里有没有人在背后搞我？”'),
    (54, 8, 2, 'interpersonal_social_subordinate',        '下属 / 团队',       'Subordinates & team',
     '下属是否可靠、团队配合度如何。', 
     '例如：“这个团队能不能带好？”'),
    (55, 8, 2, 'interpersonal_social_partner_trust',      '合作方可信度',     'Partner trustworthiness',
     '合作伙伴是否靠谱、有无坑。', 
     '例如：“这位合作伙伴能不能信任？”'),
    (56, 8, 2, 'interpersonal_social_friend',             '朋友真伪',         'Friendship authenticity',
     '朋友是否真心、有无可能翻脸。', 
     '例如：“这个朋友是可以深交的吗？”'),
    (57, 8, 2, 'interpersonal_social_benefactor_villain', '贵人 / 小人',       'Benefactors & villains',
     '近期是否易遇贵人或小人，对运势影响如何。', 
     '例如：“最近会不会有贵人出现？”'),

    -- 9. 出行 / 迁移类（travel_movement，parent_id = 9）
    (58, 9, 2, 'travel_movement_short_trip',    '短途出行 / 旅行',  'Short trip & travel',
     '短途出行、旅游的顺利程度、安全性、是否有意外。', 
     '例如：“这次旅行顺利吗？”'),
    (59, 9, 2, 'travel_movement_business_trip', '出差 / 外派',      'Business trip',
     '出差、外派对事业和健康的影响。', 
     '例如：“长期外派会不会影响身体/家庭？”'),
    (60, 9, 2, 'travel_movement_move_house',    '搬家 / 迁居',      'Move & relocation',
     '搬家是否合适、新居对运势影响如何。', 
     '例如：“现在搬家合适吗？”'),
    (61, 9, 2, 'travel_movement_migration',     '移民 / 留学',      'Migration & study abroad',
     '移民、出国读书的发展前景与风险。', 
     '例如：“移民去某国对我多不多利？”'),
    (62, 9, 2, 'travel_movement_route_choice',  '路线 / 方案选择',  'Route & plan choice',
     '出行或行动方案中，不同路线/方式的优劣比较。', 
     '例如：“走哪条路线更安全顺利？”'),

    -- 10. 房产 / 风水类（property_fengshui，parent_id = 10）
    (63, 10, 2, 'property_fengshui_buy',        '买房决策',     'Buying property',
     '是否适合买入某套房产或地块。', 
     '例如：“这套房现在买合适吗？”'),
    (64, 10, 2, 'property_fengshui_sell',       '卖房 / 变现',   'Selling property',
     '卖房时机、能否顺利成交、价格是否合适。', 
     '例如：“现在出手这套房好吗？”'),
    (65, 10, 2, 'property_fengshui_home',       '住宅风水',     'Home fengshui',
     '现住房屋格局、方位对家庭成员的影响。', 
     '例如：“现在住的房子风水对我影响如何？”'),
    (66, 10, 2, 'property_fengshui_office',     '办公室 / 店铺', 'Office & shop location',
     '办公地点、店铺选址与布局对事业财运的影响。', 
     '例如：“这间铺面适不适合开店？”'),
    (67, 10, 2, 'property_fengshui_renovation', '装修 / 布局',   'Renovation & layout',
     '装修动土、格局调整是否有利，注意事项。', 
     '例如：“改动格局敲墙会不会影响运势？”'),

    -- 11. 寻人 / 寻物类（search_lost，parent_id = 11）
    (68, 11, 2, 'search_lost_item', '失物寻找',  'Lost items',
     '物品是否还能找回、大致所在方位和环境特征。', 
     '例如：“丢的手机还能找回来吗？”'),
    (69, 11, 2, 'search_lost_person', '寻人问讯', 'Missing persons',
     '失联或久未联系之人的现况及大致方位。', 
     '例如：“多年没联系的朋友现在状况如何？”'),
    (70, 11, 2, 'search_lost_info', '消息打听',  'Information inquiry',
     '对某人/某事的近况、动态进行打探式占问。', 
     '例如：“对方最近在忙什么？”'),

    -- 12. 项目 / 决策 / 竞争类（project_decision，parent_id = 12）
    (71, 12, 2, 'project_decision_viability',   '项目可行性',     'Project viability',
     '新项目是否值得做、成功率和主要风险点。', 
     '例如：“这个新业务线值得投入吗？”'),
    (72, 12, 2, 'project_decision_bid',         '竞标 / 投标',     'Bidding & tender',
     '投标、竞标的中标机会与竞争态势。', 
     '例如：“这次投标能不能中标？”'),
    (73, 12, 2, 'project_decision_negotiation', '谈判博弈',       'Negotiation',
     '商务谈判、协议签署中的主动被动、结果倾向。', 
     '例如：“这次谈判我是不是处于弱势？”'),
    (74, 12, 2, 'project_decision_competition', '比赛 / 竞争',     'Competition & contests',
     '各类比赛、竞赛、排名争夺等胜算。', 
     '例如：“这次比赛有获奖机会吗？”'),

    -- 13. 择日 / 时机类（timing_selection，parent_id = 13）
    (75, 13, 2, 'timing_selection_auspicious_day', '吉日选择',     'Auspicious day selection',
     '为结婚、搬家、开业、动工、手术等挑选较为有利的日期。', 
     '例如：“哪天适合开业？”'),
    (76, 13, 2, 'timing_selection_action_timing',  '行动时机',     'Action timing',
     '某件事是现在动手，还是观望等待更好。', 
     '例如：“现在启动项目好，还是再等等？”'),
    (77, 13, 2, 'timing_selection_start_stop',     '开工 / 停工',   'Start & stop timing',
     '适合开工、停工、调整节奏的时间点。', 
     '例如：“什么时候适合停下来休整？”'),

    -- 14. 灵修 / 梦境类（spiritual_dream，parent_id = 14）
    (78, 14, 2, 'spiritual_dream_dream',          '梦境解析',     'Dream interpretation',
     '用奇门象来理解梦境中信息与现实对应。', 
     '例如：“最近总梦到同一个场景代表什么？”'),
    (79, 14, 2, 'spiritual_dream_spiritual_path', '修行路径',     'Spiritual path',
     '是否适合某种修行、学习玄学、宗教道路等。', 
     '例如：“适不适合系统学习某门修行？”'),
    (80, 14, 2, 'spiritual_dream_karmic',         '因缘 / 业力',   'Karmic relations',
     '某人某事反复纠缠的因缘、业力角度理解。', 
     '例如：“为什么总遇到同一种关系模式？”'),

    -- 15. 战略 / 布局类（strategy_planning，parent_id = 15）
    (81, 15, 2, 'strategy_planning_battle',  '攻势策略',   'Offensive strategy',
     '偏攻势的布局、主动出击是否有利。', 
     '例如：“现在采取激进扩张是否合适？”'),
    (82, 15, 2, 'strategy_planning_defense', '防守策略',   'Defensive strategy',
     '偏防守、收缩、保守策略是否更合适。', 
     '例如：“是不是应该收缩战线，先稳住？”'),
    (83, 15, 2, 'strategy_planning_macro',   '大局布局',   'Macro layout',
     '整体格局规划、长远布局方向的大致倾向。', 
     '例如：“公司未来五年的布局应该怎么定？”'),

    -- 16. 现代创新类（modern_innovation，parent_id = 16）
    (84, 16, 2, 'modern_innovation_internet_brand',    '互联网 / 品牌',   'Internet & brand',
     '做网站、App、线上业务、品牌打造方向是否适合。', 
     '例如：“我适合做个人品牌IP吗？”'),
    (85, 16, 2, 'modern_innovation_self_media',        '自媒体运营',       'Self-media',
     '做短视频、公众号、直播等自媒体赛道的可行性与赛道选择。', 
     '例如：“做哪类自媒体内容更有机会？”'),
    (86, 16, 2, 'modern_innovation_new_tech',          '新技术方向',       'New technology direction',
     'AI、区块链、元宇宙等新技术赛道是否适合自己。', 
     '例如：“转型做AI相关方向合不合适？”'),
    (87, 16, 2, 'modern_innovation_product_innovation','产品 / 业务创新', 'Product & business innovation',
     '现有产品/业务的创新、升级方向是否可行。', 
     '例如：“对现有产品做这个大改版是否合适？”');
