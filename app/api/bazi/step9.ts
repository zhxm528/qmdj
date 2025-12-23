/**
 * 步骤9：十神专题解读（静态画像）
 * 把"十神强弱 + 位置（年/月/日/时）+ 透藏"组合起来看：
 * 性格与行为模式（食伤、印、比劫…）
 * 事业结构（官杀/食伤制杀/印化杀等）
 * 财务模式（财的来源、守财能力、比劫夺财等）
 * 关系与家庭主题（官杀/财/印的配置与冲合）
 */

export interface Step9Result {
  ten_god_profile: {
    strong: string[];
    weak: string[];
    balanced: string[];
    themes: {
      personality: string[];
      career: string[];
      wealth: string[];
      relationship_family: string[];
      health_tendencies: string[];
    };
  };
}

export function step9(
  step2Result: any,
  step4Result: any
): Step9Result {
  const tenGods = step2Result.ten_gods;
  const strong: string[] = [];
  const weak: string[] = [];
  const balanced: string[] = [];

  // 统计十神出现次数
  const tenGodCounts: Record<string, number> = {};
  [tenGods.year_stem, tenGods.month_stem, tenGods.hour_stem].forEach(tg => {
    if (tg) tenGodCounts[tg] = (tenGodCounts[tg] || 0) + 1;
  });

  Object.entries(tenGodCounts).forEach(([tg, count]) => {
    if (count >= 2) strong.push(tg);
    else if (count === 1) balanced.push(tg);
    else weak.push(tg);
  });

  // 生成主题解读
  const themes = {
    personality: [] as string[],
    career: [] as string[],
    wealth: [] as string[],
    relationship_family: [] as string[],
    health_tendencies: [] as string[],
  };

  if (tenGods.month_stem === "正官" || tenGods.month_stem === "七杀") {
    themes.personality.push("重规则、责任感强");
    themes.career.push("适合制度化环境");
  }
  if (tenGods.month_stem === "正财" || tenGods.month_stem === "偏财") {
    themes.wealth.push("重视资源与目标");
  }
  if (tenGods.month_stem === "食神" || tenGods.month_stem === "伤官") {
    themes.personality.push("表达能力强");
  }

  return {
    ten_god_profile: {
      strong,
      weak,
      balanced,
      themes,
    },
  };
}

