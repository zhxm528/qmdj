"use client";

import { useRouter } from "next/navigation";
import Button from "./Button";

interface Plan {
  name: string;
  price: string;
  period: string;
  description?: string;
  features: string[];
  cta: string;
  highlight: boolean;
}

interface PricingCardProps {
  plan: Plan;
}

export default function PricingCard({ plan }: PricingCardProps) {
  const router = useRouter();
  const isFree = plan.price === "0元";

  const handleClick = () => {
    if (isFree) {
      // 免费版：引导注册
      router.push("/register");
    } else if (plan.cta === "立即开通") {
      // 立即开通：跳转到充值页面
      router.push("/deposit");
    } else {
      // 付费版：发起订阅
      handleSubscribe();
    }
  };

  const handleSubscribe = async () => {
    try {
      // 检查登录状态
      const response = await fetch("/api/user/me");
      if (!response.ok) {
        // 未登录，跳转到登录页
        router.push("/login");
        return;
      }

      // 确定订阅方案
      const planType = plan.name === "包月" ? "monthly" : "yearly";

      // 发起订阅
      const checkoutResponse = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: planType }),
      });

      if (checkoutResponse.ok) {
        const data = await checkoutResponse.json();
        alert(`订阅创建成功！订单号：${data.order.id}`);
        // TODO: 实际应跳转到支付页面
      } else {
        alert("创建订阅失败，请重试");
      }
    } catch (error) {
      console.error("Subscribe error:", error);
      alert("订阅时发生错误");
    }
  };

  return (
    <div
      className={`bg-white rounded-lg shadow-md p-8 border-2 transition-transform hover:scale-105 flex flex-col ${
        plan.highlight ? "border-amber-500 scale-105" : "border-gray-200"
      }`}
    >
      {plan.highlight && (
        <div className="bg-amber-500 text-white text-sm font-bold px-4 py-1 rounded-full block mb-4 mx-auto w-fit">
          推荐
        </div>
      )}

      <h3 className="text-2xl font-bold text-gray-900 mb-4">{plan.name}</h3>

      <div className="mb-6">
        <span 
          className="text-5xl font-bold text-amber-600"
          style={{ fontFamily: '"PingFang SC", "Microsoft YaHei", "Helvetica Neue", Arial, sans-serif', letterSpacing: '0.02em' }}
        >
          {plan.price}
        </span>
        <span className="text-gray-600">{plan.period}</span>
        {plan.description && (
          <div className="mt-2 text-sm text-gray-500">
            {plan.description}
          </div>
        )}
      </div>

      <ul className="space-y-3 mb-8 flex-1">
        {plan.features.map((feature, idx) => (
          <li key={idx} className="flex items-start text-sm text-gray-700">
            <div className="relative mr-2 flex-shrink-0" style={{ width: '24px', height: '24px' }}>
              {/* 带边框的小格子 */}
              <div 
                className="absolute border-2 border-amber-600 rounded"
                style={{ 
                  width: '16px', 
                  height: '16px', 
                  top: '2px',
                  left: '0px',
                  backgroundColor: 'white'
                }}
              />
              {/* 对勾图标，上方探出边框 */}
              <svg
                className="absolute text-green-600"
                style={{ 
                  width: '24px', 
                  height: '24px', 
                  top: '-4px',
                  left: '-4px'
                }}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={3}
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <span>{feature}</span>
          </li>
        ))}
      </ul>

      <Button onClick={handleClick} className="w-full mt-auto">
        {plan.cta}
      </Button>
    </div>
  );
}

