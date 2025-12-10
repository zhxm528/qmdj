import Layout from "@/components/Layout";
import ProductCard from "@/components/ProductCard";
import Link from "next/link";

interface MenuItem {
  title: string;
  path: string;
}

interface Panel {
  title: string;
  id: string;
  icon: string;
  menus?: MenuItem[];
}

export default function Products() {
  const products = [
    {
      id: 1,
      title: "基础排盘",
      status: "已支持",
      features: ["标准九宫格", "基础门星神", "快速查询"],
      icon: "📊",
    },
    {
      id: 2,
      title: "高级断局",
      status: "Coming soon",
      features: ["深度解析", "多种格局", "精准判断"],
      icon: "🔮",
    },
    {
      id: 4,
      title: "个性化报告 PDF",
      status: "Coming soon",
      features: ["专业报告生成", "PDF导出", "多语言支持"],
      icon: "📄",
    },
  ];

  const panels: Panel[] = [
    {
      title: "知识库",
      id: "knowledge_base",
      icon: "📖",
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
      <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white py-12 px-4">
        <div className="max-w-7xl mx-auto">
         

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>

          {panels.length > 0 && (
            <>
              

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {panels.map((panel) => (
                  <div
                    key={panel.id}
                    className="bg-white rounded-lg shadow-md p-6 border border-gray-200 hover:shadow-xl transition-shadow"
                  >
                    <div className="text-4xl mb-4">{panel.icon}</div>
                    <h3 className="text-2xl font-semibold text-gray-900 mb-4">
                      {panel.title}
                    </h3>
                    <div className="text-gray-600">
                      {panel.menus && panel.menus.length > 0 ? (
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
                      ) : (
                        <p className="text-sm">暂无菜单项</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}

