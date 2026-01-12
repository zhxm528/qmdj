/**
 * 步骤2：补齐基础盘面信息
 * 列出：十神（相对日主）、地支藏干、十二长生（可选）、纳音（多数情况下可选）。
 * 把天干地支的合、冲、刑、害、破以及干合、干克关系标出来。
 * 
 * 输出完整的"盘面结构总表"，包括：
 * - 十神表（以日干为基准）
 * - 藏干表（地支拆解，包含五行、阴阳、十神、主气/中气/余气）
 * - 通根表（日主是否有根、根的位置和强度）
 * - 透干表（藏干是否透出）
 * - 关系网表（合冲刑害破 + 干合干克，包括三合局、三会局等）
 */

// 完整的盘面结构总表（新格式）
export interface BaziStructureTable {
  day_master: {
    stem: string;
    element: string;
    yinyang: string;
  };
  pillars: Array<{
    pillar: "year" | "month" | "day" | "hour";
    stem: {
      char: string;
      element: string;
      yinyang: string;
      tenshen: string;
    };
    branch: {
      char: string;
      hidden: Array<{
        char: string;
        role: "主气" | "中气" | "余气";
        element: string;
        yinyang: string;
        tenshen: string;
        is_root: boolean;
        reveal_to: string[];
      }>;
    };
  }>;
  roots: {
    summary: {
      benqi: number;
      zhongqi: number;
      yuqi: number;
    };
    details: Array<{
      location: string;
      branch: string;
      hidden: string;
      strength: "本气根" | "中气根" | "余气根";
    }>;
  };
  reveals: Array<{
    from_branch: string;
    hidden: string;
    to_stems: string[];
  }>;
  relations: {
    stems: Array<{
      type: "合" | "克" | "生";
      a: string;
      b: string;
    }>;
    branches: Array<{
      type: "冲" | "六合" | "害" | "破" | "刑" | "自刑";
      a: string;
      b?: string;
    }>;
    structures: Array<{
      type: "三合局" | "三会局" | "半合" | "方局" | "会方" | "六合局" | "其他";
      members: string[];
      element: string;
      is_complete: boolean;
    }>;
  };
}

export interface Step2Result {
  five_elements: {
    stems: {
      year_stem: { stem: string; element: string };
      month_stem: { stem: string; element: string };
      day_stem: { stem: string; element: string };
      hour_stem: { stem: string; element: string };
    };
    branches: {
      year_branch: { branch: string; element: string };
      month_branch: { branch: string; element: string };
      day_branch: { branch: string; element: string };
      hour_branch: { branch: string; element: string };
    };
    optional_summary: {
      count_by_element: { 木: number; 火: number; 土: number; 金: number; 水: number };
      notes: string;
    };
  };
  hidden_stems: {
    year_branch: string[];
    month_branch: string[];
    day_branch: string[];
    hour_branch: string[];
  };
  ten_gods: {
    year_stem: string;
    month_stem: string;
    hour_stem: string;
    branches_main: {
      year_branch: string;
      month_branch: string;
      day_branch: string;
      hour_branch: string;
    };
  };
  relations: {
    stem_combos: string[];
    stem_clashes: string[];
    branch_combos: string[];
    branch_clashes: string[];
    branch_harms: string[];
    branch_punishments: string[];
    branch_breaks: string[];
  };
  optional: {
    twelve_growth: Record<string, string>;
    na_yin: Record<string, string>;
  };
  // 新增：完整的盘面结构总表
  structure_table?: BaziStructureTable;
  // 新增：原始十神信息
  shishen?: {
    summary_id: number;
    details: Array<{
      pillar: string;
      item_type: "stem" | "hidden_stem";
      target_stem: string;
      target_element: string;
      target_yinyang: string;
      tenshen: string;
      rel_to_dm: string;
      same_yinyang: boolean;
      source_branch?: string;
      hidden_role?: string;
    }>;
  };
}

