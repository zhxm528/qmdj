import { NextResponse } from "next/server";

// 外围八宫路径（阳遁顺行、阴遁逆行）
const PATH: Record<"阳遁" | "阴遁", number[]> = {
  阳遁: [4, 9, 2, 7, 6, 1, 8, 3],
  阴遁: [4, 3, 8, 1, 6, 7, 2, 9],
};

// 顺时针宫位顺序（从坎宫1开始）
const CLOCKWISE_PALACES = [1, 8, 3, 4, 9, 2, 7, 6];

// 八宫按照顺时针对应九星的关系
const PALACE_TO_STAR: Record<number, string> = {
  1: "天蓬", // 坎宫
  8: "天任", // 艮宫
  3: "天冲", // 震宫
  4: "天辅", // 巽宫
  9: "天英", // 离宫
  2: "天芮", // 坤宫（天禽和天芮同宫）
  7: "天柱", // 兑宫
  6: "天心", // 乾宫
};

// 九星顺序（顺时针）
const STAR_SEQUENCE = ["天蓬", "天任", "天冲", "天辅", "天英", "天芮", "天柱", "天心"] as const;

function buildJiuxing(
  dunType: "阳遁" | "阴遁",
  dibashen: Record<number, string>,
  tianbashen: Record<number, string>
): Record<number, string> {
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
    console.warn(`[jiuxing] 未找到地八神的值符，使用默认值`);
    diZhiFuPalace = path[0];
  }

  // 2. 根据地八神的值符所在宫位，找到对应的九星
  const startStar = PALACE_TO_STAR[diZhiFuPalace] || "天蓬";
  console.log(`[jiuxing] 地八神值符在宫${diZhiFuPalace}，对应九星: ${startStar}`);

  // 3. 找到天八神的值符所在宫位，作为九星的起点
  let tianZhiFuPalace: number | null = null;
  for (const [key, value] of Object.entries(tianbashen)) {
    const palace = Number(key);
    if (!Number.isNaN(palace) && value === "值符") {
      tianZhiFuPalace = palace;
      break;
    }
  }

  if (tianZhiFuPalace === null) {
    console.warn(`[jiuxing] 未找到天八神的值符，使用默认值`);
    tianZhiFuPalace = path[0];
  }

  console.log(`[jiuxing] 天八神值符在宫${tianZhiFuPalace}，作为九星起点`);

  // 4. 找到起点星在九星顺序中的索引
  let startStarIndex = STAR_SEQUENCE.indexOf(startStar as (typeof STAR_SEQUENCE)[number]);
  if (startStarIndex === -1) {
    console.warn(`[jiuxing] 未找到起点星 ${startStar} 在九星顺序中，使用天蓬`);
    startStarIndex = 0;
  }

  // 5. 从起点星开始，构建九星序列（从startStar开始，按照STAR_SEQUENCE顺序循环）
  const starSequence: string[] = [];
  for (let i = 0; i < STAR_SEQUENCE.length; i += 1) {
    const idx = (startStarIndex + i) % STAR_SEQUENCE.length;
    starSequence.push(STAR_SEQUENCE[idx]);
  }

  console.log(`[jiuxing] 九星序列: ${starSequence.join(" → ")}`);

  // 6. 找到起点宫位在顺时针顺序中的索引
  // 需要将path转换为顺时针顺序来排列
  // 但是path是按照阳遁/阴遁的顺序，我们需要按照顺时针顺序来排星
  // 所以需要找到起点宫在CLOCKWISE_PALACES中的位置，然后按照顺时针方向排列

  // 找到起点宫在顺时针顺序中的索引
  let startPalaceIndex = CLOCKWISE_PALACES.indexOf(tianZhiFuPalace);
  if (startPalaceIndex === -1) {
    console.warn(`[jiuxing] 起点宫 ${tianZhiFuPalace} 不在顺时针顺序中，使用第一个宫位`);
    startPalaceIndex = 0;
  }

  // 7. 从起点开始，按照顺时针方向排列九星
  const placement: Record<number, string> = {};
  for (let i = 0; i < starSequence.length; i += 1) {
    const palace = CLOCKWISE_PALACES[(startPalaceIndex + i) % CLOCKWISE_PALACES.length];
    placement[palace] = starSequence[i];
  }

  // 8. 天禽和天芮同宫，如果天芮在某个宫，天禽也在那个宫
  // 但是根据规则，天禽和天芮同宫，所以如果天芮在宫2（坤宫），天禽也在宫2
  // 实际上，天芮已经在placement中了，我们需要检查是否需要添加天禽
  // 根据规则，天禽和天芮同宫，所以如果天芮在某个宫，我们也应该显示天禽
  // 但是通常只显示一个，或者显示"天芮/天禽"
  // 这里我们保持简单，只显示一个星

  // 打印排布结果
  const placementOrder = CLOCKWISE_PALACES.map((palace) => {
    const star = placement[palace];
    return star ? `宫${palace}:${star}` : "";
  }).filter(Boolean).join(" → ");
  console.log(`[jiuxing] 九星排布 (${dunType}): ${placementOrder}`);

  return placement;
}

interface JiuxingRequest {
  dunType?: string;
  dibashen?: Record<number | string, string>;
  tianbashen?: Record<number | string, string>;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as JiuxingRequest;
    const { dunType, dibashen, tianbashen } = body || {};

    if (dunType !== "阳遁" && dunType !== "阴遁") {
      return NextResponse.json({ error: "dunType 必须为 '阳遁' 或 '阴遁'" }, { status: 400 });
    }

    if (!dibashen || Object.keys(dibashen).length === 0) {
      return NextResponse.json({ error: "dibashen 不能为空" }, { status: 400 });
    }

    if (!tianbashen || Object.keys(tianbashen).length === 0) {
      return NextResponse.json({ error: "tianbashen 不能为空" }, { status: 400 });
    }

    // 规范化地八神和天八神数据
    const normalizedDibashen: Record<number, string> = {};
    for (const [key, value] of Object.entries(dibashen)) {
      const palace = Number(key);
      if (!Number.isNaN(palace)) {
        normalizedDibashen[palace] = value;
      }
    }

    const normalizedTianbashen: Record<number, string> = {};
    for (const [key, value] of Object.entries(tianbashen)) {
      const palace = Number(key);
      if (!Number.isNaN(palace)) {
        normalizedTianbashen[palace] = value;
      }
    }

    const jiuxing = buildJiuxing(dunType, normalizedDibashen, normalizedTianbashen);
    return NextResponse.json({ jiuxing });
  } catch (error) {
    console.error("[jiuxing] 错误:", error);
    return NextResponse.json({ error: "解析请求失败" }, { status: 400 });
  }
}

