import Layout from "@/components/Layout";
import PricingCard from "@/components/PricingCard";
import Button from "@/components/Button";

export default function Pricing() {
  const plans = [
    {
      name: "免费版",
      price: "0元",
      period: "",
      features: [
        "基础排盘",
        "每日限额 5 次",
        "社区只读",
        "标准结果",
      ],
      cta: "注册并使用",
      highlight: false,
    },
    {
      name: "包月",
      price: "19元",
      period: "/月",
      features: [
        "不限次数排盘",
        "优先队列",
        "社区发言",
        "基础报告导出",
        "技术支持",
      ],
      cta: "立即开通",
      highlight: true,
    },
    {
      name: "包年",
      price: "199元",
      period: "/年",
      features: [
        "含包月全部功能",
        "高级报告",
        "历史对比",
        "专属徽章",
        "优先客服支持",
        "新功能抢先体验",
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

