import { Pool, PoolClient } from "pg";
import { dbConfig } from "./config";

// 创建数据库连接池
let pool: Pool | null = null;

/**
 * 获取数据库连接池实例（单例模式）
 */
export function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      host: dbConfig.host,
      port: dbConfig.port,
      database: dbConfig.database,
      user: dbConfig.user,
      password: dbConfig.password,
      max: dbConfig.max,
      idleTimeoutMillis: dbConfig.idleTimeoutMillis,
      connectionTimeoutMillis: dbConfig.connectionTimeoutMillis,
    });

    // 监听连接池错误
    pool.on("error", (err) => {
      console.error("数据库连接池错误:", err);
    });

    // 监听连接池连接事件
    pool.on("connect", () => {
      console.log("数据库连接池: 新连接已建立");
    });
  }

  return pool;
}

/**
 * 从连接池获取客户端
 */
export async function getClient(): Promise<PoolClient> {
  const pool = getPool();
  return await pool.connect();
}

/**
 * 执行查询
 */
export async function query<T = any>(
  text: string,
  params?: any[]
): Promise<T[]> {
  const pool = getPool();
  const result = await pool.query(text, params);
  return result.rows as T[];
}

/**
 * 执行事务
 */
export async function transaction<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await getClient();
  try {
    await client.query("BEGIN");
    const result = await callback(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

/**
 * 关闭连接池
 */
export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    console.log("数据库连接池已关闭");
  }
}

// 在应用关闭时清理连接池
if (typeof process !== "undefined") {
  process.on("SIGINT", async () => {
    await closePool();
    process.exit(0);
  });

  process.on("SIGTERM", async () => {
    await closePool();
    process.exit(0);
  });
}

