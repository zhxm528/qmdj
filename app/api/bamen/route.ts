import { NextResponse } from "next/server";

// 外围八宫路径（阳遁顺行、阴遁逆行）
const PATH: Record<"阳遁" | "阴遁", number[]> = {
  阳遁: [4, 9, 2, 7, 6, 1, 8, 3],
  阴遁: [4, 3, 8, 1, 6, 7, 2, 9],
};

// 时柱到旬首的映射表
const HOUR_PILLAR_TO_XUN: Record<string, string> = {
  甲子: "戊", 乙丑: "戊", 丙寅: "戊", 丁卯: "戊", 戊辰: "戊",
  己巳: "戊", 庚午: "戊", 辛未: "戊", 壬申: "戊", 癸酉: "戊",
  甲戌: "己", 乙亥: "己", 丙子: "己", 丁丑: "己", 戊寅: "己",
  己卯: "己", 庚辰: "己", 辛巳: "己", 壬午: "己", 癸未: "己",
  甲申: "庚", 乙酉: "庚", 丙戌: "庚", 丁亥: "庚", 戊子: "庚",
  己丑: "庚", 庚寅: "庚", 辛卯: "庚", 壬辰: "庚", 癸巳: "庚",
  甲午: "辛", 乙未: "辛", 丙申: "辛", 丁酉: "辛", 戊戌: "辛",
  己亥: "辛", 庚子: "辛", 辛丑: "辛", 壬寅: "辛", 癸卯: "辛",
  甲辰: "壬", 乙巳: "壬", 丙午: "壬", 丁未: "壬", 戊申: "壬",
  己酉: "壬", 庚戌: "壬", 辛亥: "壬", 壬子: "壬", 癸丑: "壬",
  甲寅: "癸", 乙卯: "癸", 丙辰: "癸", 丁巳: "癸", 戊午: "癸",
  己未: "癸", 庚申: "癸", 辛酉: "癸", 壬戌: "癸", 癸亥: "癸",
};

// 六十甲子顺序
const JIAZI_SEQUENCE = [
  "甲子", "乙丑", "丙寅", "丁卯", "戊辰", "己巳", "庚午", "辛未", "壬申", "癸酉",
  "甲戌", "乙亥", "丙子", "丁丑", "戊寅", "己卯", "庚辰", "辛巳", "壬午", "癸未",
  "甲申", "乙酉", "丙戌", "丁亥", "戊子", "己丑", "庚寅", "辛卯", "壬辰", "癸巳",
  "甲午", "乙未", "丙申", "丁酉", "戊戌", "己亥", "庚子", "辛丑", "壬寅", "癸卯",
  "甲辰", "乙巳", "丙午", "丁未", "戊申", "己酉", "庚戌", "辛亥", "壬子", "癸丑",
  "甲寅", "乙卯", "丙辰", "丁巳", "戊午", "己未", "庚申", "辛酉", "壬戌", "癸亥",
];

// 八卦、宫和八门的对应关系
const PALACE_TO_DOOR: Record<number, string> = {
  1: "休", // 坎1 → 休
  8: "生", // 艮8 → 生
  3: "伤", // 震3 → 伤
  4: "杜", // 巽4 → 杜
  9: "景", // 离9 → 景
  2: "死", // 坤2 → 死
  7: "惊", // 兑7 → 惊
  6: "开", // 乾6 → 开
};

// 八门顺序
const DOOR_SEQUENCE = ["休", "生", "伤", "杜", "景", "死", "惊", "开"] as const;

// 八卦顺序（阳遁顺数、阴遁逆数）
const BAGUA_SEQUENCE_YANG = [1, 2, 3, 4, 5, 6, 7, 8, 9]; // 坎1 → 坤2 → 震3 → 巽4 → 中5 → 乾6 → 兑7 → 艮8 → 离9
const BAGUA_SEQUENCE_YIN = [9, 8, 7, 6, 5, 4, 3, 2, 1]; // 离9 → 艮8 → 兑7 → 乾6 → 中5 → 巽4 → 震3 → 坤2 → 坎1

// 顺时针宫位顺序（从坎宫1开始）：1 → 8 → 3 → 4 → 9 → 2 → 7 → 6
const CLOCKWISE_PALACES = [1, 8, 3, 4, 9, 2, 7, 6];
// 逆时针宫位顺序（从坎宫1开始）：1 → 6 → 7 → 2 → 9 → 4 → 3 → 8
const COUNTER_CLOCKWISE_PALACES = [1, 6, 7, 2, 9, 4, 3, 8];

/**
 * 计算从时干对应的旬首按照六十甲子顺序数到时辰干支的步数
 * 规则：从时干对应的旬首（天干）按照六十甲子顺序数到时辰干支
 */
