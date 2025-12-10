import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { query } from "@/lib/db";

// 获取当前用户ID（管理员权限检查）
async function getCurrentUserId(): Promise<number | null> {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get("session");
    if (!session?.value) {
      return null;
    }

    const token = session.value.trim();
    let userRows = await query(
      `SELECT id, role FROM users WHERE email = $1 OR id = $2 LIMIT 1`,
      [token.toLowerCase(), /^\d+$/.test(token) ? parseInt(token, 10) : -1]
    );

    if (userRows && userRows.length > 0) {
      const user = userRows[0] as { id: number; role: string };
      if (user.role === "qmdj") {
        return user.id;
      }
    }
    return null;
  } catch (error) {
    console.error("[prompt_template_tags] 获取用户ID失败:", error);
    return null;
  }
}

interface QueryParams {
  page?: number;
  pageSize?: number;
}

// GET：查询模板标签关联列表
export async function GET(request: NextRequest) {
  try {
    const currentUserId = await getCurrentUserId();
    if (!currentUserId) {
      return NextResponse.json({ error: "未授权访问" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const params: QueryParams = {
      page: parseInt(searchParams.get("page") || "1", 10),
      pageSize: parseInt(searchParams.get("pageSize") || "10", 10),
    };

    const page = params.page || 1;
    const pageSize = params.pageSize || 10;

    let offset = 0;
    let limit: number | null = null;

    if (pageSize === -1) {
      limit = null;
    } else {
      offset = (page - 1) * pageSize;
      limit = pageSize;
    }

    // 计算总数
    const countResult = await query(
      `SELECT COUNT(*) as total FROM prompt_template_tags`,
      []
    );
    const total = parseInt(countResult[0]?.total || "0", 10);

    // 查询数据
    let dataQuery = `
      SELECT
        template_id,
        tag_id
      FROM prompt_template_tags
      ORDER BY template_id, tag_id
    `;

    const values: any[] = [];
    if (limit !== null) {
      dataQuery += ` LIMIT $1 OFFSET $2`;
      values.push(limit, offset);
    } else {
      dataQuery += ` OFFSET $1`;
      values.push(offset);
    }

    const templateTags = await query(dataQuery, values);

    return NextResponse.json({
      success: true,
      data: templateTags,
      total,
      page,
      pageSize: pageSize === -1 ? total : pageSize,
    });
  } catch (error: any) {
    console.error("[prompt_template_tags] 查询列表失败:", error);
    return NextResponse.json(
      { success: false, error: error.message || "查询失败" },
      { status: 500 }
    );
  }
}

// POST：新增模板标签关联
export async function POST(request: NextRequest) {
  try {
    const currentUserId = await getCurrentUserId();
    if (!currentUserId) {
      return NextResponse.json({ error: "未授权访问" }, { status: 401 });
    }

    const body = await request.json();
    const { template_id, tag_id } = body;

    // 验证必填字段
    if (!template_id) {
      return NextResponse.json(
        { success: false, error: "模板ID不能为空" },
        { status: 400 }
      );
    }

    if (!tag_id) {
      return NextResponse.json(
        { success: false, error: "标签ID不能为空" },
        { status: 400 }
      );
    }

    // 检查模板是否存在
    const templateCheck = await query(
      `SELECT id FROM prompt_templates WHERE id = $1`,
      [template_id]
    );
    if (!templateCheck || templateCheck.length === 0) {
      return NextResponse.json(
        { success: false, error: "模板不存在" },
        { status: 400 }
      );
    }

    // 检查标签是否存在
    const tagCheck = await query(
      `SELECT id FROM prompt_tags WHERE id = $1`,
      [tag_id]
    );
    if (!tagCheck || tagCheck.length === 0) {
      return NextResponse.json(
        { success: false, error: "标签不存在" },
        { status: 400 }
      );
    }

    // 检查关联是否已存在
    const existingCheck = await query(
      `SELECT template_id, tag_id FROM prompt_template_tags WHERE template_id = $1 AND tag_id = $2`,
      [template_id, tag_id]
    );
    if (existingCheck && existingCheck.length > 0) {
      return NextResponse.json(
        { success: false, error: "该关联已存在" },
        { status: 400 }
      );
    }

    // 插入数据
    const insertQuery = `
      INSERT INTO prompt_template_tags (template_id, tag_id)
      VALUES ($1, $2)
      RETURNING *
    `;

    const result = await query(insertQuery, [template_id, tag_id]);

    if (result && result.length > 0) {
      return NextResponse.json({
        success: true,
        data: result[0],
        message: "创建成功",
      });
    } else {
      return NextResponse.json(
        { success: false, error: "创建失败" },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error("[prompt_template_tags] 创建失败:", error);
    // 处理唯一约束错误
    if (error.code === "23505") {
      return NextResponse.json(
        { success: false, error: "该关联已存在" },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: error.message || "创建失败" },
      { status: 500 }
    );
  }
}

// PUT：更新模板标签关联（实际是删除旧关联，创建新关联）
export async function PUT(request: NextRequest) {
  try {
    const currentUserId = await getCurrentUserId();
    if (!currentUserId) {
      return NextResponse.json({ error: "未授权访问" }, { status: 401 });
    }

    const body = await request.json();
    const { old_template_id, old_tag_id, template_id, tag_id } = body;

    if (!old_template_id || !old_tag_id) {
      return NextResponse.json(
        { success: false, error: "原关联信息不能为空" },
        { status: 400 }
      );
    }

    if (!template_id || !tag_id) {
      return NextResponse.json(
        { success: false, error: "新关联信息不能为空" },
        { status: 400 }
      );
    }

    // 检查原关联是否存在
    const existingCheck = await query(
      `SELECT template_id, tag_id FROM prompt_template_tags WHERE template_id = $1 AND tag_id = $2`,
      [old_template_id, old_tag_id]
    );
    if (!existingCheck || existingCheck.length === 0) {
      return NextResponse.json(
        { success: false, error: "原关联不存在" },
        { status: 404 }
      );
    }

    // 如果新旧关联相同，直接返回成功
    if (old_template_id === template_id && old_tag_id === tag_id) {
      return NextResponse.json({
        success: true,
        data: { template_id, tag_id },
        message: "更新成功",
      });
    }

    // 检查新关联是否已存在
    const newExistingCheck = await query(
      `SELECT template_id, tag_id FROM prompt_template_tags WHERE template_id = $1 AND tag_id = $2`,
      [template_id, tag_id]
    );
    if (newExistingCheck && newExistingCheck.length > 0) {
      return NextResponse.json(
        { success: false, error: "新关联已存在" },
        { status: 400 }
      );
    }

    // 检查模板是否存在
    const templateCheck = await query(
      `SELECT id FROM prompt_templates WHERE id = $1`,
      [template_id]
    );
    if (!templateCheck || templateCheck.length === 0) {
      return NextResponse.json(
        { success: false, error: "模板不存在" },
        { status: 400 }
      );
    }

    // 检查标签是否存在
    const tagCheck = await query(
      `SELECT id FROM prompt_tags WHERE id = $1`,
      [tag_id]
    );
    if (!tagCheck || tagCheck.length === 0) {
      return NextResponse.json(
        { success: false, error: "标签不存在" },
        { status: 400 }
      );
    }

    // 删除旧关联，创建新关联（在事务中执行）
    const deleteQuery = `DELETE FROM prompt_template_tags WHERE template_id = $1 AND tag_id = $2`;
    await query(deleteQuery, [old_template_id, old_tag_id]);

    const insertQuery = `
      INSERT INTO prompt_template_tags (template_id, tag_id)
      VALUES ($1, $2)
      RETURNING *
    `;
    const result = await query(insertQuery, [template_id, tag_id]);

    if (result && result.length > 0) {
      return NextResponse.json({
        success: true,
        data: result[0],
        message: "更新成功",
      });
    } else {
      return NextResponse.json(
        { success: false, error: "更新失败" },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error("[prompt_template_tags] 更新失败:", error);
    if (error.code === "23505") {
      return NextResponse.json(
        { success: false, error: "新关联已存在" },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: error.message || "更新失败" },
      { status: 500 }
    );
  }
}

// DELETE：删除模板标签关联
export async function DELETE(request: NextRequest) {
  try {
    const currentUserId = await getCurrentUserId();
    if (!currentUserId) {
      return NextResponse.json({ error: "未授权访问" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const template_id = searchParams.get("template_id");
    const tag_id = searchParams.get("tag_id");

    if (!template_id || !tag_id) {
      return NextResponse.json(
        { success: false, error: "模板ID和标签ID不能为空" },
        { status: 400 }
      );
    }

    // 检查记录是否存在
    const existingCheck = await query(
      `SELECT template_id, tag_id FROM prompt_template_tags WHERE template_id = $1 AND tag_id = $2`,
      [template_id, tag_id]
    );
    if (!existingCheck || existingCheck.length === 0) {
      return NextResponse.json(
        { success: false, error: "关联不存在" },
        { status: 404 }
      );
    }

    // 删除记录
    const deleteQuery = `DELETE FROM prompt_template_tags WHERE template_id = $1 AND tag_id = $2 RETURNING *`;
    const result = await query(deleteQuery, [template_id, tag_id]);

    if (result && result.length > 0) {
      return NextResponse.json({
        success: true,
        data: result[0],
        message: "删除成功",
      });
    } else {
      return NextResponse.json(
        { success: false, error: "删除失败" },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error("[prompt_template_tags] 删除失败:", error);
    return NextResponse.json(
      { success: false, error: error.message || "删除失败" },
      { status: 500 }
    );
  }
}

