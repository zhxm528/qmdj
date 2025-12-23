import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

// 强制标记为动态路由，避免任何缓存行为
export const dynamic = 'force-dynamic';
export const revalidate = 0; // 可选：避免任何缓存行为

// GET：搜索联想
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const keyword = searchParams.get("q") || "";

    if (!keyword || keyword.length < 2) {
      return NextResponse.json({
        success: true,
        data: [],
      });
    }

    // 搜索术语Key、名称、别名、拼音，限制返回10条
    const suggestions = await query(
      `SELECT 
        t.id, t.term_key, t.name, t.short_desc, t.category_id,
        tc.name as category_name
       FROM term t
       LEFT JOIN term_category tc ON t.category_id = tc.id
       WHERE t.status = 1 AND (
         t.term_key ILIKE $1 OR 
         t.name ILIKE $1 OR 
         t.alias ILIKE $1 OR 
         t.pinyin ILIKE $1
       )
       ORDER BY 
         CASE WHEN t.name ILIKE $2 THEN 1 ELSE 2 END,
         t.sort_order ASC, t.name ASC
       LIMIT 10`,
      [`%${keyword}%`, `${keyword}%`]
    );

    return NextResponse.json({
      success: true,
      data: suggestions || [],
    });
  } catch (error: any) {
    console.error("[terminology/suggest] 查询失败:", error);
    return NextResponse.json(
      { success: false, error: error.message || "查询失败" },
      { status: 500 }
    );
  }
}

