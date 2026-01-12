import { NextRequest, NextResponse } from "next/server";
import { query, transaction } from "@/lib/db";

/**
 * 十神计算API
 * 根据四柱数据计算每个天干和地支藏干相对于日主的十神
 * 数据保存到 bazi_tenshen_summary_tbl 和 bazi_tenshen_detail_tbl
 */

interface ShishenRequest {
  chart_id: string; // UUID格式的chart_id
  four_pillars: {
    year: string; // 如 "甲子"
    month: string;
    day: string;
    hour: string;
  };
}

interface ShishenResponse {
  success: boolean;
  data?: {
    summary_id: number;
    details: Array<{
      pillar: string;
      item_type: "stem" | "hidden_stem";
      target_stem: string;
      target_element: string;
      target_yinyang: string;
      tenshen: string;
      rel_to_dm: string;
      same_yinyang: boolean;
      source_branch?: string;
      hidden_role?: string;
    }>;
  };
  error?: string;
}

/**
 * 五行生克关系（固定规则）
 * 生：木→火→土→金→水→木
 * 克：木→土→水→火→金→木
 */
const WUXING_SHENG: Record<string, string> = {
  木: "火",
  火: "土",
  土: "金",
  金: "水",
  水: "木",
};

const WUXING_KE: Record<string, string> = {
  木: "土",
  土: "水",
  水: "火",
  火: "金",
  金: "木",
};

const GAN_META_FALLBACK: Record<string, { yin_yang: string; wu_xing: string }> = {
  甲: { yin_yang: "YANG", wu_xing: "木" },
  乙: { yin_yang: "YIN", wu_xing: "木" },
  丙: { yin_yang: "YANG", wu_xing: "火" },
  丁: { yin_yang: "YIN", wu_xing: "火" },
  戊: { yin_yang: "YANG", wu_xing: "土" },
  己: { yin_yang: "YIN", wu_xing: "土" },
  庚: { yin_yang: "YANG", wu_xing: "金" },
  辛: { yin_yang: "YIN", wu_xing: "金" },
  壬: { yin_yang: "YANG", wu_xing: "水" },
  癸: { yin_yang: "YIN", wu_xing: "水" },
};

/**
 * 判断五行关系
 * @param dmElement 日主五行
 * @param targetElement 目标五行
 * @returns 关系类型：'same' | 'dm_sheng_x' | 'dm_ke_x' | 'x_sheng_dm' | 'x_ke_dm'
 */
function getWuxingRelation(dmElement: string, targetElement: string): string {
  if (dmElement === targetElement) {
    return "same"; // 同我
  }
  if (WUXING_SHENG[dmElement] === targetElement) {
    return "dm_sheng_x"; // 我生
  }
  if (WUXING_KE[dmElement] === targetElement) {
    return "dm_ke_x"; // 我克
  }
  if (WUXING_SHENG[targetElement] === dmElement) {
    return "x_sheng_dm"; // 生我
  }
  if (WUXING_KE[targetElement] === dmElement) {
    return "x_ke_dm"; // 克我
  }
  // 理论上不会到这里，但为了安全返回same
  return "same";
}

/**
 * 根据五行关系和阴阳关系映射到十神
 * @param relToDm 五行关系
 * @param sameYinyang 是否同阴阳
 * @returns 十神名称
 */
function mapToTenshen(relToDm: string, sameYinyang: boolean): string {
  switch (relToDm) {
    case "same": // 同我
      return sameYinyang ? "比肩" : "劫财";
    case "dm_sheng_x": // 我生
      return sameYinyang ? "食神" : "伤官";
    case "dm_ke_x": // 我克
      return sameYinyang ? "偏财" : "正财";
    case "x_ke_dm": // 克我
      return sameYinyang ? "七杀" : "正官";
    case "x_sheng_dm": // 生我
      return sameYinyang ? "偏印" : "正印";
    default:
      return "比肩"; // 默认值
  }
}

/**
 * 从数据库获取天干五行阴阳信息
 */
async function getGanMetaFromDB(
  gans: string[]
): Promise<Record<string, { yin_yang: string; wu_xing: string }>> {
  const sql = `
    SELECT stem, yin_yang, wu_xing
    FROM public.dict_heavenly_stem
    WHERE stem = ANY($1)
    ORDER BY display_order
  `;

  const rows = await query<{
    stem: string;
    yin_yang: string;
    wu_xing: string;
  }>(sql, [gans]);

  const mapping: Record<string, { yin_yang: string; wu_xing: string }> = {};
  rows.forEach((row) => {
    mapping[row.stem] = {
      yin_yang: row.yin_yang,
      wu_xing: row.wu_xing,
    };
  });

  gans.forEach((stem) => {
    if (!mapping[stem] && GAN_META_FALLBACK[stem]) {
      mapping[stem] = GAN_META_FALLBACK[stem];
    }
  });

  return mapping;
}

