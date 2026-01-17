"use client";

import React, { useState } from "react";
import { Button, ConfigProvider, Card, Spin, Collapse, Tooltip } from "antd";
import zhCN from "antd/locale/zh_CN";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import Layout from "@/components/Layout";
import DateSelector from "@/components/DateSelector";
import HourSelector from "@/components/HourSelector";
import MinuteSelector from "@/components/MinuteSelector";
import GenderSelector from "@/components/GenderSelector";
import SidebarDrawer from "@/components/SidebarDrawer";

const { Panel } = Collapse;

// 动态导入 ECharts 组件（避免 SSR 问题）
const ReactECharts = dynamic(
  () => import("echarts-for-react").catch((err) => {
    console.error("Failed to load echarts-for-react:", err);
    // 返回一个占位组件
    return {
      default: () => (
        <div className="flex items-center justify-center h-full min-h-[400px] text-gray-500">
          <div className="text-center">
            <p>图表加载失败，请刷新页面重试</p>
          </div>
        </div>
      ),
    };
  }),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <Spin size="large" />
      </div>
    ),
  }
);

// 获取当前日期的格式化字符串 (YYYY-MM-DD)
function getCurrentDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// 获取当前小时的格式化字符串 (HH)
function getCurrentHour(): string {
  const now = new Date();
  return String(now.getHours()).padStart(2, "0");
}

// 获取当前分钟的格式化字符串 (MM)
function getCurrentMinute(): string {
  const now = new Date();
  return String(now.getMinutes()).padStart(2, "0");
}

// 将寒暖燥湿的英文枚举值转换为中文
function getTendencyChinese(tendency: string | null | undefined): string {
  if (!tendency) return "-";
  const map: Record<string, string> = {
    HAN: "偏寒",
    RE: "偏热",
    ZAO: "偏燥",
    SHI: "偏湿",
    NEUTRAL: "中和",
  };
  return map[tendency] || tendency;
}

function getDayunDirectionLabel(direction: string | null | undefined): string {
  if (!direction) return "-";
  if (direction === "FORWARD" || direction === "forward") return "顺行";
  if (direction === "BACKWARD" || direction === "backward") return "逆行";
  return direction;
}

// 将年干阴阳的英文值转换为中文
function getYinyangChinese(yinyang: string | null | undefined): string {
  if (!yinyang) return "-";
  const map: Record<string, string> = {
    YIN: "阴",
    YANG: "阳",
  };
  return map[yinyang.toUpperCase()] || yinyang;
}

// 将性别的英文值转换为中文
function getGenderChinese(gender: string | null | undefined): string {
  if (!gender) return "-";
  const map: Record<string, string> = {
    MALE: "男",
    FEMALE: "女",
  };
  return map[gender.toUpperCase()] || gender;
}

// 将破格等级的英文值转换为中文
function getBreakLevelChinese(level: string | null | undefined): string {
  if (!level) return "-";
  const map: Record<string, string> = {
    NONE: "无破",
    LIGHT: "轻破",
    MEDIUM: "中破",
    HEAVY: "重破",
  };
  return map[level.toUpperCase()] || level;
}

// 将成局状态的英文值转换为中文
function getFormationStatusChinese(status: string | null | undefined): string {
  if (!status) return "-";
  const map: Record<string, string> = {
    FORMED: "成局",
    PARTIAL: "半成",
  };
  return map[status.toUpperCase()] || status;
}

// 将自洽结论的英文值转换为中文
function getSelfConsistencyChinese(consistency: string | null | undefined): string {
  if (!consistency) return "-";
  const map: Record<string, string> = {
    CONSISTENT: "自洽",
    NEEDS_REVIEW: "需复核",
  };
  return map[consistency.toUpperCase()] || consistency;
}

// 将问题类型的英文值转换为中文
function getIssueTypeChinese(issueType: string | null | undefined): string {
  if (!issueType) return "-";
  const map: Record<string, string> = {
    REMEDY_MISMATCH: "用神不匹配",
    CLIMATE_MISMATCH: "调候不匹配",
  };
  return map[issueType.toUpperCase()] || issueType;
}

// 将问题严重程度的英文值转换为中文
function getSeverityChinese(severity: string | null | undefined): string {
  if (!severity) return "-";
  const map: Record<string, string> = {
    LOW: "低",
    MEDIUM: "中",
    HIGH: "高",
  };
  return map[severity.toUpperCase()] || severity;
}

// 将病标签的英文值转换为中文
function getDiseaseTagChinese(tag: string): string {
  const map: Record<string, string> = {
    dm_too_weak: "身弱",
    dm_too_strong: "身强",
    cold_need_fire: "需火暖",
    dry_need_moist: "需水润",
  };
  return map[tag] || tag;
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString("zh-CN", { hour12: false });
}

interface BaziStep {
  step: number;
  name: string;
  annotations: string;
  result: any;
  confidence: number;
}

