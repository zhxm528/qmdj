# 全站暗色主题方案

## 目标
- 提供适用于全站的暗色主题，确保可读性与一致的视觉语言。

## 颜色变量（建议）
### 基础
- `--color-bg`: `#0b0f14`
- `--color-surface`: `#111827`
- `--color-elevated`: `#1f2937`
- `--color-border`: `#2a3341`
- `--color-muted`: `#94a3b8`
- `--color-text`: `#e5e7eb`
- `--color-text-strong`: `#f9fafb`

### 品牌与交互
- `--color-primary`: `#f59e0b`
- `--color-primary-strong`: `#fbbf24`
- `--color-link`: `#fbbf24`
- `--color-link-hover`: `#fcd34d`
- `--color-focus`: `#f59e0b`
- `--color-danger`: `#ef4444`
- `--color-success`: `#10b981`
- `--color-warning`: `#f59e0b`

### 组件状态
- `--color-card-bg`: `#111827`
- `--color-input-bg`: `#0f172a`
- `--color-input-text`: `#e5e7eb`
- `--color-input-border`: `#2a3341`
- `--color-hover`: `rgba(255, 255, 255, 0.06)`
- `--color-active`: `rgba(255, 255, 255, 0.12)`

## 方案步骤
1. 主题策略：定义全局 CSS 变量（颜色/背景/边框/文本/交互态），支持亮色/暗色两套值。
2. 应用范围：在 `Layout` 或 `app` 根部用 `data-theme` 或 `class` 控制主题切换，影响所有页面。
3. 组件适配：先做基础元素（body、card、button、link、表单、表格、divider），再逐页修小范围冲突。
4. 切换入口：在页头用户下拉菜单增加“白天/黑夜模式”切换并持久化（localStorage + prefers-color-scheme 作为默认）。
5. 验证清单：关键页面（bazi、qimen、products、admin、terminology）逐页验收对比，确保对比度与可读性。

## 落地文件清单（建议）
- `app/globals.css`：定义亮色/暗色 CSS 变量与全局背景/文字基色。
- `components/Layout.tsx`：增加主题切换入口（用户下拉菜单）与主题状态管理。
- `components/ThemeProvider.tsx`（可选）：封装主题初始化、切换与持久化。
- `components/Header`（若拆分）：补充暗色下的导航与按钮配色。

## 页面级别适配范围
- `app/bazi/page.tsx`：八字页面
- `app/qimen/page.tsx`：奇门页面
- `app/products/knowledge_base/terminology/page.tsx`：术语页面
- `app/products/page.tsx`
- `app/account/page.tsx`
- `app/member/page.tsx`
- `app/pricing/page.tsx`
- `app/term/page.tsx`
- `app/privacy/page.tsx`
- `app/components/SidebarDrawer.tsx`
- `app/admin/**`：管理后台
