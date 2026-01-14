import Layout from "@/components/Layout";
import PricingCard from "@/components/PricingCard";
import Button from "@/components/Button";

export default function Pricing() {
  const plans = [
    {
      name: "白银会员",
      price: "9.9",
      period: "元/月",
      description: "先把心稳下来，我们陪你看清当下。",
      features: [
        "查看万年历",
        "免费体验【15天】黄金会员",
      ],
      cta: "注册并使用",
      highlight: false,
    },
    {
      name: "黄金会员",
      price: "29",
      period: "元/月 （包月）",
      description: "不只是一次解读，更是把选择变得清晰的陪伴。",
      features: [
        "查看万年历",
        "奇门遁甲在线排盘",
        "问感情",
        "问财运",
        "问健康",
        "问学业",
        "生辰八字看运势",
        "商品享受 95% 折扣",
      ],
      cta: "立即开通",
      highlight: true,
    },
    {
      name: "钻石会员",
      price: "299",
      period: "元/年 （包年）",
      description: "关键时期，给你更强的支撑，陪你把路走顺走稳。",
      features: [
        "查看万年历",
        "奇门遁甲在线排盘",
        "问感情",
        "问财运",
        "问健康",
        "问学业",
        "问事业",
        "问官司",
        "大运流年深度解析",
        "商品享受 90% 折扣",
      ],
      cta: "立即开通",
      highlight: false,
    },
  ];

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50 py-12 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">价格计划</h1>
            <p className="text-lg text-gray-600">从轻柔的陪伴到深入解读，把关键问题看清、把心安稳下来，更完整的深度方案，会更贴近你。</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {plans.map((plan) => (
              <PricingCard key={plan.name} plan={plan} />
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
}

