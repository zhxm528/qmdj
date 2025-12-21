import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { query } from "@/lib/db";

// 强制标记为动态路由，避免任何缓存行为
export const dynamic = 'force-dynamic';
export const revalidate = 0; // 可选：避免任何缓存行为

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
      // 检查是否为管理员
      if (user.role === "qmdj") {
        return user.id;
      }
    }
    return null;
  } catch (error) {
    console.error("[users] 获取用户ID失败:", error);
    return null;
  }
}

interface UserQueryParams {
  name?: string;
  email?: string;
  role?: string;
  status?: string;
  isEmailVerified?: boolean;
  isPaid?: boolean;
  page?: number;
  pageSize?: number;
}

// GET 接口：查询用户列表
export async function GET(request: NextRequest) {
  try {
    // 检查管理员权限
    const currentUserId = await getCurrentUserId();
    if (!currentUserId) {
      return NextResponse.json({ error: "未授权访问" }, { status: 401 });
    }

    // 解析查询参数
    const { searchParams } = new URL(request.url);
    const params: UserQueryParams = {
      name: searchParams.get("name") || undefined,
      email: searchParams.get("email") || undefined,
      role: searchParams.get("role") || undefined,
      status: searchParams.get("status") || undefined,
      isEmailVerified:
        searchParams.get("isEmailVerified") === "true"
          ? true
          : searchParams.get("isEmailVerified") === "false"
          ? false
          : undefined,
      isPaid:
        searchParams.get("isPaid") === "true"
          ? true
          : searchParams.get("isPaid") === "false"
          ? false
          : undefined,
      page: parseInt(searchParams.get("page") || "1", 10),
      pageSize: parseInt(searchParams.get("pageSize") || "10", 10),
    };

    // 构建查询条件
    const conditions: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (params.name) {
      conditions.push(`name ILIKE $${paramIndex}`);
      values.push(`%${params.name}%`);
      paramIndex++;
    }

    if (params.email) {
      conditions.push(`email ILIKE $${paramIndex}`);
      values.push(`%${params.email}%`);
      paramIndex++;
    }

    if (params.role) {
      conditions.push(`role = $${paramIndex}`);
      values.push(params.role);
      paramIndex++;
    }

    if (params.status) {
      conditions.push(`status = $${paramIndex}`);
      values.push(params.status);
      paramIndex++;
    }

    if (params.isEmailVerified !== undefined) {
      conditions.push(`is_email_verified = $${paramIndex}`);
      values.push(params.isEmailVerified);
      paramIndex++;
    }

    if (params.isPaid !== undefined) {
      conditions.push(`is_paid = $${paramIndex}`);
      values.push(params.isPaid);
      paramIndex++;
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    // 计算总数
    const countResult = await query(
      `SELECT COUNT(*) as total FROM users ${whereClause}`,
      values
    );
    const total = parseInt(countResult[0]?.total || "0", 10);

    // 查询数据
    const offset = (params.page! - 1) * params.pageSize!;
    const limit = params.pageSize === -1 ? null : params.pageSize;

    let dataQuery = `
      SELECT 
        id, name, email, role, avatar, phone, address,
        created_at, updated_at, status, is_email_verified,
        membership_level, membership_no, is_paid, last_paid_at
      FROM users 
      ${whereClause}
      ORDER BY created_at DESC
    `;

    if (limit !== null) {
      dataQuery += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      values.push(limit, offset);
    } else {
      dataQuery += ` OFFSET $${paramIndex}`;
      values.push(offset);
    }

    const users = await query(dataQuery, values);

    return NextResponse.json({
      success: true,
      data: users,
      total,
      page: params.page,
      pageSize: params.pageSize,
    });
  } catch (error: any) {
    console.error("[users] 查询用户列表失败:", error);
    return NextResponse.json(
      { success: false, error: error.message || "查询失败" },
      { status: 500 }
    );
  }
}
