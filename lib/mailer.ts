import { mailConfig } from "./config";

/**
 * 生成邮箱验证链接
 */
export function generateVerificationUrl(token: string): string {
  return `${mailConfig.baseUrl}/verify-email?token=${token}`;
}

/**
 * 生成邮件HTML内容
 */
export function generateVerificationEmailHtml(
  userName: string,
  verificationUrl: string
): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>邮箱验证</title>
</head>
<body style="font-family: Arial, 'Microsoft YaHei', sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 24px;">【缘来运势】邮箱验证</h1>
  </div>
  
  <div style="background: #ffffff; padding: 40px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 10px 10px;">
    <p style="font-size: 16px; margin-bottom: 20px;">
      您好${userName ? `，${userName}` : ""}，感谢注册【缘来运势】！
    </p>
    
    <p style="font-size: 14px; color: #666; margin-bottom: 30px;">
      为了确认这是您的邮箱地址，请在 <strong>24 小时内</strong> 点击下方按钮完成验证。
    </p>
    
    <div style="text-align: center; margin: 40px 0;">
      <a href="${verificationUrl}" 
         style="display: inline-block; background: #F59E0B; color: white; text-decoration: none; padding: 15px 40px; border-radius: 5px; font-size: 16px; font-weight: bold;">
        确认邮箱
      </a>
    </div>
    
    <p style="font-size: 12px; color: #999; margin-top: 30px; word-break: break-all;">
      如果按钮无法点击，请复制以下链接到浏览器中打开：<br>
      <a href="${verificationUrl}" style="color: #F59E0B;">${verificationUrl}</a>
    </p>
    
    <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
      <p style="font-size: 12px; color: #666; margin-bottom: 10px;">
        <strong>安全提示：</strong>
      </p>
      <ul style="font-size: 12px; color: #666; margin: 0; padding-left: 20px;">
        <li>此链接将在 24 小时后失效</li>
        <li>如果这不是您本人的操作，请忽略本邮件，您的账号不会被激活</li>
      </ul>
    </div>
    
    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center;">
      <p style="font-size: 12px; color: #999; margin: 0;">
        如有任何疑问，请联系：<a href="mailto:yuanlaiyunshi@gmail.com" style="color: #F59E0B;">yuanlaiyunshi@gmail.com</a>
      </p>
      <p style="font-size: 11px; color: #ccc; margin-top: 20px;">
        © ${new Date().getFullYear()} 【缘来运势】. 保留所有权利.
      </p>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * 生成邮件纯文本内容
 */
export function generateVerificationEmailText(
  userName: string,
  verificationUrl: string
): string {
  return `
您好${userName ? `，${userName}` : ""}，感谢注册【运势】！

为了确认这是您的邮箱地址，请在 24 小时内点击以下链接完成验证：

${verificationUrl}

安全提示：
- 此链接将在 24 小时后失效
- 如果这不是您本人的操作，请忽略本邮件，您的账号不会被激活

如有任何疑问，请联系：yuanlaiyunshi@gmail.com

© ${new Date().getFullYear()} 【缘来运势】. 保留所有权利.
  `.trim();
}

/**
 * 发送验证邮件（带详细日志）
 */
export async function sendVerificationEmail(
  to: string,
  userName: string,
  token: string
): Promise<void> {
  const logPrefix = "[mailer]";
  const verificationUrl = generateVerificationUrl(token);
  const html = generateVerificationEmailHtml(userName, verificationUrl);
  const text = generateVerificationEmailText(userName, verificationUrl);

  console.log(`${logPrefix} 准备发送验证邮件 -> 收件人: ${to}`);
  const smtpConfigured =
    !!mailConfig.smtp.host &&
    !!mailConfig.smtp.auth.user &&
    typeof mailConfig.smtp.auth.pass === "string" &&
    mailConfig.smtp.auth.pass.length > 0;
  console.log(
    `${logPrefix} SMTP 配置: ${smtpConfigured ? "已配置" : "未配置（将仅打印预览）"}`
  );

  try {
    if (smtpConfigured) {
      const nodemailer = require("nodemailer");
      const transporter = nodemailer.createTransport({
        host: mailConfig.smtp.host,
        port: mailConfig.smtp.port,
        secure: mailConfig.smtp.secure,
        auth: {
          user: mailConfig.smtp.auth.user,
          pass: mailConfig.smtp.auth.pass,
        },
      });

      console.log(`${logPrefix} 发送中...`);
      const info = await transporter.sendMail({
        from: `"${mailConfig.fromName}" <${mailConfig.from}>`,
        to,
        subject: "【缘来运势】邮箱验证：点击确认，激活您的账户",
        html,
        text,
      });
      console.log(
        `${logPrefix} 发送成功 ✅ messageId=${info?.messageId || "N/A"} response=${info?.response || "N/A"}`
      );
      console.log(`${logPrefix} 验证链接: ${verificationUrl}`);
    } else {
      // 开发/未配置SMTP时打印预览
      console.log("=== 验证邮件（预览）===");
      console.log("收件人:", to);
      console.log("主题: 【缘来运势】邮箱验证：点击确认，激活您的账户");
      console.log("验证链接:", verificationUrl);
      console.log("(HTML 内容已生成，略)");
      console.log("======================");
    }
  } catch (err: any) {
    console.error(`${logPrefix} 发送失败 ❌`, err?.message || err);
    console.error(
      `${logPrefix} 上下文: to=${to}, from=${mailConfig.from}, host=${mailConfig.smtp.host}, user=${mailConfig.smtp.auth.user}`
    );
  }
}

