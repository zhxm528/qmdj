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
        "在线排盘",
        "每日限额 5 次",
        "在线学习",
        "无限交流",
      ],
      cta: "注册并使用",
      highlight: false,
    },
    {
      name: "",
      price: "19元",
      period: "/月",
      features: [
        "无限制排盘",
        "AI解盘",
        "在线学习",
        "学习资料下载",
        "无限交流",
      ],
      cta: "立即开通",
      highlight: true,
    },
    {
      name: "高级版",
      price: "199元",
      period: "/年",
      features: [
        "无限制排盘",
        "AI解盘",
        "解盘下载",
        "在线学习",
        "学习资料下载",
        "无限交流",
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

