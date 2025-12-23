/**
 * 步骤10：动态：排大运
 * 起运年龄与顺逆（按你的排盘规则来）。
 * 每一步大运：看它引动了哪些喜忌、是否扶格/破格、是否解决"病"或加重"病"。
 */

export interface Step10Result {
  da_yun: {
    start_age: number | null;
    direction: string;
    cycles: Array<{
      age_range: string;
      pillar: { stem: string; branch: string };
      element_effect: string;
      ten_god_effect: string;
      key_triggers: string[];
      summary: string;
    }>;
  };
}

export function step10(
  fourPillars: {
    year: string;
    month: string;
    day: string;
    hour: string;
  },
  step7Result: any
): Step10Result {
  // 简化实现：默认8岁起运，顺排
  // TODO: 根据性别和年干计算起运年龄和顺逆
  const startAge = 8;
  const direction = "forward";

  // 生成前两步大运作为示例
  const cycles = [
    {
      age_range: "8-17",
      pillar: { stem: "丁", branch: "卯" },
      element_effect: "木火偏旺",
      ten_god_effect: "财官偏强",
      key_triggers: ["学业/规训主题增强"],
      summary: "压力与机会并存，需稳住基本盘",
    },
    {
      age_range: "18-27",
      pillar: { stem: "戊", branch: "辰" },
      element_effect: "土增",
      ten_god_effect: "印增强",
      key_triggers: ["证照/技能/贵人资源"],
      summary: "更利于积累与转型",
    },
  ];

  return {
    da_yun: {
      start_age: startAge,
      direction,
      cycles,
    },
  };
}