// 天干五行表
const GAN_TO_ELEMENT: Record<string, string> = {
  甲: "木", 乙: "木", 丙: "火", 丁: "火", 戊: "土",
  己: "土", 庚: "金", 辛: "金", 壬: "水", 癸: "水",
};

// 天干阴阳表
const GAN_TO_YINYANG: Record<string, string> = {
  甲: "阳", 乙: "阴", 丙: "阳", 丁: "阴", 戊: "阳",
  己: "阴", 庚: "阳", 辛: "阴", 壬: "阳", 癸: "阴",
};

// 地支五行表
const BRANCH_TO_ELEMENT: Record<string, string> = {
  寅: "木", 卯: "木", 巳: "火", 午: "火", 辰: "土", 戌: "土", 丑: "土", 未: "土",
  申: "金", 酉: "金", 子: "水", 亥: "水",
};

// 地支藏干表（按主气→中气→余气顺序）
const BRANCH_HIDDEN_STEMS: Record<string, string[]> = {
  子: ["癸"],
  丑: ["己", "癸", "辛"],
  寅: ["甲", "丙", "戊"],
  卯: ["乙"],
  辰: ["戊", "乙", "癸"],
  巳: ["丙", "戊", "庚"],
  午: ["丁", "己"],
  未: ["己", "丁", "乙"],
  申: ["庚", "壬", "戊"],
  酉: ["辛"],
  戌: ["戊", "辛", "丁"],
  亥: ["壬", "甲"],
};

// 藏干角色映射（主气、中气、余气）
const HIDDEN_ROLES: Record<string, Array<"主气" | "中气" | "余气">> = {
  子: ["主气"],
  丑: ["主气", "中气", "余气"],
  寅: ["主气", "中气", "余气"],
  卯: ["主气"],
  辰: ["主气", "中气", "余气"],
  巳: ["主气", "中气", "余气"],
  午: ["主气", "中气"],
  未: ["主气", "中气", "余气"],
  申: ["主气", "中气", "余气"],
  酉: ["主气"],
  戌: ["主气", "中气", "余气"],
  亥: ["主气", "中气"],
};

// 十神表（以日干为基准）
const TEN_GODS: Record<string, Record<string, string>> = {
  甲: { 甲: "比肩", 乙: "劫财", 丙: "食神", 丁: "伤官", 戊: "偏财", 己: "正财", 庚: "七杀", 辛: "正官", 壬: "偏印", 癸: "正印" },
  乙: { 甲: "劫财", 乙: "比肩", 丙: "伤官", 丁: "食神", 戊: "正财", 己: "偏财", 庚: "正官", 辛: "七杀", 壬: "正印", 癸: "偏印" },
  丙: { 甲: "偏印", 乙: "正印", 丙: "比肩", 丁: "劫财", 戊: "食神", 己: "伤官", 庚: "偏财", 辛: "正财", 壬: "七杀", 癸: "正官" },
  丁: { 甲: "正印", 乙: "偏印", 丙: "劫财", 丁: "比肩", 戊: "伤官", 己: "食神", 庚: "正财", 辛: "偏财", 壬: "正官", 癸: "七杀" },
  戊: { 甲: "七杀", 乙: "正官", 丙: "偏印", 丁: "正印", 戊: "比肩", 己: "劫财", 庚: "食神", 辛: "伤官", 壬: "偏财", 癸: "正财" },
  己: { 甲: "正官", 乙: "七杀", 丙: "正印", 丁: "偏印", 戊: "劫财", 己: "比肩", 庚: "伤官", 辛: "食神", 壬: "正财", 癸: "偏财" },
  庚: { 甲: "偏财", 乙: "正财", 丙: "七杀", 丁: "正官", 戊: "偏印", 己: "正印", 庚: "比肩", 辛: "劫财", 壬: "食神", 癸: "伤官" },
  辛: { 甲: "正财", 乙: "偏财", 丙: "正官", 丁: "七杀", 戊: "正印", 己: "偏印", 庚: "劫财", 辛: "比肩", 壬: "伤官", 癸: "食神" },
  壬: { 甲: "食神", 乙: "伤官", 丙: "偏财", 丁: "正财", 戊: "七杀", 己: "正官", 庚: "偏印", 辛: "正印", 壬: "比肩", 癸: "劫财" },
  癸: { 甲: "伤官", 乙: "食神", 丙: "正财", 丁: "偏财", 戊: "正官", 己: "七杀", 庚: "正印", 辛: "偏印", 壬: "劫财", 癸: "比肩" },
};

