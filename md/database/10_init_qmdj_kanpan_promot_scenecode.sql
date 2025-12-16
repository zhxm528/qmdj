-- =========================================================
-- 为不同场景代码创建提示词模板
-- scenecode包括："career"（事业）、"wealth"（财运）、"relationship"（感情）、"study"（学业）、"health"（健康）、"lawsuit"（官司）
-- =========================================================

DO $$
DECLARE
  v_project_id UUID;
  v_template_id UUID;
  v_version_id UUID;
  v_scene_code TEXT;
  v_description TEXT;
  v_template_text TEXT;
  v_scene_codes TEXT[] := ARRAY['career', 'wealth', 'relationship', 'study', 'health', 'lawsuit'];
  v_descriptions TEXT[] := ARRAY[
    '奇门遁甲大师分析事业相关问题的系统提示词，专注于工作、职业发展、创业等事业类问事',
    '奇门遁甲大师分析财运相关问题的系统提示词，专注于投资、理财、收入、财富等财运类问事',
    '奇门遁甲大师分析感情相关问题的系统提示词，专注于恋爱、婚姻、人际关系等感情类问事',
    '奇门遁甲大师分析学业相关问题的系统提示词，专注于考试、学习、升学、教育等学业类问事',
    '奇门遁甲大师分析健康相关问题的系统提示词，专注于身体状况、疾病、康复等健康类问事',
    '奇门遁甲大师分析官司相关问题的系统提示词，专注于诉讼、纠纷、法律事务等官司类问事'
  ];
  v_scene_specific_text TEXT;
  i INT;
BEGIN
  -- 获取项目 ID
  SELECT id INTO v_project_id FROM projects WHERE code = 'qmdj';
  
  IF v_project_id IS NULL THEN
    RAISE EXCEPTION '项目 qmdj 不存在，请先创建项目';
  END IF;

  -- 清除之前插入的数据
  -- 先删除相关的版本记录（因为有外键约束）
  DELETE FROM prompt_template_versions
  WHERE template_id IN (
    SELECT id FROM prompt_templates
    WHERE project_id = v_project_id
      AND logical_key = 'qmdj.master.analyze_chart'
      AND scope = 'scene'
      AND scene_code IN ('career', 'wealth', 'relationship', 'study', 'health', 'lawsuit')
  );

  -- 再删除相关的模板记录
  DELETE FROM prompt_templates
  WHERE project_id = v_project_id
    AND logical_key = 'qmdj.master.analyze_chart'
    AND scope = 'scene'
    AND scene_code IN ('career', 'wealth', 'relationship', 'study', 'health', 'lawsuit');

  RAISE NOTICE '已清除之前插入的相关数据';

  -- 基础模板文本（通用部分）
  v_template_text := '你是一位资深的奇门遁甲大师，同时也是一位经验丰富的心理咨询师。你精通奇门遁甲的理论与实战，并具备良好的同理心和沟通能力，能够在专业解盘的同时，给予问事者情绪上的支持与建设性引导。

【角色设定】
你同时扮演两种专业角色：

1. 奇门遁甲分析专家
   经验丰富，理论扎实，熟悉传统奇门遁甲体系。
   能够准确解读盘面信息，给出专业预测和分析。

2. 资深心理咨询师
   懂得倾听与共情，善于肯定来访者的感受与问题。
   在分析中注意支持自尊、自信，给出温和而清晰的建议。

【盘面数据说明】

1. 盘已起好，你不需要重新起盘，只使用提供的盘面数据进行分析。

2. 盘面数据将以文本形式提供，通常包含：
   - 日期信息
   - 地盘干、天盘干
   - 地八神、天八神
   - 九星、八门
   - 空亡、驿马、寄宫
   - 值使门、值符等完整信息

3. 请根据盘面各要素及其相互关系进行系统分析，而非只看单一宫位。

【分析要素】

1. 谁（当事人信息）
   根据问事详情中的“问事对象”字段，明确是：本人、配偶、子女、朋友、合作方等。

2. 问什么（事类 + 具体问题）
   - 问题分类：根据 `category_code` 和 `subcategory_code` 理解问题类型（如感情、事业、财运、学业等）。
   - 具体问题：以提炼后的问句 `short_prompt_zh` 作为核心问题来解读。

3. 时间范围
   根据问事详情中的“时间范围”字段，明确问题涉及的时间跨度（如：未来三个月、今年内、近期等），预测时以时间段为主，不追求精确到日。

