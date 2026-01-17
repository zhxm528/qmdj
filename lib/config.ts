// Groq API 配置
export const groqConfig = {
  apiKey: process.env.GROQ_API_KEY || "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",
  baseURL: "https://api.groq.com/openai/v1",
  model: "llama-3.3-70b-versatile",
};

// DeepSeek API 配置
export const deepseekConfig = {
  apiKey: process.env.DEEPSEEK_API_KEY || "sk-4cfb428f4047486a8bab85b796745658",
  baseURL: process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com",
  model: "deepseek-chat",
};

const isProd = process.env.NODE_ENV === "production";

const devDbConfig = {
  host: "127.0.0.1",
  port: 5432,
  database: "qmdj",
  user: "myuser",
  password: "mypassword",
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
};

const prodDbConfig = {
  host: "45.76.154.72",
  port: 5432,
  database: "qmdj",
  user: "mz",
  password: "12qw!@QW",
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
};

// 数据库配置
export const dbConfig = isProd ? prodDbConfig : devDbConfig;

// 邮件配置
export const mailConfig = {
  from: process.env.MAIL_FROM || "noreply@cosmodeus.com",
  fromName: process.env.MAIL_FROM_NAME || "缘来",
  supportEmail: process.env.MAIL_SUPPORT_EMAIL || "support@cosmodeus.com",
  smtp: {
    host: process.env.MAIL_SMTP_HOST || "arrow.mxrouting.net",
    port: parseInt(process.env.MAIL_SMTP_PORT || "465", 10),
    secure: process.env.MAIL_SMTP_SECURE === "false" ? false : true,
    auth: {
      user: process.env.MAIL_SMTP_USER || "noreply@cosmodeus.com",
      pass: process.env.MAIL_SMTP_PASS || "suanming",
    },
  },
  baseUrl: process.env.MAIL_BASE_URL || "https://www.cosmodeus.com",
};

// 时区配置
export const timezoneConfig = {
  // IANA 时区标识符，例如：Asia/Shanghai, America/New_York, Europe/London
  timezone: process.env.TIMEZONE || "Asia/Shanghai",
  // UTC 偏移量（小时），例如：+8 表示东八区（北京时间）
  utcOffset: parseInt(process.env.UTC_OFFSET || "8", 10),
};