// 天干合
const STEM_COMBOS: string[][] = [
  ["甲", "己"], ["乙", "庚"], ["丙", "辛"], ["丁", "壬"], ["戊", "癸"],
];

// 天干冲（相克）
const STEM_CLASHES: string[][] = [
  ["甲", "庚"], ["乙", "辛"], ["丙", "壬"], ["丁", "癸"],
];

// 地支六合
const BRANCH_COMBOS: string[][] = [
  ["子", "丑"], ["寅", "亥"], ["卯", "戌"], ["辰", "酉"], ["巳", "申"], ["午", "未"],
];

// 地支六冲
const BRANCH_CLASHES: string[][] = [
  ["子", "午"], ["丑", "未"], ["寅", "申"], ["卯", "酉"], ["辰", "戌"], ["巳", "亥"],
];

// 地支六害
const BRANCH_HARMS: string[][] = [
  ["子", "未"], ["丑", "午"], ["寅", "巳"], ["卯", "辰"], ["申", "亥"], ["酉", "戌"],
];

// 地支三刑
const BRANCH_PUNISHMENTS: string[][] = [
  ["寅", "巳", "申"], // 无恩之刑
  ["丑", "戌", "未"], // 恃势之刑
  ["子", "卯"],       // 无礼之刑
  ["辰", "午", "酉", "亥"], // 自刑
];

// 地支相破
const BRANCH_BREAKS: string[][] = [
  ["子", "酉"], ["寅", "亥"], ["卯", "午"], ["辰", "丑"], ["巳", "申"], ["未", "戌"],
];

// 三合局
const SANHE_JU: Array<{ members: string[]; element: string }> = [
  { members: ["申", "子", "辰"], element: "水" },
  { members: ["寅", "午", "戌"], element: "火" },
  { members: ["亥", "卯", "未"], element: "木" },
  { members: ["巳", "酉", "丑"], element: "金" },
];

// 三会局
const SANHUI_JU: Array<{ members: string[]; element: string }> = [
  { members: ["亥", "子", "丑"], element: "水" },
  { members: ["寅", "卯", "辰"], element: "木" },
  { members: ["巳", "午", "未"], element: "火" },
  { members: ["申", "酉", "戌"], element: "金" },
];

// 天干相生关系
const STEM_SHENG: Record<string, string[]> = {
  木: ["火"],
  火: ["土"],
  土: ["金"],
  金: ["水"],
  水: ["木"],
};

