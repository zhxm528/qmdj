-- =========================================================
-- 初始化奇门遁甲看盘提示词到数据库
-- 用途：将 app/api/kanpan/route.ts 中的硬编码提示词迁移到数据库管理
-- =========================================================

-- 1. 创建项目记录（如果不存在）
-- =========================================================
INSERT INTO projects (code, name, description)
VALUES (
  'qmdj',
  '奇门遁甲问事助手',
  '奇门遁甲问事助手项目，提供奇门遁甲排盘和分析功能'
)
ON CONFLICT (code) DO NOTHING;

-- 2. 创建环境记录（如果不存在）
-- =========================================================
INSERT INTO environments (code, name, description)
VALUES
  ('dev', '开发环境', '开发环境：用于开发和测试'),
  ('staging', '预发布环境', '预发布环境：用于上线前验证'),
  ('prod', '生产环境', '生产环境：正式运行环境')
ON CONFLICT (code) DO NOTHING;

-- 3. 创建提示词模板记录
-- =========================================================
DO $$
DECLARE
  v_project_id UUID;
  v_template_id UUID;
  v_version_id UUID;
BEGIN
  -- 获取项目 ID
  SELECT id INTO v_project_id FROM projects WHERE code = 'qmdj';
  
  IF v_project_id IS NULL THEN
    RAISE EXCEPTION '项目 qmdj 不存在，请先创建项目';
  END IF;

  -- 插入或更新模板
  INSERT INTO prompt_templates (
    logical_key,
    scope,
    project_id,
    scene_code,
    role,
    language,
    description,
    status
  )
  VALUES (
    'qmdj.master.analyze_chart',
    'scene',
    v_project_id,
    'analyze_chart',
    'system',
    'zh-CN',
    '奇门遁甲大师分析盘面的系统提示词，用于定义AI分析专家的角色和分析规则',
    'active'
  )
  ON CONFLICT (scope, project_id, scene_code, role, logical_key) 
  DO UPDATE SET
    description = EXCLUDED.description,
    status = EXCLUDED.status,
    updated_at = NOW()
  RETURNING id INTO v_template_id;

  -- 如果冲突更新时没有返回 ID，需要再次查询
  IF v_template_id IS NULL THEN
    SELECT id INTO v_template_id 
    FROM prompt_templates 
    WHERE logical_key = 'qmdj.master.analyze_chart' 
      AND scope = 'scene'
      AND project_id = v_project_id;
  END IF;

  -- 4. 创建提示词版本记录（v1.0.0）
  -- =========================================================
  INSERT INTO prompt_template_versions (
    template_id,
    version,
    template_text,
    status,
    changelog,
    created_by
  )
  VALUES (
    v_template_id,
    '1.0.0',
    '你是一位资深的奇门遁甲大师，精通奇门遁甲的理论和实践。

【角色设定】
你是一位经验丰富的奇门遁甲分析专家，具备深厚的理论功底和丰富的实战经验，能够准确解读盘面信息并提供专业的预测和分析。

【盘面数据说明】
1. 盘已经起好，你不需要再起盘，直接使用提供的盘面数据进行分析。
2. 盘面数据将以文本形式提供，包含：日期信息、地盘干、天盘干、地八神、天八神、九星、八门、空亡、驿马、寄宫、值使门、值符等完整信息。
3. 请仔细分析盘面中的各项要素及其相互关系。

【分析要素】
1. 谁（当事人信息）：根据问事详情中的"问事对象"字段，明确是为谁而问（本人、配偶、子女、朋友等）。
2. 问什么（事类 + 具体问题）：
   - 问题分类：根据提供的分类代码（category_code 和 subcategory_code）理解问题类型
   - 具体问题：使用提炼后的问句（short_prompt_zh）作为核心问题
3. 时间范围：根据问事详情中的"时间范围"字段，明确问题涉及的时间跨度（未来三个月、今年内、近期等）。
4. 关键对象：注意问事详情中提到的关键人物或事物。

【回答形式要求】
1. 回答结构：采用统一的标题和段落格式，结构清晰，层次分明。
2. 内容侧重：先给出结论和核心预测，再进行详细分析和教学说明。
3. 输出格式：
   - 一、核心结论（简要概括）
   - 二、盘面分析（详细解读）
   - 三、预测建议（具体指导）
   - 四、注意事项（风险提示）

【流派与规则约束】
1. 使用传统奇门遁甲体系进行分析，遵循经典理论。
2. 不引入其他占卜体系（如六爻、紫微斗数等）的内容。
3. 严格按照奇门遁甲的规则和原理进行解读，不随意发挥。

【术语与解释要求】
1. 使用专业术语时，必须同时提供白话解释，确保非专业人士也能理解。
2. 专业术语格式：专业术语（白话解释），例如：值符（代表主要矛盾或核心问题）。
3. 避免过度使用专业术语，保持内容的可读性。

【不确定性与风险提示】
1. 对于盘面信息不明确或存在多种解读可能的情况，可以明确表示"我不太确定"或"需要更多信息"。
2. 对于时间预测，可以给出大致范围而非精确时间点。
3. 对于复杂问题，可以说明分析的局限性。

【回避内容与边界】
1. 不要提供医疗建议或诊断，遇到健康相关问题应建议咨询专业医生。
2. 避免极端措辞和绝对化表述，保持客观理性。
3. 不提供鸡汤式安慰，而是基于盘面数据给出实质性分析。
4. 不涉及政治敏感话题。
5. 不提供投资建议或具体金额预测。

【互动方式】
1. 直接给出分析和预测，不需要反问用户。
2. 如果盘面信息不足或问题不明确，可以在分析中说明，但不需要向用户提问。

【背景与动机】
根据问事详情中的"分类原因"和"关键对象"，理解用户问事的背景和动机，这有助于更准确地解读盘面。

请根据以上要求，对提供的奇门遁甲排盘结果进行专业、准确、易懂的分析和预测。',
    'active',
    '初始版本：从 app/api/kanpan/route.ts 迁移的硬编码提示词',
    'system'
  )
  ON CONFLICT (template_id, version) DO UPDATE SET
    template_text = EXCLUDED.template_text,
    status = EXCLUDED.status,
    changelog = EXCLUDED.changelog,
    created_at = NOW()
  RETURNING id INTO v_version_id;

  -- 如果冲突更新时没有返回 ID，需要再次查询
  IF v_version_id IS NULL THEN
    SELECT id INTO v_version_id 
    FROM prompt_template_versions 
    WHERE template_id = v_template_id 
      AND version = '1.0.0';
  END IF;

  -- 5. 更新模板的 current_version_id
  -- =========================================================
  UPDATE prompt_templates
  SET current_version_id = v_version_id,
      updated_at = NOW()
  WHERE id = v_template_id;

  RAISE NOTICE '提示词模板初始化完成：template_id=%, version_id=%', v_template_id, v_version_id;
END $$;

-- =========================================================
-- 验证数据
-- =========================================================
SELECT 
  p.code AS project_code,
  p.name AS project_name,
  pt.logical_key,
  pt.scope,
  pt.scene_code,
  pt.role,
  ptv.version,
  ptv.status AS version_status,
  LEFT(ptv.template_text, 100) AS template_preview
FROM projects p
JOIN prompt_templates pt ON pt.project_id = p.id
LEFT JOIN prompt_template_versions ptv ON pt.current_version_id = ptv.id
WHERE p.code = 'qmdj' AND pt.logical_key = 'qmdj.master.analyze_chart';
