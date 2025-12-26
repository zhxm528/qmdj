import { NextRequest, NextResponse } from "next/server";

/**
 * 天干地支关系规则表API
 * 返回五合、六合、三合、三会、冲、刑、害、破、干克、干合规则表
 */

interface GanheResponse {
  success: boolean;
  data?: {
    gan_he: Record<string, { with: string; transform: string }>; // 五合（天干五合）
    zhi_liuhe: Record<string, string>; // 六合（地支六合）
    zhi_sanhe: Record<string, string>; // 三合（地支三合局）
    zhi_sanhui: Record<string, string>; // 三会（地支三会局）
    zhi_chong: Record<string, string>; // 冲（地支六冲）
    zhi_xing: {
      groups: string[][]; // 三刑组
      zixing: string[]; // 自刑
    }; // 刑（地支刑）
    zhi_hai: Record<string, string>; // 害（地支六害）
    zhi_po: Record<string, string>; // 破（地支六破）
    gan_ke: {
      gan_wuxing: Record<string, string>; // 天干五行映射
      wuxing_ke: Record<string, string>; // 五行相克规则
    }; // 干克（天干相克）
  };
  error?: string;
}

// 五合（天干五合）
const GAN_HE: Record<string, { with: string; transform: string }> = {
  甲: { with: "己", transform: "土" },
  己: { with: "甲", transform: "土" },
  乙: { with: "庚", transform: "金" },
  庚: { with: "乙", transform: "金" },
  丙: { with: "辛", transform: "水" },
  辛: { with: "丙", transform: "水" },
  丁: { with: "壬", transform: "木" },
  壬: { with: "丁", transform: "木" },
  戊: { with: "癸", transform: "火" },
  癸: { with: "戊", transform: "火" },
};

// 六合（地支六合）
const ZHI_LIUHE: Record<string, string> = {
  子: "丑",
  丑: "子",
  寅: "亥",
  亥: "寅",
  卯: "戌",
  戌: "卯",
  辰: "酉",
  酉: "辰",
  巳: "申",
  申: "巳",
  午: "未",
  未: "午",
};

// 三合（地支三合局）
const ZHI_SANHE: Record<string, string> = {
  申子辰: "水",
  子辰申: "水",
  辰申子: "水",
  寅午戌: "火",
  午戌寅: "火",
  戌寅午: "火",
  亥卯未: "木",
  卯未亥: "木",
  未亥卯: "木",
  巳酉丑: "金",
  酉丑巳: "金",
  丑巳酉: "金",
};

// 三会（地支三会局）
const ZHI_SANHUI: Record<string, string> = {
  亥子丑: "水",
  子丑亥: "水",
  丑亥子: "水",
  寅卯辰: "木",
  卯辰寅: "木",
  辰寅卯: "木",
  巳午未: "火",
  午未巳: "火",
  未巳午: "火",
  申酉戌: "金",
  酉戌申: "金",
  戌申酉: "金",
};

// 冲（地支六冲）
const ZHI_CHONG: Record<string, string> = {
  子: "午",
  午: "子",
  丑: "未",
  未: "丑",
  寅: "申",
  申: "寅",
  卯: "酉",
  酉: "卯",
  辰: "戌",
  戌: "辰",
  巳: "亥",
  亥: "巳",
};

// 刑（地支刑）
const ZHI_XING_GROUPS: string[][] = [
  ["寅", "巳", "申"], // 三刑（无恩之刑）
  ["丑", "未", "戌"], // 三刑（持势之刑）
  ["子", "卯"], // 相刑（无礼之刑）
];
const ZHI_ZIXING: string[] = ["辰", "午", "酉", "亥"]; // 自刑

// 害（地支六害）
const ZHI_HAI: Record<string, string> = {
  子: "未",
  未: "子",
  丑: "午",
  午: "丑",
  寅: "巳",
  巳: "寅",
  卯: "辰",
  辰: "卯",
  申: "亥",
  亥: "申",
  酉: "戌",
  戌: "酉",
};

// 破（地支六破）
const ZHI_PO: Record<string, string> = {
  子: "酉",
  酉: "子",
  卯: "午",
  午: "卯",
  辰: "丑",
  丑: "辰",
  未: "戌",
  戌: "未",
  寅: "亥",
  亥: "寅",
  巳: "申",
  申: "巳",
};

// 干克（天干相克）
const GAN_WUXING: Record<string, string> = {
  甲: "木",
  乙: "木",
  丙: "火",
  丁: "火",
  戊: "土",
  己: "土",
  庚: "金",
  辛: "金",
  壬: "水",
  癸: "水",
};

const WUXING_KE: Record<string, string> = {
  木: "土",
  土: "水",
  水: "火",
  火: "金",
  金: "木",
};

export async function GET(): Promise<NextResponse<GanheResponse>> {
  try {
    return NextResponse.json({
      success: true,
      data: {
        gan_he: GAN_HE,
        zhi_liuhe: ZHI_LIUHE,
        zhi_sanhe: ZHI_SANHE,
        zhi_sanhui: ZHI_SANHUI,
        zhi_chong: ZHI_CHONG,
        zhi_xing: {
          groups: ZHI_XING_GROUPS,
          zixing: ZHI_ZIXING,
        },
        zhi_hai: ZHI_HAI,
        zhi_po: ZHI_PO,
        gan_ke: {
          gan_wuxing: GAN_WUXING,
          wuxing_ke: WUXING_KE,
        },
      },
    });
  } catch (error: any) {
    console.error("天干地支关系规则表API错误:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "获取规则表失败",
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest): Promise<NextResponse<GanheResponse>> {
  // POST请求也返回完整规则表
  return GET();
}

