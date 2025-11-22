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
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "5432", 10),
  database: process.env.DB_NAME || "mydatabase",
  user: process.env.DB_USER || "myuser",
  password: process.env.DB_PASSWORD || "mypassword",
  // 连接池配置
  max: parseInt(process.env.DB_POOL_MAX || "20", 10), // 最大连接数
  idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || "30000", 10), // 空闲连接超时时间（毫秒）
  connectionTimeoutMillis: parseInt(process.env.DB_CONNECTION_TIMEOUT || "2000", 10), // 连接超时时间（毫秒）
};

// 邮件配置
export const mailConfig = {
  from: "zhxm528@126.com",
  fromName: "奇门遁甲",
  smtp: {
    host: "smtp.126.com",
    port: parseInt("465", 10),
    secure: true,
    auth: {
      user: "zhxm528@126.com",
      pass: "ATvG95L8HSDqNWxn",
    },
  },
  baseUrl: "http://localhost:3000",
};