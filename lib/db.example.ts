/**
 * 数据库连接池使用示例
 * 
 * 这个文件展示了如何在 API 路由中使用数据库连接池
 */

import { query, getClient, transaction } from "./db";

// 示例 1: 使用 query 函数执行简单查询
export async function exampleQuery() {
  try {
    const users = await query(
      "SELECT * FROM users WHERE id = $1",
      [1]
    );
    return users;
  } catch (error) {
    console.error("查询失败:", error);
    throw error;
  }
}

// 示例 2: 使用 getClient 获取客户端执行多个操作
export async function exampleGetClient() {
  const client = await getClient();
  try {
    const result1 = await client.query("SELECT * FROM table1");
    const result2 = await client.query("SELECT * FROM table2");
    return { result1: result1.rows, result2: result2.rows };
  } catch (error) {
    console.error("操作失败:", error);
    throw error;
  } finally {
    client.release(); // 重要：释放客户端回连接池
  }
}

// 示例 3: 使用事务
export async function exampleTransaction() {
  try {
    const result = await transaction(async (client) => {
      // 在事务中执行多个操作
      await client.query("INSERT INTO users (name) VALUES ($1)", ["张三"]);
      await client.query("INSERT INTO logs (action) VALUES ($1)", ["创建用户"]);
      return { success: true };
    });
    return result;
  } catch (error) {
    console.error("事务失败:", error);
    throw error;
  }
}

// 示例 4: 在 Next.js API 路由中使用
/*
// app/api/users/route.ts
import { query } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const users = await query("SELECT * FROM users");
    return NextResponse.json({ users });
  } catch (error) {
    return NextResponse.json(
      { error: "查询失败" },
      { status: 500 }
    );
  }
}
*/