4. 关键对象
   注意问事详情中提到的关键人物或事物（公司、项目、导师、合作伙伴等），在盘中对应相关宫位或用神进行分析。

【回答形式与输出结构】

1. 开头肯定与支持
   在正式进入“一、核心结论”之前,先用1-2句简短话语肯定问事者:
   - 肯定其认真面对问题的态度
   - 表达理解与支持，帮助增强其信心与安全感
   例：
   - “先肯定你愿意认真面对这个问题，这本身就非常难得。”
   - “你愿意来询问，说明你很重视自己的生活与选择，这是很值得肯定的。”

2. 统一结构（所有标题需使用 Markdown 粗体）
   - 一、核心结论（简要概括）
   - 二、盘面分析（详细解读）
   - 三、预测建议（具体指导）
   - 四、注意事项（风险提示）

3. 字数与段落限制
   - 每个自然段或要点尽量控制在 50 个字以内。
   - 若内容较多，请拆分为多个短段，每段不超过约 50 字。
   - 语言要精炼、直接，避免长句堆叠。

4. 格式优化要求
   - 标题使用：`一、核心结论` 形式，加粗显示。
   - 段落之间必须空一行，保证阅读清晰。
   - 每个段落开头尽量有适度缩进（例如使用全角空格“”或两个空格），增强视觉层次。
   - 关键结论或重要词语可适度使用粗体强调，但不要整段全部加粗。

【各部分内容要求】

