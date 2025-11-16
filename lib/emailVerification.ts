import { query, transaction } from "./db";
import crypto from "crypto";

export interface EmailVerification {
  id: number;
  user_id: number;
  email: string;
  token: string;
  status: "pending" | "used" | "expired";
  expires_at: Date;
  used_at: Date | null;
  created_at: Date;
}

/**
 * 生成高熵随机 Token
 */
export function generateToken(): string {
  // 生成 64 字节的随机数据，转换为十六进制字符串（128 字符）
  return crypto.randomBytes(64).toString("hex");
}

/**
 * 创建邮箱验证记录
 */
export async function createEmailVerification(
  userId: number,
  email: string,
  expiresInHours: number = 24
): Promise<EmailVerification> {
  const token = generateToken();
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + expiresInHours);

  const result = await query(
    `INSERT INTO email_verifications (user_id, email, token, status, expires_at, created_at)
     VALUES ($1, $2, $3, 'pending', $4, NOW())
     RETURNING *`,
    [userId, email, token, expiresAt]
  );

  if (result.length === 0) {
    throw new Error("创建邮箱验证记录失败");
  }

  return result[0] as EmailVerification;
}

/**
 * 根据 token 查找验证记录
 */
export async function findVerificationByToken(
  token: string
): Promise<EmailVerification | null> {
  const result = await query(
    `SELECT * FROM email_verifications WHERE token = $1`,
    [token]
  );

  if (result.length === 0) {
    return null;
  }

  return result[0] as EmailVerification;
}

/**
 * 验证 token 是否有效
 */
export async function validateToken(token: string): Promise<{
  valid: boolean;
  verification: EmailVerification | null;
  error?: string;
}> {
  const verification = await findVerificationByToken(token);

  if (!verification) {
    return { valid: false, verification: null, error: "链接无效或已失效" };
  }

  // 检查是否已使用
  if (verification.status !== "pending" || verification.used_at) {
    return {
      valid: false,
      verification,
      error: "链接已被使用或已失效",
    };
  }

  // 检查是否过期
  const now = new Date();
  const expiresAt = new Date(verification.expires_at);
  if (now > expiresAt) {
    // 更新状态为过期
    await query(
      `UPDATE email_verifications SET status = 'expired' WHERE id = $1`,
      [verification.id]
    );
    return { valid: false, verification, error: "链接已过期" };
  }

  return { valid: true, verification };
}

/**
 * 标记验证记录为已使用
 */
export async function markVerificationAsUsed(
  verificationId: number
): Promise<void> {
  await query(
    `UPDATE email_verifications 
     SET status = 'used', used_at = NOW() 
     WHERE id = $1`,
    [verificationId]
  );
}

/**
 * 根据用户ID查找待验证的记录
 */
export async function findPendingVerificationByUserId(
  userId: number
): Promise<EmailVerification | null> {
  const result = await query(
    `SELECT * FROM email_verifications 
     WHERE user_id = $1 AND status = 'pending' 
     ORDER BY created_at DESC 
     LIMIT 1`,
    [userId]
  );

  if (result.length === 0) {
    return null;
  }

  return result[0] as EmailVerification;
}

/**
 * 使旧验证记录失效（当生成新验证记录时）
 */
export async function invalidateOldVerifications(
  userId: number
): Promise<void> {
  await query(
    `UPDATE email_verifications 
     SET status = 'expired' 
     WHERE user_id = $1 AND status = 'pending'`,
    [userId]
  );
}

