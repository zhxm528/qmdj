"use client";

import React, { useState } from "react";
import { Button, ConfigProvider, Card, Spin, Collapse, Tooltip } from "antd";
import zhCN from "antd/locale/zh_CN";
import dynamic from "next/dynamic";
import Layout from "@/components/Layout";
import DateSelector from "@/components/DateSelector";
import HourSelector from "@/components/HourSelector";
import MinuteSelector from "@/components/MinuteSelector";

const { Panel } = Collapse;

// 动态导入 ECharts 组件（避免 SSR 问题）
const ReactECharts = dynamic(() => import("echarts-for-react"), { ssr: false });

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

interface BaziStep {
  step: number;
  name: string;
  annotations: string;
  result: any;
  confidence: number;
}

export default function BaziPage() {
  const [date, setDate] = useState<string>(getCurrentDate());
  const [hour, setHour] = useState<string>(getCurrentHour());
  const [minute, setMinute] = useState<string>(getCurrentMinute());
  const [loading, setLoading] = useState(false);
  const [baziSteps, setBaziSteps] = useState<BaziStep[]>([]);
  const [fourPillars, setFourPillars] = useState<{
    year: string;
    month: string;
    day: string;
    hour: string;
  } | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
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

  const dateParts = date ? date.split("-") : null;
  const year = dateParts && dateParts.length === 3 ? dateParts[0] : "";
  const month = dateParts && dateParts.length === 3 ? dateParts[1] : "";
  const day = dateParts && dateParts.length === 3 ? dateParts[2] : "";

  // 获取用户角色
  React.useEffect(() => {
    const fetchUserRole = async () => {
      try {
        const response = await fetch("/api/user/me");
        if (response.ok) {
          const userData = await response.json();
          setUserRole(userData.role || null);
        }
      } catch (error) {
        // 用户未登录或获取失败，不设置角色
        setUserRole(null);
      }
    };
    fetchUserRole();
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

      // 调用八字排盘 API
      const response = await fetch("/api/bazi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date,
          hour,
          minute,
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
            
            const hiddenStemsResponse = await fetch("/api/bazi/dizhicanggan", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ branches }),
            });
            
            if (hiddenStemsResponse.ok) {
              const hiddenStemsData = await hiddenStemsResponse.json();
              if (hiddenStemsData.success && hiddenStemsData.result) {
                setHiddenStemsData(hiddenStemsData.result);
              }
            }
          } catch (error) {
            console.warn("获取地支藏干信息失败:", error);
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
        }

        // 保存到数据库（如果用户已登录）
        try {
          const userCheckResponse = await fetch("/api/user/me");
          if (userCheckResponse.ok) {
            // 构建JSON数据
            const baziJson = buildBaziJson(data.steps, data.fourPillars, date, hour, minute);
            
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

  // 将步骤结果转换为自然语言描述
  const formatStepResult = (step: BaziStep): string => {
    const { step: stepNum, result } = step;
    
    switch (stepNum) {
      case 1: {
        // 定日主（命主）
        const { day_master, day_pillar, five_elements } = result;
        let text = `日主为${day_master.stem}（${day_master.element}，${day_master.yin_yang}），日柱为${day_pillar.stem}${day_pillar.branch}。\n\n`;
        
        // 五行分布
        if (five_elements) {
          text += "【五行分布】\n";
          text += `年柱：天干 ${five_elements.stems.year_stem.stem}（${five_elements.stems.year_stem.element}），地支 ${five_elements.branches.year_branch.branch}（${five_elements.branches.year_branch.element}）\n`;
          text += `月柱：天干 ${five_elements.stems.month_stem.stem}（${five_elements.stems.month_stem.element}），地支 ${five_elements.branches.month_branch.branch}（${five_elements.branches.month_branch.element}）\n`;
          text += `日柱：天干 ${five_elements.stems.day_stem.stem}（${five_elements.stems.day_stem.element}），地支 ${five_elements.branches.day_branch.branch}（${five_elements.branches.day_branch.element}）\n`;
          text += `时柱：天干 ${five_elements.stems.hour_stem.stem}（${five_elements.stems.hour_stem.element}），地支 ${five_elements.branches.hour_branch.branch}（${five_elements.branches.hour_branch.element}）\n\n`;
          
          // 五行统计
          if (five_elements.optional_summary) {
            const counts = five_elements.optional_summary.count_by_element;
            text += "【五行统计】\n";
            text += `木：${counts.木}、火：${counts.火}、土：${counts.土}、金：${counts.金}、水：${counts.水}\n`;
            if (five_elements.optional_summary.notes) {
              text += `备注：${five_elements.optional_summary.notes}\n`;
            }
          }
        }
        
        return text;
      }
      
      case 2:
      case 3:
      case 4:
      case 5:
      case 6:
      case 7:
      case 8:
      case 9:
      case 10:
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
    minute: string
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
          sex: "",
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
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">生辰八字</h1>
              <p className="text-gray-600 text-sm">
                请选择你的出生日期与时间，我们将根据生辰八字进行排盘与分析。
              </p>
            </div>

            {/* 日期与时辰选择 */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                  <div className="grid grid-cols-2 gap-3">
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
              </div>

              <div className="mt-6 flex justify-center">
                <Button
                  type="primary"
                  size="large"
                  onClick={handleBaziPaipan}
                  loading={loading}
                  disabled={!date || !hour}
                  className="bg-amber-600 hover:bg-amber-700"
                >
                  生成八字排盘
                </Button>
              </div>
            </div>

            {/* 13个步骤结果展示 */}
            {baziSteps.length > 0 && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">排盘结果</h2>
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
                <Collapse defaultActiveKey={["1"]} accordion>
                  {baziSteps.map((step) => {
                    const naturalText = formatStepResult(step);
                    return (
                      <Panel
                        header={
                          <div className="flex items-center justify-between">
                            <span>
                              <span className="font-semibold">{step.step}：</span>
                              {step.name}
                            </span>
                            <Tooltip
                              title={
                                <div className="text-xs">
                                  <div>90%~100%：几乎不依赖主观判断</div>
                                  <div>60%~80%：规则较稳定，但仍可能受口径影响</div>
                                  <div>30%~50%：强依赖流派与综合判断</div>
                                  <div>0%~20%：信息不足或明显不确定</div>
                                </div>
                              }
                              placement="left"
                            >
                              <span className="text-sm text-gray-500 cursor-help hover:text-gray-700">
                                置信度: {(step.confidence * 100).toFixed(0)}%
                              </span>
                            </Tooltip>
                          </div>
                        }
                        key={step.step}
                      >
                        <div className="space-y-4">
                          <p className="text-sm text-gray-600 italic">{step.annotations}</p>
                          <div className="bg-gray-50 rounded-lg p-4">
                            <div className="text-sm whitespace-pre-wrap text-gray-800 leading-relaxed">
                              {naturalText}
                            </div>
                          </div>
                          {/* 步骤1显示天干五行阴阳表格 */}
                          {step.step === 1 && fourPillars && ganMetaData && (
                            <div className="mt-4 bg-white rounded-lg p-4 border border-gray-200">
                              <h4 className="text-sm font-semibold text-gray-700 mb-3">天干五行阴阳表</h4>
                              <div className="overflow-x-auto">
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
                          )}
                          {/* 步骤1显示地支藏干表格 */}
                          {step.step === 1 && fourPillars && hiddenStemsData && (
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
                          {/* 步骤1显示五行统计雷达图 */}
                          {step.step === 1 && step.result.five_elements?.optional_summary?.count_by_element && (
                            <div className="mt-4 bg-white rounded-lg p-4 border border-gray-200">
                              <h4 className="text-sm font-semibold text-gray-700 mb-3">五行统计雷达图</h4>
                              <ReactECharts
                                option={getRadarChartOption(step.result.five_elements.optional_summary.count_by_element)}
                                style={{ height: "400px", width: "100%" }}
                                opts={{ renderer: "svg" }}
                              />
                            </div>
                          )}
                          {/* 步骤1显示天干地支关系规则表 */}
                          {step.step === 1 && ganheData && (
                            <div className="mt-4 bg-white rounded-lg p-4 border border-gray-200">
                              <h4 className="text-sm font-semibold text-gray-700 mb-3">天干地支关系规则表</h4>
                              <div className="space-y-6">
                                {/* 五合（天干五合） */}
                                <div>
                                  <h5 className="text-xs font-semibold text-gray-600 mb-2">五合（天干五合）</h5>
                                  <div className="overflow-x-auto">
                                    <table className="w-full border-collapse text-sm">
                                      <thead>
                                        <tr className="bg-gray-50">
                                          <th className="border border-gray-300 px-3 py-2 text-center font-semibold">天干1</th>
                                          <th className="border border-gray-300 px-3 py-2 text-center font-semibold">天干2</th>
                                          <th className="border border-gray-300 px-3 py-2 text-center font-semibold">合化五行</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {Object.entries(ganheData.gan_he)
                                          .filter(([gan, _]) => ["甲", "乙", "丙", "丁", "戊"].includes(gan))
                                          .map(([gan, info]) => (
                                            <tr key={gan} className="hover:bg-gray-50">
                                              <td className="border border-gray-300 px-3 py-2 text-center font-medium">{gan}</td>
                                              <td className="border border-gray-300 px-3 py-2 text-center font-medium">{info.with}</td>
                                              <td className="border border-gray-300 px-3 py-2 text-center">{info.transform}</td>
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
                                          <th className="border border-gray-300 px-3 py-2 text-center font-semibold">地支1</th>
                                          <th className="border border-gray-300 px-3 py-2 text-center font-semibold">地支2</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {Object.entries(ganheData.zhi_liuhe)
                                          .filter(([zhi, _]) => ["子", "寅", "卯", "辰", "巳", "午"].includes(zhi))
                                          .map(([zhi, partner]) => (
                                            <tr key={zhi} className="hover:bg-gray-50">
                                              <td className="border border-gray-300 px-3 py-2 text-center font-medium">{zhi}</td>
                                              <td className="border border-gray-300 px-3 py-2 text-center font-medium">{partner}</td>
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
                                          <th className="border border-gray-300 px-3 py-2 text-center font-semibold">三合局</th>
                                          <th className="border border-gray-300 px-3 py-2 text-center font-semibold">合化五行</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {Object.entries(ganheData.zhi_sanhe)
                                          .filter(([combo, _]) => ["申子辰", "寅午戌", "亥卯未", "巳酉丑"].includes(combo))
                                          .map(([combo, element]) => (
                                            <tr key={combo} className="hover:bg-gray-50">
                                              <td className="border border-gray-300 px-3 py-2 text-center font-medium">{combo}</td>
                                              <td className="border border-gray-300 px-3 py-2 text-center">{element}</td>
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
                                          <th className="border border-gray-300 px-3 py-2 text-center font-semibold">三会局</th>
                                          <th className="border border-gray-300 px-3 py-2 text-center font-semibold">会化五行</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {Object.entries(ganheData.zhi_sanhui)
                                          .filter(([combo, _]) => ["亥子丑", "寅卯辰", "巳午未", "申酉戌"].includes(combo))
                                          .map(([combo, element]) => (
                                            <tr key={combo} className="hover:bg-gray-50">
                                              <td className="border border-gray-300 px-3 py-2 text-center font-medium">{combo}</td>
                                              <td className="border border-gray-300 px-3 py-2 text-center">{element}</td>
                                            </tr>
                                          ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                                
                                {/* 冲（地支六冲） */}
                                <div>
                                  <h5 className="text-xs font-semibold text-gray-600 mb-2">冲（地支六冲）</h5>
                                  <div className="overflow-x-auto">
                                    <table className="w-full border-collapse text-sm">
                                      <thead>
                                        <tr className="bg-gray-50">
                                          <th className="border border-gray-300 px-3 py-2 text-center font-semibold">地支1</th>
                                          <th className="border border-gray-300 px-3 py-2 text-center font-semibold">地支2</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {Object.entries(ganheData.zhi_chong)
                                          .filter(([zhi, _]) => ["子", "丑", "寅", "卯", "辰", "巳"].includes(zhi))
                                          .map(([zhi, partner]) => (
                                            <tr key={zhi} className="hover:bg-gray-50">
                                              <td className="border border-gray-300 px-3 py-2 text-center font-medium">{zhi}</td>
                                              <td className="border border-gray-300 px-3 py-2 text-center font-medium">{partner}</td>
                                            </tr>
                                          ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                                
                                {/* 刑（地支刑） */}
                                <div>
                                  <h5 className="text-xs font-semibold text-gray-600 mb-2">刑（地支刑）</h5>
                                  <div className="space-y-3">
                                    <div>
                                      <div className="text-xs text-gray-500 mb-1">三刑组：</div>
                                      <div className="overflow-x-auto">
                                        <table className="w-full border-collapse text-sm">
                                          <thead>
                                            <tr className="bg-gray-50">
                                              <th className="border border-gray-300 px-3 py-2 text-center font-semibold">三刑组</th>
                                              <th className="border border-gray-300 px-3 py-2 text-center font-semibold">类型</th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            {ganheData.zhi_xing.groups.map((group, idx) => (
                                              <tr key={idx} className="hover:bg-gray-50">
                                                <td className="border border-gray-300 px-3 py-2 text-center font-medium">{group.join("、")}</td>
                                                <td className="border border-gray-300 px-3 py-2 text-center text-xs">
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
                                      <div className="text-sm text-gray-700">{ganheData.zhi_xing.zixing.join("、")}</div>
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
                                          <th className="border border-gray-300 px-3 py-2 text-center font-semibold">地支1</th>
                                          <th className="border border-gray-300 px-3 py-2 text-center font-semibold">地支2</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {Object.entries(ganheData.zhi_hai)
                                          .filter(([zhi, _]) => ["子", "丑", "寅", "卯", "申", "酉"].includes(zhi))
                                          .map(([zhi, partner]) => (
                                            <tr key={zhi} className="hover:bg-gray-50">
                                              <td className="border border-gray-300 px-3 py-2 text-center font-medium">{zhi}</td>
                                              <td className="border border-gray-300 px-3 py-2 text-center font-medium">{partner}</td>
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
                                          <th className="border border-gray-300 px-3 py-2 text-center font-semibold">地支1</th>
                                          <th className="border border-gray-300 px-3 py-2 text-center font-semibold">地支2</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {Object.entries(ganheData.zhi_po)
                                          .filter(([zhi, _]) => ["子", "卯", "辰", "未", "寅", "巳"].includes(zhi))
                                          .map(([zhi, partner]) => (
                                            <tr key={zhi} className="hover:bg-gray-50">
                                              <td className="border border-gray-300 px-3 py-2 text-center font-medium">{zhi}</td>
                                              <td className="border border-gray-300 px-3 py-2 text-center font-medium">{partner}</td>
                                            </tr>
                                          ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                                
                                {/* 干克（天干相克） */}
                                <div>
                                  <h5 className="text-xs font-semibold text-gray-600 mb-2">干克（天干相克）</h5>
                                  <div className="space-y-3">
                                    <div>
                                      <div className="text-xs text-gray-500 mb-1">天干五行映射：</div>
                                      <div className="overflow-x-auto">
                                        <table className="w-full border-collapse text-sm">
                                          <thead>
                                            <tr className="bg-gray-50">
                                              <th className="border border-gray-300 px-3 py-2 text-center font-semibold">天干</th>
                                              <th className="border border-gray-300 px-3 py-2 text-center font-semibold">五行</th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            {Object.entries(ganheData.gan_ke.gan_wuxing).map(([gan, wuxing]) => (
                                              <tr key={gan} className="hover:bg-gray-50">
                                                <td className="border border-gray-300 px-3 py-2 text-center font-medium">{gan}</td>
                                                <td className="border border-gray-300 px-3 py-2 text-center">{wuxing}</td>
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
                                              <th className="border border-gray-300 px-3 py-2 text-center font-semibold">克方</th>
                                              <th className="border border-gray-300 px-3 py-2 text-center font-semibold">被克方</th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            {Object.entries(ganheData.gan_ke.wuxing_ke).map(([ke, beike]) => (
                                              <tr key={ke} className="hover:bg-gray-50">
                                                <td className="border border-gray-300 px-3 py-2 text-center font-medium">{ke}</td>
                                                <td className="border border-gray-300 px-3 py-2 text-center font-medium">{beike}</td>
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
      </Layout>
    </ConfigProvider>
  );
}



