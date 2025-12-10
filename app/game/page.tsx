"use client";

import { useRouter } from "next/navigation";
import Layout from "@/components/Layout";

export default function Game() {
  const router = useRouter();

  // 创建3x3的图片数据（9个格子）
  // 图片文件应放在 public/game/ 目录下
  // 例如：public/game/image1.jpg, public/game/image2.jpg 等
  // 在代码中通过 /game/image1.jpg 路径引用（注意：public 目录是根路径）
  const gridItems = Array.from({ length: 9 }, (_, index) => ({
    id: index + 1,
    // 使用本地图片：将图片文件放在 public/game/ 目录下
    // 支持的图片格式：.jpg, .jpeg, .png, .gif, .webp 等
    // 命名建议：image1.jpg, image2.jpg, ..., image9.jpg
    imageUrl: `/game/image${index + 1}.webp`,
  }));

  // 处理图片点击事件
  const handleImageClick = (itemId: number) => {
    // 第一个图片（id为1）跳转到苹果机游戏页面
    if (itemId === 1) {
      router.push("/game/pingguoji");
    }
  };

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white py-12 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">游戏</h1>
          </div>
          
          {/* 3x3 图片展示表格 */}
          <div className="grid grid-cols-3 gap-4 max-w-2xl mx-auto">
            {gridItems.map((item) => (
              <div
                key={item.id}
                onClick={() => handleImageClick(item.id)}
                className="aspect-square bg-white rounded-lg shadow-md overflow-hidden border-2 border-gray-200 hover:border-amber-500 transition-colors cursor-pointer"
              >
                <img
                  src={item.imageUrl}
                  alt={`图片 ${item.id}`}
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
}

