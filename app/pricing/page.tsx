import Layout from "@/components/Layout";
import PricingCard from "@/components/PricingCard";
import Button from "@/components/Button";

export default function Pricing() {
  const plans = [
    {
      name: "白银会员",
      price: "9.9",
      period: "元/月",
      description: "先把心稳下来，我们陪你【看清当下】。",
      features: [
        "查看万年历",
        "在线奇门排盘",
        "免费体验【15天】黄金会员",
      ],
      cta: "注册并使用",
      highlight: false,
    },
    {
      name: "黄金会员",
      price: "29",
      period: "元/月",
      description: "不只是一次解读，更是把【选择】变得清晰的【陪伴】。",
      features: [
        "查看万年历",
        "在线奇门排盘",
        "奇门遁甲问事深度解析",
        "生辰八字看运势",
        "商品享受【95%】折扣",
      ],
      cta: "立即开通",
      highlight: true,
    },
    {
      name: "钻石会员",
      price: "299",
      period: "元/月",
      description: "关键时期，给你【更强的支撑】，陪你把路【走顺走稳】。",
      features: [
        "查看万年历",
        "在线奇门排盘",
        "奇门遁甲问事深度解析【无限】",
        "生辰八字看运势【无限】",
        "紫微斗数【无限】",
        "商品享受【90%】折扣",
      ],
      cta: "立即开通",
      highlight: false,
    },
  ];

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white py-12 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">价格方案</h1>
            <p className="text-lg text-gray-600">选择适合您的计划</p>
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