export async function step2(
  fourPillars: {
    year: string;
    month: string;
    day: string;
    hour: string;
  },
  dayMaster: string,
  chartId: string | null = null
): Promise<Step2Result> {
  console.log("[step2] input ok:", { fourPillars, dayMaster, chartId });
  const yearStem = fourPillars.year.charAt(0);
  const yearBranch = fourPillars.year.charAt(1);
  const monthStem = fourPillars.month.charAt(0);
  const monthBranch = fourPillars.month.charAt(1);
  const dayStem = fourPillars.day.charAt(0);
  const dayBranch = fourPillars.day.charAt(1);
  const hourStem = fourPillars.hour.charAt(0);
  const hourBranch = fourPillars.hour.charAt(1);

  // 五行信息
  const fiveElements = {
    stems: {
      year_stem: { stem: yearStem, element: GAN_TO_ELEMENT[yearStem] || "" },
      month_stem: { stem: monthStem, element: GAN_TO_ELEMENT[monthStem] || "" },
      day_stem: { stem: dayStem, element: GAN_TO_ELEMENT[dayStem] || "" },
      hour_stem: { stem: hourStem, element: GAN_TO_ELEMENT[hourStem] || "" },
    },
    branches: {
      year_branch: { branch: yearBranch, element: BRANCH_TO_ELEMENT[yearBranch] || "" },
      month_branch: { branch: monthBranch, element: BRANCH_TO_ELEMENT[monthBranch] || "" },
      day_branch: { branch: dayBranch, element: BRANCH_TO_ELEMENT[dayBranch] || "" },
      hour_branch: { branch: hourBranch, element: BRANCH_TO_ELEMENT[hourBranch] || "" },
    },
    optional_summary: {
      count_by_element: { 木: 0, 火: 0, 土: 0, 金: 0, 水: 0 },
      notes: "统计口径：天干1次+地支主五行1次；未把藏干计入",
    },
  };

  // 统计五行数量
  const elementCount = fiveElements.optional_summary.count_by_element;
  [fiveElements.stems.year_stem, fiveElements.stems.month_stem, fiveElements.stems.day_stem, fiveElements.stems.hour_stem].forEach(s => {
    if (s.element && elementCount[s.element as keyof typeof elementCount] !== undefined) {
      elementCount[s.element as keyof typeof elementCount]++;
    }
  });
  [fiveElements.branches.year_branch, fiveElements.branches.month_branch, fiveElements.branches.day_branch, fiveElements.branches.hour_branch].forEach(b => {
    if (b.element && elementCount[b.element as keyof typeof elementCount] !== undefined) {
      elementCount[b.element as keyof typeof elementCount]++;
    }
  });

  // 地支藏干
  const hiddenStems = {
    year_branch: BRANCH_HIDDEN_STEMS[yearBranch] || [],
    month_branch: BRANCH_HIDDEN_STEMS[monthBranch] || [],
    day_branch: BRANCH_HIDDEN_STEMS[dayBranch] || [],
    hour_branch: BRANCH_HIDDEN_STEMS[hourBranch] || [],
  };

  // 十神
  const tenGodsMap = TEN_GODS[dayMaster] || {};
  const tenGods = {
    year_stem: tenGodsMap[yearStem] || "",
    month_stem: tenGodsMap[monthStem] || "",
    hour_stem: tenGodsMap[hourStem] || "",
    branches_main: {
      year_branch: tenGodsMap[hiddenStems.year_branch[0]] || "",
      month_branch: tenGodsMap[hiddenStems.month_branch[0]] || "",
      day_branch: tenGodsMap[hiddenStems.day_branch[0]] || "",
      hour_branch: tenGodsMap[hiddenStems.hour_branch[0]] || "",
    },
  };

  // 关系分析
  const stems = [yearStem, monthStem, dayStem, hourStem];
  const branches = [yearBranch, monthBranch, dayBranch, hourBranch];

  const stemCombos: string[] = [];
  const stemClashes: string[] = [];
  for (let i = 0; i < stems.length; i++) {
    for (let j = i + 1; j < stems.length; j++) {
      const pair = [stems[i], stems[j]].sort();
      if (STEM_COMBOS.some(c => c[0] === pair[0] && c[1] === pair[1])) {
        stemCombos.push(`${pair[0]}${pair[1]}合`);
      }
      if (STEM_CLASHES.some(c => c[0] === pair[0] && c[1] === pair[1] || c[0] === pair[1] && c[1] === pair[0])) {
        stemClashes.push(`${pair[0]}${pair[1]}冲`);
      }
    }
  }

  const branchCombos: string[] = [];
  const branchClashes: string[] = [];
  const branchHarms: string[] = [];
  const branchPunishments: string[] = [];
  const branchBreaks: string[] = [];

  for (let i = 0; i < branches.length; i++) {
    for (let j = i + 1; j < branches.length; j++) {
      const pair = [branches[i], branches[j]].sort();
      if (BRANCH_COMBOS.some(c => c[0] === pair[0] && c[1] === pair[1])) {
        branchCombos.push(`${pair[0]}${pair[1]}合`);
      }
      if (BRANCH_CLASHES.some(c => c[0] === pair[0] && c[1] === pair[1])) {
        branchClashes.push(`${pair[0]}${pair[1]}冲`);
      }
      if (BRANCH_HARMS.some(c => c[0] === pair[0] && c[1] === pair[1])) {
        branchHarms.push(`${pair[0]}${pair[1]}害`);
      }
      if (BRANCH_BREAKS.some(c => c[0] === pair[0] && c[1] === pair[1])) {
        branchBreaks.push(`${pair[0]}${pair[1]}破`);
      }
    }
  }

  // 检查三刑
  for (const punishment of BRANCH_PUNISHMENTS) {
    const found = punishment.filter(p => branches.includes(p));
    if (found.length >= 2) {
      branchPunishments.push(found.join("") + "刑");
    }
  }

  // ========== 构建完整的盘面结构总表 ==========
  const dayMasterElement = GAN_TO_ELEMENT[dayMaster] || "";
  const dayMasterYinYang = GAN_TO_YINYANG[dayMaster] || "";
  // tenGodsMap 已在上面定义，直接复用

  // 构建四柱详细信息
  const pillarsData = [
    { pillar: "year" as const, stem: yearStem, branch: yearBranch },
    { pillar: "month" as const, stem: monthStem, branch: monthBranch },
    { pillar: "day" as const, stem: dayStem, branch: dayBranch },
    { pillar: "hour" as const, stem: hourStem, branch: hourBranch },
  ];

  const pillars = pillarsData.map((p) => {
    const hiddenStemsList = BRANCH_HIDDEN_STEMS[p.branch] || [];
    const roles = HIDDEN_ROLES[p.branch] || [];
    
    const hidden = hiddenStemsList.map((hiddenStem, idx) => {
      const hiddenElement = GAN_TO_ELEMENT[hiddenStem] || "";
      const hiddenYinYang = GAN_TO_YINYANG[hiddenStem] || "";
      const hiddenTenshen = tenGodsMap[hiddenStem] || "";
      const role = roles[idx] || "主气";
      
      // 判断是否为日主的根（同五行）
      const isRoot = hiddenElement === dayMasterElement;
      
      // 判断根强度
      let rootStrength: "本气根" | "中气根" | "余气根" | null = null;
      if (isRoot) {
        if (role === "主气") rootStrength = "本气根";
        else if (role === "中气") rootStrength = "中气根";
        else if (role === "余气") rootStrength = "余气根";
      }
      
      // 判断透干（藏干是否在天干中出现）
      const revealTo: string[] = [];
      pillarsData.forEach((pillarData) => {
        if (pillarData.stem === hiddenStem && pillarData.pillar !== "day") {
          revealTo.push(`${pillarData.pillar}_stem`);
        }
      });
      
      return {
        char: hiddenStem,
        role: role as "主气" | "中气" | "余气",
        element: hiddenElement,
        yinyang: hiddenYinYang,
        tenshen: hiddenTenshen,
        is_root: isRoot,
        reveal_to: revealTo,
      };
    });

    return {
      pillar: p.pillar,
      stem: {
        char: p.stem,
        element: GAN_TO_ELEMENT[p.stem] || "",
        yinyang: GAN_TO_YINYANG[p.stem] || "",
        tenshen: p.pillar === "day" ? "日主" : (tenGodsMap[p.stem] || ""),
      },
      branch: {
        char: p.branch,
        hidden,
      },
    };
  });

  // 构建通根表
  const rootsDetails: Array<{
    location: string;
    branch: string;
    hidden: string;
    strength: "本气根" | "中气根" | "余气根";
  }> = [];
  
  let benqiCount = 0;
  let zhongqiCount = 0;
  let yuqiCount = 0;

  pillars.forEach((p) => {
    p.branch.hidden.forEach((h) => {
      if (h.is_root && h.reveal_to.length >= 0) {
        const strength = h.role === "主气" ? "本气根" : h.role === "中气" ? "中气根" : "余气根";
        rootsDetails.push({
          location: `${p.pillar}_branch`,
          branch: p.branch.char,
          hidden: h.char,
          strength,
        });
        
        if (strength === "本气根") benqiCount++;
        else if (strength === "中气根") zhongqiCount++;
        else if (strength === "余气根") yuqiCount++;
      }
    });
  });

  // 构建透干表
  const reveals: Array<{
    from_branch: string;
    hidden: string;
    to_stems: string[];
  }> = [];

  pillars.forEach((p) => {
    p.branch.hidden.forEach((h) => {
      if (h.reveal_to.length > 0) {
        reveals.push({
          from_branch: p.branch.char,
          hidden: h.char,
          to_stems: h.reveal_to,
        });
      }
    });
  });

  // 构建关系网表
  const stemRelations: Array<{ type: "合" | "克" | "生"; a: string; b: string }> = [];
  const branchRelations: Array<{ type: "冲" | "六合" | "害" | "破" | "刑" | "自刑"; a: string; b?: string }> = [];
  const structures: Array<{ type: "三合局" | "三会局" | "半合" | "方局" | "会方" | "六合局" | "其他"; members: string[]; element: string; is_complete: boolean }> = [];

  // 天干关系
  for (let i = 0; i < stems.length; i++) {
    for (let j = i + 1; j < stems.length; j++) {
      const stemA = stems[i];
      const stemB = stems[j];
      const pillarA = pillarsData[i];
      const pillarB = pillarsData[j];
      
      // 天干五合
      if (STEM_COMBOS.some(c => (c[0] === stemA && c[1] === stemB) || (c[0] === stemB && c[1] === stemA))) {
        stemRelations.push({
          type: "合",
          a: `${stemA}(${pillarA.pillar})`,
          b: `${stemB}(${pillarB.pillar})`,
        });
      }
      
      // 天干相克
      const elementA = GAN_TO_ELEMENT[stemA];
      const elementB = GAN_TO_ELEMENT[stemB];
      if (STEM_CLASHES.some(c => (c[0] === stemA && c[1] === stemB) || (c[0] === stemB && c[1] === stemA))) {
        stemRelations.push({
          type: "克",
          a: `${stemA}(${pillarA.pillar})`,
          b: `${stemB}(${pillarB.pillar})`,
        });
      }
      
      // 天干相生
      if (STEM_SHENG[elementA]?.includes(elementB)) {
        stemRelations.push({
          type: "生",
          a: `${stemA}(${pillarA.pillar})`,
          b: `${stemB}(${pillarB.pillar})`,
        });
      } else if (STEM_SHENG[elementB]?.includes(elementA)) {
        stemRelations.push({
          type: "生",
          a: `${stemB}(${pillarB.pillar})`,
          b: `${stemA}(${pillarA.pillar})`,
        });
      }
    }
  }

  // 地支关系
  for (let i = 0; i < branches.length; i++) {
    for (let j = i + 1; j < branches.length; j++) {
      const branchA = branches[i];
      const branchB = branches[j];
      const pillarA = pillarsData[i];
      const pillarB = pillarsData[j];
      
      // 六合
      if (BRANCH_COMBOS.some(c => (c[0] === branchA && c[1] === branchB) || (c[0] === branchB && c[1] === branchA))) {
        branchRelations.push({
          type: "六合",
          a: `${branchA}(${pillarA.pillar})`,
          b: `${branchB}(${pillarB.pillar})`,
        });
      }
      
      // 六冲
      if (BRANCH_CLASHES.some(c => (c[0] === branchA && c[1] === branchB) || (c[0] === branchB && c[1] === branchA))) {
        branchRelations.push({
          type: "冲",
          a: `${branchA}(${pillarA.pillar})`,
          b: `${branchB}(${pillarB.pillar})`,
        });
      }
      
      // 六害
      if (BRANCH_HARMS.some(c => (c[0] === branchA && c[1] === branchB) || (c[0] === branchB && c[1] === branchA))) {
        branchRelations.push({
          type: "害",
          a: `${branchA}(${pillarA.pillar})`,
          b: `${branchB}(${pillarB.pillar})`,
        });
      }
      
      // 相破
      if (BRANCH_BREAKS.some(c => (c[0] === branchA && c[1] === branchB) || (c[0] === branchB && c[1] === branchA))) {
        branchRelations.push({
          type: "破",
          a: `${branchA}(${pillarA.pillar})`,
          b: `${branchB}(${pillarB.pillar})`,
        });
      }
    }
  }

  // 三刑
  for (const punishment of BRANCH_PUNISHMENTS) {
    const found = punishment.filter(p => branches.includes(p));
    if (found.length >= 2) {
      const foundPillars = found.map(b => pillarsData[branches.indexOf(b)]);
      branchRelations.push({
        type: found.length === 3 ? "刑" : "刑",
        a: found.map((b, idx) => `${b}(${foundPillars[idx].pillar})`).join("、"),
      });
    }
  }

  // 自刑
  const zixingBranches = ["辰", "午", "酉", "亥"];
  branches.forEach((b, idx) => {
    if (zixingBranches.includes(b)) {
      branchRelations.push({
        type: "自刑",
        a: `${b}(${pillarsData[idx].pillar})`,
      });
    }
  });

  // 三合局
  SANHE_JU.forEach((ju) => {
    const found = ju.members.filter(m => branches.includes(m));
    if (found.length >= 2) {
      structures.push({
        type: found.length === 3 ? "三合局" : "半合",
        members: found,
        element: ju.element,
        is_complete: found.length === 3,
      });
    }
  });

  // 三会局
  SANHUI_JU.forEach((ju) => {
    const found = ju.members.filter(m => branches.includes(m));
    if (found.length >= 2) {
      structures.push({
        type: found.length === 3 ? "三会局" : "会方",
        members: found,
        element: ju.element,
        is_complete: found.length === 3,
      });
    }
  });

  const structureTable: BaziStructureTable = {
    day_master: {
      stem: dayMaster,
      element: dayMasterElement,
      yinyang: dayMasterYinYang,
    },
    pillars,
    roots: {
      summary: {
        benqi: benqiCount,
        zhongqi: zhongqiCount,
        yuqi: yuqiCount,
      },
      details: rootsDetails,
    },
    reveals,
    relations: {
      stems: stemRelations,
      branches: branchRelations,
      structures,
    },
  };

  // 调用 shishen API 获取十神信息
  let shishenData: Step2Result["shishen"] | undefined = undefined;
  if (chartId) {
    try {
      const { calculateAndSaveShishen } = await import("./shishen/route");
      const shishenResult = await calculateAndSaveShishen(chartId, {
        year: fourPillars.year,
        month: fourPillars.month,
        day: fourPillars.day,
        hour: fourPillars.hour,
      });
      shishenData = shishenResult;
    } catch (shishenError: any) {
      console.error("[step2] 调用 shishen 计算函数时出错:", shishenError);
      console.error("[step2] shishen 错误堆栈:", shishenError.stack);
      // 不抛出错误，继续执行
    }
  }
  console.log("[step2] response ok:", { hasStructureTable: !!structureTable, hasShishen: !!shishenData });
  return {
    five_elements: fiveElements,
    hidden_stems: hiddenStems,
    ten_gods: tenGods,
    relations: {
      stem_combos: stemCombos,
      stem_clashes: stemClashes,
      branch_combos: branchCombos,
      branch_clashes: branchClashes,
      branch_harms: branchHarms,
      branch_punishments: branchPunishments,
      branch_breaks: branchBreaks,
    },
    optional: {
      twelve_growth: {}, // TODO: 实现十二长生
      na_yin: {}, // TODO: 实现纳音
    },
    structure_table: structureTable,
    shishen: shishenData,
  };
}

