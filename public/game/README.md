# 游戏图片目录

## 目录说明

此目录用于存放游戏页面（`/app/game/page.tsx`）显示的图片文件。

## 如何上传图片

1. **将图片文件直接复制到此目录**（`public/game/`）
   - 支持的图片格式：`.jpg`, `.jpeg`, `.png`, `.gif`, `.webp` 等
   - 建议图片尺寸：200x200 像素或更大（正方形图片效果最佳）

2. **命名规范**（可选，但建议统一）
   - 方式一：按顺序命名，如 `image1.jpg`, `image2.jpg`, ..., `image9.jpg`
   - 方式二：使用有意义的名称，如 `card1.jpg`, `card2.jpg` 等

## 如何在代码中引用

在 `app/game/page.tsx` 中，通过以下方式引用图片：

```typescript
// public 目录中的文件可以通过根路径直接访问
// public/game/image1.jpg → /game/image1.jpg
imageUrl: `/game/image1.jpg`
```

## 示例

假设您上传了以下图片文件：
- `public/game/image1.jpg`
- `public/game/image2.jpg`
- ...
- `public/game/image9.jpg`

在代码中可以这样使用：

```typescript
const gridItems = Array.from({ length: 9 }, (_, index) => ({
  id: index + 1,
  imageUrl: `/game/image${index + 1}.jpg`,  // 引用 public/game/ 目录下的图片
}));
```

## 注意事项

- 图片文件大小建议控制在 500KB 以内，以保证页面加载速度
- 图片文件名区分大小写
- 修改图片后，可能需要刷新浏览器缓存才能看到更新

