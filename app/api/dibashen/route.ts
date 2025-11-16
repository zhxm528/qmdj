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

// 八神固定顺序
const SHEN_SEQUENCE = ["值符", "腾蛇", "太阴", "六合", "白虎", "玄武", "九地", "九天"] as const;

function buildDibashen(
  dunType: "阳遁" | "阴遁",
  hourPillar: string,
  dipangan: Record<number, string>
): Record<number, string> {
  const path = PATH[dunType];
  
  // 1. 找到时柱对应的旬首
  const xunShou = HOUR_PILLAR_TO_XUN[hourPillar] || "戊";
  console.log(`[dibashen] 旬首: ${xunShou}`);

  // 2. 在地盘干中找到旬首对应的宫位，这个宫位就是值符的起点
  let zhiFuPalace: number | null = null;
  for (const [key, value] of Object.entries(dipangan)) {
    const palace = Number(key);
    if (!Number.isNaN(palace) && value === xunShou) {
      zhiFuPalace = palace;
      break;
    }
  }

  // 如果找不到旬首对应的宫位，使用默认值
  if (zhiFuPalace === null) {
    console.warn(`[dibashen] 未找到旬首 ${xunShou} 对应的宫位，使用默认值`);
    zhiFuPalace = path[0];
  }

  // 规则：如果值符在中宫5，则移到坤二宫2（类似天盘干的规则）
  if (zhiFuPalace === 5) {
    zhiFuPalace = 2;
    console.log(`[dibashen] 值符在中宫5，采用「出中入坤」规则，移到坤二宫2`);
  }

  console.log(`[dibashen] 值符所在宫位: 宫${zhiFuPalace}`);

  // 3. 找到值符所在宫位在path中的索引位置
  let startIndex = path.indexOf(zhiFuPalace);
  if (startIndex === -1) {
    // 如果值符宫位不在path中（边缘情况），默认使用第一个宫位
    console.warn(`[dibashen] 值符宫位 ${zhiFuPalace} 不在path中，使用第一个宫位`);
    startIndex = 0;
  }

  // 4. 从值符所在的宫开始，按照八神顺序依次排列
  // 阳遁顺行、阴遁逆行，只排外圈八宫
  const placement: Record<number, string> = {};
  for (let i = 0; i < SHEN_SEQUENCE.length; i += 1) {
    const palace = path[(startIndex + i) % path.length];
    placement[palace] = SHEN_SEQUENCE[i];
  }

  // 打印排布结果
  const placementOrder = path.map((palace) => {
    const shen = placement[palace];
    return shen ? `宫${palace}:${shen}` : "";
  }).filter(Boolean).join(" → ");
  console.log(`[dibashen] 地八神排布 (${dunType}): ${placementOrder}`);

  return placement;
}

interface DibashenRequest {
  dunType?: string;
  hourPillar?: string;
  dipangan?: Record<number | string, string>;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as DibashenRequest;
    const { dunType, hourPillar, dipangan } = body || {};

    if (dunType !== "阳遁" && dunType !== "阴遁") {
      return NextResponse.json({ error: "dunType 必须为 '阳遁' 或 '阴遁'" }, { status: 400 });
    }

    if (!hourPillar || !HOUR_PILLAR_TO_XUN[hourPillar]) {
      return NextResponse.json({ error: "hourPillar 无法匹配旬首" }, { status: 400 });
    }

    if (!dipangan || Object.keys(dipangan).length === 0) {
      return NextResponse.json({ error: "dipangan 不能为空" }, { status: 400 });
    }

    // 规范化地盘干数据
    const normalizedDipangan: Record<number, string> = {};
    for (const [key, value] of Object.entries(dipangan)) {
      const palace = Number(key);
      if (!Number.isNaN(palace)) {
        normalizedDipangan[palace] = value;
      }
    }

    const dibashen = buildDibashen(dunType, hourPillar, normalizedDipangan);
    return NextResponse.json({ dibashen });
  } catch (error) {
    console.error("[dibashen] 错误:", error);
    return NextResponse.json({ error: "解析请求失败" }, { status: 400 });
  }
}

