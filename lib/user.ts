import { query } from "./db";

export interface User {
  id: number;
  name: string;
  email: string;
  password: string;
  role: string;
  avatar?: string;
  phone?: string;
  address?: string;
  created_at: Date;
  updated_at: Date;
  openid?: string;
  status?: string;
  token?: string;
  is_email_verified: boolean;
}

/**
 * 根据邮箱查找用户
 */
export async function findUserByEmail(email: string): Promise<User | null> {
  const result = await query(
    `SELECT * FROM users WHERE email = $1`,
    [email.toLowerCase().trim()]
  );

  if (result.length === 0) {
    return null;
  }

  return result[0] as User;
}

/**
 * 根据ID查找用户
 */
export async function findUserById(userId: number): Promise<User | null> {
  const result = await query(`SELECT * FROM users WHERE id = $1`, [userId]);

  if (result.length === 0) {
    return null;
  }

  return result[0] as User;
}

/**
 * 创建用户
 */
export async function createUser(
  name: string,
  email: string,
  password: string
): Promise<User> {
  const result = await query(
    `INSERT INTO users (name, email, password, status, is_email_verified, created_at, updated_at)
     VALUES ($1, $2, $3, 'pending', FALSE, NOW(), NOW())
     RETURNING *`,
    [name, email.toLowerCase().trim(), password]
  );

  if (result.length === 0) {
    throw new Error("创建用户失败");
  }

  return result[0] as User;
}

/**
 * 标记邮箱为已验证
 */
export async function markEmailAsVerified(
  userId: number,
  email: string
): Promise<void> {
  await query(
    `UPDATE users 
     SET is_email_verified = TRUE, 
         status = 'active',
         updated_at = NOW()
     WHERE id = $1 AND email = $2`,
    [userId, email]
  );
}

/**
 * 更新用户token
 */
export async function updateUserToken(
  userId: number,
  token: string
): Promise<void> {
  await query(
    `UPDATE users SET token = $1, updated_at = NOW() WHERE id = $2`,
    [token, userId]
  );
}

