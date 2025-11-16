import { NextResponse } from "next/server";

// 时支到驿马地支的映射（根据口诀）
// 申子辰：马 → 寅
// 寅午戌：马 → 申
// 巳酉丑：马 → 亥
// 亥卯未：马 → 巳
const SHIZHI_TO_YIMA: Record<string, string> = {
  申: "寅",
  子: "寅",
  辰: "寅",
  寅: "申",
  午: "申",
  戌: "申",
  巳: "亥",
  酉: "亥",
  丑: "亥",
  亥: "巳",
  卯: "巳",
  未: "巳",
};

// 地支到宫位的映射（根据空亡对应的宫位布局）
// 布局：
// 辰巳 |  午  | 未申
// 卯   |      |  酉
// 寅丑 |  子  | 亥戌
const DIZHI_TO_PALACE: Record<string, number> = {
  辰: 4, // 巽4
  巳: 4, // 巽4
  午: 9, // 离9
  未: 2, // 坤2
  申: 2, // 坤2
  卯: 3, // 震3
  酉: 7, // 兑7
  寅: 8, // 艮8
  丑: 8, // 艮8
  子: 1, // 坎1
  亥: 6, // 乾6
  戌: 6, // 乾6
};

/**
 * 从时柱中提取地支
 * 时柱格式：如 "甲子" -> 提取 "子"
 */
function extractShizhi(hourPillar: string): string | null {
  if (!hourPillar || hourPillar.length < 2) {
    return null;
  }
  // 时柱的第二个字符是地支
  return hourPillar.charAt(1);
}

/**
 * 构建驿马排盘
 * 规则：根据时支确定驿马地支，在驿马对应的宫位标注"驿马"
 */
function buildYima(hourPillar: string): Record<number, boolean> {
  // 1. 从时柱中提取时支
  const shizhi = extractShizhi(hourPillar);
  if (!shizhi) {
    console.warn(`[yima] 无法从时柱 ${hourPillar} 中提取时支`);
    return {};
  }

  console.log(`[yima] 时柱: ${hourPillar}, 时支: ${shizhi}`);

  // 2. 根据时支确定驿马地支
  const yimaDizhi = SHIZHI_TO_YIMA[shizhi];
  if (!yimaDizhi) {
    console.warn(`[yima] 未找到时支 ${shizhi} 对应的驿马地支`);
    return {};
  }

  console.log(`[yima] 驿马地支: ${yimaDizhi}`);

  // 3. 将驿马地支映射到宫位
  const yima: Record<number, boolean> = {};
  const palace = DIZHI_TO_PALACE[yimaDizhi];
  if (palace) {
    yima[palace] = true;
    console.log(`[yima] 驿马地支 ${yimaDizhi} → 宫${palace} 驿马`);
  } else {
    console.warn(`[yima] 未找到驿马地支 ${yimaDizhi} 对应的宫位`);
  }

  // 打印结果
  const yimaPalaces = Object.keys(yima)
    .map((p) => `宫${p}`)
    .join("、");
  console.log(`[yima] 驿马宫位: ${yimaPalaces || "无"}`);

  return yima;
}

interface YimaRequest {
  hourPillar?: string;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as YimaRequest;
    const { hourPillar } = body || {};

    if (!hourPillar) {
      return NextResponse.json({ error: "hourPillar 不能为空" }, { status: 400 });
    }

    const yima = buildYima(hourPillar);
    return NextResponse.json({ yima });
  } catch (error) {
    console.error("[yima] 错误:", error);
    return NextResponse.json({ error: "解析请求失败" }, { status: 400 });
  }
}