/**
 * 从数据库获取地支藏干信息
 */
async function getBranchHiddenStemsFromDB(
  branches: string[]
): Promise<Record<string, Array<{ stem: string; position: number; role: string }>>> {
  const sql = `
    SELECT branch_code, stem_code, position, role
    FROM public.bazi_branch_hidden_stem_dict
    WHERE branch_code = ANY($1)
    ORDER BY branch_code, position
  `;

  const rows = await query<{
    branch_code: string;
    stem_code: string;
    position: number;
    role: string;
  }>(sql, [branches]);

  const mapping: Record<string, Array<{ stem: string; position: number; role: string }>> = {};
  rows.forEach((row) => {
    if (!mapping[row.branch_code]) {
      mapping[row.branch_code] = [];
    }
    mapping[row.branch_code].push({
      stem: row.stem_code,
      position: row.position,
      role: row.role,
    });
  });

  return mapping;
}

/**
 * 将hidden_role从中文转换为英文
 */
function convertHiddenRole(role: string): "main" | "middle" | "residual" {
  if (role === "主气") return "main";
  if (role === "中气") return "middle";
  return "residual";
}

/**
 * 计算十神并保存到数据库
 * 导出此函数供其他模块直接调用
 */
export async function calculateAndSaveShishen(
  chartId: string,
  fourPillars: ShishenRequest["four_pillars"]
): Promise<{ summary_id: number; details: any[] }> {
  return await transaction(async (client) => {
    // 1. 提取四柱天干和地支
    const yearStem = fourPillars.year.charAt(0);
    const yearBranch = fourPillars.year.charAt(1);
    const monthStem = fourPillars.month.charAt(0);
    const monthBranch = fourPillars.month.charAt(1);
    const dayStem = fourPillars.day.charAt(0);
    const dayBranch = fourPillars.day.charAt(1);
    const hourStem = fourPillars.hour.charAt(0);
    const hourBranch = fourPillars.hour.charAt(1);

    // 2. 获取所有天干的五行阴阳信息
    const allGans = [yearStem, monthStem, dayStem, hourStem];
    const ganMeta = await getGanMetaFromDB(allGans);

    // 3. 获取日主信息
    const dayMasterMeta = ganMeta[dayStem];
    if (!dayMasterMeta) {
      throw new Error(`无法获取日主 ${dayStem} 的五行阴阳信息`);
    }
    const dmElement = dayMasterMeta.wu_xing;
    const dmYinyang = dayMasterMeta.yin_yang;

    // 4. 获取所有地支的藏干信息
    const allBranches = [yearBranch, monthBranch, dayBranch, hourBranch];
    const branchHiddenStems = await getBranchHiddenStemsFromDB(allBranches);

    // 5. 获取所有藏干的五行阴阳信息
    const allHiddenStems: string[] = [];
    Object.values(branchHiddenStems).forEach((stems) => {
      stems.forEach((s) => {
        if (!allHiddenStems.includes(s.stem)) {
          allHiddenStems.push(s.stem);
        }
      });
    });
    const hiddenStemMeta = await getGanMetaFromDB(allHiddenStems);

    // 6. 创建汇总记录
    const summaryResult = await client.query(
      `INSERT INTO public.bazi_tenshen_summary_tbl 
       (chart_id, day_master_stem, dm_element, dm_yinyang, calc_version)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (chart_id, calc_version) 
       DO UPDATE SET 
         day_master_stem = EXCLUDED.day_master_stem,
         dm_element = EXCLUDED.dm_element,
         dm_yinyang = EXCLUDED.dm_yinyang
       RETURNING id`,
      [chartId, dayStem, dmElement, dmYinyang, "v1"]
    );

    const summaryId = summaryResult.rows[0].id;

    // 7. 删除旧的明细记录
    await client.query(
      `DELETE FROM public.bazi_tenshen_detail_tbl WHERE summary_id = $1`,
      [summaryId]
    );

    // 8. 计算并保存天干的十神
    const details: any[] = [];
    const pillars = [
      { pillar: "year", stem: yearStem },
      { pillar: "month", stem: monthStem },
      { pillar: "day", stem: dayStem },
      { pillar: "hour", stem: hourStem },
    ];

    for (const { pillar, stem } of pillars) {
      const meta = ganMeta[stem];
      if (!meta) continue;

      let tenshen: string;
      let relToDm: string;
      let sameYinyang: boolean;

      if (pillar === "day") {
        // 日干标记为"日主"
        tenshen = "日主";
        relToDm = "same";
        sameYinyang = true;
      } else {
        // 计算其他天干的十神
        relToDm = getWuxingRelation(dmElement, meta.wu_xing);
        sameYinyang = dmYinyang === meta.yin_yang;
        tenshen = mapToTenshen(relToDm, sameYinyang);
      }

      // 保存到数据库
      const detailResult = await client.query(
        `INSERT INTO public.bazi_tenshen_detail_tbl
         (summary_id, chart_id, pillar, item_type, target_stem, target_element, 
          target_yinyang, rel_to_dm, tenshen, same_yinyang)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING id`,
        [
          summaryId,
          chartId,
          pillar,
          "stem",
          stem,
          meta.wu_xing,
          meta.yin_yang,
          relToDm,
          tenshen,
          sameYinyang,
        ]
      );

      details.push({
        pillar,
        item_type: "stem",
        target_stem: stem,
        target_element: meta.wu_xing,
        target_yinyang: meta.yin_yang,
        tenshen,
        rel_to_dm: relToDm,
        same_yinyang: sameYinyang,
      });
    }

    // 9. 计算并保存地支藏干的十神
    const branchPillars = [
      { pillar: "year", branch: yearBranch },
      { pillar: "month", branch: monthBranch },
      { pillar: "day", branch: dayBranch },
      { pillar: "hour", branch: hourBranch },
    ];

    for (const { pillar, branch } of branchPillars) {
      const hiddenStems = branchHiddenStems[branch] || [];

      for (const { stem, position, role } of hiddenStems) {
        const meta = hiddenStemMeta[stem];
        if (!meta) continue;

        const relToDm = getWuxingRelation(dmElement, meta.wu_xing);
        const sameYinyang = dmYinyang === meta.yin_yang;
        const tenshen = mapToTenshen(relToDm, sameYinyang);
        const hiddenRole = convertHiddenRole(role);

        // 保存到数据库
        await client.query(
          `INSERT INTO public.bazi_tenshen_detail_tbl
           (summary_id, chart_id, pillar, item_type, target_stem, target_element,
            target_yinyang, source_branch, hidden_role, rel_to_dm, tenshen, same_yinyang)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
          [
            summaryId,
            chartId,
            pillar,
            "hidden_stem",
            stem,
            meta.wu_xing,
            meta.yin_yang,
            branch,
            hiddenRole,
            relToDm,
            tenshen,
            sameYinyang,
          ]
        );

        details.push({
          pillar,
          item_type: "hidden_stem",
          target_stem: stem,
          target_element: meta.wu_xing,
          target_yinyang: meta.yin_yang,
          tenshen,
          rel_to_dm: relToDm,
          same_yinyang: sameYinyang,
          source_branch: branch,
          hidden_role: hiddenRole,
        });
      }
    }

    return { summary_id: summaryId, details };
  });
}

export async function POST(req: NextRequest): Promise<NextResponse<ShishenResponse>> {
  try {
    const body = (await req.json()) as ShishenRequest;
    console.log("[shishen] input ok:", body);
    const { chart_id, four_pillars } = body;

    if (!chart_id || !four_pillars) {
      return NextResponse.json(
        {
          success: false,
          error: "缺少必要参数：chart_id 和 four_pillars",
        },
        { status: 400 }
      );
    }

    // 验证四柱格式
    const pillars = [four_pillars.year, four_pillars.month, four_pillars.day, four_pillars.hour];
    for (const pillar of pillars) {
      if (!pillar || pillar.length !== 2) {
        return NextResponse.json(
          {
            success: false,
            error: `四柱格式不正确：${pillar}，应为两个字符（天干+地支）`,
          },
          { status: 400 }
        );
      }
    }

    // 计算并保存十神
    const result = await calculateAndSaveShishen(chart_id, four_pillars);
    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error("[十神计算API] 错误:", error);
    console.error("[十神计算API] 错误堆栈:", error.stack);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "计算十神失败",
      },
      { status: 500 }
    );
  }
}

