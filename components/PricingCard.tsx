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

  const handleClick = async () => {
    if (isFree) {
      // 免费版：引导注册
      router.push("/register");
    } else if (plan.cta === "立即开通") {
      // 立即开通：先检查登录状态
      try {
        const response = await fetch("/api/user/me");
        const userData = response.ok
          ? await response.json().catch(() => null)
          : null;
        if (!userData?.loggedIn) {
          // 未登录，跳转到注册页面
          router.push("/register");
          return;
        }
        // 已登录，跳转到充值页面
      router.push("/deposit");
      } catch (error) {
        console.error("Check login status error:", error);
        // 出错时也跳转到注册页面
        router.push("/register");
      }
    } else {
      // 付费版：发起订阅
      handleSubscribe();
    }
  };

  const handleSubscribe = async () => {
    try {
      // 检查登录状态
      const response = await fetch("/api/user/me");
      const userData = response.ok
        ? await response.json().catch(() => null)
        : null;
      if (!userData?.loggedIn) {
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
      className={`bg-[var(--color-card-bg)] rounded-lg shadow-md p-8 border-2 transition-transform hover:scale-105 flex flex-col ${
        plan.highlight ? "border-[var(--color-primary)] scale-105" : "border-[var(--color-border)]"
      }`}
    >
      {plan.highlight && (
        <div className="bg-[var(--color-primary)] text-white text-sm font-bold px-4 py-1 rounded-full block mb-4 mx-auto w-fit">
          推荐
        </div>
      )}

      <h3 
        className={`text-2xl font-bold mb-4 ${
          plan.name === "白银会员" 
            ? "text-[var(--color-muted)]" 
            : plan.name === "黄金会员"
            ? "text-[var(--color-warning)]"
            : plan.name === "钻石会员"
            ? "text-[var(--color-link)]"
            : "text-[var(--color-text-strong)]"
        }`}
      >
        {plan.name}
      </h3>

      <div className="mb-6">
        <span 
          className={`font-bold text-[var(--color-link)] ${
            plan.name === "黄金会员" 
              ? "text-5xl" 
              : "text-4xl"
          }`}
          style={{ fontFamily: '"PingFang SC", "Microsoft YaHei", "Helvetica Neue", Arial, sans-serif', letterSpacing: '0.02em' }}
        >
          {plan.price}
        </span>
        <span className="text-[var(--color-text)]">{plan.period}</span>
        {plan.description && (
          <div className="mt-2 text-sm text-[var(--color-muted)]">
            {plan.description}
          </div>
        )}
      </div>

      <ul className="space-y-3 mb-8 flex-1">
        {plan.features.map((feature, idx) => (
          <li key={idx} className="flex items-start text-sm text-[var(--color-text)]">
            <div className="relative mr-2 flex-shrink-0" style={{ width: '24px', height: '24px' }}>
              {/* 带边框的小格子 */}
              <div 
                className="absolute border-2 border-[var(--color-link)] rounded"
                style={{ 
                  width: '16px', 
                  height: '16px', 
                  top: '2px',
                  left: '0px',
                  backgroundColor: 'var(--color-card-bg)'
                }}
              />
              {/* 对勾图标，上方探出边框 */}
              <svg
                className="absolute text-[var(--color-success)]"
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
