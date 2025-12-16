# 日期时间的处理规则

## 概述

本文档描述了系统中日期时间字段的处理规则，包括后端查询和前端显示的实现方式。

## 后端处理

### 规则

确保 `created_at` 不做任何转换，直接返回数据库的原始 UTC 时间。

### 实现方式

查询数据库时，对于日期时间字段，使用 `AT TIME ZONE 'UTC'` 确保返回 UTC 时间，不受数据库时区设置影响。

**示例 SQL：**

```sql
SELECT
  created_at AT TIME ZONE 'UTC' AS created_at
FROM consumption_transaction
ORDER BY created_at DESC
```

### 实现目标

- 返回的是 UTC 时间（数据库存储的原始 UTC 值）
- 不受数据库会话时区设置影响
- 前端可以按配置的时区进行转换显示

### 技术说明

`AT TIME ZONE 'UTC'` 将 `TIMESTAMPTZ` 转换为 UTC 时区的 `TIMESTAMP`，确保返回的是 UTC 时间字符串，前端可以按配置的时区正确显示。

## 前端处理

### 规则

创建时间按照 `lib/config.ts` 中定义的时区显示。

### 实现方式

#### 1. 时区配置 API

创建了时区处理的 API 端点：`app/api/config/timezone/route.ts`

- 返回时区配置信息
- 包含 `timezone`（IANA 时区标识符）和 `utcOffset`（UTC 偏移量，单位：小时）

#### 2. 客户端组件更新

更新了客户端组件，主要改动：

- 添加状态存储时区配置
- 在 `useEffect` 中加载时区配置
- 修改创建时间列的 `render` 函数，使用配置的时区偏移量显示时间

**示例代码：**

```typescript
// 加载时区配置
const loadTimezoneConfig = async () => {
  const res = await fetch("/api/config/timezone");
  const data = await res.json();
  if (data.success) {
    setTimezoneConfig({
      timezone: data.timezone,
      utcOffset: data.utcOffset,
    });
  }
};

// 时间显示
render: (value: string) => {
  if (!value) return "-";
  if (!timezoneConfig) {
    return dayjs.utc(value).format("YYYY-MM-DD HH:mm:ss") + " (UTC)";
  }
  const utcTime = dayjs.utc(value);
  const localTime = utcTime.add(timezoneConfig.utcOffset, "hour");
  return localTime.format("YYYY-MM-DD HH:mm:ss");
}
```

### 实现目标

- 日期时间字段会按照 `lib/config.ts` 中的 `timezoneConfig`（默认 `Asia/Shanghai`，UTC+8）显示
- 不依赖浏览器的本地时区
- 如果时区配置还未加载，会先显示 UTC 时间并标注 "(UTC)"

### 技术说明

- 使用 `dayjs.utc(value)` 解析 UTC 时间字符串
- 使用 `add(timezoneConfig.utcOffset, "hour")` 添加时区偏移量
- 使用 `useMemo` 确保时区配置更新时表格列重新渲染

## 配置文件

时区配置定义在 `lib/config.ts`：

```typescript
export const timezoneConfig = {
  timezone: process.env.TIMEZONE || "Asia/Shanghai",
  utcOffset: parseInt(process.env.UTC_OFFSET || "8", 10),
};
```

## 相关文件

- 后端 API：`app/api/admin/member/member_account/route.ts`
- 前端页面：`app/admin/member/member_account/page.tsx`
- 时区配置 API：`app/api/config/timezone/route.ts`
- 配置文件：`lib/config.ts`
- 字段：`更新时间`
