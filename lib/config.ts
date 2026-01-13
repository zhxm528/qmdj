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

// 数据库配置
export const dbConfig = {
  host: process.env.DB_HOST || "45.76.154.72",
  port: parseInt(process.env.DB_PORT || "5432", 10),
  database: process.env.DB_NAME || "qmdj",
  user: process.env.DB_USER || "mz",
  password: process.env.DB_PASSWORD || "12qw!@QW",
  // 连接池配置
  max: parseInt(process.env.DB_POOL_MAX || "20", 10), // 最大连接数
  idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || "30000", 10), // 空闲连接超时时间（毫秒）
  connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || "10000", 10), // 连接超时时间（毫秒）
};

// 邮件配置
export const mailConfig = {
  from: process.env.MAIL_FROM || "noreply@cosmodeus.com",
  fromName: process.env.MAIL_FROM_NAME || "缘来运势",
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