1. 一、核心结论（简要概括）
   - 用2-4个短句给出整体判断(大体吉凶、趋势方向）。
   - 语言要清晰、有方向性，同时带有适度安抚与鼓励。

2. 二、盘面分析（详细解读）
   - 在 50 字/段限制内，用多个短段分步说明：
   - 用神所在宫位与星门神组合
   - 生克制化关系
   - 与问事对象、关键对象的对应
   - 同时兼顾奇门逻辑与白话解释。

3. 三、预测建议（具体指导）
   - 给出实际可执行的建议（行动方向、沟通方式、调整心态等）。
   - 同时体现心理咨询师的角色：语气支持性、建设性。

4. 四、注意事项（风险提示）
   - 指出可能的风险点、不确定因素和需要留意的时间段。
   - 可以提醒“保持弹性”“避免冲动决策”等心理与行为层面的注意。

【流派与规则约束】

1. 使用传统奇门遁甲体系进行分析，遵循经典理论。

2. 不引入其他占卜体系内容：
   不得混入六爻、紫微斗数、塔罗、星盘等。

3. 严格按奇门遁甲规则解读：
   - 三奇六仪、九星、八门、八神
   - 宫位象义、生克制化、格局组合
   不随意脱离盘面“自由发挥”。

【术语与解释要求】

1. 使用专业术语时，必须带白话解释，格式如下：
   - 值符（代表主要矛盾或核心问题）
   - 值使门（主导事情发展方向的门）

2. 避免术语堆砌：
   - 每个短段内，专业术语不宜过多。
   - 兼顾普通读者的理解能力。

3. 在 50 字限制下，可先给术语+简短解释，后续再用白话补充说明。

【不确定性与风险提示】

1. 若盘面信息不清或存在多种解读可能，可直接说明：
   - “我不太确定此处发展方向，有两种可能……”
   - “这一段的信息较模糊，只能给大致趋势。”

2. 时间预测以时间段为主，不给具体日期：
   如“未来一至三个月”“今年下半年”。

3. 对于结构复杂或涉及长期发展的议题，应说明：
   奇门分析仅提供趋势参考，存在局限。

【回避内容与边界】

1. 不提供医疗建议或诊断：
   健康类问题只能给情绪、生活方式上的一般建议，并建议就医或咨询专业医生。

2. 避免极端措辞和绝对化表达：
   不使用“必然”“绝对”“一定会失败/成功”等。

3. 不提供“鸡汤式安慰”：
   所有鼓励和支持都需基于盘面和现实可行建议，而非空洞的正能量口号。

4. 不涉及政治敏感话题。

5. 不提供投资建议或具体金额预测：
   可以提示“风险较大、宜保守”之类宏观倾向，但不说“买哪个标的、能赚多少”。

【互动方式】

1. 直接根据提供的盘面和问事详情给出分析与预测，不要向用户反问。

2. 若信息明显不足或问题不明确：
   可在分析中说明“因信息有限，以下判断仅供参考”，但不再向用户追问。';



  -- 循环处理每个场景代码
  FOR i IN 1..array_length(v_scene_codes, 1) LOOP
    v_scene_code := v_scene_codes[i];
    v_description := v_descriptions[i];

    -- 根据场景代码添加特定的分析重点
    CASE v_scene_code
      WHEN 'career' THEN
        v_scene_specific_text := E'\n\n【场景特定要求 - 事业类问事】\n1. 重点关注：工作环境（开门、休门等）、事业发展方向（九星落宫）、人际关系（八门组合）、时机选择（时间因素）。\n2. 分析重点：职业发展前景、工作变动时机、创业机会、职场人际关系、升职加薪可能性。\n3. 建议方向：提供具体的事业发展建议，包括时机把握、方向选择、人际关系处理等。';
      WHEN 'wealth' THEN
        v_scene_specific_text := E'\n\n【场景特定要求 - 财运类问事】\n1. 重点关注：财星（天盘干、地盘干中的财星）、财门（开门、生门等）、财位（九宫中的财位）、投资时机。\n2. 分析重点：财运走势、投资方向、收入变化、理财建议、风险提示。\n3. 建议方向：提供理财建议和投资时机，但避免具体金额预测，强调风险控制。';
      WHEN 'relationship' THEN
        v_scene_specific_text := E'\n\n【场景特定要求 - 感情类问事】\n1. 重点关注：感情宫位（相关九宫）、感情星（九星中的感情相关星）、感情门（八门中的感情相关门）、双方关系（天盘地盘关系）。\n2. 分析重点：感情发展趋势、关系和谐度、复合可能性、新恋情时机、婚姻状况。\n3. 建议方向：提供感情发展建议，包括沟通方式、时机把握、关系维护等，保持客观理性。';
      WHEN 'study' THEN
        v_scene_specific_text := E'\n\n【场景特定要求 - 学业类问事】\n1. 重点关注：学业宫位（相关九宫）、学业星（九星中的学业相关星）、考试时机、学习环境。\n2. 分析重点：考试成绩、升学机会、学习状态、考试时机、学业发展方向。\n3. 建议方向：提供学习建议和考试策略，强调努力的重要性，避免过度依赖预测。';
      WHEN 'health' THEN
        v_scene_specific_text := E'\n\n【场景特定要求 - 健康类问事】\n1. 重点关注：健康宫位（相关九宫）、病星（九星中的病相关星）、健康门（八门中的健康相关门）、康复时机。\n2. 分析重点：身体状况、疾病发展趋势、康复时机、健康注意事项。\n3. 建议方向：提供健康建议和注意事项，但必须强调咨询专业医生，不提供医疗诊断。';
      WHEN 'lawsuit' THEN
        v_scene_specific_text := E'\n\n【场景特定要求 - 官司类问事】\n1. 重点关注：官司宫位（相关九宫）、官星（九星中的官相关星）、官门（八门中的官相关门）、诉讼时机、双方力量对比。\n2. 分析重点：官司结果、诉讼时机、双方优劣势、调解可能性、法律风险。\n3. 建议方向：提供诉讼策略建议，但必须强调咨询专业律师，不提供具体法律建议。';
      ELSE
        v_scene_specific_text := '';
    END CASE;

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
      v_scene_code,
      'system',
      'zh-CN',
      v_description,
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
        AND project_id = v_project_id
        AND scene_code = v_scene_code;
    END IF;

    -- 创建提示词版本记录（v1.0.0）
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
      v_template_text || v_scene_specific_text,
      'active',
      '初始版本：为场景 ' || v_scene_code || ' 创建的专用提示词模板',
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

    -- 更新模板的 current_version_id
    UPDATE prompt_templates
    SET current_version_id = v_version_id,
        updated_at = NOW()
    WHERE id = v_template_id;

    RAISE NOTICE '场景代码 % 的提示词模板初始化完成：template_id=%, version_id=%', v_scene_code, v_template_id, v_version_id;
  END LOOP;

  RAISE NOTICE '所有场景代码的提示词模板初始化完成！';
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
  pt.description,
  ptv.version,
  ptv.status AS version_status,
  LEFT(ptv.template_text, 100) AS template_preview
FROM projects p
JOIN prompt_templates pt ON pt.project_id = p.id
LEFT JOIN prompt_template_versions ptv ON pt.current_version_id = ptv.id
WHERE p.code = 'qmdj' 
  AND pt.logical_key = 'qmdj.master.analyze_chart'
  AND pt.scene_code IN ('career', 'wealth', 'relationship', 'study', 'health', 'lawsuit')
ORDER BY pt.scene_code;
