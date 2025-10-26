import Layout from "@/components/Layout";
import ProductCard from "@/components/ProductCard";

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
      id: 3,
      title: "流月/流日趋势",
      status: "Coming soon",
      features: ["时间序列分析", "趋势预测", "图表可视化"],
      icon: "📈",
    },
    {
      id: 4,
      title: "个性化报告 PDF",
      status: "Coming soon",
      features: ["专业报告生成", "PDF导出", "多语言支持"],
      icon: "📄",
    },
    {
      id: 5,
      title: "历史对比与标注",
      status: "Coming soon",
      features: ["历史记录", "对比分析", "自定义标注"],
      icon: "📝",
    },
    {
      id: 6,
      title: "API 接口",
      status: "Coming soon",
      features: ["RESTful API", "Webhook支持", "开发者友好"],
      icon: "🔌",
    },
  ];

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">产品功能</h1>
            <p className="text-lg text-gray-600">探索奇门遁甲的强大功能</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
}

