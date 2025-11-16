import { NextResponse } from "next/server";

/**
 * 构建寄宫排盘
 * 规则：
 * 1. 把"中5宫"的天干排入"坤2宫"，在第3行第1列（3-1）中显示
 * 2. 还需要把"中5宫"的天干同时排入"天芮星"所在宫，在第2行第1列（2-1）中显示
 */
function buildJigong(
  dipangan: Record<number, string>,
  tianpangan: Record<number, string>,
  jiuxing: Record<number, string>
): Record<number, { diGan?: string; tianGan?: string }> {
  // 1. 获取中5宫的地盘干和天盘干
  const zhong5DiGan = dipangan[5] || "";
  const zhong5TianGan = tianpangan[5] || "";

  console.log(`[jigong] 中5宫地盘干: ${zhong5DiGan}, 天盘干: ${zhong5TianGan}`);

  // 如果没有中5宫的天干，返回空
  if (!zhong5DiGan && !zhong5TianGan) {
    console.log(`[jigong] 中5宫没有天干，无需寄宫`);
    return {};
  }

  // 2. 找到天芮星所在宫位
  let tianRuiPalace: number | null = null;
  for (const [key, value] of Object.entries(jiuxing)) {
    const palace = Number(key);
    if (!Number.isNaN(palace) && value === "天芮") {
      tianRuiPalace = palace;
      break;
    }
  }

  if (tianRuiPalace === null) {
    console.warn(`[jigong] 未找到天芮星所在宫位`);
  } else {
    console.log(`[jigong] 天芮星所在宫位: 宫${tianRuiPalace}`);
  }

  // 3. 构建寄宫信息
  const jigong: Record<number, { diGan?: string; tianGan?: string }> = {};

  // 3.1 天芮星所在宫：在第2行第1列（2-1）中显示
  if (tianRuiPalace !== null && (zhong5DiGan || zhong5TianGan)) {
    jigong[tianRuiPalace] = {
      diGan: zhong5DiGan || undefined,
      tianGan: zhong5TianGan || undefined,
    };
    console.log(`[jigong] 天芮星所在宫${tianRuiPalace}寄宫: 地盘干=${zhong5DiGan || "无"}, 天盘干=${zhong5TianGan || "无"}`);
  }

  // 打印结果
  const jigongPalaces = Object.keys(jigong)
    .map((p) => `宫${p}`)
    .join("、");
  console.log(`[jigong] 寄宫宫位: ${jigongPalaces || "无"}`);

  return jigong;
}

interface JigongRequest {
  dipangan?: Record<number | string, string>;
  tianpangan?: Record<number | string, string>;
  jiuxing?: Record<number | string, string>;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as JigongRequest;
    const { dipangan, tianpangan, jiuxing } = body || {};

    if (!dipangan || Object.keys(dipangan).length === 0) {
      return NextResponse.json({ error: "dipangan 不能为空" }, { status: 400 });
    }

    if (!tianpangan || Object.keys(tianpangan).length === 0) {
      return NextResponse.json({ error: "tianpangan 不能为空" }, { status: 400 });
    }

    if (!jiuxing || Object.keys(jiuxing).length === 0) {
      return NextResponse.json({ error: "jiuxing 不能为空" }, { status: 400 });
    }

    // 规范化数据
    const normalizedDipangan: Record<number, string> = {};
    for (const [key, value] of Object.entries(dipangan)) {
      const palace = Number(key);
      if (!Number.isNaN(palace)) {
        normalizedDipangan[palace] = value;
      }
    }

    const normalizedTianpangan: Record<number, string> = {};
    for (const [key, value] of Object.entries(tianpangan)) {
      const palace = Number(key);
      if (!Number.isNaN(palace)) {
        normalizedTianpangan[palace] = value;
      }
    }

    const normalizedJiuxing: Record<number, string> = {};
    for (const [key, value] of Object.entries(jiuxing)) {
      const palace = Number(key);
      if (!Number.isNaN(palace)) {
        normalizedJiuxing[palace] = value;
      }
    }

    const jigong = buildJigong(normalizedDipangan, normalizedTianpangan, normalizedJiuxing);
    return NextResponse.json({ jigong });
  } catch (error) {
    console.error("[jigong] 错误:", error);
    return NextResponse.json({ error: "解析请求失败" }, { status: 400 });
  }
}

