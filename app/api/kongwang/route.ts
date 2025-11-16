import { NextResponse } from "next/server";

// 六十甲子顺序
const JIAZI_SEQUENCE = [
  "甲子", "乙丑", "丙寅", "丁卯", "戊辰", "己巳", "庚午", "辛未", "壬申", "癸酉",
  "甲戌", "乙亥", "丙子", "丁丑", "戊寅", "己卯", "庚辰", "辛巳", "壬午", "癸未",
  "甲申", "乙酉", "丙戌", "丁亥", "戊子", "己丑", "庚寅", "辛卯", "壬辰", "癸巳",
  "甲午", "乙未", "丙申", "丁酉", "戊戌", "己亥", "庚子", "辛丑", "壬寅", "癸卯",
  "甲辰", "乙巳", "丙午", "丁未", "戊申", "己酉", "庚戌", "辛亥", "壬子", "癸丑",
  "甲寅", "乙卯", "丙辰", "丁巳", "戊午", "己未", "庚申", "辛酉", "壬戌", "癸亥",
];

// 旬首到空亡地支的映射
const XUN_TO_KONGWANG: Record<string, string[]> = {
  甲子: ["戌", "亥"], // 甲子旬：戌亥空亡
  甲戌: ["申", "酉"], // 甲戌旬：申酉空亡
  甲申: ["午", "未"], // 甲申旬：午未空亡
  甲午: ["辰", "巳"], // 甲午旬：辰巳空亡
  甲辰: ["寅", "卯"], // 甲辰旬：寅卯空亡
  甲寅: ["子", "丑"], // 甲寅旬：子丑空亡
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
 * 根据时柱确定旬首（甲X）
 */
function getXunShou(hourPillar: string): string | null {
  // 找到时辰干支在六十甲子中的位置
  const hourPillarIndex = JIAZI_SEQUENCE.indexOf(hourPillar);
  if (hourPillarIndex === -1) {
    console.warn(`[kongwang] 未找到时辰干支 ${hourPillar}`);
    return null;
  }

  // 从当前位置向前查找，找到最近的"甲X"
  let xunStartIndex = hourPillarIndex;
  while (xunStartIndex >= 0 && JIAZI_SEQUENCE[xunStartIndex].charAt(0) !== "甲") {
    xunStartIndex -= 1;
  }

  if (xunStartIndex < 0) {
    console.warn(`[kongwang] 未找到包含 ${hourPillar} 的旬起始位置`);
    return null;
  }

  return JIAZI_SEQUENCE[xunStartIndex];
}

/**
 * 构建空亡排盘
 * 规则：根据时柱确定旬首，然后确定空亡地支，在空亡对应的宫位标注"空"
 */
function buildKongwang(hourPillar: string): Record<number, boolean> {
  // 1. 根据时柱确定旬首
  const xunShou = getXunShou(hourPillar);
  if (!xunShou) {
    console.warn(`[kongwang] 无法确定旬首，返回空结果`);
    return {};
  }

  console.log(`[kongwang] 时柱: ${hourPillar}, 旬首: ${xunShou}`);

  // 2. 根据旬首确定空亡地支
  const kongwangDizhi = XUN_TO_KONGWANG[xunShou];
  if (!kongwangDizhi || kongwangDizhi.length === 0) {
    console.warn(`[kongwang] 未找到旬首 ${xunShou} 对应的空亡地支`);
    return {};
  }

  console.log(`[kongwang] 空亡地支: ${kongwangDizhi.join("、")}`);

  // 3. 将空亡地支映射到宫位
  const kongwang: Record<number, boolean> = {};
  for (const dizhi of kongwangDizhi) {
    const palace = DIZHI_TO_PALACE[dizhi];
    if (palace) {
      kongwang[palace] = true;
      console.log(`[kongwang] 地支 ${dizhi} → 宫${palace} 空亡`);
    } else {
      console.warn(`[kongwang] 未找到地支 ${dizhi} 对应的宫位`);
    }
  }

  // 打印结果
  const kongwangPalaces = Object.keys(kongwang)
    .map((p) => `宫${p}`)
    .join("、");
  console.log(`[kongwang] 空亡宫位: ${kongwangPalaces}`);

  return kongwang;
}

interface KongwangRequest {
  hourPillar?: string;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as KongwangRequest;
    const { hourPillar } = body || {};

    if (!hourPillar) {
      return NextResponse.json({ error: "hourPillar 不能为空" }, { status: 400 });
    }

    const kongwang = buildKongwang(hourPillar);
    return NextResponse.json({ kongwang });
  } catch (error) {
    console.error("[kongwang] 错误:", error);
    return NextResponse.json({ error: "解析请求失败" }, { status: 400 });
  }
}

