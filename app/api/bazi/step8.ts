/**
 * 步骤8：验盘：看"病药"是否自洽
 * 用几条检查避免走偏：
 * 用神是否真的能解决主要矛盾？
 * 忌神是否在盘中很旺、是否有制化？
 * 合冲是否会让你选的用神"用不上"或"被绑架"？
 * 结构是否一推就矛盾（比如既说从弱又说用印比）。
 */

export interface Step8Result {
  consistency_check: {
    main_conflict: string;
    medicine: string;
    risk_points: string[];
    self_consistency: string;
    notes: string[];
  };
}

export function step8(
  step4Result: any,
  step6Result: any,
  step7Result: any,
  step2Result: any
): Step8Result {
  const bodyState = step4Result.strength_judgement.body_state;
  const yongShen = step7Result.useful_gods.yong_shen;
  const breakers = step6Result.structure.breakers || [];

  const mainConflict = `${bodyState}，需要${yongShen.element}（${yongShen.ten_god}）来平衡`;
  const medicine = `以${yongShen.element}为用，${step7Result.useful_gods.xi_shen.map((x: any) => x.element).join("、")}为喜`;

  const riskPoints: string[] = [];
  if (breakers.length > 0) {
    riskPoints.push(...breakers.map((b: string) => `${b}可能影响用神发挥`));
  }

  // 检查用神是否被合冲
  const relations = step2Result.relations;
  const allRelations = [
    ...relations.stem_combos,
    ...relations.branch_combos,
    ...relations.branch_clashes,
  ];
  
  if (allRelations.length > 0) {
    riskPoints.push(`合冲关系${allRelations.length}处，需注意用神是否被引动`);
  }

  let selfConsistency = "needs_review";
  if (riskPoints.length === 0 && bodyState !== "平衡") {
    selfConsistency = "consistent";
  }

  const notes: string[] = [];
  if (selfConsistency === "needs_review") {
    notes.push("建议结合具体事件验证");
  }

  return {
    consistency_check: {
      main_conflict: mainConflict,
      medicine,
      risk_points: riskPoints,
      self_consistency: selfConsistency,
      notes,
    },
  };
}