function countStepsFromXunShouToHourPillar(hourPillar: string): number {
  // 找到时辰干支在六十甲子中的位置
  const hourPillarIndex = JIAZI_SEQUENCE.indexOf(hourPillar);
  if (hourPillarIndex === -1) {
    console.warn(`[bamen] 未找到时辰干支 ${hourPillar}，使用默认值`);
    return 0;
  }
  
  // 获取时干对应的旬首天干
  const xunShou = HOUR_PILLAR_TO_XUN[hourPillar] || "戊";
  
  // 找到包含该时辰干支的旬的起始位置（甲X）
  // 从当前位置向前查找，找到最近的"甲X"
  let xunStartIndex = hourPillarIndex;
  while (xunStartIndex >= 0 && JIAZI_SEQUENCE[xunStartIndex].charAt(0) !== "甲") {
    xunStartIndex -= 1;
  }
  
  if (xunStartIndex < 0) {
    // 如果没找到，从末尾开始查找
    xunStartIndex = JIAZI_SEQUENCE.length - 1;
    while (xunStartIndex >= 0 && JIAZI_SEQUENCE[xunStartIndex].charAt(0) !== "甲") {
      xunStartIndex -= 1;
    }
  }
  
  if (xunStartIndex < 0) {
    console.warn(`[bamen] 未找到包含 ${hourPillar} 的旬起始位置，使用默认值`);
    return 0;
  }
  
  // 计算步数（在同一个旬内，从甲X到时辰干支）
  // 例如：甲子旬中，从甲子到甲子=0步，从甲子到乙丑=1步，从甲子到癸酉=9步
  let steps = hourPillarIndex - xunStartIndex;
  if (steps < 0) {
    steps += 60; // 如果跨旬，加上60
  }
  
  // 确保在0-9之间（一个旬只有10个）
  steps = steps % 10;
  
  console.log(`[bamen] 旬首天干: ${xunShou}, 时辰干支: ${hourPillar}, 从旬首到时辰干支的步数: ${steps}`);
  return steps;
}

