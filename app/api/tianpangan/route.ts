import { NextResponse } from "next/server";

const GAN_SEQUENCE = ["戊", "己", "庚", "辛", "壬", "癸", "丁", "丙", "乙"] as const;
const PATH: Record<"阳遁" | "阴遁", number[]> = {
  阳遁: [4, 9, 2, 7, 6, 1, 8, 3],
  阴遁: [4, 3, 8, 1, 6, 7, 2, 9],
};

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

function mapHourGanToDipangan(hourGan: string): string {
  if (GAN_SEQUENCE.includes(hourGan as (typeof GAN_SEQUENCE)[number])) {
    return hourGan;
  }
  if (hourGan === "甲") return "戊";
  if (hourGan === "乙") return "丙";
  return "戊";
}

function rotateSequence(startGan: string): string[] {
  const idx = GAN_SEQUENCE.indexOf(startGan as (typeof GAN_SEQUENCE)[number]);
  if (idx === -1) {
    return [...GAN_SEQUENCE];
  }
  return [...GAN_SEQUENCE.slice(idx), ...GAN_SEQUENCE.slice(0, idx)];
}

function buildTianpangan(
  dunType: "阳遁" | "阴遁",
  hourPillar: string,
  dipangan: Record<number, string>
): Record<number, string> {
  const path = PATH[dunType];
  const hourGan = hourPillar.charAt(0);
  const mappedHourGan = mapHourGanToDipangan(hourGan);
  const xunShou = HOUR_PILLAR_TO_XUN[hourPillar] || "戊";
  
  console.log(`[tianpangan] 时柱: ${hourPillar}`);
  console.log(`[tianpangan] 旬首: ${xunShou}`);

  // 按照外围八宫顺序，先记住每个宫对应的地盘干，在后台依次打印出地盘干
  const rawDipanganOrder = path.map((palace) => dipangan[palace] || "");
  const dipanganOrderText = path.map((palace, idx) => {
    const gan = dipangan[palace] || "";
    return gan ? `宫${palace}:${gan}` : "";
  }).filter(Boolean).join(" → ");
  console.log(`[tianpangan] 外围八宫顺序的地盘干 (${dunType}): ${dipanganOrderText}`);
  
  // 以旬首找到所在地盘干的位置，从这个位置开始把地盘干依次填满剩余天盘干
  const loopStartIndex = rawDipanganOrder.indexOf(xunShou);
  const rotatedDipangan = loopStartIndex === -1
    ? rawDipanganOrder
    : [...rawDipanganOrder.slice(loopStartIndex), ...rawDipanganOrder.slice(0, loopStartIndex)];
  console.log(`[tianpangan] 从旬首${xunShou}开始的地盘干循环:`, rotatedDipangan.join(" → "));

  const fallbackSequence = rotateSequence(xunShou);
  const sequence = rotatedDipangan.map((gan, idx) => {
    const candidate = gan || fallbackSequence[idx];
    return candidate || GAN_SEQUENCE[idx % GAN_SEQUENCE.length];
  });

  // 通过时柱查旬首，把旬首落到与时干对应地盘干的宫，这个宫位上作为天盘干的起始点
  // 如果遇到时干是"甲"的情况，旬首对应地盘干的宫作为天盘干的起始点
  const hourGanText = hourPillar.charAt(0);
  console.log(`[tianpangan] 时干: ${hourGanText}`);
  console.log(`[tianpangan] 时干映射到地盘干: ${mappedHourGan}`);
  
  let startPalace = path[0];
  if (hourGanText === "甲") {
    // 如果时干是"甲"，使用旬首对应地盘干的宫作为起始点
    for (const [key, value] of Object.entries(dipangan)) {
      const palace = Number(key);
      if (!Number.isNaN(palace) && value === xunShou) {
        startPalace = palace;
        break;
      }
    }
    console.log(`[tianpangan] 时干为"甲"，旬首${xunShou}对应地盘干的宫位: 宫${startPalace}`);
  } else {
    // 否则，使用时干对应地盘干的宫作为起始点
    for (const [key, value] of Object.entries(dipangan)) {
      const palace = Number(key);
      if (!Number.isNaN(palace) && value === mappedHourGan) {
        startPalace = palace;
        break;
      }
    }
    console.log(`[tianpangan] 时干对应地盘干的宫位: 宫${startPalace}`);
  }

  // 规则：天盘十干不允许停在中五宫，如果起点在中宫5，则采用「出中入坤」规则移到坤二宫2
  if (startPalace === 5) {
    startPalace = 2;
    console.log(`[tianpangan] 起点天干在中宫5，采用「出中入坤」规则，移到坤二宫2`);
  }
  
  console.log(`[tianpangan] 天盘干起始点: 宫${startPalace}（旬首${xunShou}落在此宫）`);

  // 找到起点宫位在path中的索引位置（path只包含外围八宫，不包含中宫5）
  let startIndex = path.indexOf(startPalace);
  if (startIndex === -1) {
    // 如果startPalace不在path中（边缘情况），默认使用坤二宫2作为起点
    startIndex = path.indexOf(2);
    if (startIndex === -1) {
      // 如果连2都不在path中（理论上不应该发生），使用第一个宫位
      startIndex = 0;
    }
  }

  const placement: Record<number, string> = {};
  for (let i = 0; i < sequence.length; i += 1) {
    const palace = path[(startIndex + i) % path.length];
    placement[palace] = sequence[i];
  }

  // 规则：检查最终结果，如果有天干被放在中宫5，将其移到坤二宫2
  // 注意：由于path不包含5，正常情况下不会分配到5，但为了安全起见，还是检查一下
  if (placement[5]) {
    // 如果坤二宫2已经有天干，需要合并或覆盖（根据规则，应该是覆盖）
    console.log(`[tianpangan] 检测到天干 ${placement[5]} 在中宫5，采用「出中入坤」规则，移到坤二宫2`);
    placement[2] = placement[5];
    delete placement[5];
  }

  // 打印排盘顺序
  const placementOrder = path.map((palace) => {
    const gan = placement[palace];
    return gan ? `宫${palace}:${gan}` : "";
  }).filter(Boolean).join(" → ");
  console.log(`[tianpangan] 排盘顺序 (${dunType}): ${placementOrder}`);

  return placement;
}

interface TianpanganRequest {
  dunType?: string;
  hourPillar?: string;
  dipangan?: Record<number | string, string>;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as TianpanganRequest;
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

    const normalizedDipangan: Record<number, string> = {};
    for (const [key, value] of Object.entries(dipangan)) {
      const palace = Number(key);
      if (!Number.isNaN(palace)) {
        normalizedDipangan[palace] = value;
      }
    }

    const tianpangan = buildTianpangan(dunType, hourPillar, normalizedDipangan);
    return NextResponse.json({ tianpangan });
  } catch (error) {
    return NextResponse.json({ error: "解析请求失败" }, { status: 400 });
  }
}
