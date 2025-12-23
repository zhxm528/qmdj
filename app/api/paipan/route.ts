import { NextRequest, NextResponse } from "next/server";

const DISPLAY_ORDER = [4, 9, 2, 3, 5, 7, 8, 1, 6];

interface PaipanRequest {
  date?: string;
  hour?: string;
  minute?: string;
  dateInfo?: {
    gregorian?: string;
    lunar?: string;
    season?: string;
    startShijie?: string;
    endShijie?: string;
    fourPillars?: {
      year: string;
      month: string;
      day: string;
      hour: string;
    };
    dunType?: "阳遁" | "阴遁";
    ju?: number;
  };
}

interface PaipanResponse {
  success: boolean;
  grid?: any[];
  dipangan?: Record<number, string>;
  tianpangan?: Record<number, string>;
  dibashen?: Record<number, string>;
  tianbashen?: Record<number, string>;
  jiuxing?: Record<number, string>;
  bamen?: Record<number, string>;
  kongwang?: Record<number, boolean>;
  yima?: Record<number, boolean>;
  jigong?: Record<number, { diGan?: string; tianGan?: string }>;
  zhiShiDoor?: string;
  zhiFuPalace?: number | null;
  error?: string;
}

/**
 * 内部调用 API 端点
 */
async function callInternalAPI(req: NextRequest, endpoint: string, body: any): Promise<any> {
  // 使用请求的 origin 作为基础 URL
  const baseUrl = req.nextUrl.origin;
  const url = `${baseUrl}${endpoint}`;
  
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error || `调用 ${endpoint} 失败`);
    }

    return await response.json();
  } catch (error: any) {
    console.error(`调用 ${endpoint} 失败:`, error);
    throw error;
  }
}

export async function POST(req: NextRequest): Promise<NextResponse<PaipanResponse>> {
  try {
    const body = (await req.json()) as PaipanRequest;
    const { date, hour, minute, dateInfo } = body;

    if (!date || !hour || !dateInfo) {
      return NextResponse.json(
        { success: false, error: "请先选择日期和小时" },
        { status: 400 }
      );
    }

    if (!dateInfo.dunType || !dateInfo.fourPillars?.hour) {
      return NextResponse.json(
        { success: false, error: "日期信息不完整" },
        { status: 400 }
      );
    }

    // 1. 排地盘干
    const dipanganData = await callInternalAPI(req, "/api/dipangan", {
      dunType: dateInfo.dunType,
      ju: dateInfo.ju,
    });
    const dipanganMap: Record<number, string> = dipanganData.dipangan || {};

    // 2. 排天盘干
    const tianpanganData = await callInternalAPI(req, "/api/tianpangan", {
      dunType: dateInfo.dunType,
      hourPillar: dateInfo.fourPillars.hour,
      dipangan: dipanganMap,
    });
    const tianpanganMap: Record<number, string> = tianpanganData.tianpangan || {};

    // 3. 排地八神
    const dibashenData = await callInternalAPI(req, "/api/dibashen", {
      dunType: dateInfo.dunType,
      hourPillar: dateInfo.fourPillars.hour,
      dipangan: dipanganMap,
    });
    const dibashenMap: Record<number, string> = dibashenData.dibashen || {};

    // 从地八神中找到值符所在的宫位
    let zhiFuPalaceFound: number | null = null;
    for (const [key, value] of Object.entries(dibashenMap)) {
      const palace = Number(key);
      if (!Number.isNaN(palace) && value === "值符") {
        zhiFuPalaceFound = palace;
        break;
      }
    }

    // 4. 排天八神
    const tianbashenData = await callInternalAPI(req, "/api/tianbashen", {
      dunType: dateInfo.dunType,
      hourPillar: dateInfo.fourPillars.hour,
      tianpangan: tianpanganMap,
    });
    const tianbashenMap: Record<number, string> = tianbashenData.tianbashen || {};

    // 5. 排九星
    const jiuxingData = await callInternalAPI(req, "/api/jiuxing", {
      dunType: dateInfo.dunType,
      dibashen: dibashenMap,
      tianbashen: tianbashenMap,
    });
    const jiuxingMap: Record<number, string> = jiuxingData.jiuxing || {};

    // 6. 排八门
    const bamenData = await callInternalAPI(req, "/api/bamen", {
      dunType: dateInfo.dunType,
      hourPillar: dateInfo.fourPillars.hour,
      dibashen: dibashenMap,
    });
    const bamenMap: Record<number, string> = bamenData.bamen || {};
    const zhiShiDoor = bamenData.zhiShiDoor || "";

    // 7. 排空亡
    const kongwangData = await callInternalAPI(req, "/api/kongwang", {
      hourPillar: dateInfo.fourPillars.hour,
    });
    const kongwangMap: Record<number, boolean> = kongwangData.kongwang || {};

    // 8. 排驿马
    const yimaData = await callInternalAPI(req, "/api/yima", {
      hourPillar: dateInfo.fourPillars.hour,
    });
    const yimaMap: Record<number, boolean> = yimaData.yima || {};

    // 9. 排寄宫
    const jigongData = await callInternalAPI(req, "/api/jigong", {
      dipangan: dipanganMap,
      tianpangan: tianpanganMap,
      jiuxing: jiuxingMap,
    });
    const jigongMap: Record<number, { diGan?: string; tianGan?: string }> = jigongData.jigong || {};

    // 10. 构建 grid 数据
    const grid = DISPLAY_ORDER.map((palaceNo) => {
      const diGan = dipanganMap[palaceNo] || "";
      const tianGan = tianpanganMap[palaceNo] || "";
      const diShen = dibashenMap[palaceNo] || "";
      const tianShen = tianbashenMap[palaceNo] || "";
      const star = jiuxingMap[palaceNo] || "";
      const door = bamenMap[palaceNo] || "";
      const kongWang = kongwangMap[palaceNo] || false;
      const yiMa = yimaMap[palaceNo] || false;
      const jiGongInfo = jigongMap[palaceNo] || null;
      const parts: string[] = [];
      if (diGan) parts.push(`地盘干：${diGan}`);
      if (tianGan) parts.push(`天盘干：${tianGan}`);
      if (diShen) parts.push(`地八神：${diShen}`);
      if (tianShen) parts.push(`天八神：${tianShen}`);
      if (star) parts.push(`九星：${star}`);
      if (door) parts.push(`八门：${door}`);
      return {
        id: palaceNo,
        name: ``, // 宫位名称
        diGan,
        tianGan,
        diShen,
        tianShen,
        star,
        door,
        kongWang,
        yiMa,
        jiGong: jiGongInfo,
        content: parts.join(" · ") || "暂无排盘数据",
      };
    });

    return NextResponse.json({
      success: true,
      grid,
      dipangan: dipanganMap,
      tianpangan: tianpanganMap,
      dibashen: dibashenMap,
      tianbashen: tianbashenMap,
      jiuxing: jiuxingMap,
      bamen: bamenMap,
      kongwang: kongwangMap,
      yima: yimaMap,
      jigong: jigongMap,
      zhiShiDoor,
      zhiFuPalace: zhiFuPalaceFound,
    });
  } catch (error: any) {
    console.error("排盘失败:", error);
    return NextResponse.json(
      { success: false, error: error.message || "排盘失败，请重试" },
      { status: 500 }
    );
  }
}
