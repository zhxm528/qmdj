import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

// GET：查询分类列表
export async function GET(request: NextRequest) {
  try {
    const categories = await query(
      `SELECT id, name, code, description, sort_order, created_at, updated_at
       FROM term_category
       ORDER BY sort_order ASC, name ASC`
    );

    return NextResponse.json({
      success: true,
      data: categories || [],
    });
  } catch (error: any) {
    console.error("[terminology/categories] 查询失败:", error);
    return NextResponse.json(
      { success: false, error: error.message || "查询失败" },
      { status: 500 }
    );
  }
}

