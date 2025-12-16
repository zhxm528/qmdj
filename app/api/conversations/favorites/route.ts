import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { query, transaction } from "@/lib/db";

/**
 * 获取当前用户ID（从session cookie）
 */
async function getCurrentUserId(): Promise<number | null> {
  try {
    const cookieStore = await cookies();
    const session = cookieStore.get("session");
    if (!session?.value) {
      return null;
    }

    const token = session.value.trim();
    // 尝试按邮箱查询
    const userRows = await query<{ id: number }>(
      `SELECT id FROM users WHERE email = $1 LIMIT 1`,
      [token.toLowerCase()]
    );

    if (userRows && userRows.length > 0) {
      return userRows[0].id;
    }

    // 若未命中且token是数字，按ID查询
    if (/^\d+$/.test(token)) {
      const userRowsById = await query<{ id: number }>(
        `SELECT id FROM users WHERE id = $1 LIMIT 1`,
        [parseInt(token, 10)]
      );
      if (userRowsById && userRowsById.length > 0) {
        return userRowsById[0].id;
      }
    }

    return null;
  } catch (error) {
    console.error("[conversations/favorites] 获取用户ID失败:", error);
    return null;
  }
}

/**
 * GET /api/conversations/favorites
 * 获取用户收藏的对话ID列表
 */
export async function GET(request: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json(
        { error: "未登录" },
        { status: 401 }
      );
    }

    const favoriteRows = await query<{ conversation_id: number }>(
      `SELECT conversation_id 
       FROM conversation_favorites
       WHERE user_id = $1 AND deleted_at IS NULL`,
      [userId]
    );

    const favoriteIds = favoriteRows.map((row) => row.conversation_id);

    return NextResponse.json({
      success: true,
      favorite_ids: favoriteIds,
    });
  } catch (error: any) {
    console.error("[conversations/favorites] 获取收藏列表失败:", error);
    return NextResponse.json(
      {
        error: error.message || "获取收藏列表失败，请稍后重试",
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/conversations/favorites
 * 收藏对话
 */
export async function POST(request: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json(
        { error: "未登录" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { conversation_id } = body;

    if (!conversation_id) {
      return NextResponse.json(
        { error: "对话ID为必填项" },
        { status: 400 }
      );
    }

    // 验证对话是否存在且属于当前用户
    const conversationRows = await query<{ id: number }>(
      `SELECT id FROM conversations 
       WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL LIMIT 1`,
      [conversation_id, userId]
    );

    if (!conversationRows || conversationRows.length === 0) {
      return NextResponse.json(
        { error: "对话不存在或无权限访问" },
        { status: 404 }
      );
    }

    // 检查是否已经收藏
    const existingFavorite = await query<{ id: number; deleted_at: string | null }>(
      `SELECT id, deleted_at FROM conversation_favorites
       WHERE user_id = $1 AND conversation_id = $2 LIMIT 1`,
      [userId, conversation_id]
    );

    if (existingFavorite && existingFavorite.length > 0) {
      // 如果已存在但已取消收藏（deleted_at不为空），则恢复收藏
      if (existingFavorite[0].deleted_at) {
        await query(
          `UPDATE conversation_favorites
           SET deleted_at = NULL, created_at = NOW()
           WHERE user_id = $1 AND conversation_id = $2`,
          [userId, conversation_id]
        );
      }
      // 如果已存在且未取消收藏，则直接返回成功
      return NextResponse.json({
        success: true,
        message: "已收藏",
      });
    }

    // 创建新的收藏记录
    await query(
      `INSERT INTO conversation_favorites (user_id, conversation_id)
       VALUES ($1, $2)
       ON CONFLICT (user_id, conversation_id) 
       DO UPDATE SET deleted_at = NULL, created_at = NOW()`,
      [userId, conversation_id]
    );

    return NextResponse.json({
      success: true,
      message: "收藏成功",
    });
  } catch (error: any) {
    console.error("[conversations/favorites] 收藏对话失败:", error);
    return NextResponse.json(
      {
        error: error.message || "收藏对话失败，请稍后重试",
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/conversations/favorites
 * 取消收藏对话
 */
export async function DELETE(request: NextRequest) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json(
        { error: "未登录" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { conversation_id } = body;

    if (!conversation_id) {
      return NextResponse.json(
        { error: "对话ID为必填项" },
        { status: 400 }
      );
    }

    // 软删除收藏记录（设置 deleted_at）
    await query(
      `UPDATE conversation_favorites
       SET deleted_at = NOW()
       WHERE user_id = $1 AND conversation_id = $2 AND deleted_at IS NULL`,
      [userId, conversation_id]
    );

    return NextResponse.json({
      success: true,
      message: "已取消收藏",
    });
  } catch (error: any) {
    console.error("[conversations/favorites] 取消收藏失败:", error);
    return NextResponse.json(
      {
        error: error.message || "取消收藏失败，请稍后重试",
      },
      { status: 500 }
    );
  }
}
