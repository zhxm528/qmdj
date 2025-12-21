import Layout from "@/components/Layout";
import Link from "next/link";
import Image from "next/image";

interface MenuItem {
  title: string;
  path: string;
}

interface Panel {
  title: string;
  id: string;
  icon: string;
  status?: string;
  menus?: MenuItem[];
  banner?: string;
  features?: string[];
  path?: string;
  buttonText?: string;
  comingSoon?: boolean;
}

export default function Products() {
  const panels: Panel[] = [
    {
      title: "奇门遁甲",
      id: "qimen",
      icon: "",
      status: "黄金会员",
      features: ["用更聪明、更温柔的方式，在复杂关系里保护自己，并找到更好的出口。","以【年/月/日/时】起盘，分析趋势、机会、挑战、人际，给出更适合的行动方向。"],
      path: "/qimen",
      buttonText: "进入奇门",
      banner: "/product/qmdj_product_qimen_banner.webp",
    },
    {
      title: "生辰八字",
      id: "bazi",
      icon: "",
      status: "黄金会员",
      features: ["生辰八字是一套语言，把你的性格节奏与关系模式讲清楚，帮助做出更清醒的选择。", "推演一个人的性格倾向、运势节奏、情感与婚恋互动模式。"],
      banner: "/product/qmdj_product_bazi_banner.webp",
      comingSoon: true,
      buttonText: "即将推出",
    },
    {
      title: "紫微斗数",
      id: "ziwei",
      icon: "",
      status: "钻石会员",
      features: ["它像一张人生与关系的【导航盘】，用结构化语言帮你看清自己、看懂关系、选对节奏。", "以【出生年/月/日/时】起盘，通过星曜落宫与组合，解读人的性格、机会、成长。"],
      banner: "/product/qmdj_product_ziwei_banner.webp",
      comingSoon: true,
      buttonText: "即将推出",
    },
    {
      title: "知识库",
      id: "knowledge_base",
      icon: "",
      status: "白银会员",
      banner: "/product/qmdj_product_knowledge_banner.webp",
      menus: [
        {
          title: "名词解释",
          path: "/products/knowledge_base/terminology",
        },
      ],
    },
  ];

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50 py-12 px-4">
        <div className="max-w-7xl mx-auto">
         

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {panels.map((panel) => (
              <div
                key={panel.id}
                className="bg-white rounded-lg shadow-md p-6 border border-gray-200 hover:shadow-xl transition-shadow"
              >
                {panel.banner && (
                  <div className="mb-4 rounded-lg overflow-hidden">
                    <Image
                      src={panel.banner}
                      alt={panel.title}
                      width={400}
                      height={200}
                      className="w-full h-auto object-cover"
                    />
                  </div>
                )}
                <div className="text-4xl mb-4">{panel.icon}</div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-2xl font-semibold text-gray-900">
                    {panel.title}
                  </h3>
                  {panel.status && (
                    <span className="inline-block px-3 py-1 rounded-full text-sm font-medium bg-amber-100 text-amber-800">
                      {panel.status}
                    </span>
                  )}
                </div>
                {panel.features && panel.features.length > 0 && (
                  <ul className="space-y-2 mb-6">
                    {panel.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start text-sm text-gray-600">
                        <span className="mr-2">•</span>
                        {feature}
                      </li>
                    ))}
                  </ul>
                )}
                {panel.buttonText && (
                  panel.comingSoon ? (
                    <button
                      disabled
                      className="w-full px-4 py-2 rounded-lg border border-gray-300 text-gray-400 bg-gray-50 cursor-not-allowed transition-colors"
                    >
                      {panel.buttonText}
                    </button>
                  ) : panel.path ? (
                    <Link
                      href={panel.path}
                      className="w-full px-4 py-2 rounded-lg border border-amber-600 text-amber-600 hover:bg-amber-50 transition-colors block text-center"
                    >
                      {panel.buttonText}
                    </Link>
                  ) : null
                )}
                {panel.menus && panel.menus.length > 0 && (
                  <div className="text-gray-600">
                    <ul className="space-y-2">
                      {panel.menus.map((menu, index) => (
                        <li key={index}>
                          <Link
                            href={menu.path}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-amber-600 hover:text-amber-700 hover:underline transition-colors"
                          >
                            {menu.title}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
}