export default function BaziPage() {
  const pathname = usePathname();
  const isQimenRoute = pathname?.startsWith("/qimen");
  const isBaziRoute = pathname?.startsWith("/bazi");
  const [sidebarTab, setSidebarTab] = useState<"ask" | "look">(isBaziRoute ? "look" : "ask");
  const [activeStepKey, setActiveStepKey] = useState<string>("1");
  const [date, setDate] = useState<string>(getCurrentDate());
  const [hour, setHour] = useState<string>(getCurrentHour());
  const [minute, setMinute] = useState<string>(getCurrentMinute());
  const [gender, setGender] = useState<string>("男");
  const [loading, setLoading] = useState(false);
  const [baziSteps, setBaziSteps] = useState<BaziStep[]>([]);
  const [fourPillars, setFourPillars] = useState<{
    year: string;
    month: string;
    day: string;
    hour: string;
  } | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [hiddenStemsData, setHiddenStemsData] = useState<Record<string, string[]> | null>(null);
  const [ganMetaData, setGanMetaData] = useState<Record<string, { yin_yang: string; wu_xing: string }> | null>(null);
  const [ganheData, setGanheData] = useState<{
    gan_he: Record<string, { with: string; transform: string }>;
    zhi_liuhe: Record<string, string>;
    zhi_sanhe: Record<string, string>;
    zhi_sanhui: Record<string, string>;
    zhi_chong: Record<string, string>;
    zhi_xing: { groups: string[][]; zixing: string[] };
    zhi_hai: Record<string, string>;
    zhi_po: Record<string, string>;
    gan_ke: { gan_wuxing: Record<string, string>; wuxing_ke: Record<string, string> };
  } | null>(null);
  const [chartId, setChartId] = useState<string | null>(null);
  const [tonggenData, setTonggenData] = useState<any[] | null>(null);
  const [touganData, setTouganData] = useState<any[] | null>(null);
  const [delingData, setDelingData] = useState<any | null>(null);
  const [rootqiData, setRootqiData] = useState<any | null>(null);
  const [dezhuData, setDezhuData] = useState<any | null>(null);
  const [keXieData, setKeXieData] = useState<any | null>(null);
  const [yuelingLLMLoading, setYuelingLLMLoading] = useState<boolean>(false);
  const [mingzhuLLMLoading, setMingzhuLLMLoading] = useState<boolean>(false);
  const [baseinfoLLMLoading, setBaseinfoLLMLoading] = useState<boolean>(false);
  const [wangshuaiLLMLoading, setWangshuaiLLMLoading] = useState<boolean>(false);
  const visibleSteps = baziSteps.filter((step) => ![11, 12, 13].includes(step.step));
  const baziTimeline = [
    { label: "定命主", step: 1 },
    { label: "月令与季节", step: 3 },
    { label: "基础盘面", step: 2 },
    { label: "旺衰强弱", step: 4 },
    { label: "寒暖燥湿", step: 5 },
    { label: "格局成局", step: 6 },
    { label: "用喜神忌神", step: 7 },
    { label: "验盘", step: 8 },
    { label: "十神解读", step: 9 },
    { label: "大运", step: 10 },
  ];

  const getBaziStepHref = (step: number) =>
    isBaziRoute ? `#bazi-step-${step}` : `/bazi#bazi-step-${step}`;

  const dateParts = date ? date.split("-") : null;
  const year = dateParts && dateParts.length === 3 ? dateParts[0] : "";
  const month = dateParts && dateParts.length === 3 ? dateParts[1] : "";
  const day = dateParts && dateParts.length === 3 ? dateParts[2] : "";

  // 获取用户信息和登录状态
  React.useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const response = await fetch("/api/user/me");
        const userData = response.ok
          ? await response.json().catch(() => null)
          : null;
        const loggedIn = Boolean(userData && userData.loggedIn);
        setIsLoggedIn(loggedIn);
        setUserRole(loggedIn ? userData.role || null : null);
        setUserEmail(loggedIn ? userData.email || null : null);
      } catch (error) {
        // 用户未登录或获取失败
        setIsLoggedIn(false);
        setUserEmail(null);
        setUserRole(null);
      }
    };
    fetchUserInfo();
  }, []);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const applyHash = () => {
      const match = window.location.hash.match(/^#bazi-step-(\d+)$/);
      if (match) {
        setActiveStepKey(match[1]);
      }
    };
    applyHash();
    window.addEventListener("hashchange", applyHash);
    return () => window.removeEventListener("hashchange", applyHash);
  }, []);

  // 生成八字排盘
  const handleBaziPaipan = async () => {
    if (!date || !hour) {
      alert("请先选择日期和小时");
      return;
    }

    try {
      setLoading(true);
      setBaziSteps([]);
      setHiddenStemsData(null);
      setGanMetaData(null);
      setGanheData(null);
      setRootqiData(null);
      setDezhuData(null);
      setKeXieData(null);

      // 调用八字排盘 API
      const response = await fetch("/api/bazi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date,
          hour,
          minute,
          gender,
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || "八字排盘失败");
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "八字排盘失败");
      }

      if (data.steps && data.steps.length > 0) {
        setBaziSteps(data.steps);
        
        // 从API返回中获取chart_id
        if (data.chart_id) {
          setChartId(data.chart_id);
        }
        
        // 从API返回中获取四柱信息
        if (data.fourPillars) {
          setFourPillars(data.fourPillars);
          
          // 获取地支藏干信息
          try {
            const branches = [
              data.fourPillars.year.charAt(1),
              data.fourPillars.month.charAt(1),
              data.fourPillars.day.charAt(1),
              data.fourPillars.hour.charAt(1),
            ];
            
            console.log("[前端] 请求地支藏干信息，branches:", branches);
            
            const hiddenStemsResponse = await fetch("/api/bazi/dizhicanggan", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ branches }),
            });
            
            console.log("[前端] 地支藏干API响应状态:", hiddenStemsResponse.status, hiddenStemsResponse.ok);
            
            if (hiddenStemsResponse.ok) {
              const hiddenStemsData = await hiddenStemsResponse.json();
              console.log("[前端] 地支藏干API返回数据:", JSON.stringify(hiddenStemsData, null, 2));
              console.log("[前端] hiddenStemsData.success:", hiddenStemsData.success);
              console.log("[前端] hiddenStemsData.result:", hiddenStemsData.result);
              console.log("[前端] hiddenStemsData.result是否存在:", !!hiddenStemsData.result);
              
              if (hiddenStemsData.success && hiddenStemsData.result) {
                console.log("[前端] 设置hiddenStemsData:", hiddenStemsData.result);
                setHiddenStemsData(hiddenStemsData.result);
              } else {
                console.warn("[前端] 地支藏干数据格式不正确或result为空");
                if (hiddenStemsData.mapping) {
                  console.log("[前端] 尝试使用mapping字段:", hiddenStemsData.mapping);
                  // 如果result不存在但mapping存在，尝试从mapping中提取
                  const resultFromMapping: Record<string, string[]> = {};
                  branches.forEach((branch) => {
                    if (hiddenStemsData.mapping[branch]) {
                      resultFromMapping[branch] = hiddenStemsData.mapping[branch];
                    }
                  });
                  if (Object.keys(resultFromMapping).length > 0) {
                    console.log("[前端] 从mapping提取的result:", resultFromMapping);
                    setHiddenStemsData(resultFromMapping);
                  }
                }
              }
            } else {
              const errorText = await hiddenStemsResponse.text();
              console.error("[前端] 地支藏干API响应错误:", hiddenStemsResponse.status, errorText);
            }
          } catch (error) {
            console.error("[前端] 获取地支藏干信息失败:", error);
          }
          
          // 获取天干五行阴阳信息
          try {
            const gans = [
              data.fourPillars.year.charAt(0),
              data.fourPillars.month.charAt(0),
              data.fourPillars.day.charAt(0),
              data.fourPillars.hour.charAt(0),
            ];
            
            const ganMetaResponse = await fetch("/api/bazi/wuxingyinyang", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ gans }),
            });
            
            if (ganMetaResponse.ok) {
              const ganMetaData = await ganMetaResponse.json();
              if (ganMetaData.success && ganMetaData.result) {
                setGanMetaData(ganMetaData.result);
              } else if (ganMetaData.success && ganMetaData.mapping) {
                // 如果没有result，使用完整的mapping
                setGanMetaData(ganMetaData.mapping);
              }
            }
          } catch (error) {
            console.warn("获取天干五行阴阳信息失败:", error);
          }
          
          // 获取天干地支关系规则表
          try {
            const ganheResponse = await fetch("/api/bazi/ganhe", {
              method: "GET",
            });
            
            if (ganheResponse.ok) {
              const ganheData = await ganheResponse.json();
              if (ganheData.success && ganheData.data) {
                setGanheData(ganheData.data);
              }
            }
          } catch (error) {
            console.warn("获取天干地支关系规则表失败:", error);
          }
          
          // 从 step3 结果中获取根气和得助数据
          // step3 会在后台自动调用 rootqi、dezhu API
          const step3Data = data.steps?.find((s: any) => s.step === 3);
          if (step3Data && step3Data.result) {
            // 获取根气数据
            if (step3Data.result.rootqi) {
              setRootqiData(step3Data.result.rootqi);
              console.log("[前端] 从 step3 获取根气数据:", step3Data.result.rootqi);
            }
            
            // 获取得助数据
            if (step3Data.result.dezhu) {
              setDezhuData(step3Data.result.dezhu);
              console.log("[前端] 从 step3 获取得助数据:", step3Data.result.dezhu);
            }

            // 获取受克泄耗数据
            if (step3Data.result.ke_xie) {
              setKeXieData(step3Data.result.ke_xie);
              console.log("[前端] 从 step3 获取受克泄耗数据:", step3Data.result.ke_xie);
            }
          } else {
            console.warn("[前端] step3 数据不存在或格式不正确");
          }

          // 从 step4 结果中获取通根表、透干表和得令数据
          // step4 会在后台自动调用 tonggen、tougan、deling API
          const step4Data = data.steps?.find((s: any) => s.step === 4);
          if (step4Data && step4Data.result) {
            // 获取通根表数据
            if (step4Data.result.tonggen && Array.isArray(step4Data.result.tonggen)) {
              setTonggenData(step4Data.result.tonggen);
              console.log("[前端] 从 step4 获取通根表数据，数量:", step4Data.result.tonggen.length);
            }
            
            // 获取透干表数据
            if (step4Data.result.tougan && Array.isArray(step4Data.result.tougan)) {
              setTouganData(step4Data.result.tougan);
              console.log("[前端] 从 step4 获取透干表数据，数量:", step4Data.result.tougan.length);
            }
            
            // 得令数据
            if (step4Data.result.deling) {
              setDelingData(step4Data.result.deling);
              console.log("[前端] 从 step4 获取得令数据:", JSON.stringify(step4Data.result.deling, null, 2));
            }
          } else {
            console.warn("[前端] step4 数据不存在或格式不正确");
          }
        }

        // 保存到数据库（如果用户已登录）
        try {
            const userCheckResponse = await fetch("/api/user/me");
            const userCheckData = userCheckResponse.ok
              ? await userCheckResponse.json().catch(() => null)
              : null;
            if (userCheckData?.loggedIn) {
            // 构建JSON数据
            const baziJson = buildBaziJson(data.steps, data.fourPillars, date, hour, minute, gender);
            
            const saveResponse = await fetch("/api/qimen_pan", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                date,
                hour,
                minute,
                bazi_json: baziJson,
              }),
            });

            if (saveResponse.ok) {
              const saveData = await saveResponse.json();
              console.log("八字排盘结果已保存:", saveData);
            } else {
              const err = await saveResponse.json().catch(() => ({}));
              console.warn("保存八字排盘结果失败:", err.error || "未知错误");
            }
          } else {
            console.log("用户未登录，八字排盘结果不保存到数据库");
          }
        } catch (saveError: any) {
          console.warn("保存八字排盘结果时出错:", saveError);
        }
      }
    } catch (error: any) {
      console.error("八字排盘失败:", error);
      alert(error.message || "八字排盘失败，请重试");
    } finally {
      setLoading(false);
    }
  };

  // 调用定命主 LLM 生成 API
  const handleMingzhuLLM = async () => {
    const step1 = baziSteps.find((s) => s.step === 1);
    if (!step1 || !step1.result) {
      alert("请先完成八字排盘");
      return;
    }

    try {
      setMingzhuLLMLoading(true);

      const response = await fetch("/api/bazi/mingzhu-llm", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          step1Result: step1.result,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "调用 LLM 生成描述失败");
      }

      const data = await response.json();
      if (data.success && data.text) {
        // 更新 step1 的 result，添加 llm_text
        const updatedSteps = baziSteps.map((s) => {
          if (s.step === 1) {
            return {
              ...s,
              result: {
                ...s.result,
                llm_text: data.text,
              },
            };
          }
          return s;
        });
        setBaziSteps(updatedSteps);
      } else {
        throw new Error(data.error || "LLM 返回数据格式不正确");
      }
    } catch (error: any) {
      console.error("调用定命主 LLM 失败:", error);
      alert(error.message || "调用 LLM 生成描述失败，请重试");
    } finally {
      setMingzhuLLMLoading(false);
    }
  };

  // 调用基础盘面信息 LLM 生成 API
  const handleBaseinfoLLM = async () => {
    const step2 = baziSteps.find((s) => s.step === 2);
    if (!step2 || !step2.result) {
      alert("请先完成八字排盘");
      return;
    }

    try {
      setBaseinfoLLMLoading(true);

      const response = await fetch("/api/bazi/baseinfo-llm", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          step2Result: step2.result,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "调用 LLM 生成描述失败");
      }

      const data = await response.json();
      if (data.success && data.text) {
        // 更新 step2 的 result，添加 llm_text
        const updatedSteps = baziSteps.map((s) => {
          if (s.step === 2) {
            return {
              ...s,
              result: {
                ...s.result,
                llm_text: data.text,
              },
            };
          }
          return s;
        });
        setBaziSteps(updatedSteps);
      } else {
        throw new Error(data.error || "LLM 返回数据格式不正确");
      }
    } catch (error: any) {
      console.error("调用基础盘面信息 LLM 失败:", error);
      alert(error.message || "调用 LLM 生成描述失败，请重试");
    } finally {
      setBaseinfoLLMLoading(false);
    }
  };

  // 调用旺衰：日主强弱与身态 LLM 生成 API
  const handleWangshuaiLLM = async () => {
    const step4 = baziSteps.find((s) => s.step === 4);
    if (!step4 || !step4.result) {
      alert("请先完成八字排盘");
      return;
    }

    try {
      setWangshuaiLLMLoading(true);

      const response = await fetch("/api/bazi/wangshuai-llm", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          step4Result: step4.result,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "调用 LLM 生成描述失败");
      }

      const data = await response.json();
      if (data.success && data.text) {
        // 更新 step4 的 result，添加 llm_text
        const updatedSteps = baziSteps.map((s) => {
          if (s.step === 4) {
            return {
              ...s,
              result: {
                ...s.result,
                llm_text: data.text,
              },
            };
          }
          return s;
        });
        setBaziSteps(updatedSteps);
      } else {
        throw new Error(data.error || "LLM 返回数据格式不正确");
      }
    } catch (error: any) {
      console.error("调用旺衰 LLM 失败:", error);
      alert(error.message || "调用 LLM 生成描述失败，请重试");
    } finally {
      setWangshuaiLLMLoading(false);
    }
  };

  // 调用月令与季节 LLM 生成 API
  const handleYuelingLLM = async () => {
    const step3 = baziSteps.find((s) => s.step === 3);
    if (!step3 || !step3.result) {
      alert("请先完成八字排盘");
      return;
    }

    try {
      setYuelingLLMLoading(true);

      const response = await fetch("/api/bazi/yueling-llm", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          step3Result: step3.result,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "调用 LLM 生成描述失败");
      }

      const data = await response.json();
      if (data.success && data.text) {
        // 更新 step3 的 result，添加 llm_text
        const updatedSteps = baziSteps.map((s) => {
          if (s.step === 3) {
            return {
              ...s,
              result: {
                ...s.result,
                llm_text: data.text,
              },
            };
          }
          return s;
        });
        setBaziSteps(updatedSteps);
      } else {
        throw new Error(data.error || "LLM 返回数据格式不正确");
      }
    } catch (error: any) {
      console.error("调用月令与季节 LLM 失败:", error);
      alert(error.message || "调用 LLM 生成描述失败，请重试");
    } finally {
      setYuelingLLMLoading(false);
    }
  };

  // 默认提示文案
  const defaultUpgradeMessage = "升级到更深度的专属方案后，你可以请智能老师为你细致解盘，把困惑说清、把心安下来。";

  // 将步骤结果转换为自然语言描述
  const formatStepResult = (step: BaziStep): string => {
    const { step: stepNum, result } = step;
    
    switch (stepNum) {
      case 1: {
        // 定日主（命主）
        const llmText: string | undefined = (result as any).llm_text;

        // 优先使用 LLM 返回的自然语言描述
        if (llmText && typeof llmText === "string" && llmText.trim().length > 0) {
          return llmText.trim();
        }

        // 回退：使用默认提示文案
        return defaultUpgradeMessage;
      }
      
      case 2: {
        // 基础盘面信息
        const llmText: string | undefined = (result as any).llm_text;

        // 优先使用 LLM 返回的自然语言描述
        if (llmText && typeof llmText === "string" && llmText.trim().length > 0) {
          return llmText.trim();
        }

        // 回退：使用默认提示文案
        return defaultUpgradeMessage;
      }
      
      case 3: {
        // 月令与季节
        const llmText: string | undefined = (result as any).llm_text;

        // 优先使用 LLM 返回的自然语言描述
        if (llmText && typeof llmText === "string" && llmText.trim().length > 0) {
          return llmText.trim();
        }

        // 回退：使用默认提示文案
        return defaultUpgradeMessage;
      }
      
      case 4: {
        // 旺衰：日主强弱与身态
        const llmText: string | undefined = (result as any).llm_text;

        // 优先使用 LLM 返回的自然语言描述
        if (llmText && typeof llmText === "string" && llmText.trim().length > 0) {
          return llmText.trim();
        }

        // 回退：使用默认提示文案
        return defaultUpgradeMessage;
      }
      case 5: {
        const llmText: string | undefined = (result as any).llm_text;

        // 优先使用 LLM 返回的自然语言描述
        if (llmText && typeof llmText === "string" && llmText.trim().length > 0) {
          return llmText.trim();
        }

        // 回退：使用默认提示文案
        return defaultUpgradeMessage;
      }
      case 6: {
        const llmText: string | undefined = (result as any).llm_text;

        // 优先使用 LLM 返回的自然语言描述
        if (llmText && typeof llmText === "string" && llmText.trim().length > 0) {
          return llmText.trim();
        }

        // 回退：使用默认提示文案
        return defaultUpgradeMessage;
      }
      case 7: {
        const llmText: string | undefined = (result as any).llm_text;

        // 优先使用 LLM 返回的自然语言描述
        if (llmText && typeof llmText === "string" && llmText.trim().length > 0) {
          return llmText.trim();
        }

        // 回退：使用默认提示文案
        return defaultUpgradeMessage;
      }
      case 8: {
        const llmText: string | undefined = (result as any).llm_text;

        // 优先使用 LLM 返回的自然语言描述
        if (llmText && typeof llmText === "string" && llmText.trim().length > 0) {
          return llmText.trim();
        }

        // 回退：使用默认提示文案
        return defaultUpgradeMessage;
      }
      case 9: {
        const llmText: string | undefined = (result as any).llm_text;

        // 优先使用 LLM 返回的自然语言描述
        if (llmText && typeof llmText === "string" && llmText.trim().length > 0) {
          return llmText.trim();
        }

        // 回退：使用默认提示文案
        return defaultUpgradeMessage;
      }
      case 10: {
        const llmText: string | undefined = (result as any).llm_text;

        // 优先使用 LLM 返回的自然语言描述
        if (llmText && typeof llmText === "string" && llmText.trim().length > 0) {
          return llmText.trim();
        }

        // 回退：使用默认提示文案
        return defaultUpgradeMessage;
      }
      case 11:
      case 12:
      case 13:
        // 其他步骤暂未实现，显示占位文本
        return `此步骤的分析结果暂未实现，请稍后查看。\n\n步骤说明：${step.annotations || ""}`;
      
      default:
        // 其他步骤暂未实现，显示占位文本
        return `此步骤的分析结果暂未实现，请稍后查看。\n\n步骤说明：${step.annotations || ""}`;
    }
  };

  // 生成五行旺相休囚死状态雷达图配置
  const getYuelingRadarChartOption = (
    allElementsState: Record<string, { state: string; state_rank: number }>,
    dayMasterElement: string
  ) => {
    const elements = ["木", "火", "土", "金", "水"];
    const values = elements.map((element) => {
      const stateInfo = allElementsState[element];
      return stateInfo ? stateInfo.state_rank : 0;
    });
    
    // 创建一个计数器来跟踪 formatter 的调用顺序（作为备用方案）
    let callIndex = 0;

    return {
      radar: {
        indicator: elements.map((element) => ({
          name: element,
          max: 5,
        })),
        center: ["50%", "55%"],
        radius: "70%",
        axisName: {
          color: "#666",
          fontSize: 14,
          fontWeight: "bold",
        },
        splitArea: {
          show: true,
          areaStyle: {
            color: ["rgba(250, 250, 250, 0.3)", "rgba(200, 200, 200, 0.1)"],
          },
        },
        splitLine: {
          lineStyle: {
            color: "#ddd",
          },
        },
        axisLine: {
          lineStyle: {
            color: "#ccc",
          },
        },
      },
      tooltip: {
        trigger: "item",
        formatter: (params: any) => {
          // ECharts 雷达图的 tooltip formatter
          // 直接显示所有五行的状态信息，确保 tooltip 始终有内容显示
          const tooltipLines = elements.map((elementName) => {
            const stateInfo = allElementsState[elementName];
            if (stateInfo) {
              const isDayMaster = elementName === dayMasterElement;
              return `${elementName}：${stateInfo.state}（${stateInfo.state_rank}/5）${isDayMaster ? " ← 日主" : ""}`;
            }
            return `${elementName}：无数据`;
          });
          
          return tooltipLines.join("<br/>");
        },
      },
      series: [
        {
          name: "旺相休囚死状态",
          type: "radar",
          label: {
            show: true,
            position: "top",
            distance: 8,
            formatter: (params: any) => {
              let index: number = -1;
              
              // 方法1: 优先使用 indicatorIndex（这是最可靠的方法）
              // 在雷达图中，每个数据点对应一个 indicator，indicatorIndex 应该总是可用的
              // indicatorIndex 直接对应 radar.indicator 数组的索引，顺序是固定的：[木, 火, 土, 金, 水]
              if (typeof params.indicatorIndex === "number" && params.indicatorIndex >= 0 && params.indicatorIndex < elements.length) {
                index = params.indicatorIndex;
              }
              // 方法2: 如果 indicatorIndex 不可用，使用调用顺序作为备用
              // 在雷达图中，formatter 会按照 indicator 的顺序被调用
              // 注意：这个方法依赖于 ECharts 的调用顺序，可能不够可靠
              else {
                // 使用闭包中的计数器来跟踪调用顺序
                const currentIndex = callIndex % elements.length;
                callIndex++;
                index = currentIndex;
              }
              
              // 确保索引有效
              if (index >= 0 && index < elements.length) {
                const elementName = elements[index];
                const stateInfo = allElementsState[elementName];
                if (stateInfo) {
                  // 显示格式：元素名：状态值（例如："木：5" 或 "木：旺（5）"）
                  // 为了简洁，只显示元素名和数值
                  return `${elementName}：${stateInfo.state_rank}`;
                }
                return `${elementName}：0`;
              }
              
              // 如果仍然无法确定，返回空字符串（不显示标签）
              return "";
            },
            color: "#333",
            fontSize: 12,
            fontWeight: "bold",
            backgroundColor: "rgba(255, 255, 255, 0.8)",
            borderColor: "#8b5cf6",
            borderWidth: 1,
            borderRadius: 4,
            padding: [4, 6],
          },
          labelLine: {
            show: true,
            length: 10,
            length2: 5,
          },
          data: [
            {
              value: values,
              name: "旺相休囚死",
              areaStyle: {
                color: "rgba(139, 92, 246, 0.3)", // purple-500 with opacity
              },
              lineStyle: {
                color: "#8b5cf6", // purple-500
                width: 2,
              },
              itemStyle: {
                color: "#8b5cf6", // purple-500
              },
            },
          ],
          emphasis: {
            label: {
              show: true,
            },
          },
        },
      ],
    };
  };

  // 生成五行统计雷达图配置
  const getRadarChartOption = (countByElement: { 木: number; 火: number; 土: number; 金: number; 水: number }) => {
    const maxValue = Math.max(...Object.values(countByElement), 1); // 至少为1，避免除零
    const normalizedValues = [
      countByElement.木 / maxValue * 100,
      countByElement.火 / maxValue * 100,
      countByElement.土 / maxValue * 100,
      countByElement.金 / maxValue * 100,
      countByElement.水 / maxValue * 100,
    ];

    // 使用固定顺序的元素数组，确保顺序与 indicator 一致
    const elements: Array<keyof typeof countByElement> = ["木", "火", "土", "金", "水"];
    
    // 创建一个计数器来跟踪 formatter 的调用顺序
    // 在雷达图中，formatter 会按照 indicator 的顺序被调用
    let callIndex = 0;

    return {
      radar: {
        indicator: [
          { name: "木", max: 100 },
          { name: "火", max: 100 },
          { name: "土", max: 100 },
          { name: "金", max: 100 },
          { name: "水", max: 100 },
        ],
        center: ["50%", "55%"],
        radius: "70%",
        axisName: {
          color: "#666",
          fontSize: 14,
          fontWeight: "bold",
        },
        splitArea: {
          show: true,
          areaStyle: {
            color: ["rgba(250, 250, 250, 0.3)", "rgba(200, 200, 200, 0.1)"],
          },
        },
        splitLine: {
          lineStyle: {
            color: "#ddd",
          },
        },
        axisLine: {
          lineStyle: {
            color: "#ccc",
          },
        },
      },
      tooltip: {
        trigger: "item",
        formatter: (params: any) => {
          if (Array.isArray(params)) {
            return params.map((p: any) => {
              const index = typeof p.indicatorIndex === "number" ? p.indicatorIndex : -1;
              if (index >= 0 && index < elements.length) {
                const elementName = elements[index];
                const originalValue = countByElement[elementName] || 0;
                return `${elementName}: ${originalValue}`;
              }
              return p.name || "";
            }).join("<br/>");
          }
          const index = typeof params.indicatorIndex === "number" ? params.indicatorIndex : -1;
          if (index >= 0 && index < elements.length) {
            const elementName = elements[index];
            const originalValue = countByElement[elementName] || 0;
            return `${elementName}: ${originalValue}`;
          }
          return params.name || "";
        },
      },
      series: [
        {
          name: "五行统计",
          type: "radar",
          label: {
            show: true,
            position: "top",
            distance: 8,
            formatter: (params: any) => {
              // 在 ECharts 雷达图中，label formatter 的参数：
              // params.value: 当前数据点的值（归一化后的值，是一个数字）
              // params.indicatorIndex: 指标索引（雷达图特有，ECharts 5.x 支持，这是最可靠的方法）
              // params.dataIndex: 数据系列索引（通常是 0）
              // params.seriesIndex: 系列索引
              // params.name: 可能包含指标名称或其他信息
              
              // 关键问题：当多个元素有相同的值时（如土：3、水：3），值匹配会失败
              // 解决方案：必须使用 indicatorIndex，它直接对应 indicator 数组的索引
              
              let index: number = -1;
              
              // 方法1: 优先使用 indicatorIndex（这是最可靠的方法）
              // 在雷达图中，每个数据点对应一个 indicator，indicatorIndex 应该总是可用的
              // indicatorIndex 直接对应 radar.indicator 数组的索引，顺序是固定的：[木, 火, 土, 金, 水]
              if (typeof params.indicatorIndex === "number" && params.indicatorIndex >= 0 && params.indicatorIndex < elements.length) {
                index = params.indicatorIndex;
              }
              // 方法2: 如果 indicatorIndex 不可用，使用调用顺序作为备用
              // 在雷达图中，formatter 会按照 indicator 的顺序被调用
              // 注意：这个方法依赖于 ECharts 的调用顺序，可能不够可靠
              else {
                // 使用闭包中的计数器来跟踪调用顺序
                const currentIndex = callIndex % elements.length;
                callIndex++;
                index = currentIndex;
              }
              
              // 确保索引有效
              if (index >= 0 && index < elements.length) {
                const elementName = elements[index];
                const originalValue = countByElement[elementName] || 0;
                return `${elementName}: ${originalValue}`;
              }
              
              // 如果仍然无法确定，返回空字符串（不显示标签）
              return "";
            },
            color: "#333",
            fontSize: 12,
            fontWeight: "bold",
            backgroundColor: "rgba(255, 255, 255, 0.8)",
            borderColor: "#f59e0b",
            borderWidth: 1,
            borderRadius: 4,
            padding: [4, 6],
          },
          labelLine: {
            show: true,
            length: 10,
            length2: 5,
          },
          data: [
            {
              value: normalizedValues,
              name: "五行分布",
              areaStyle: {
                color: "rgba(245, 158, 11, 0.3)", // amber-500 with opacity
              },
              lineStyle: {
                color: "#f59e0b", // amber-500
                width: 2,
              },
              itemStyle: {
                color: "#f59e0b", // amber-500
              },
            },
          ],
          emphasis: {
            label: {
              show: true,
            },
          },
        },
      ],
    };
  };

  // 构建八字JSON数据
  const buildBaziJson = (
    steps: BaziStep[],
    fourPillarsData: { year: string; month: string; day: string; hour: string } | null,
    date: string,
    hour: string,
    minute: string,
    genderValue: string
  ) => {
    // 从四柱数据构建输入格式
    const fourPillarsInput = fourPillarsData
      ? {
          year: {
            stem: fourPillarsData.year.charAt(0),
            branch: fourPillarsData.year.charAt(1),
          },
          month: {
            stem: fourPillarsData.month.charAt(0),
            branch: fourPillarsData.month.charAt(1),
          },
          day: {
            stem: fourPillarsData.day.charAt(0),
            branch: fourPillarsData.day.charAt(1),
          },
          hour: {
            stem: fourPillarsData.hour.charAt(0),
            branch: fourPillarsData.hour.charAt(1),
          },
        }
      : {
          year: { stem: "", branch: "" },
          month: { stem: "", branch: "" },
          day: { stem: "", branch: "" },
          hour: { stem: "", branch: "" },
        };

    return {
      meta: {
        spec_version: "bazi_reading_flow_v1",
        created_at_local: new Date().toISOString().replace("Z", ""),
        timezone: "Asia/Shanghai",
        method_notes: {
          month_rule: "jieqi",
          true_solar_time_corrected: false,
          school: "generic",
          confidence_scale: "0-1",
        },
      },
      input: {
        four_pillars: fourPillarsInput,
        optional_context: {
          sex: genderValue || "",
          birth_place: "",
          notes: "",
        },
      },
      steps: steps.map(s => ({
        step: s.step,
        name: s.name,
        annotations: s.annotations,
        result: s.result,
        confidence: s.confidence,
      })),
    };
  };

  return (
    <ConfigProvider locale={zhCN}>
      <Layout>
        <div className="min-h-screen bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            

            {/* 日期与时辰选择 */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-[2.5fr_1.5fr_0.8fr] gap-6">
                <DateSelector
                  value={date}
                  onChange={(newDate) => {
                    setDate(newDate);
                  }}
                  required
                />
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    时辰 <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <HourSelector
                      value={hour}
                      onChange={(newHour) => {
                        setHour(newHour);
                      }}
                      year={year}
                      month={month}
                      day={day}
                      required
                    />
                    <MinuteSelector
                      value={minute}
                      onChange={(newMinute) => {
                        setMinute(newMinute);
                      }}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    性别
                  </label>
                  <GenderSelector
                    value={gender}
                    onChange={(newGender) => {
                      setGender(newGender);
                    }}
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-center">
                <Tooltip
                  title={
                    !isLoggedIn || !userEmail ? (
                      <span>
                        请先
                        <Link href="/login" className="text-blue-500 hover:text-blue-600 underline ml-1 mr-1">
                          登录
                        </Link>
                        才能排盘
                      </span>
                    ) : !date || !hour ? (
                      "请先选择日期和时辰"
                    ) : (
                      ""
                    )
                  }
                  placement="top"
                >
                  <Button
                    type="primary"
                    size="large"
                    onClick={handleBaziPaipan}
                    loading={loading}
                    disabled={!isLoggedIn || !userEmail || !date || !hour}
                    className="bg-amber-600 hover:bg-amber-700"
                  >
                    八字排盘
                  </Button>
                </Tooltip>
              </div>
            </div>

            {/* 13个步骤结果展示 */}
            {visibleSteps.length > 0 && (
              <div className="bg-white rounded-lg shadow-md p-6">
                {fourPillars && (
                  <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">四柱信息</h3>
                    <div className="grid grid-cols-4 gap-4 text-center">
                      <div>
                        <div className="text-sm text-gray-600">年柱</div>
                        <div className="text-xl font-bold text-amber-700">{fourPillars.year}</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600">月柱</div>
                        <div className="text-xl font-bold text-amber-700">{fourPillars.month}</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600">日柱</div>
                        <div className="text-xl font-bold text-amber-700">{fourPillars.day}</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-600">时柱</div>
                        <div className="text-xl font-bold text-amber-700">{fourPillars.hour}</div>
                      </div>
                    </div>
                  </div>
                )}
                <Collapse
                  accordion
                  activeKey={activeStepKey}
                  onChange={(key) => {
                    if (Array.isArray(key)) {
                      setActiveStepKey(String(key[0] || ""));
                    } else {
                      setActiveStepKey(String(key || ""));
                    }
                  }}
                >
                  {[...visibleSteps].sort((a, b) => {
                    // step 1 始终第一
                    if (a.step === 1) return -1;
                    if (b.step === 1) return 1;
                    // step 3 在 step 2 之前
                    if (a.step === 3 && b.step === 2) return -1;
                    if (a.step === 2 && b.step === 3) return 1;
                    // 其他按原顺序
                    return a.step - b.step;
                  }).map((step) => {
                    const naturalText = formatStepResult(step);
                    const llmMarkdown = (step.result as any)?.llm_text;
                    const useMarkdown =
                      typeof llmMarkdown === "string" && llmMarkdown.trim().length > 0;
                    return (
                      <Panel
                        header={
                          <div className="flex justify-between items-center w-full">
                            <div className="flex items-center">
                              <span className="font-semibold">
                                {step.name}
                              </span>
                              {step.annotations && (
                                <span className="text-sm text-gray-500 font-normal italic ml-4">
                                  {step.annotations}
                                </span>
                              )}
                            </div>
                            {step.step === 1 && (
                              <Button
                                type="primary"
                                size="small"
                                loading={mingzhuLLMLoading}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMingzhuLLM();
                                }}
                                className="ml-4"
                              >
                                解盘
                              </Button>
                            )}
                            {step.step === 2 && (
                              <Button
                                type="primary"
                                size="small"
                                loading={baseinfoLLMLoading}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleBaseinfoLLM();
                                }}
                                className="ml-4"
                              >
                                解盘
                              </Button>
                            )}
                            {step.step === 3 && (
                              <Button
                                type="primary"
                                size="small"
                                loading={yuelingLLMLoading}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleYuelingLLM();
                                }}
                                className="ml-4"
                              >
                                解盘
                              </Button>
                            )}
                            {step.step === 4 && (
                              <Button
                                type="primary"
                                size="small"
                                loading={wangshuaiLLMLoading}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleWangshuaiLLM();
                                }}
                                className="ml-4"
                              >
                                解盘
                              </Button>
                            )}
                          </div>
                        }
                        key={String(step.step)}
                      >
                        <div className="space-y-4">
                          <div id={`bazi-step-${step.step}`} className="scroll-mt-24" />
                          <div className="bg-gray-50 rounded-lg p-4">
                            {useMarkdown ? (
                              <div className="text-sm text-gray-800 leading-relaxed">
                                <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>
                                  {llmMarkdown}
                                </ReactMarkdown>
                              </div>
                            ) : (
                              <div className="text-sm whitespace-pre-wrap text-gray-800 leading-relaxed">
                                {naturalText}
                              </div>
                            )}
                          </div>
                          {/* 步骤1显示五行分布、天干五行阴阳表和五行统计雷达图（左侧两个表格垂直堆叠，右侧雷达图） */}
                          {step.step === 1 && step.result.five_elements && fourPillars && ganMetaData && step.result.five_elements?.optional_summary?.count_by_element && (
                            <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
                              {/* 左侧：五行分布和天干五行阴阳表（垂直堆叠） */}
                              <div className="flex flex-col gap-4">
                                {/* 五行分布表格 */}
                                <div className="bg-white rounded-lg p-4 border border-gray-200 flex flex-col">
                                  <h4 className="text-sm font-semibold text-gray-700 mb-3">五行分布</h4>
                                  <div className="overflow-x-auto flex-1">
                                    <table className="w-full border-collapse text-sm">
                                      <thead>
                                        <tr className="bg-gray-50">
                                          <th className="border border-gray-300 px-3 py-2 text-left font-semibold">柱位</th>
                                          <th className="border border-gray-300 px-3 py-2 text-center font-semibold">天干</th>
                                          <th className="border border-gray-300 px-3 py-2 text-center font-semibold">天干五行</th>
                                          <th className="border border-gray-300 px-3 py-2 text-center font-semibold">地支</th>
                                          <th className="border border-gray-300 px-3 py-2 text-center font-semibold">地支五行</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {[
                                          { pillar: "年柱", stem: step.result.five_elements.stems.year_stem, branch: step.result.five_elements.branches.year_branch },
                                          { pillar: "月柱", stem: step.result.five_elements.stems.month_stem, branch: step.result.five_elements.branches.month_branch },
                                          { pillar: "日柱", stem: step.result.five_elements.stems.day_stem, branch: step.result.five_elements.branches.day_branch },
                                          { pillar: "时柱", stem: step.result.five_elements.stems.hour_stem, branch: step.result.five_elements.branches.hour_branch },
                                        ].map(({ pillar, stem, branch }) => (
                                          <tr key={pillar} className="hover:bg-gray-50">
                                            <td className="border border-gray-300 px-3 py-2 font-medium">{pillar}</td>
                                            <td className="border border-gray-300 px-3 py-2 text-center font-bold text-amber-700">{stem.stem}</td>
                                            <td className="border border-gray-300 px-3 py-2 text-center">{stem.element || "-"}</td>
                                            <td className="border border-gray-300 px-3 py-2 text-center font-bold text-amber-700">{branch.branch}</td>
                                            <td className="border border-gray-300 px-3 py-2 text-center">{branch.element || "-"}</td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                                {/* 天干五行阴阳表格 */}
                                <div className="bg-white rounded-lg p-4 border border-gray-200 flex flex-col">
                                  <h4 className="text-sm font-semibold text-gray-700 mb-3">天干五行阴阳表</h4>
                                  <div className="overflow-x-auto flex-1">
                                    <table className="w-full border-collapse text-sm">
                                      <thead>
                                        <tr className="bg-gray-50">
                                          <th className="border border-gray-300 px-3 py-2 text-left font-semibold">柱位</th>
                                          <th className="border border-gray-300 px-3 py-2 text-center font-semibold">天干</th>
                                          <th className="border border-gray-300 px-3 py-2 text-center font-semibold">阴阳</th>
                                          <th className="border border-gray-300 px-3 py-2 text-center font-semibold">五行</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {[
                                          { pillar: "年干", gan: fourPillars.year.charAt(0) },
                                          { pillar: "月干", gan: fourPillars.month.charAt(0) },
                                          { pillar: "日干", gan: fourPillars.day.charAt(0) },
                                          { pillar: "时干", gan: fourPillars.hour.charAt(0) },
                                        ].map(({ pillar, gan }) => {
                                          const meta = ganMetaData[gan];
                                          return (
                                            <tr key={pillar} className="hover:bg-gray-50">
                                              <td className="border border-gray-300 px-3 py-2 font-medium">{pillar}</td>
                                              <td className="border border-gray-300 px-3 py-2 text-center font-bold text-amber-700">{gan}</td>
                                              <td className="border border-gray-300 px-3 py-2 text-center">{meta?.yin_yang || "-"}</td>
                                              <td className="border border-gray-300 px-3 py-2 text-center">{meta?.wu_xing || "-"}</td>
                                            </tr>
                                          );
                                        })}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              </div>
                              {/* 右侧：五行统计雷达图 */}
                              <div className="bg-white rounded-lg p-4 border border-gray-200 flex flex-col">
                                <div className="flex flex-col mb-3">
                                  <h4 className="text-sm font-semibold text-gray-700 mb-2">五行统计雷达图</h4>
                                  <div className="text-xs text-gray-600">
                                    {(() => {
                                      const counts = step.result.five_elements.optional_summary.count_by_element;
                                      return `木：${counts.木}、火：${counts.火}、土：${counts.土}、金：${counts.金}、水：${counts.水}`;
                                    })()}
                                  </div>
                                </div>
                                <div className="flex-1 flex items-center justify-center">
                                  <ReactECharts
                                    option={getRadarChartOption(step.result.five_elements.optional_summary.count_by_element)}
                                    style={{ height: "100%", width: "100%", minHeight: "400px" }}
                                    opts={{ renderer: "svg" }}
                                  />
                                </div>
                              </div>
                            </div>
                          )}
                          {/* 步骤2显示原始十神表格 */}
                          {step.step === 2 && (() => {
                            // 从步骤2的结果中获取十神数据
                            const shishenData = step.result?.shishen;
                            console.log("[前端] 步骤2 - shishenData:", shishenData ? `存在，details数量=${shishenData.details?.length || 0}` : "不存在");
                            return shishenData ? (
                              <div className="mt-4 bg-white rounded-lg p-4 border border-gray-200">
                                <h4 className="text-sm font-semibold text-gray-700 mb-3">原始十神</h4>
                                <div className="space-y-4">
                                  {/* 天干十神表格 */}
                                  <div>
                                    <h5 className="text-xs font-semibold text-gray-600 mb-2">天干十神</h5>
                                    <div className="overflow-x-auto">
                                      <table className="w-full border-collapse text-sm">
                                        <thead>
                                          <tr className="bg-gray-50">
                                            <th className="border border-gray-300 px-3 py-2 text-center font-semibold">柱位</th>
                                            <th className="border border-gray-300 px-3 py-2 text-center font-semibold">天干</th>
                                            <th className="border border-gray-300 px-3 py-2 text-center font-semibold">五行</th>
                                            <th className="border border-gray-300 px-3 py-2 text-center font-semibold">阴阳</th>
                                            <th className="border border-gray-300 px-3 py-2 text-center font-semibold">十神</th>
                                            <th className="border border-gray-300 px-3 py-2 text-center font-semibold">关系</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {shishenData.details
                                            .filter((d: any) => d.item_type === "stem")
                                            .sort((a: any, b: any) => {
                                              const order: Record<string, number> = { year: 0, month: 1, day: 2, hour: 3 };
                                              return order[a.pillar] - order[b.pillar];
                                            })
                                            .map((detail: any) => {
                                              const pillarNames: Record<string, string> = {
                                                year: "年干",
                                                month: "月干",
                                                day: "日干",
                                                hour: "时干",
                                              };
                                              const relNames: Record<string, string> = {
                                                same: "同我",
                                                dm_sheng_x: "我生",
                                                dm_ke_x: "我克",
                                                x_sheng_dm: "生我",
                                                x_ke_dm: "克我",
                                              };
                                              return (
                                                <tr key={`${detail.pillar}-${detail.target_stem}`} className="hover:bg-gray-50">
                                                  <td className="border border-gray-300 px-3 py-2 text-center font-medium">
                                                    {pillarNames[detail.pillar] || detail.pillar}
                                                  </td>
                                                  <td className="border border-gray-300 px-3 py-2 text-center font-bold text-amber-700">
                                                    {detail.target_stem}
                                                  </td>
                                                  <td className="border border-gray-300 px-3 py-2 text-center">{detail.target_element}</td>
                                                  <td className="border border-gray-300 px-3 py-2 text-center">{detail.target_yinyang}</td>
                                                  <td className="border border-gray-300 px-3 py-2 text-center font-semibold text-blue-600">
                                                    {detail.tenshen}
                                                  </td>
                                                  <td className="border border-gray-300 px-3 py-2 text-center text-xs text-gray-500">
                                                    {relNames[detail.rel_to_dm] || detail.rel_to_dm}
                                                  </td>
                                                </tr>
                                              );
                                            })}
                                        </tbody>
                                      </table>
                                    </div>
                                  </div>
                                  {/* 地支藏干十神表格 */}
                                  <div>
                                    <h5 className="text-xs font-semibold text-gray-600 mb-2">地支藏干十神</h5>
                                    <div className="overflow-x-auto">
                                      <table className="w-full border-collapse text-sm">
                                        <thead>
                                          <tr className="bg-gray-50">
                                            <th className="border border-gray-300 px-3 py-2 text-center font-semibold">柱位</th>
                                            <th className="border border-gray-300 px-3 py-2 text-center font-semibold">地支</th>
                                            <th className="border border-gray-300 px-3 py-2 text-center font-semibold">藏干</th>
                                            <th className="border border-gray-300 px-3 py-2 text-center font-semibold">角色</th>
                                            <th className="border border-gray-300 px-3 py-2 text-center font-semibold">五行</th>
                                            <th className="border border-gray-300 px-3 py-2 text-center font-semibold">阴阳</th>
                                            <th className="border border-gray-300 px-3 py-2 text-center font-semibold">十神</th>
                                            <th className="border border-gray-300 px-3 py-2 text-center font-semibold">关系</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {shishenData.details
                                            .filter((d: any) => d.item_type === "hidden_stem")
                                            .sort((a: any, b: any) => {
                                              const order: Record<string, number> = { year: 0, month: 1, day: 2, hour: 3 };
                                              const roleOrder: Record<string, number> = { main: 0, middle: 1, residual: 2 };
                                              if (order[a.pillar] !== order[b.pillar]) {
                                                return order[a.pillar] - order[b.pillar];
                                              }
                                              return (roleOrder[a.hidden_role] || 0) - (roleOrder[b.hidden_role] || 0);
                                            })
                                            .map((detail: any) => {
                                              const pillarNames: Record<string, string> = {
                                                year: "年支",
                                                month: "月支",
                                                day: "日支",
                                                hour: "时支",
                                              };
                                              const roleNames: Record<string, string> = {
                                                main: "主气",
                                                middle: "中气",
                                                residual: "余气",
                                              };
                                              const relNames: Record<string, string> = {
                                                same: "同我",
                                                dm_sheng_x: "我生",
                                                dm_ke_x: "我克",
                                                x_sheng_dm: "生我",
                                                x_ke_dm: "克我",
                                              };
                                              return (
                                                <tr key={`${detail.pillar}-${detail.source_branch}-${detail.target_stem}-${detail.hidden_role}`} className="hover:bg-gray-50">
                                                  <td className="border border-gray-300 px-3 py-2 text-center font-medium">
                                                    {pillarNames[detail.pillar] || detail.pillar}
                                                  </td>
                                                  <td className="border border-gray-300 px-3 py-2 text-center font-bold text-amber-700">
                                                    {detail.source_branch}
                                                  </td>
                                                  <td className="border border-gray-300 px-3 py-2 text-center font-medium">
                                                    {detail.target_stem}
                                                  </td>
                                                  <td className="border border-gray-300 px-3 py-2 text-center text-xs">
                                                    {roleNames[detail.hidden_role] || detail.hidden_role}
                                                  </td>
                                                  <td className="border border-gray-300 px-3 py-2 text-center">{detail.target_element}</td>
                                                  <td className="border border-gray-300 px-3 py-2 text-center">{detail.target_yinyang}</td>
                                                  <td className="border border-gray-300 px-3 py-2 text-center font-semibold text-blue-600">
                                                    {detail.tenshen}
                                                  </td>
                                                  <td className="border border-gray-300 px-3 py-2 text-center text-xs text-gray-500">
                                                    {relNames[detail.rel_to_dm] || detail.rel_to_dm}
                                                  </td>
                                                </tr>
                                              );
                                            })}
                                        </tbody>
                                      </table>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ) : null;
                          })()}
                          {/* 步骤2显示地支藏干表 */}
                          {step.step === 2 && fourPillars && hiddenStemsData && (
                            <div className="mt-4 bg-white rounded-lg p-4 border border-gray-200">
                              <h4 className="text-sm font-semibold text-gray-700 mb-3">地支藏干表</h4>
                              <div className="overflow-x-auto">
                                <table className="w-full border-collapse text-sm">
                                  <thead>
                                    <tr className="bg-gray-50">
                                      <th className="border border-gray-300 px-3 py-2 text-left font-semibold">柱位</th>
                                      <th className="border border-gray-300 px-3 py-2 text-center font-semibold">地支</th>
                                      <th className="border border-gray-300 px-3 py-2 text-left font-semibold">藏干</th>
                                      <th className="border border-gray-300 px-3 py-2 text-left font-semibold">说明</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {[
                                      { pillar: "年支", branch: fourPillars.year.charAt(1) },
                                      { pillar: "月支", branch: fourPillars.month.charAt(1) },
                                      { pillar: "日支", branch: fourPillars.day.charAt(1) },
                                      { pillar: "时支", branch: fourPillars.hour.charAt(1) },
                                    ].map(({ pillar, branch }) => {
                                      const hiddenStems = hiddenStemsData[branch] || [];
                                      const roleLabels = ["主气", "中气", "余气"];
                                      return (
                                        <tr key={pillar} className="hover:bg-gray-50">
                                          <td className="border border-gray-300 px-3 py-2 font-medium">{pillar}</td>
                                          <td className="border border-gray-300 px-3 py-2 text-center font-bold text-amber-700">{branch}</td>
                                          <td className="border border-gray-300 px-3 py-2">
                                            {hiddenStems.length > 0 ? (
                                              <div className="flex flex-wrap gap-2">
                                                {hiddenStems.map((stem, index) => (
                                                  <span key={index} className="inline-flex items-center gap-1">
                                                    <span className="font-medium">{stem}</span>
                                                    {index < roleLabels.length && (
                                                      <span className="text-xs text-gray-500">({roleLabels[index]})</span>
                                                    )}
                                                  </span>
                                                ))}
                                              </div>
                                            ) : (
                                              <span className="text-gray-400">无</span>
                                            )}
                                          </td>
                                          <td className="border border-gray-300 px-3 py-2 text-gray-600 text-xs">
                                            {hiddenStems.length > 0
                                              ? `共${hiddenStems.length}个藏干，按主气→中气→余气顺序排列`
                                              : "该地支无藏干"}
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}
                          {/* 步骤2显示天干地支关系规则表 */}
                          {step.step === 2 && ganheData && (
                            <div className="mt-4 bg-white rounded-lg p-4 border border-gray-200">
                              <h4 className="text-sm font-semibold text-gray-700 mb-3">合冲刑害破 + 干合干克</h4>
                              <div className="space-y-6">
                                {/* 四个表格一行显示：五合、六合、三合、三会 */}
                                <div className="grid grid-cols-1 gap-4">
                                  {/* 五合（天干五合） */}
                                  <div>
                                    <h5 className="text-xs font-semibold text-gray-600 mb-2">五合（天干五合）</h5>
                                    <div className="overflow-x-auto">
                                      <table className="w-full border-collapse text-sm">
                                        <thead>
                                          <tr className="bg-gray-50">
                                            <th className="border border-gray-300 px-2 py-1 text-center font-semibold text-xs">天干1</th>
                                            <th className="border border-gray-300 px-2 py-1 text-center font-semibold text-xs">天干2</th>
                                            <th className="border border-gray-300 px-2 py-1 text-center font-semibold text-xs">合化五行</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {Object.entries(ganheData.gan_he)
                                            .filter(([gan, _]) => ["甲", "乙", "丙", "丁", "戊"].includes(gan))
                                            .map(([gan, info]) => (
                                              <tr key={gan} className="hover:bg-gray-50">
                                                <td className="border border-gray-300 px-2 py-1 text-center font-medium text-xs">{gan}</td>
                                                <td className="border border-gray-300 px-2 py-1 text-center font-medium text-xs">{info.with}</td>
                                                <td className="border border-gray-300 px-2 py-1 text-center text-xs">{info.transform}</td>
                                              </tr>
                                            ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  </div>
                                  
                                  {/* 六合（地支六合） */}
                                  <div>
                                    <h5 className="text-xs font-semibold text-gray-600 mb-2">六合（地支六合）</h5>
                                    <div className="overflow-x-auto">
                                      <table className="w-full border-collapse text-sm">
                                        <thead>
                                          <tr className="bg-gray-50">
                                            <th className="border border-gray-300 px-2 py-1 text-center font-semibold text-xs">地支1</th>
                                            <th className="border border-gray-300 px-2 py-1 text-center font-semibold text-xs">地支2</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {Object.entries(ganheData.zhi_liuhe)
                                            .filter(([zhi, _]) => ["子", "寅", "卯", "辰", "巳", "午"].includes(zhi))
                                            .map(([zhi, partner]) => (
                                              <tr key={zhi} className="hover:bg-gray-50">
                                                <td className="border border-gray-300 px-2 py-1 text-center font-medium text-xs">{zhi}</td>
                                                <td className="border border-gray-300 px-2 py-1 text-center font-medium text-xs">{partner}</td>
                                              </tr>
                                            ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  </div>
                                  
                                  {/* 三合（地支三合局） */}
                                  <div>
                                    <h5 className="text-xs font-semibold text-gray-600 mb-2">三合（地支三合局）</h5>
                                    <div className="overflow-x-auto">
                                      <table className="w-full border-collapse text-sm">
                                        <thead>
                                          <tr className="bg-gray-50">
                                            <th className="border border-gray-300 px-2 py-1 text-center font-semibold text-xs">三合局</th>
                                            <th className="border border-gray-300 px-2 py-1 text-center font-semibold text-xs">合化五行</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {Object.entries(ganheData.zhi_sanhe)
                                            .filter(([combo, _]) => ["申子辰", "寅午戌", "亥卯未", "巳酉丑"].includes(combo))
                                            .map(([combo, element]) => (
                                              <tr key={combo} className="hover:bg-gray-50">
                                                <td className="border border-gray-300 px-2 py-1 text-center font-medium text-xs">{combo}</td>
                                                <td className="border border-gray-300 px-2 py-1 text-center text-xs">{element}</td>
                                              </tr>
                                            ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  </div>
                                  
                                  {/* 三会（地支三会局） */}
                                  <div>
                                    <h5 className="text-xs font-semibold text-gray-600 mb-2">三会（地支三会局）</h5>
                                    <div className="overflow-x-auto">
                                      <table className="w-full border-collapse text-sm">
                                        <thead>
                                          <tr className="bg-gray-50">
                                            <th className="border border-gray-300 px-2 py-1 text-center font-semibold text-xs">三会局</th>
                                            <th className="border border-gray-300 px-2 py-1 text-center font-semibold text-xs">会化五行</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {Object.entries(ganheData.zhi_sanhui)
                                            .filter(([combo, _]) => ["亥子丑", "寅卯辰", "巳午未", "申酉戌"].includes(combo))
                                            .map(([combo, element]) => (
                                              <tr key={combo} className="hover:bg-gray-50">
                                                <td className="border border-gray-300 px-2 py-1 text-center font-medium text-xs">{combo}</td>
                                                <td className="border border-gray-300 px-2 py-1 text-center text-xs">{element}</td>
                                              </tr>
                                            ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  </div>
                                </div>
                                
                                {/* 四个表格一行显示：冲、刑、害、破 */}
                                <div className="grid grid-cols-1 gap-4">
                                  {/* 冲（地支六冲） */}
                                  <div>
                                    <h5 className="text-xs font-semibold text-gray-600 mb-2">冲（地支六冲）</h5>
                                    <div className="overflow-x-auto">
                                      <table className="w-full border-collapse text-sm">
                                        <thead>
                                          <tr className="bg-gray-50">
                                            <th className="border border-gray-300 px-2 py-1 text-center font-semibold text-xs">地支1</th>
                                            <th className="border border-gray-300 px-2 py-1 text-center font-semibold text-xs">地支2</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {Object.entries(ganheData.zhi_chong)
                                            .filter(([zhi, _]) => ["子", "丑", "寅", "卯", "辰", "巳"].includes(zhi))
                                            .map(([zhi, partner]) => (
                                              <tr key={zhi} className="hover:bg-gray-50">
                                                <td className="border border-gray-300 px-2 py-1 text-center font-medium text-xs">{zhi}</td>
                                                <td className="border border-gray-300 px-2 py-1 text-center font-medium text-xs">{partner}</td>
                                              </tr>
                                            ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  </div>
                                  
                                  {/* 刑（地支刑） */}
                                  <div>
                                    <h5 className="text-xs font-semibold text-gray-600 mb-2">刑（地支刑）</h5>
                                    <div className="space-y-2">
                                      <div>
                                        <div className="text-xs text-gray-500 mb-1">三刑组：</div>
                                        <div className="overflow-x-auto">
                                          <table className="w-full border-collapse text-sm">
                                            <thead>
                                              <tr className="bg-gray-50">
                                                <th className="border border-gray-300 px-2 py-1 text-center font-semibold text-xs">三刑组</th>
                                                <th className="border border-gray-300 px-2 py-1 text-center font-semibold text-xs">类型</th>
                                              </tr>
                                            </thead>
                                            <tbody>
                                              {ganheData.zhi_xing.groups.map((group, idx) => (
                                                <tr key={idx} className="hover:bg-gray-50">
                                                  <td className="border border-gray-300 px-2 py-1 text-center font-medium text-xs">{group.join("、")}</td>
                                                  <td className="border border-gray-300 px-2 py-1 text-center text-xs">
                                                    {group.length === 3 ? "三刑" : "相刑"}
                                                  </td>
                                                </tr>
                                              ))}
                                            </tbody>
                                          </table>
                                        </div>
                                      </div>
                                      <div>
                                        <div className="text-xs text-gray-500 mb-1">自刑：</div>
                                        <div className="text-xs text-gray-700">{ganheData.zhi_xing.zixing.join("、")}</div>
                                      </div>
                                    </div>
                                  </div>
                                  
                                  {/* 害（地支六害） */}
                                  <div>
                                    <h5 className="text-xs font-semibold text-gray-600 mb-2">害（地支六害）</h5>
                                    <div className="overflow-x-auto">
                                      <table className="w-full border-collapse text-sm">
                                        <thead>
                                          <tr className="bg-gray-50">
                                            <th className="border border-gray-300 px-2 py-1 text-center font-semibold text-xs">地支1</th>
                                            <th className="border border-gray-300 px-2 py-1 text-center font-semibold text-xs">地支2</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {Object.entries(ganheData.zhi_hai)
                                            .filter(([zhi, _]) => ["子", "丑", "寅", "卯", "申", "酉"].includes(zhi))
                                            .map(([zhi, partner]) => (
                                              <tr key={zhi} className="hover:bg-gray-50">
                                                <td className="border border-gray-300 px-2 py-1 text-center font-medium text-xs">{zhi}</td>
                                                <td className="border border-gray-300 px-2 py-1 text-center font-medium text-xs">{partner}</td>
                                              </tr>
                                            ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  </div>
                                  
                                  {/* 破（地支六破） */}
                                  <div>
                                    <h5 className="text-xs font-semibold text-gray-600 mb-2">破（地支六破）</h5>
                                    <div className="overflow-x-auto">
                                      <table className="w-full border-collapse text-sm">
                                        <thead>
                                          <tr className="bg-gray-50">
                                            <th className="border border-gray-300 px-2 py-1 text-center font-semibold text-xs">地支1</th>
                                            <th className="border border-gray-300 px-2 py-1 text-center font-semibold text-xs">地支2</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {Object.entries(ganheData.zhi_po)
                                            .filter(([zhi, _]) => ["子", "卯", "辰", "未", "寅", "巳"].includes(zhi))
                                            .map(([zhi, partner]) => (
                                              <tr key={zhi} className="hover:bg-gray-50">
                                                <td className="border border-gray-300 px-2 py-1 text-center font-medium text-xs">{zhi}</td>
                                                <td className="border border-gray-300 px-2 py-1 text-center font-medium text-xs">{partner}</td>
                                              </tr>
                                            ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  </div>
                                </div>
                                
                                {/* 干克（天干相克） */}
                                <div>
                                  <h5 className="text-xs font-semibold text-gray-600 mb-2">干克（天干相克）</h5>
                                  <div className="grid grid-cols-1 gap-4">
                                    <div>
                                      <div className="text-xs text-gray-500 mb-1">天干五行映射：</div>
                                      <div className="overflow-x-auto">
                                        <table className="w-full border-collapse text-sm">
                                          <thead>
                                            <tr className="bg-gray-50">
                                              <th className="border border-gray-300 px-2 py-1 text-center font-semibold text-xs">天干</th>
                                              <th className="border border-gray-300 px-2 py-1 text-center font-semibold text-xs">五行</th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            {Object.entries(ganheData.gan_ke.gan_wuxing).map(([gan, wuxing]) => (
                                              <tr key={gan} className="hover:bg-gray-50">
                                                <td className="border border-gray-300 px-2 py-1 text-center font-medium text-xs">{gan}</td>
                                                <td className="border border-gray-300 px-2 py-1 text-center text-xs">{wuxing}</td>
                                              </tr>
                                            ))}
                                          </tbody>
                                        </table>
                                      </div>
                                    </div>
                                    <div>
                                      <div className="text-xs text-gray-500 mb-1">五行相克规则：</div>
                                      <div className="overflow-x-auto">
                                        <table className="w-full border-collapse text-sm">
                                          <thead>
                                            <tr className="bg-gray-50">
                                              <th className="border border-gray-300 px-2 py-1 text-center font-semibold text-xs">克方</th>
                                              <th className="border border-gray-300 px-2 py-1 text-center font-semibold text-xs">被克方</th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            {Object.entries(ganheData.gan_ke.wuxing_ke).map(([ke, beike]) => (
                                              <tr key={ke} className="hover:bg-gray-50">
                                                <td className="border border-gray-300 px-2 py-1 text-center font-medium text-xs">{ke}</td>
                                                <td className="border border-gray-300 px-2 py-1 text-center font-medium text-xs">{beike}</td>
                                              </tr>
                                            ))}
                                          </tbody>
                                        </table>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                          {/* 步骤3显示月令信息、月令强弱/得令表格和雷达图（左右两列布局） */}
                          {step.step === 3 && (step.result.month_command || step.result.yueling_strength) && (
                            <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
                              {/* 左列：月令信息表格和月令强弱/得令表格（垂直堆叠） */}
                              <div className="flex flex-col gap-4">
                                {/* 月令信息表格 */}
                                {step.result.month_command && (
                                  <div className="bg-white rounded-lg p-4 border border-gray-200 flex flex-col">
                                    <h4 className="text-sm font-semibold text-gray-700 mb-3">月令信息</h4>
                                    <div className="overflow-x-auto flex-1">
                                      <table className="w-full border-collapse text-sm">
                                        <tbody>
                                          <tr className="hover:bg-gray-50">
                                            <td className="border border-gray-300 px-3 py-2 font-semibold bg-gray-50 w-1/4">月支（月令）</td>
                                            <td className="border border-gray-300 px-3 py-2">{step.result.month_command.month_branch || "-"}</td>
                                          </tr>
                                          <tr className="hover:bg-gray-50">
                                            <td className="border border-gray-300 px-3 py-2 font-semibold bg-gray-50">对应季节</td>
                                            <td className="border border-gray-300 px-3 py-2">{step.result.month_command.season || "-"}</td>
                                          </tr>
                                          <tr className="hover:bg-gray-50">
                                            <td className="border border-gray-300 px-3 py-2 font-semibold bg-gray-50">当令之气</td>
                                            <td className="border border-gray-300 px-3 py-2">{step.result.month_command.dominant_qi || "-"}</td>
                                          </tr>
                                          {step.result.month_command.supporting_elements_rank && step.result.month_command.supporting_elements_rank.length > 0 && (
                                            <tr className="hover:bg-gray-50">
                                              <td className="border border-gray-300 px-3 py-2 font-semibold bg-gray-50">五行强弱</td>
                                              <td className="border border-gray-300 px-3 py-2">{step.result.month_command.supporting_elements_rank.join(" > ")}</td>
                                            </tr>
                                          )}
                                        </tbody>
                                      </table>
                                    </div>
                                  </div>
                                )}
                                {/* 月令强弱/得令表格 */}
                                {step.result.yueling_strength && (
                                  <div className="bg-white rounded-lg p-4 border border-gray-200 flex flex-col">
                                    <h4 className="text-sm font-semibold text-gray-700 mb-3">月令强弱/得令</h4>
                                    <div className="overflow-x-auto flex-1">
                                      <table className="w-full border-collapse text-sm">
                                        <tbody>
                                          <tr className="hover:bg-gray-50">
                                            <td className="border border-gray-300 px-3 py-2 font-semibold bg-gray-50 w-1/4">日主五行</td>
                                            <td className="border border-gray-300 px-3 py-2">{step.result.yueling_strength.day_master_element || "-"}</td>
                                          </tr>
                                          <tr className="hover:bg-gray-50">
                                            <td className="border border-gray-300 px-3 py-2 font-semibold bg-gray-50">得令状态</td>
                                            <td className="border border-gray-300 px-3 py-2">
                                              {step.result.yueling_strength.day_master_state || "-"}
                                              {step.result.yueling_strength.day_master_state_rank !== undefined && (
                                                <span className="text-gray-500 ml-2">（强弱值：{step.result.yueling_strength.day_master_state_rank}/5）</span>
                                              )}
                                            </td>
                                          </tr>
                                          {step.result.yueling_strength.is_override && (
                                            <tr className="hover:bg-gray-50">
                                              <td className="border border-gray-300 px-3 py-2 font-semibold bg-gray-50">覆盖规则</td>
                                              <td className="border border-gray-300 px-3 py-2">
                                                <span className="text-amber-600">⚠️ 使用了覆盖规则</span>
                                                {step.result.yueling_strength.override_note && (
                                                  <span className="ml-2">{step.result.yueling_strength.override_note}</span>
                                                )}
                                              </td>
                                            </tr>
                                          )}
                                        </tbody>
                                      </table>
                                    </div>
                                  </div>
                                )}
                              </div>
                              {/* 右列：所有五行旺相休囚死状态雷达图 */}
                              {step.result.yueling_strength?.all_elements_state && (
                                <div className="bg-white rounded-lg p-4 border border-gray-200 flex flex-col">
                                  <h4 className="text-sm font-semibold text-gray-700 mb-3">所有五行旺相休囚死状态</h4>
                                  <div className="flex-1 flex items-center justify-center">
                                    <ReactECharts
                                      option={getYuelingRadarChartOption(
                                        step.result.yueling_strength.all_elements_state,
                                        step.result.yueling_strength.day_master_element
                                      )}
                                      style={{ height: "100%", width: "100%", minHeight: "400px" }}
                                      opts={{ renderer: "svg" }}
                                    />
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                          {/* 步骤4显示通根表、透干表和得令数据 */}
                          {step.step === 4 && (
                            <div className="mt-4 space-y-4">
                              {/* 第一行：通根表和透干表 */}
                              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                {/* 通根表 */}
                                {tonggenData && tonggenData.length > 0 && (
                                  <div className="bg-white rounded-lg p-4 border border-gray-200">
                                    <h4 className="text-sm font-semibold text-gray-700 mb-3">通根表</h4>
                                    <div className="overflow-x-auto">
                                      <table className="w-full border-collapse text-sm">
                                        <thead>
                                          <tr className="bg-gray-50">
                                            <th className="border border-gray-300 px-3 py-2 text-left font-semibold text-xs">天干</th>
                                            <th className="border border-gray-300 px-3 py-2 text-left font-semibold text-xs">地支</th>
                                            <th className="border border-gray-300 px-3 py-2 text-center font-semibold text-xs">根层级</th>
                                            <th className="border border-gray-300 px-3 py-2 text-center font-semibold text-xs">权重</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {tonggenData.map((item, idx) => (
                                            <tr key={idx} className="hover:bg-gray-50">
                                              <td className="border border-gray-300 px-3 py-2 text-center font-medium text-xs">{item.stem_code}</td>
                                              <td className="border border-gray-300 px-3 py-2 text-center font-medium text-xs">{item.branch_code}</td>
                                              <td className="border border-gray-300 px-3 py-2 text-center text-xs">{item.root_role || "-"}</td>
                                              <td className="border border-gray-300 px-3 py-2 text-center text-xs">
                                                {item.weight != null ? (typeof item.weight === 'number' ? item.weight.toFixed(2) : parseFloat(String(item.weight)).toFixed(2)) : "-"}
                                              </td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  </div>
                                )}
                                {/* 透干表 */}
                                {touganData && touganData.length > 0 && (
                                  <div className="bg-white rounded-lg p-4 border border-gray-200">
                                    <h4 className="text-sm font-semibold text-gray-700 mb-3">透干表</h4>
                                    <div className="overflow-x-auto">
                                      <table className="w-full border-collapse text-sm">
                                        <thead>
                                          <tr className="bg-gray-50">
                                            <th className="border border-gray-300 px-3 py-2 text-left font-semibold text-xs">柱位</th>
                                            <th className="border border-gray-300 px-3 py-2 text-left font-semibold text-xs">地支</th>
                                            <th className="border border-gray-300 px-3 py-2 text-center font-semibold text-xs">藏干</th>
                                            <th className="border border-gray-300 px-3 py-2 text-center font-semibold text-xs">层级</th>
                                            <th className="border border-gray-300 px-3 py-2 text-center font-semibold text-xs">是否透干</th>
                                            <th className="border border-gray-300 px-3 py-2 text-center font-semibold text-xs">透出位置</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {touganData.map((item, idx) => {
                                            const pillarNames: Record<string, string> = {
                                              year: "年",
                                              month: "月",
                                              day: "日",
                                              hour: "时",
                                            };
                                            return (
                                              <tr key={idx} className="hover:bg-gray-50">
                                                <td className="border border-gray-300 px-3 py-2 text-center font-medium text-xs">{pillarNames[item.pillar] || item.pillar}</td>
                                                <td className="border border-gray-300 px-3 py-2 text-center font-medium text-xs">{item.branch_code}</td>
                                                <td className="border border-gray-300 px-3 py-2 text-center text-xs">{item.hidden_stem}</td>
                                                <td className="border border-gray-300 px-3 py-2 text-center text-xs">{item.hidden_role}</td>
                                                <td className="border border-gray-300 px-3 py-2 text-center text-xs">
                                                  {item.is_tougan ? (
                                                    <span className="text-green-600 font-semibold">是</span>
                                                  ) : (
                                                    <span className="text-gray-400">否</span>
                                                  )}
                                                </td>
                                                <td className="border border-gray-300 px-3 py-2 text-center text-xs">
                                                  {item.tougan_pillars && Array.isArray(item.tougan_pillars) && item.tougan_pillars.length > 0
                                                    ? item.tougan_pillars.map((p: string) => pillarNames[p] || p).join("、")
                                                    : "-"}
                                                </td>
                                              </tr>
                                            );
                                          })}
                                        </tbody>
                                      </table>
                                    </div>
                                  </div>
                                )}
                              </div>
                              {/* 第二行：得令数据、根气表、得助表 */}
                              <div className="flex flex-col gap-4">
                                {/* 得令数据 */}
                                {delingData && (
                                  <div className="bg-white rounded-lg p-4 border border-gray-200">
                                    <h4 className="text-sm font-semibold text-gray-700 mb-3">得令判定</h4>
                                    <div className="overflow-x-auto">
                                      <table className="w-full border-collapse text-sm">
                                        <tbody>
                                          <tr className="hover:bg-gray-50">
                                            <td className="border border-gray-300 px-3 py-2 font-semibold bg-gray-50 w-1/3">月支</td>
                                            <td className="border border-gray-300 px-3 py-2 text-center">{delingData.month_branch || "-"}</td>
                                          </tr>
                                          <tr className="hover:bg-gray-50">
                                            <td className="border border-gray-300 px-3 py-2 font-semibold bg-gray-50">季节</td>
                                            <td className="border border-gray-300 px-3 py-2 text-center">{delingData.season_code || "-"}</td>
                                          </tr>
                                          <tr className="hover:bg-gray-50">
                                            <td className="border border-gray-300 px-3 py-2 font-semibold bg-gray-50">日主</td>
                                            <td className="border border-gray-300 px-3 py-2 text-center">
                                              {delingData.day_stem || "-"}（{delingData.day_master_element || "-"}）
                                            </td>
                                          </tr>
                                          <tr className="hover:bg-gray-50">
                                            <td className="border border-gray-300 px-3 py-2 font-semibold bg-gray-50">日主状态</td>
                                            <td className="border border-gray-300 px-3 py-2 text-center text-xs">
                                              {delingData.day_master_state || "-"}
                                              {delingData.day_master_score !== undefined && (
                                                <span className="text-gray-500 ml-1">
                                                  （{typeof delingData.day_master_score === "number"
                                                    ? delingData.day_master_score.toFixed(2)
                                                    : parseFloat(String(delingData.day_master_score)).toFixed(2)}）
                                                </span>
                                              )}
                                            </td>
                                          </tr>
                                          <tr className="hover:bg-gray-50">
                                            <td className="border border-gray-300 px-3 py-2 font-semibold bg-gray-50">是否得令</td>
                                            <td className="border border-gray-300 px-3 py-2 text-center">
                                              {delingData.is_deling ? (
                                                <span className="text-green-600 font-semibold">是</span>
                                              ) : (
                                                <span className="text-red-600 font-semibold">否</span>
                                              )}
                                            </td>
                                          </tr>
                                          <tr className="hover:bg-gray-50">
                                            <td className="border border-gray-300 px-3 py-2 font-semibold bg-gray-50">规则</td>
                                            <td className="border border-gray-300 px-3 py-2 text-center text-xs text-gray-600">
                                              {delingData.rule_text || delingData.ruleset_id || "-"}
                                            </td>
                                          </tr>
                                        </tbody>
                                      </table>
                                    </div>
                                  </div>
                                )}
                                {/* 根气表 */}
                                {rootqiData && rootqiData.summaries && rootqiData.summaries.length > 0 && (
                                  <div className="bg-white rounded-lg p-4 border border-gray-200">
                                    <h4 className="text-sm font-semibold text-gray-700 mb-3">根气表</h4>
                                    <div className="overflow-x-auto">
                                      <table className="w-full border-collapse text-sm">
                                        <tbody>
                                          {(() => {
                                            const pillarNames: Record<string, string> = {
                                              Y: "年",
                                              M: "月",
                                              D: "日",
                                              H: "时",
                                            };
                                            const levelNames: Record<string, string> = {
                                              NONE: "无根",
                                              WEAK: "弱根",
                                              MEDIUM: "中根",
                                              STRONG: "强根",
                                              UNKNOWN: "未知",
                                            };
                                            const summaries = rootqiData.summaries || [];
                                            const totalRoots = summaries.reduce(
                                              (sum: number, item: any) => sum + (item.root_count || 0),
                                              0
                                            );
                                            const best = summaries.reduce(
                                              (acc: any, item: any) => {
                                                const score = typeof item.total_root_score === "number"
                                                  ? item.total_root_score
                                                  : parseFloat(String(item.total_root_score || 0));
                                                return score > acc.score ? { item, score } : acc;
                                              },
                                              { item: null, score: -1 }
                                            );
                                            const bestItem = best.item;
                                            const targetLabel = bestItem
                                              ? `${bestItem.target_stem}（${pillarNames[bestItem.target_pillar] || bestItem.target_pillar}）`
                                              : "-";
                                            const bestScore = bestItem
                                              ? typeof bestItem.total_root_score === "number"
                                                ? bestItem.total_root_score.toFixed(4)
                                                : parseFloat(String(bestItem.total_root_score)).toFixed(4)
                                              : "-";
                                            const bestLevel = bestItem ? levelNames[bestItem.root_level] || bestItem.root_level : "-";
                                            const bestRoot = bestItem?.best_root_branch
                                              ? `${bestItem.best_root_branch}(${pillarNames[bestItem.best_root_pillar] || bestItem.best_root_pillar})`
                                              : "-";

                                            return (
                                              <>
                                                <tr className="hover:bg-gray-50">
                                                  <td className="border border-gray-300 px-3 py-2 font-semibold bg-gray-50 w-1/3">目标天干</td>
                                                  <td className="border border-gray-300 px-3 py-2 text-center font-medium text-xs">
                                                    {targetLabel}
                                                  </td>
                                                </tr>
                                                <tr className="hover:bg-gray-50">
                                                  <td className="border border-gray-300 px-3 py-2 font-semibold bg-gray-50">总根数</td>
                                                  <td className="border border-gray-300 px-3 py-2 text-center text-xs">{totalRoots}</td>
                                                </tr>
                                                <tr className="hover:bg-gray-50">
                                                  <td className="border border-gray-300 px-3 py-2 font-semibold bg-gray-50">最高根分</td>
                                                  <td className="border border-gray-300 px-3 py-2 text-center text-xs">{bestScore}</td>
                                                </tr>
                                                <tr className="hover:bg-gray-50">
                                                  <td className="border border-gray-300 px-3 py-2 font-semibold bg-gray-50">最高等级</td>
                                                  <td className="border border-gray-300 px-3 py-2 text-center text-xs">{bestLevel}</td>
                                                </tr>
                                                <tr className="hover:bg-gray-50">
                                                  <td className="border border-gray-300 px-3 py-2 font-semibold bg-gray-50">最佳根</td>
                                                  <td className="border border-gray-300 px-3 py-2 text-center text-xs">{bestRoot}</td>
                                                </tr>
                                              </>
                                            );
                                          })()}
                                        </tbody>
                                      </table>
                                    </div>
                                  </div>
                                )}
                                {/* 得助表 */}
                                {dezhuData && dezhuData.summary && (
                                  <div className="bg-white rounded-lg p-4 border border-gray-200">
                                    <h4 className="text-sm font-semibold text-gray-700 mb-3">得助表</h4>
                                    <div className="overflow-x-auto">
                                      <table className="w-full border-collapse text-sm">
                                        <tbody>
                                          <tr className="hover:bg-gray-50">
                                            <td className="border border-gray-300 px-3 py-2 font-semibold bg-gray-50 w-1/3">比劫得分</td>
                                            <td className="border border-gray-300 px-3 py-2 text-center">
                                              {typeof dezhuData.summary.same_class_score === 'number' ? dezhuData.summary.same_class_score.toFixed(4) : parseFloat(String(dezhuData.summary.same_class_score)).toFixed(4)}
                                            </td>
                                          </tr>
                                          <tr className="hover:bg-gray-50">
                                            <td className="border border-gray-300 px-3 py-2 font-semibold bg-gray-50">生扶得分</td>
                                            <td className="border border-gray-300 px-3 py-2 text-center">
                                              {typeof dezhuData.summary.shengfu_score === 'number' ? dezhuData.summary.shengfu_score.toFixed(4) : parseFloat(String(dezhuData.summary.shengfu_score)).toFixed(4)}
                                            </td>
                                          </tr>
                                          <tr className="hover:bg-gray-50">
                                            <td className="border border-gray-300 px-3 py-2 font-semibold bg-gray-50">总得助分</td>
                                            <td className="border border-gray-300 px-3 py-2 text-center font-semibold">
                                              {typeof dezhuData.summary.total_support_score === 'number' ? dezhuData.summary.total_support_score.toFixed(4) : parseFloat(String(dezhuData.summary.total_support_score)).toFixed(4)}
                                            </td>
                                          </tr>
                                        </tbody>
                                      </table>
                                    </div>
                                  </div>
                                )}
                              </div>
                              {keXieData && keXieData.summary && (
                                <div className="mt-4 bg-white rounded-lg p-4 border border-gray-200">
                                  <h4 className="text-sm font-semibold text-gray-700 mb-3">受克泄耗（制化）</h4>
                                  <div className="overflow-x-auto">
                                    <table className="w-full border-collapse text-sm">
                                      <tbody>
                                        <tr className="hover:bg-gray-50">
                                          <td className="border border-gray-300 px-3 py-2 font-semibold bg-gray-50 w-1/4">泄分</td>
                                          <td className="border border-gray-300 px-3 py-2 text-center">
                                            {typeof keXieData.summary.xie_score === "number"
                                              ? keXieData.summary.xie_score.toFixed(4)
                                              : parseFloat(String(keXieData.summary.xie_score)).toFixed(4)}
                                          </td>
                                          <td className="border border-gray-300 px-3 py-2 font-semibold bg-gray-50 w-1/4">耗分</td>
                                          <td className="border border-gray-300 px-3 py-2 text-center">
                                            {typeof keXieData.summary.hao_score === "number"
                                              ? keXieData.summary.hao_score.toFixed(4)
                                              : parseFloat(String(keXieData.summary.hao_score)).toFixed(4)}
                                          </td>
                                        </tr>
                                        <tr className="hover:bg-gray-50">
                                          <td className="border border-gray-300 px-3 py-2 font-semibold bg-gray-50">克分</td>
                                          <td className="border border-gray-300 px-3 py-2 text-center">
                                            {typeof keXieData.summary.ke_score === "number"
                                              ? keXieData.summary.ke_score.toFixed(4)
                                              : parseFloat(String(keXieData.summary.ke_score)).toFixed(4)}
                                          </td>
                                          <td className="border border-gray-300 px-3 py-2 font-semibold bg-gray-50">制化分</td>
                                          <td className="border border-gray-300 px-3 py-2 text-center">
                                            {typeof keXieData.summary.zhihua_score === "number"
                                              ? keXieData.summary.zhihua_score.toFixed(4)
                                              : parseFloat(String(keXieData.summary.zhihua_score)).toFixed(4)}
                                          </td>
                                        </tr>
                                        <tr className="hover:bg-gray-50">
                                          <td className="border border-gray-300 px-3 py-2 font-semibold bg-gray-50">总分</td>
                                          <td className="border border-gray-300 px-3 py-2 text-center font-semibold" colSpan={3}>
                                            {typeof keXieData.summary.total_score === "number"
                                              ? keXieData.summary.total_score.toFixed(4)
                                              : parseFloat(String(keXieData.summary.total_score)).toFixed(4)}
                                          </td>
                                        </tr>
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                          {/* 步骤5显示寒暖燥湿与调候 */}
                          {step.step === 5 && step.result?.climate_balance && (
                            <div className="mt-4 space-y-4">
                              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                <div className="bg-white rounded-lg p-4 border border-gray-200">
                                  <h4 className="text-sm font-semibold text-gray-700 mb-3">寒暖燥湿</h4>
                                  <div className="overflow-x-auto">
                                    <table className="w-full border-collapse text-sm">
                                      <tbody>
                                        <tr className="hover:bg-gray-50">
                                          <td className="border border-gray-300 px-3 py-2 font-semibold bg-gray-50 w-1/3">温度</td>
                                          <td className="border border-gray-300 px-3 py-2 text-center">{step.result.climate_balance.temperature || "-"}</td>
                                        </tr>
                                        <tr className="hover:bg-gray-50">
                                          <td className="border border-gray-300 px-3 py-2 font-semibold bg-gray-50">湿度</td>
                                          <td className="border border-gray-300 px-3 py-2 text-center">{step.result.climate_balance.humidity || "-"}</td>
                                        </tr>
                                        <tr className="hover:bg-gray-50">
                                          <td className="border border-gray-300 px-3 py-2 font-semibold bg-gray-50">燥湿</td>
                                          <td className="border border-gray-300 px-3 py-2 text-center">{step.result.climate_balance.dry_wet || "-"}</td>
                                        </tr>
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                                <div className="bg-white rounded-lg p-4 border border-gray-200">
                                  <h4 className="text-sm font-semibold text-gray-700 mb-3">调候建议</h4>
                                  <div className="space-y-2 text-sm">
                                    <div>
                                      <div className="text-xs text-gray-500 mb-1">需要</div>
                                      <div className="text-gray-700">
                                        {step.result.climate_balance.needs?.length
                                          ? step.result.climate_balance.needs.join("、")
                                          : "-"}
                                      </div>
                                    </div>
                                    <div>
                                      <div className="text-xs text-gray-500 mb-1">备注</div>
                                      <div className="text-gray-700">
                                        {step.result.climate_balance.notes?.length
                                          ? step.result.climate_balance.notes.join("、")
                                          : "-"}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                              {step.result.han_zao?.summary && (
                                <div className="bg-white rounded-lg p-4 border border-gray-200">
                                  <h4 className="text-sm font-semibold text-gray-700 mb-3">寒暖燥湿汇总</h4>
                                  <div className="overflow-x-auto">
                                    <table className="w-full border-collapse text-sm">
                                      <tbody>
                                        <tr className="hover:bg-gray-50">
                                          <td className="border border-gray-300 px-3 py-2 font-semibold bg-gray-50 w-1/4">偏寒</td>
                                          <td className="border border-gray-300 px-3 py-2 text-center">
                                            {typeof step.result.han_zao.summary.han_score === "number"
                                              ? step.result.han_zao.summary.han_score.toFixed(4)
                                              : parseFloat(String(step.result.han_zao.summary.han_score)).toFixed(4)}
                                          </td>
                                          <td className="border border-gray-300 px-3 py-2 font-semibold bg-gray-50 w-1/4">偏热</td>
                                          <td className="border border-gray-300 px-3 py-2 text-center">
                                            {typeof step.result.han_zao.summary.re_score === "number"
                                              ? step.result.han_zao.summary.re_score.toFixed(4)
                                              : parseFloat(String(step.result.han_zao.summary.re_score)).toFixed(4)}
                                          </td>
                                        </tr>
                                        <tr className="hover:bg-gray-50">
                                          <td className="border border-gray-300 px-3 py-2 font-semibold bg-gray-50">偏燥</td>
                                          <td className="border border-gray-300 px-3 py-2 text-center">
                                            {typeof step.result.han_zao.summary.zao_score === "number"
                                              ? step.result.han_zao.summary.zao_score.toFixed(4)
                                              : parseFloat(String(step.result.han_zao.summary.zao_score)).toFixed(4)}
                                          </td>
                                          <td className="border border-gray-300 px-3 py-2 font-semibold bg-gray-50">偏湿</td>
                                          <td className="border border-gray-300 px-3 py-2 text-center">
                                            {typeof step.result.han_zao.summary.shi_score === "number"
                                              ? step.result.han_zao.summary.shi_score.toFixed(4)
                                              : parseFloat(String(step.result.han_zao.summary.shi_score)).toFixed(4)}
                                          </td>
                                        </tr>
                                        <tr className="hover:bg-gray-50">
                                          <td className="border border-gray-300 px-3 py-2 font-semibold bg-gray-50">结论</td>
                                          <td className="border border-gray-300 px-3 py-2 text-center font-semibold" colSpan={3}>
                                            {getTendencyChinese(step.result.han_zao.summary.final_tendency)}
                                          </td>
                                        </tr>
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                          {step.step === 6 && step.result?.structure && (() => {
                            const structure = step.result.structure;
                            const summary = structure.summary || {};
                            return (
                              <div className="mt-4 space-y-4">
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                  <div className="bg-white rounded-lg p-4 border border-gray-200">
                                    <h4 className="text-sm font-semibold text-gray-700 mb-3">格局摘要</h4>
                                    <div className="overflow-x-auto">
                                      <table className="w-full border-collapse text-sm">
                                        <tbody>
                                          <tr className="hover:bg-gray-50">
                                            <td className="border border-gray-300 px-3 py-2 font-semibold bg-gray-50 w-1/3">主格局</td>
                                            <td className="border border-gray-300 px-3 py-2 text-center">
                                              {structure.primary_pattern || "-"}
                                            </td>
                                          </tr>
                                          <tr className="hover:bg-gray-50">
                                            <td className="border border-gray-300 px-3 py-2 font-semibold bg-gray-50">清纯/破格</td>
                                            <td className="border border-gray-300 px-3 py-2 text-center">
                                              {structure.purity || "-"}
                                            </td>
                                          </tr>
                                          <tr className="hover:bg-gray-50">
                                            <td className="border border-gray-300 px-3 py-2 font-semibold bg-gray-50">清纯分</td>
                                            <td className="border border-gray-300 px-3 py-2 text-center">
                                              {summary.purity_score ?? "-"}
                                            </td>
                                          </tr>
                                          <tr className="hover:bg-gray-50">
                                            <td className="border border-gray-300 px-3 py-2 font-semibold bg-gray-50">破格等级</td>
                                            <td className="border border-gray-300 px-3 py-2 text-center">
                                              {getBreakLevelChinese(summary.break_level)}
                                            </td>
                                          </tr>
                                        </tbody>
                                      </table>
                                    </div>
                                  </div>
                                  <div className="bg-white rounded-lg p-4 border border-gray-200">
                                    <h4 className="text-sm font-semibold text-gray-700 mb-3">破格点</h4>
                                    <div className="text-sm text-gray-700">
                                      {structure.breakers?.length ? structure.breakers.join("，") : "-"}
                                    </div>
                                  </div>
                                </div>
                                {Array.isArray(structure.candidates) && structure.candidates.length > 0 && (
                                  <div className="bg-white rounded-lg p-4 border border-gray-200">
                                    <h4 className="text-sm font-semibold text-gray-700 mb-3">候选格局</h4>
                                    <div className="overflow-x-auto">
                                      <table className="w-full border-collapse text-sm">
                                        <thead>
                                          <tr className="bg-gray-50">
                                            <th className="border border-gray-300 px-3 py-2 text-left font-semibold">格局</th>
                                            <th className="border border-gray-300 px-3 py-2 text-center font-semibold">核心十神</th>
                                            <th className="border border-gray-300 px-3 py-2 text-center font-semibold">得分</th>
                                            <th className="border border-gray-300 px-3 py-2 text-center font-semibold">置信度</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {structure.candidates.map((c: any, idx: number) => (
                                            <tr key={idx} className="hover:bg-gray-50">
                                              <td className="border border-gray-300 px-3 py-2 font-medium">
                                                {c.pattern_code || "-"}
                                              </td>
                                              <td className="border border-gray-300 px-3 py-2 text-center">
                                                {c.core_tenshen || "-"}
                                              </td>
                                              <td className="border border-gray-300 px-3 py-2 text-center">
                                                {typeof c.score === "number" ? c.score.toFixed(1) : c.score ?? "-"}
                                              </td>
                                              <td className="border border-gray-300 px-3 py-2 text-center">
                                                {typeof c.confidence === "number" ? c.confidence.toFixed(2) : c.confidence ?? "-"}
                                              </td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  </div>
                                )}
                                {Array.isArray(structure.formations) && structure.formations.length > 0 && (
                                  <div className="bg-white rounded-lg p-4 border border-gray-200">
                                    <h4 className="text-sm font-semibold text-gray-700 mb-3">成局列表</h4>
                                    <div className="overflow-x-auto">
                                      <table className="w-full border-collapse text-sm">
                                        <thead>
                                          <tr className="bg-gray-50">
                                            <th className="border border-gray-300 px-3 py-2 text-left font-semibold">类型</th>
                                            <th className="border border-gray-300 px-3 py-2 text-center font-semibold">局名</th>
                                            <th className="border border-gray-300 px-3 py-2 text-center font-semibold">状态</th>
                                            <th className="border border-gray-300 px-3 py-2 text-center font-semibold">得分</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {structure.formations.map((f: any, idx: number) => (
                                            <tr key={idx} className="hover:bg-gray-50">
                                              <td className="border border-gray-300 px-3 py-2 font-medium">
                                                {f.formation_type || "-"}
                                              </td>
                                              <td className="border border-gray-300 px-3 py-2 text-center">
                                                {f.formation_code || "-"}
                                              </td>
                                              <td className="border border-gray-300 px-3 py-2 text-center">
                                                {getFormationStatusChinese(f.status)}
                                              </td>
                                              <td className="border border-gray-300 px-3 py-2 text-center">
                                                {typeof f.score === "number" ? f.score.toFixed(1) : f.score ?? "-"}
                                              </td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })()}
                          {step.step === 7 && step.result?.useful_gods && (
                            <div className="mt-4 space-y-4">
                              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                <div className="bg-white rounded-lg p-4 border border-gray-200">
                                  <h4 className="text-sm font-semibold text-gray-700 mb-3">用神/喜神/忌神</h4>
                                  <div className="overflow-x-auto">
                                    <table className="w-full border-collapse text-sm">
                                      <tbody>
                                        <tr className="hover:bg-gray-50">
                                          <td className="border border-gray-300 px-3 py-2 font-semibold bg-gray-50 w-1/3">用神</td>
                                          <td className="border border-gray-300 px-3 py-2 text-center">
                                            {step.result.useful_gods.yong_shen?.element || "-"}
                                          </td>
                                        </tr>
                                        <tr className="hover:bg-gray-50">
                                          <td className="border border-gray-300 px-3 py-2 font-semibold bg-gray-50">喜神</td>
                                          <td className="border border-gray-300 px-3 py-2 text-center">
                                            {step.result.useful_gods.xi_shen?.length
                                              ? step.result.useful_gods.xi_shen.map((x: any) => x.element).join("，")
                                              : "-"}
                                          </td>
                                        </tr>
                                        <tr className="hover:bg-gray-50">
                                          <td className="border border-gray-300 px-3 py-2 font-semibold bg-gray-50">忌神</td>
                                          <td className="border border-gray-300 px-3 py-2 text-center">
                                            {step.result.useful_gods.ji_shen?.length
                                              ? step.result.useful_gods.ji_shen.map((x: any) => x.element).join("，")
                                              : "-"}
                                          </td>
                                        </tr>
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                                <div className="bg-white rounded-lg p-4 border border-gray-200">
                                  <h4 className="text-sm font-semibold text-gray-700 mb-3">取用理由</h4>
                                  <div className="space-y-2 text-sm text-gray-700">
                                    <div>
                                      <span className="text-xs text-gray-500">用神：</span>
                                      {step.result.useful_gods.yong_shen?.why || "-"}
                                    </div>
                                    <div>
                                      <span className="text-xs text-gray-500">喜神：</span>
                                      {step.result.useful_gods.xi_shen?.length
                                        ? step.result.useful_gods.xi_shen.map((x: any) => x.why).join("，")
                                        : "-"}
                                    </div>
                                    <div>
                                      <span className="text-xs text-gray-500">忌神：</span>
                                      {step.result.useful_gods.ji_shen?.length
                                        ? step.result.useful_gods.ji_shen.map((x: any) => x.why).join("，")
                                        : "-"}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                          {step.step === 8 && step.result?.consistency_check && (
                            <div className="mt-4 space-y-4">
                              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                <div className="bg-white rounded-lg p-4 border border-gray-200">
                                  <h4 className="text-sm font-semibold text-gray-700 mb-3">自洽评分</h4>
                                  <div className="overflow-x-auto">
                                    <table className="w-full border-collapse text-sm">
                                      <tbody>
                                        <tr className="hover:bg-gray-50">
                                          <td className="border border-gray-300 px-3 py-2 font-semibold bg-gray-50 w-1/3">评分</td>
                                          <td className="border border-gray-300 px-3 py-2 text-center">
                                            {step.result.consistency_check.consistency_score ?? "-"}
                                          </td>
                                        </tr>
                                        <tr className="hover:bg-gray-50">
                                          <td className="border border-gray-300 px-3 py-2 font-semibold bg-gray-50">结论</td>
                                          <td className="border border-gray-300 px-3 py-2 text-center">
                                            {getSelfConsistencyChinese(step.result.consistency_check.self_consistency)}
                                          </td>
                                        </tr>
                                        <tr className="hover:bg-gray-50">
                                          <td className="border border-gray-300 px-3 py-2 font-semibold bg-gray-50">病标签</td>
                                          <td className="border border-gray-300 px-3 py-2 text-center">
                                            {step.result.consistency_check.disease_tags?.length
                                              ? step.result.consistency_check.disease_tags.map((tag: string) => getDiseaseTagChinese(tag)).join("，")
                                              : "-"}
                                          </td>
                                        </tr>
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                                <div className="bg-white rounded-lg p-4 border border-gray-200">
                                  <h4 className="text-sm font-semibold text-gray-700 mb-3">药与风险</h4>
                                  <div className="space-y-2 text-sm text-gray-700">
                                    <div>
                                      <span className="text-xs text-gray-500">用神：</span>
                                      {step.result.consistency_check.remedy_candidates?.primary_yongshen || "-"}
                                    </div>
                                    <div>
                                      <span className="text-xs text-gray-500">调候：</span>
                                      {step.result.consistency_check.remedy_candidates?.tiao_hou || "-"}
                                    </div>
                                    <div>
                                      <span className="text-xs text-gray-500">问题：</span>
                                      {step.result.consistency_check.risk_points?.length
                                        ? step.result.consistency_check.risk_points.join("，")
                                        : "-"}
                                    </div>
                                  </div>
                                </div>
                              </div>
                              {Array.isArray(step.result.consistency_check.issues) &&
                                step.result.consistency_check.issues.length > 0 && (
                                  <div className="bg-white rounded-lg p-4 border border-gray-200">
                                    <h4 className="text-sm font-semibold text-gray-700 mb-3">问题明细</h4>
                                    <div className="overflow-x-auto">
                                      <table className="w-full border-collapse text-sm">
                                        <thead>
                                          <tr className="bg-gray-50">
                                            <th className="border border-gray-300 px-3 py-2 text-left font-semibold">类型</th>
                                            <th className="border border-gray-300 px-3 py-2 text-center font-semibold">等级</th>
                                            <th className="border border-gray-300 px-3 py-2 text-left font-semibold">说明</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {step.result.consistency_check.issues.map((i: any, idx: number) => (
                                            <tr key={idx} className="hover:bg-gray-50">
                                              <td className="border border-gray-300 px-3 py-2 font-medium">
                                                {getIssueTypeChinese(i.issue_type)}
                                              </td>
                                              <td className="border border-gray-300 px-3 py-2 text-center">
                                                {getSeverityChinese(i.severity)}
                                              </td>
                                              <td className="border border-gray-300 px-3 py-2">
                                                {i.message || "-"}
                                              </td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  </div>
                                )}
                            </div>
                          )}
                          {step.step === 9 && step.result?.tenshen_profile_static && (
                            <div className="mt-4 space-y-4">
                              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                <div className="bg-white rounded-lg p-4 border border-gray-200">
                                  <h4 className="text-sm font-semibold text-gray-700 mb-3">十神画像摘要</h4>
                                  <div className="overflow-x-auto">
                                    <table className="w-full border-collapse text-sm">
                                      <tbody>
                                        <tr className="hover:bg-gray-50">
                                          <td className="border border-gray-300 px-3 py-2 font-semibold bg-gray-50 w-1/3">主导十神</td>
                                          <td className="border border-gray-300 px-3 py-2 text-center">
                                            {step.result.tenshen_profile_static.top_tenshen?.length
                                              ? step.result.tenshen_profile_static.top_tenshen.join("，")
                                              : "-"}
                                          </td>
                                        </tr>
                                        <tr className="hover:bg-gray-50">
                                          <td className="border border-gray-300 px-3 py-2 font-semibold bg-gray-50">置信度</td>
                                          <td className="border border-gray-300 px-3 py-2 text-center">
                                            {step.result.tenshen_profile_static.confidence ?? "-"}
                                          </td>
                                        </tr>
                                        <tr className="hover:bg-gray-50">
                                          <td className="border border-gray-300 px-3 py-2 font-semibold bg-gray-50">证据条数</td>
                                          <td className="border border-gray-300 px-3 py-2 text-center">
                                            {step.result.tenshen_profile_static.evidence_count ?? "-"}
                                          </td>
                                        </tr>
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                                <div className="bg-white rounded-lg p-4 border border-gray-200">
                                  <h4 className="text-sm font-semibold text-gray-700 mb-3">六类占比</h4>
                                  <div className="overflow-x-auto">
                                    <table className="w-full border-collapse text-sm">
                                      <tbody>
                                        <tr className="hover:bg-gray-50">
                                          <td className="border border-gray-300 px-3 py-2 font-semibold bg-gray-50 w-1/3">财</td>
                                          <td className="border border-gray-300 px-3 py-2 text-center">
                                            {step.result.tenshen_profile_static.category_ratio?.财 ?? "-"}
                                          </td>
                                        </tr>
                                        <tr className="hover:bg-gray-50">
                                          <td className="border border-gray-300 px-3 py-2 font-semibold bg-gray-50">官杀</td>
                                          <td className="border border-gray-300 px-3 py-2 text-center">
                                            {step.result.tenshen_profile_static.category_ratio?.官杀 ?? "-"}
                                          </td>
                                        </tr>
                                        <tr className="hover:bg-gray-50">
                                          <td className="border border-gray-300 px-3 py-2 font-semibold bg-gray-50">印</td>
                                          <td className="border border-gray-300 px-3 py-2 text-center">
                                            {step.result.tenshen_profile_static.category_ratio?.印 ?? "-"}
                                          </td>
                                        </tr>
                                        <tr className="hover:bg-gray-50">
                                          <td className="border border-gray-300 px-3 py-2 font-semibold bg-gray-50">食伤</td>
                                          <td className="border border-gray-300 px-3 py-2 text-center">
                                            {step.result.tenshen_profile_static.category_ratio?.食伤 ?? "-"}
                                          </td>
                                        </tr>
                                        <tr className="hover:bg-gray-50">
                                          <td className="border border-gray-300 px-3 py-2 font-semibold bg-gray-50">比劫</td>
                                          <td className="border border-gray-300 px-3 py-2 text-center">
                                            {step.result.tenshen_profile_static.category_ratio?.比劫 ?? "-"}
                                          </td>
                                        </tr>
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              </div>
                              {Array.isArray(step.result.tenshen_profile_static.items) &&
                                step.result.tenshen_profile_static.items.length > 0 && (
                                  <div className="bg-white rounded-lg p-4 border border-gray-200">
                                    <h4 className="text-sm font-semibold text-gray-700 mb-3">十神明细</h4>
                                    <div className="overflow-x-auto">
                                      <table className="w-full border-collapse text-sm">
                                        <thead>
                                          <tr className="bg-gray-50">
                                            <th className="border border-gray-300 px-3 py-2 text-left font-semibold">十神</th>
                                            <th className="border border-gray-300 px-3 py-2 text-center font-semibold">出现数</th>
                                            <th className="border border-gray-300 px-3 py-2 text-center font-semibold">得分</th>
                                            <th className="border border-gray-300 px-3 py-2 text-center font-semibold">排名</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {step.result.tenshen_profile_static.items.map((item: any, idx: number) => (
                                            <tr key={idx} className="hover:bg-gray-50">
                                              <td className="border border-gray-300 px-3 py-2 font-medium">
                                                {item.tenshen_code || "-"}
                                              </td>
                                              <td className="border border-gray-300 px-3 py-2 text-center">
                                                {item.count_total ?? "-"}
                                              </td>
                                              <td className="border border-gray-300 px-3 py-2 text-center">
                                                {typeof item.score_total === "number"
                                                  ? item.score_total.toFixed(2)
                                                  : item.score_total ?? "-"}
                                              </td>
                                              <td className="border border-gray-300 px-3 py-2 text-center">
                                                {item.rank_no ?? "-"}
                                              </td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  </div>
                                )}
                            </div>
                          )}
                          {step.step === 10 && step.result?.dayun && (
                            <div className="mt-4 space-y-4">
                              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                <div className="bg-white rounded-lg p-4 border border-gray-200">
                                  <h4 className="text-sm font-semibold text-gray-700 mb-3">起运信息</h4>
                                  <div className="overflow-x-auto">
                                    <table className="w-full border-collapse text-sm">
                                      <tbody>
                                        <tr className="hover:bg-gray-50">
                                          <td className="border border-gray-300 px-3 py-2 font-semibold bg-gray-50">顺逆</td>
                                          <td className="border border-gray-300 px-3 py-2 text-center">
                                            {getDayunDirectionLabel(step.result.dayun.meta?.direction)}
                                          </td>
                                        </tr>
                                        <tr className="hover:bg-gray-50">
                                          <td className="border border-gray-300 px-3 py-2 font-semibold bg-gray-50">起运年龄</td>
                                          <td className="border border-gray-300 px-3 py-2 text-center">
                                            {step.result.dayun.meta?.start_age ?? "-"}
                                          </td>
                                        </tr>
                                        <tr className="hover:bg-gray-50">
                                          <td className="border border-gray-300 px-3 py-2 font-semibold bg-gray-50">起运年份</td>
                                          <td className="border border-gray-300 px-3 py-2 text-center">
                                            {step.result.dayun.meta?.start_year ?? "-"}
                                          </td>
                                        </tr>
                                        <tr className="hover:bg-gray-50">
                                          <td className="border border-gray-300 px-3 py-2 font-semibold bg-gray-50">目标节气</td>
                                          <td className="border border-gray-300 px-3 py-2 text-center">
                                            {step.result.dayun.meta?.target_jieqi_name || "-"}
                                          </td>
                                        </tr>
                                        <tr className="hover:bg-gray-50">
                                          <td className="border border-gray-300 px-3 py-2 font-semibold bg-gray-50">节气时间</td>
                                          <td className="border border-gray-300 px-3 py-2 text-center">
                                            {formatDateTime(step.result.dayun.meta?.target_jieqi_datetime)}
                                          </td>
                                        </tr>
                                        <tr className="hover:bg-gray-50">
                                          <td className="border border-gray-300 px-3 py-2 font-semibold bg-gray-50">起运天数</td>
                                          <td className="border border-gray-300 px-3 py-2 text-center">
                                            {step.result.dayun.meta?.diff_days ?? "-"}
                                          </td>
                                        </tr>
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                                <div className="bg-white rounded-lg p-4 border border-gray-200">
                                  <h4 className="text-sm font-semibold text-gray-700 mb-3">规则摘要</h4>
                                  <div className="space-y-2 text-sm text-gray-700">
                                    <div>
                                      <span className="text-xs text-gray-500">年干阴阳：</span>
                                      {getYinyangChinese(step.result.dayun.meta?.year_stem_yinyang)}
                                    </div>
                                    <div>
                                      <span className="text-xs text-gray-500">性别：</span>
                                      {getGenderChinese(step.result.dayun.meta?.gender)}
                                    </div>
                                    <div>
                                      <span className="text-xs text-gray-500">规则版本：</span>
                                      {step.result.dayun.meta?.rule_version || "-"}
                                    </div>
                                  </div>
                                </div>
                              </div>
                              {Array.isArray(step.result.dayun.list) && step.result.dayun.list.length > 0 && (
                                <div className="bg-white rounded-lg p-4 border border-gray-200">
                                  <h4 className="text-sm font-semibold text-gray-700 mb-3">大运列表</h4>
                                  <div className="overflow-x-auto">
                                    <table className="w-full border-collapse text-sm">
                                      <thead>
                                        <tr className="bg-gray-50">
                                          <th className="border border-gray-300 px-3 py-2 text-left font-semibold">运序</th>
                                          <th className="border border-gray-300 px-3 py-2 text-center font-semibold">大运干支</th>
                                          <th className="border border-gray-300 px-3 py-2 text-center font-semibold">起运年龄</th>
                                          <th className="border border-gray-300 px-3 py-2 text-center font-semibold">起运年份</th>
                                          <th className="border border-gray-300 px-3 py-2 text-center font-semibold">起运月份</th>
                                          <th className="border border-gray-300 px-3 py-2 text-center font-semibold">结束年份</th>
                                          <th className="border border-gray-300 px-3 py-2 text-center font-semibold">结束月份</th>
                                          <th className="border border-gray-300 px-3 py-2 text-center font-semibold">顺逆</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {step.result.dayun.list.map((item: any) => (
                                          <tr key={item.seq} className="hover:bg-gray-50">
                                            <td className="border border-gray-300 px-3 py-2 font-medium">{item.seq}</td>
                                            <td className="border border-gray-300 px-3 py-2 text-center">
                                              {item.dayun_pillar || "-"}
                                            </td>
                                            <td className="border border-gray-300 px-3 py-2 text-center">
                                              {item.start_age ?? "-"}
                                            </td>
                                            <td className="border border-gray-300 px-3 py-2 text-center">
                                              {item.start_year ?? "-"}
                                            </td>
                                            <td className="border border-gray-300 px-3 py-2 text-center">
                                              {item.start_month ?? "-"}
                                            </td>
                                            <td className="border border-gray-300 px-3 py-2 text-center">
                                              {item.end_year ?? "-"}
                                            </td>
                                            <td className="border border-gray-300 px-3 py-2 text-center">
                                              {item.end_month ?? "-"}
                                            </td>
                                            <td className="border border-gray-300 px-3 py-2 text-center">
                                              {getDayunDirectionLabel(item.direction)}
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                          {userRole === "qmdj" && (
                            <details className="mt-4">
                              <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
                                查看原始JSON数据
                              </summary>
                              <div className="mt-2 bg-gray-100 rounded p-3">
                                <pre className="text-xs whitespace-pre-wrap overflow-auto">
                                  {JSON.stringify(step.result, null, 2)}
                                </pre>
                              </div>
                            </details>
                          )}
                        </div>
                      </Panel>
                    );
                  })}
                </Collapse>
              </div>
            )}

            {loading && (
              <div className="bg-white rounded-lg shadow-md p-6 text-center">
                <Spin size="large" />
                <p className="mt-4 text-gray-600">正在生成八字排盘，请稍候...</p>
              </div>
            )}
          </div>
        </div>
        <SidebarDrawer title="瞬间移动">
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2 rounded-lg bg-gray-100 p-1">
              <button
                type="button"
                onClick={() => setSidebarTab("ask")}
                className={`rounded-md py-2 text-sm transition-colors ${
                  sidebarTab === "ask"
                    ? "bg-amber-600 text-white"
                    : "text-gray-700 hover:bg-gray-200"
                }`}
              >
                问问
              </button>
              <button
                type="button"
                onClick={() => setSidebarTab("look")}
                className={`rounded-md py-2 text-sm transition-colors ${
                  sidebarTab === "look"
                    ? "bg-amber-600 text-white"
                    : "text-gray-700 hover:bg-gray-200"
                }`}
              >
                看看
              </button>
            </div>
            {sidebarTab === "ask" ? (
              <div className="text-sm">
                <a href="/qimen#qimen-date" className="flex items-start gap-3 py-3 text-amber-700 hover:text-amber-800">
                  <span className="flex w-4 flex-col items-center">
                    <span className="h-2 w-2 rounded-full bg-amber-500" />
                    <span className="relative mt-2 h-4 w-px bg-amber-200">
                      <span className="absolute -bottom-1 left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 border-b border-r border-amber-300" />
                    </span>
                  </span>
                  起盘
                </a>
                <a href="/qimen#qimen-question" className="flex items-start gap-3 py-3 text-amber-700 hover:text-amber-800">
                  <span className="flex w-4 flex-col items-center">
                    <span className="h-2 w-2 rounded-full bg-amber-500" />
                    <span className="relative mt-2 h-4 w-px bg-amber-200">
                      <span className="absolute -bottom-1 left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 border-b border-r border-amber-300" />
                    </span>
                  </span>
                  问事
                </a>
                <a href="/qimen#qimen-history" className="flex items-start gap-3 py-3 text-amber-700 hover:text-amber-800">
                  <span className="flex w-4 flex-col items-center">
                    <span className="h-2 w-2 rounded-full bg-amber-500" />
                    <span className="relative mt-2 h-4 w-px bg-amber-200">
                      <span className="absolute -bottom-1 left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 border-b border-r border-amber-300" />
                    </span>
                  </span>
                  历史
                </a>
              </div>
            ) : (
              <div className="text-sm">
                {baziTimeline.map((item) => (
                  <a
                    key={item.step}
                    href={getBaziStepHref(item.step)}
                    onClick={() => {
                      if (isBaziRoute) {
                        setActiveStepKey(String(item.step));
                      }
                    }}
                    className="flex items-start gap-3 py-3 text-amber-700 hover:text-amber-800"
                  >
                    <span className="flex w-4 flex-col items-center">
                      <span className="h-2 w-2 rounded-full bg-amber-500" />
                      <span className="relative mt-2 h-4 w-px bg-amber-200">
                        <span className="absolute -bottom-1 left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 border-b border-r border-amber-300" />
                      </span>
                    </span>
                    {item.label}
                  </a>
                ))}
              </div>
            )}
          </div>
        </SidebarDrawer>
      </Layout>
    </ConfigProvider>
  );
}



