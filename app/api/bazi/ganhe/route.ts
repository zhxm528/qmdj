import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

/**
 * 天干地支关系规则表API
 * 返回五合、六合、三合、三会、冲、刑、害、破、干克、干合规则表
 * 数据从数据库表 bazi_relation_rule 和 bazi_relation_entry 读取
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

/**
 * 从数据库获取关系规则数据
 */
async function getRelationRulesFromDB() {
  // 查询所有规则条目，关联规则定义表
  const sql = `
    SELECT 
      r.rule_code,
      r.name_cn,
      r.domain,
      r.is_symmetric,
      e.participants,
      e.output_wuxing,
      e.meta
    FROM public.bazi_relation_entry e
    INNER JOIN public.bazi_relation_rule r ON e.rule_id = r.rule_id
    ORDER BY r.rule_code, e.entry_id
  `;

  console.log("[干合规则表] 查询SQL:", sql);

  const rows = await query<{
    rule_code: string;
    name_cn: string;
    domain: string;
    is_symmetric: boolean;
    participants: string[];
    output_wuxing: string | null;
    meta: any;
  }>(sql);

  console.log("[干合规则表] 数据库查询结果行数:", rows.length);
  console.log("[干合规则表] 数据库查询原始结果:", JSON.stringify(rows, null, 2));

  return rows;
}

/**
 * 从数据库获取天干五行映射（用于干克）
 */
async function getGanWuxingFromDB(): Promise<Record<string, string>> {
  const sql = `
    SELECT 
      stem,
      wu_xing
    FROM public.dict_heavenly_stem
    ORDER BY display_order
  `;

  console.log("[干合规则表] 查询天干五行SQL:", sql);

  const rows = await query<{
    stem: string;
    wu_xing: string;
  }>(sql);

  console.log("[干合规则表] 天干五行查询结果:", JSON.stringify(rows, null, 2));

  const mapping: Record<string, string> = {};
  rows.forEach((row) => {
    mapping[row.stem] = row.wu_xing;
  });

  return mapping;
}

/**
 * 生成所有排列组合（用于三合、三会等）
 */
function generatePermutations(arr: string[]): string[] {
  if (arr.length === 0) return [];
  if (arr.length === 1) return [arr[0]];
  if (arr.length === 2) return [arr.join(""), arr.reverse().join("")];
  if (arr.length === 3) {
    // 三元素的所有排列
    const [a, b, c] = arr;
    return [
      a + b + c,
      a + c + b,
      b + a + c,
      b + c + a,
      c + a + b,
      c + b + a,
    ];
  }
  return [];
}

/**
 * 构建关系规则数据
 */
async function buildGanheData() {
  const rules = await getRelationRulesFromDB();
  const ganWuxing = await getGanWuxingFromDB();

  // 初始化结果对象
  const result: GanheResponse["data"] = {
    gan_he: {},
    zhi_liuhe: {},
    zhi_sanhe: {},
    zhi_sanhui: {},
    zhi_chong: {},
    zhi_xing: {
      groups: [],
      zixing: [],
    },
    zhi_hai: {},
    zhi_po: {},
    gan_ke: {
      gan_wuxing: ganWuxing,
      wuxing_ke: {
        木: "土",
        土: "水",
        水: "火",
        火: "金",
        金: "木",
      },
    },
  };

  // 处理每个规则条目
  rules.forEach((rule) => {
    const { rule_code, participants, output_wuxing, meta } = rule;

    switch (rule_code) {
      case "GAN_HE":
      case "GAN_WUHE": {
        // 干合/五合：双向映射
        if (participants.length === 2) {
          const [a, b] = participants;
          const transform = output_wuxing || "";
          result.gan_he[a] = { with: b, transform };
          result.gan_he[b] = { with: a, transform };
        }
        break;
      }

      case "ZHI_LIUHE": {
        // 六合：双向映射
        if (participants.length === 2) {
          const [a, b] = participants;
          result.zhi_liuhe[a] = b;
          result.zhi_liuhe[b] = a;
        }
        break;
      }

      case "ZHI_SANHE": {
        // 三合：生成所有排列组合
        if (participants.length === 3 && output_wuxing) {
          const permutations = generatePermutations(participants);
          permutations.forEach((key) => {
            result.zhi_sanhe[key] = output_wuxing;
          });
        }
        break;
      }

      case "ZHI_SANHUI": {
        // 三会：生成所有排列组合
        if (participants.length === 3 && output_wuxing) {
          const permutations = generatePermutations(participants);
          permutations.forEach((key) => {
            result.zhi_sanhui[key] = output_wuxing;
          });
        }
        break;
      }

      case "ZHI_CHONG": {
        // 冲：双向映射
        if (participants.length === 2) {
          const [a, b] = participants;
          result.zhi_chong[a] = b;
          result.zhi_chong[b] = a;
        }
        break;
      }

      case "ZHI_XING": {
        // 刑：根据meta.kind区分三刑组和自刑
        const kind = meta?.kind;
        if (kind === "自刑" && participants.length === 1) {
          result.zhi_xing.zixing.push(participants[0]);
        } else if (kind === "三刑" || kind === "相刑") {
          result.zhi_xing.groups.push([...participants]);
        }
        break;
      }

      case "ZHI_HAI": {
        // 害：双向映射
        if (participants.length === 2) {
          const [a, b] = participants;
          result.zhi_hai[a] = b;
          result.zhi_hai[b] = a;
        }
        break;
      }

      case "ZHI_PO": {
        // 破：双向映射
        if (participants.length === 2) {
          const [a, b] = participants;
          result.zhi_po[a] = b;
          result.zhi_po[b] = a;
        }
        break;
      }

      case "GAN_KE": {
        // 干克：已经在gan_ke中通过gan_wuxing和wuxing_ke构建，这里不需要额外处理
        // 因为前端可以通过gan_wuxing和wuxing_ke推导出干克关系
        break;
      }
    }
  });

  console.log("[干合规则表] 构建后的结果数据:", JSON.stringify(result, null, 2));

  return result;
}

export async function GET(): Promise<NextResponse<GanheResponse>> {
  try {
    console.log("[干合规则表API] GET请求开始");
    const data = await buildGanheData();

    const response = {
      success: true,
      data,
    };

    console.log("[干合规则表API] 最终返回响应:", JSON.stringify(response, null, 2));

    return NextResponse.json(response);
  } catch (error: any) {
    console.error("[干合规则表API] GET错误:", error);
    console.error("[干合规则表API] 错误堆栈:", error.stack);
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
