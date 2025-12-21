import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

// 强制标记为动态路由，避免任何缓存行为
export const dynamic = 'force-dynamic';
export const revalidate = 0; // 可选：避免任何缓存行为

interface TermQueryParams {
  q?: string; // 搜索关键词
  category_id?: number; // 分类ID
  sort_order?: "name" | "sort_order"; // 排序方式
  page?: number;
  pageSize?: number;
}

// GET：查询术语列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const params: TermQueryParams = {
      q: searchParams.get("q") || undefined,
      category_id: searchParams.get("category_id")
        ? parseInt(searchParams.get("category_id")!, 10)
        : undefined,
      sort_order: (searchParams.get("sort_order") as "name" | "sort_order") || "sort_order",
      page: parseInt(searchParams.get("page") || "1", 10),
      pageSize: parseInt(searchParams.get("pageSize") || "100", 10),
    };

    // 构建查询条件
    const conditions: string[] = ["t.status = 1"]; // 只查询启用的术语
    const values: any[] = [];
    let paramIndex = 1;

    // 搜索条件：支持名称、别名、拼音
    if (params.q) {
      const searchCondition = `(
        t.name ILIKE $${paramIndex} OR 
        t.alias ILIKE $${paramIndex} OR 
        t.pinyin ILIKE $${paramIndex}
      )`;
      conditions.push(searchCondition);
      values.push(`%${params.q}%`);
      paramIndex++;
    }

    // 分类筛选
    if (params.category_id) {
      conditions.push(`t.category_id = $${paramIndex}`);
      values.push(params.category_id);
      paramIndex++;
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    // 排序
    let orderClause = "ORDER BY ";
    if (params.sort_order === "name") {
      orderClause += "t.name ASC";
    } else {
      orderClause += "t.sort_order ASC, t.name ASC";
    }

    // 查询数据（包含分类名称）
    const dataQuery = `
      SELECT 
        t.id, t.term_key, t.name, t.alias, t.pinyin, t.category_id,
        t.short_desc, t.full_desc, t.status, t.sort_order,
        t.created_at, t.updated_at,
        tc.name as category_name
      FROM term t
      LEFT JOIN term_category tc ON t.category_id = tc.id
      ${whereClause}
      ${orderClause}
    `;

    const terms = await query(dataQuery, values);

    return NextResponse.json({
      success: true,
      data: terms,
      total: terms.length,
    });
  } catch (error: any) {
    console.error("[terminology] 查询失败:", error);
    return NextResponse.json(
      { success: false, error: error.message || "查询失败" },
      { status: 500 }
    );
  }
}
