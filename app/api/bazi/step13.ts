/**
 * 步骤13：输出结论与建议
 * 归纳：你的"主结构""主要矛盾（病）""解决路径（药）""阶段节奏（哪几年更适合做什么）"。
 * 给出策略：主动顺势（用喜神）、规避风险（忌神年份做减法）、资源配置（学习/证照/合作/现金流等）。
 */

export interface Step13Result {
  summary: {
    core_structure: string;
    main_conflict: string;
    key_levers: string[];
    timing_strategy: string[];
  };
  actionable_advice: {
    do_more: string[];
    do_less: string[];
    risk_management: string[];
    resource_allocation: string[];
  };
}

export function step13(
  step4Result: any,
  step6Result: any,
  step7Result: any,
  step8Result: any
): Step13Result {
  console.log("[step13] input ok:", { step4Result, step6Result, step7Result, step8Result });
  const bodyState = step4Result.strength_judgement.body_state;
  const primaryPattern = step6Result.structure.primary_pattern;
  const mainConflict = step8Result.consistency_check.main_conflict;
  const yongShen = step7Result.useful_gods.yong_shen;
  const xiShen = step7Result.useful_gods.xi_shen;

  const coreStructure = `${primaryPattern}，${bodyState}，宜先稳后进`;
  const keyLevers = [
    `补${yongShen.element}（${yongShen.ten_god}）`,
    ...xiShen.map((x: any) => `助${x.element}（${x.ten_god}）`),
  ];

  console.log("[step13] response ok:", { coreStructure, mainConflict });
  return {
    summary: {
      core_structure: coreStructure,
      main_conflict: mainConflict,
      key_levers: keyLevers,
      timing_strategy: ["喜运做扩张，忌运做防守与蓄力"],
    },
    actionable_advice: {
      do_more: ["系统化学习/证照/技能积累", "建立可复用流程与工具"],
      do_less: ["硬碰硬的冲突式表达", "高杠杆高波动投入"],
      risk_management: ["重要年份提前做预算与预案", "把健康与作息当成硬约束"],
      resource_allocation: ["把资源投向长期复利（技能、人脉、现金流）"],
    },
  };
}

