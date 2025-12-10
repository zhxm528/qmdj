import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

// GET：查询术语详情（包含相关术语）
export async function GET(
  request: NextRequest,
  { params }: { params: { term_key: string } }
) {
  try {
    const termKey = params.term_key;

    // 查询术语基本信息
    const termResult = await query(
      `SELECT 
        t.id, t.term_key, t.name, t.alias, t.pinyin, t.category_id,
        t.short_desc, t.full_desc, t.status, t.sort_order,
        t.created_at, t.updated_at,
        tc.name as category_name
       FROM term t
       LEFT JOIN term_category tc ON t.category_id = tc.id
       WHERE t.term_key = $1 AND t.status = 1
       LIMIT 1`,
      [termKey]
    );

    if (!termResult || termResult.length === 0) {
      return NextResponse.json(
        { success: false, error: "术语不存在" },
        { status: 404 }
      );
    }

    const term = termResult[0];

    // 查询相关术语
    const relationsResult = await query(
      `SELECT 
        tr.id, tr.from_term_id, tr.to_term_id, tr.relation_type,
        t.name as term_name, t.term_key
       FROM term_relation tr
       INNER JOIN term t ON tr.to_term_id = t.id
       WHERE tr.from_term_id = $1 AND t.status = 1
       ORDER BY tr.relation_type, t.name ASC`,
      [term.id]
    );

    // 按关系类型分组
    const relations = {
      related: [] as any[],
      parent: [] as any[],
      child: [] as any[],
    };

    if (relationsResult && relationsResult.length > 0) {
      relationsResult.forEach((rel: any) => {
        if (rel.relation_type === "related") {
          relations.related.push(rel);
        } else if (rel.relation_type === "parent") {
          relations.parent.push(rel);
        } else if (rel.relation_type === "child") {
          relations.child.push(rel);
        }
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        ...term,
        relations,
      },
    });
  } catch (error: any) {
    console.error("[terminology] 查询详情失败:", error);
    return NextResponse.json(
      { success: false, error: error.message || "查询失败" },
      { status: 500 }
    );
  }
}