function buildBamen(
  dunType: "阳遁" | "阴遁",
  hourPillar: string,
  dibashen: Record<number, string>
): { bamen: Record<number, string>; zhiShiDoor: string } {
  const path = PATH[dunType];
  
  // 1. 找到地八神的值符所在宫位
  let diZhiFuPalace: number | null = null;
  for (const [key, value] of Object.entries(dibashen)) {
    const palace = Number(key);
    if (!Number.isNaN(palace) && value === "值符") {
      diZhiFuPalace = palace;
      break;
    }
  }
  
  if (diZhiFuPalace === null) {
    console.warn(`[bamen] 未找到地八神的值符，使用默认值`);
    diZhiFuPalace = path[0];
  }
  
  // 如果值符在中宫5，则移到坤二宫2
  if (diZhiFuPalace === 5) {
    diZhiFuPalace = 2;
    console.log(`[bamen] 值符在中宫5，移到坤二宫2`);
  }
  
  console.log(`[bamen] 地八神值符所在宫位: 宫${diZhiFuPalace}`);
  
  // 2. 找到地八神值符所在宫对应的门（值使门）
  const zhiShiDoor = PALACE_TO_DOOR[diZhiFuPalace];
  if (!zhiShiDoor) {
    console.warn(`[bamen] 未找到宫${diZhiFuPalace}对应的门，使用默认值`);
    return { bamen: {}, zhiShiDoor: "" };
  }
  
  console.log(`[bamen] 值使门: ${zhiShiDoor}`);
  
  // 3. 计算从旬首到时辰干支的步数
  const steps = countStepsFromXunShouToHourPillar(hourPillar);
  const xunShou = HOUR_PILLAR_TO_XUN[hourPillar] || "戊";
  console.log(`[bamen] 从时干对应的旬首"${xunShou}"按照六十甲子顺序数到时辰干支"${hourPillar}"的数量: ${steps}`);
  
  // 4. 值使门以同样的计算步数，按照八卦顺序（阳遁顺数/阴遁逆数）排入宫位
  // 从地八神值符所在宫开始，按照八卦顺序数同样的步数，得到值使门应该落到的宫
  const baguaSequence = dunType === "阳遁" ? BAGUA_SEQUENCE_YANG : BAGUA_SEQUENCE_YIN;
  const startIndex = baguaSequence.indexOf(diZhiFuPalace);
  if (startIndex === -1) {
    console.warn(`[bamen] 宫${diZhiFuPalace}不在八卦顺序中，使用默认值`);
    return { bamen: {}, zhiShiDoor };
  }
  
  console.log(`[bamen] 从地八神值符所在宫${diZhiFuPalace}开始，按照八卦顺序(${dunType})数${steps}步`);
  
  // 计算值使门应该落到的宫
  // 规则：在计算步数时不要跳过中宫，如果最终步数落到中宫，则把值使门寄入坤2宫
  let targetIndex = startIndex;
  let actualSteps = 0;
  const stepDetails: string[] = [];
  stepDetails.push(`起点: 宫${baguaSequence[startIndex]}`);
  while (actualSteps < steps) {
    targetIndex = (targetIndex + 1) % baguaSequence.length;
    const nextPalace = baguaSequence[targetIndex];
    actualSteps += 1; // 计算步数时不要跳过中宫，中宫也要算一步
    stepDetails.push(`宫${nextPalace}(${actualSteps}步)`);
  }
  console.log(`[bamen] 计算过程: ${stepDetails.join(" → ")}`);
  
  const zhiShiDoorPalace = baguaSequence[targetIndex];
  // 如果最终步数落到中宫5，则把值使门寄入坤2宫
  const finalZhiShiDoorPalace = zhiShiDoorPalace === 5 ? 2 : zhiShiDoorPalace;
  
  if (zhiShiDoorPalace === 5) {
    console.log(`[bamen] 值使门落到中宫5，寄入坤2宫`);
  }
  
  console.log(`[bamen] 值使门"${zhiShiDoor}"所在宫位: 宫${finalZhiShiDoorPalace}`);
  
  // 5. 以"值使门"所在宫为起点，按阳遁顺时针或阴遁逆时针依次排入八门
  // 找到值使门在八门顺序中的索引
  const zhiShiDoorIndex = DOOR_SEQUENCE.indexOf(zhiShiDoor as (typeof DOOR_SEQUENCE)[number]);
  if (zhiShiDoorIndex === -1) {
    console.warn(`[bamen] 未找到值使门 ${zhiShiDoor} 在八门顺序中，使用默认值`);
    return { bamen: {}, zhiShiDoor };
  }
  
  // 以"值使门"所在宫为起点，按顺时针依次排入八门
  const palaceSequence = CLOCKWISE_PALACES;
  const direction = "顺时针";
  
  // 找到值使门所在宫在宫位顺序中的索引
  let startPalaceIndex = palaceSequence.indexOf(finalZhiShiDoorPalace);
  if (startPalaceIndex === -1) {
    console.warn(`[bamen] 值使门所在宫 ${finalZhiShiDoorPalace} 不在${direction}顺序中，使用默认值`);
    startPalaceIndex = 0;
  }
  
  console.log(`[bamen] 从值使门所在宫${finalZhiShiDoorPalace}开始，按${direction}排入八门`);
  
  // 从值使门开始，按照八门顺序排列
  const doorSequence: string[] = [];
  for (let i = 0; i < DOOR_SEQUENCE.length; i += 1) {
    const idx = (zhiShiDoorIndex + i) % DOOR_SEQUENCE.length;
    doorSequence.push(DOOR_SEQUENCE[idx]);
  }
  
  console.log(`[bamen] 八门序列: ${doorSequence.join(" → ")}`);
  
  // 6. 从值使门所在宫开始，按顺时针方向排列八门
  const placement: Record<number, string> = {};
  for (let i = 0; i < doorSequence.length; i += 1) {
    const palace = palaceSequence[(startPalaceIndex + i) % palaceSequence.length];
    placement[palace] = doorSequence[i];
  }
  
  // 打印排布结果（按宫位顺序显示）
  const placementOrder = palaceSequence.map((palace) => {
    const door = placement[palace];
    return door ? `宫${palace}:${door}` : "";
  }).filter(Boolean).join(" → ");
  console.log(`[bamen] 八门排布 (${dunType}, ${direction}): ${placementOrder}`);
  
  return { bamen: placement, zhiShiDoor };
}

interface BamenRequest {
  dunType?: string;
  hourPillar?: string;
  dibashen?: Record<number | string, string>;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as BamenRequest;
    const { dunType, hourPillar, dibashen } = body || {};
    
    if (dunType !== "阳遁" && dunType !== "阴遁") {
      return NextResponse.json({ error: "dunType 必须为 '阳遁' 或 '阴遁'" }, { status: 400 });
    }
    
    if (!hourPillar || !HOUR_PILLAR_TO_XUN[hourPillar]) {
      return NextResponse.json({ error: "hourPillar 无法匹配旬首" }, { status: 400 });
    }
    
    if (!dibashen || Object.keys(dibashen).length === 0) {
      return NextResponse.json({ error: "dibashen 不能为空" }, { status: 400 });
    }
    
    // 规范化地八神数据
    const normalizedDibashen: Record<number, string> = {};
    for (const [key, value] of Object.entries(dibashen)) {
      const palace = Number(key);
      if (!Number.isNaN(palace)) {
        normalizedDibashen[palace] = value;
      }
    }
    
    const result = buildBamen(dunType, hourPillar, normalizedDibashen);
    return NextResponse.json({ bamen: result.bamen, zhiShiDoor: result.zhiShiDoor });
  } catch (error) {
    console.error("[bamen] 错误:", error);
    return NextResponse.json({ error: "解析请求失败" }, { status: 400 });
  }
}

