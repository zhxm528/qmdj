"use client";

import React, { useState } from "react";
import { Button, ConfigProvider, Card, Spin, Collapse, Tooltip } from "antd";
import zhCN from "antd/locale/zh_CN";
import Layout from "@/components/Layout";
import DateSelector from "@/components/DateSelector";
import HourSelector from "@/components/HourSelector";
import MinuteSelector from "@/components/MinuteSelector";

const { Panel } = Collapse;

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
        const { day_master, day_pillar } = result;
        return `日主为${day_master.stem}（${day_master.element}，${day_master.yin_yang}），日柱为${day_pillar.stem}${day_pillar.branch}。这是整个命盘的核心，所有十神、喜忌都围绕日主展开。`;
      }
      
      case 2: {
        // 补齐基础盘面信息
        const { five_elements, hidden_stems, ten_gods, relations, optional } = result;
        let text = "基础盘面信息：\n\n";
        
        // 五行信息
        if (five_elements) {
          text += "【五行分布】\n";
          text += `年干：${five_elements.stems.year_stem.stem}（${five_elements.stems.year_stem.element}）\n`;
          text += `月干：${five_elements.stems.month_stem.stem}（${five_elements.stems.month_stem.element}）\n`;
          text += `日干：${five_elements.stems.day_stem.stem}（${five_elements.stems.day_stem.element}）\n`;
          text += `时干：${five_elements.stems.hour_stem.stem}（${five_elements.stems.hour_stem.element}）\n`;
          text += `年支：${five_elements.branches.year_branch.branch}（${five_elements.branches.year_branch.element}）\n`;
          text += `月支：${five_elements.branches.month_branch.branch}（${five_elements.branches.month_branch.element}）\n`;
          text += `日支：${five_elements.branches.day_branch.branch}（${five_elements.branches.day_branch.element}）\n`;
          text += `时支：${five_elements.branches.hour_branch.branch}（${five_elements.branches.hour_branch.element}）\n\n`;
          
          if (five_elements.optional_summary) {
            const counts = five_elements.optional_summary.count_by_element;
            text += "【五行统计】\n";
            text += `木：${counts.木}、火：${counts.火}、土：${counts.土}、金：${counts.金}、水：${counts.水}\n`;
            if (five_elements.optional_summary.notes) {
              text += `备注：${five_elements.optional_summary.notes}\n`;
            }
            text += "\n";
          }
        }
        
        // 地支藏干
        text += "【地支藏干】\n";
        text += `年支藏干：${hidden_stems.year_branch.join("、") || "无"}\n`;
        text += `月支藏干：${hidden_stems.month_branch.join("、") || "无"}\n`;
        text += `日支藏干：${hidden_stems.day_branch.join("、") || "无"}\n`;
        text += `时支藏干：${hidden_stems.hour_branch.join("、") || "无"}\n\n`;
        
        // 十神
        text += "【十神关系】\n";
        text += `年干：${ten_gods.year_stem || "无"}\n`;
        text += `月干：${ten_gods.month_stem || "无"}\n`;
        text += `时干：${ten_gods.hour_stem || "无"}\n`;
        text += `年支主气：${ten_gods.branches_main.year_branch || "无"}\n`;
        text += `月支主气：${ten_gods.branches_main.month_branch || "无"}\n`;
        text += `日支主气：${ten_gods.branches_main.day_branch || "无"}\n`;
        text += `时支主气：${ten_gods.branches_main.hour_branch || "无"}\n\n`;
        
        // 关系
        text += "【天干地支关系】\n";
        if (relations.stem_combos.length > 0) {
          text += `天干合：${relations.stem_combos.join("、")}\n`;
        }
        if (relations.stem_clashes.length > 0) {
          text += `天干冲：${relations.stem_clashes.join("、")}\n`;
        }
        if (relations.branch_combos.length > 0) {
          text += `地支合：${relations.branch_combos.join("、")}\n`;
        }
        if (relations.branch_clashes.length > 0) {
          text += `地支冲：${relations.branch_clashes.join("、")}\n`;
        }
        if (relations.branch_harms.length > 0) {
          text += `地支害：${relations.branch_harms.join("、")}\n`;
        }
        if (relations.branch_punishments.length > 0) {
          text += `地支刑：${relations.branch_punishments.join("、")}\n`;
        }
        if (relations.branch_breaks.length > 0) {
          text += `地支破：${relations.branch_breaks.join("、")}\n`;
        }
        
        return text;
      }
      
      case 3: {
        // 抓月令与季节
        const { month_command } = result;
        return `月令为${month_command.month_branch}，属于${month_command.season}季，当令之气为${month_command.dominant_qi}。\n\n五行力量排序：${month_command.supporting_elements_rank.join(" > ")}。\n\n月令是判断日主强弱的第一权重，决定了整个命盘的大方向。`;
      }
      
      case 4: {
        // 判旺衰
        const { strength_judgement } = result;
        const { body_state, score_summary, key_reasons } = strength_judgement;
        let text = `【身态判断】\n${body_state}\n\n`;
        
        text += "【得分情况】\n";
        text += `有利因素：印${score_summary.favorable_to_dm.resource}、比劫${score_summary.favorable_to_dm.peer}、通根${score_summary.favorable_to_dm.rooting}、得令${score_summary.favorable_to_dm.season}\n`;
        text += `不利因素：食伤${score_summary.unfavorable_to_dm.output}、财${score_summary.unfavorable_to_dm.wealth}、官杀${score_summary.unfavorable_to_dm.power}、其他${score_summary.unfavorable_to_dm.control}\n\n`;
        
        text += "【关键原因】\n";
        key_reasons.forEach((reason: string) => {
          text += `• ${reason}\n`;
        });
        
        return text;
      }
      
      case 5: {
        // 寒暖燥湿
        const { climate_balance } = result;
        let text = `【气候平衡】\n`;
        text += `温度：${climate_balance.temperature}\n`;
        text += `湿度：${climate_balance.humidity}\n`;
        text += `燥湿：${climate_balance.dry_wet}\n\n`;
        
        if (climate_balance.needs.length > 0) {
          text += "【调候需求】\n";
          climate_balance.needs.forEach((need: string) => {
            text += `• ${need}\n`;
          });
        }
        
        if (climate_balance.notes.length > 0) {
          text += "\n【备注】\n";
          climate_balance.notes.forEach((note: string) => {
            text += `• ${note}\n`;
          });
        }
        
        return text;
      }
      
      case 6: {
        // 定格局
        const { structure } = result;
        let text = `【格局判断】\n`;
        text += `主格局：${structure.primary_pattern}\n`;
        
        if (structure.secondary_patterns.length > 0) {
          text += `次格局：${structure.secondary_patterns.join("、")}\n`;
        }
        
        if (structure.formed_combinations.length > 0) {
          text += `成局：${structure.formed_combinations.join("、")}\n`;
        }
        
        if (structure.breakers.length > 0) {
          text += `破格因素：${structure.breakers.join("、")}\n`;
        }
        
        text += `格局清纯度：${structure.purity}\n`;
        
        if (structure.notes.length > 0) {
          text += "\n【备注】\n";
          structure.notes.forEach((note: string) => {
            text += `• ${note}\n`;
          });
        }
        
        return text;
      }
      
      case 7: {
        // 取用神
        const { useful_gods, element_preference } = result;
        let text = "【用神喜忌】\n\n";
        
        text += `【用神】\n${useful_gods.yong_shen.element}（${useful_gods.yong_shen.ten_god}）\n`;
        text += `原因：${useful_gods.yong_shen.why}\n\n`;
        
        if (useful_gods.xi_shen.length > 0) {
          text += "【喜神】\n";
          useful_gods.xi_shen.forEach((xi: any) => {
            text += `• ${xi.element}（${xi.ten_god}）：${xi.why}\n`;
          });
          text += "\n";
        }
        
        if (useful_gods.ji_shen.length > 0) {
          text += "【忌神】\n";
          useful_gods.ji_shen.forEach((ji: any) => {
            text += `• ${ji.element}（${ji.ten_god}）：${ji.why}\n`;
          });
          text += "\n";
        }
        
        text += "【五行喜忌】\n";
        if (element_preference.favorable.length > 0) {
          text += `喜：${element_preference.favorable.join("、")}\n`;
        }
        if (element_preference.unfavorable.length > 0) {
          text += `忌：${element_preference.unfavorable.join("、")}\n`;
        }
        
        return text;
      }
      
      case 8: {
        // 验盘
        const { consistency_check } = result;
        let text = "【验盘检查】\n\n";
        text += `主要矛盾：${consistency_check.main_conflict}\n`;
        text += `解决方案：${consistency_check.medicine}\n\n`;
        
        if (consistency_check.risk_points.length > 0) {
          text += "【风险点】\n";
          consistency_check.risk_points.forEach((risk: string) => {
            text += `• ${risk}\n`;
          });
          text += "\n";
        }
        
        text += `自洽性：${consistency_check.self_consistency === "consistent" ? "一致" : "需复核"}\n`;
        
        if (consistency_check.notes.length > 0) {
          text += "\n【备注】\n";
          consistency_check.notes.forEach((note: string) => {
            text += `• ${note}\n`;
          });
        }
        
        return text;
      }
      
      case 9: {
        // 十神专题
        const { ten_god_profile } = result;
        let text = "【十神强弱】\n";
        if (ten_god_profile.strong.length > 0) {
          text += `强：${ten_god_profile.strong.join("、")}\n`;
        }
        if (ten_god_profile.weak.length > 0) {
          text += `弱：${ten_god_profile.weak.join("、")}\n`;
        }
        if (ten_god_profile.balanced.length > 0) {
          text += `平衡：${ten_god_profile.balanced.join("、")}\n`;
        }
        text += "\n";
        
        text += "【主题解读】\n";
        const { themes } = ten_god_profile;
        if (themes.personality.length > 0) {
          text += `性格：${themes.personality.join("；")}\n`;
        }
        if (themes.career.length > 0) {
          text += `事业：${themes.career.join("；")}\n`;
        }
        if (themes.wealth.length > 0) {
          text += `财运：${themes.wealth.join("；")}\n`;
        }
        if (themes.relationship_family.length > 0) {
          text += `关系家庭：${themes.relationship_family.join("；")}\n`;
        }
        if (themes.health_tendencies.length > 0) {
          text += `健康倾向：${themes.health_tendencies.join("；")}\n`;
        }
        
        return text;
      }
      
      case 10: {
        // 排大运
        const { da_yun } = result;
        let text = `【大运信息】\n`;
        text += `起运年龄：${da_yun.start_age || "未计算"}岁\n`;
        text += `顺逆：${da_yun.direction === "forward" ? "顺行" : "逆行"}\n\n`;
        
        text += "【大运周期】\n";
        da_yun.cycles.forEach((cycle: any) => {
          text += `\n${cycle.age_range}岁：${cycle.pillar.stem}${cycle.pillar.branch}\n`;
          text += `五行影响：${cycle.element_effect}\n`;
          text += `十神影响：${cycle.ten_god_effect}\n`;
          if (cycle.key_triggers.length > 0) {
            text += `关键触发：${cycle.key_triggers.join("、")}\n`;
          }
          text += `总结：${cycle.summary}\n`;
        });
        
        return text;
      }
      
      case 11: {
        // 叠流年
        const { liu_nian } = result;
        let text = "【流年分析】\n\n";
        
        liu_nian.forEach((year: any) => {
          text += `${year.year}年：${year.pillar.stem}${year.pillar.branch}\n`;
          
          if (year.with_natal.clashes.length > 0 || year.with_natal.combos.length > 0) {
            text += `与原局：`;
            if (year.with_natal.combos.length > 0) {
              text += `合${year.with_natal.combos.join("、")}`;
            }
            if (year.with_natal.clashes.length > 0) {
              text += `冲${year.with_natal.clashes.join("、")}`;
            }
            text += "\n";
          }
          
          if (year.theme.length > 0) {
            text += `主题：${year.theme.join("、")}\n`;
          }
          if (year.risk.length > 0) {
            text += `风险：${year.risk.join("、")}\n`;
          }
          if (year.notes) {
            text += `备注：${year.notes}\n`;
          }
          text += "\n";
        });
        
        return text;
      }
      
      case 12: {
        // 流月流日
        const { enabled, notes } = result;
        if (enabled) {
          return `流月/流日分析已启用。\n${notes || ""}`;
        } else {
          return `流月/流日分析未启用。\n${notes || "通常用于择时或复盘具体事件节点，不建议一开始就使用最细粒度。"}`;
        }
      }
      
      case 13: {
        // 结论与建议
        const { summary, actionable_advice } = result;
        let text = "【核心总结】\n";
        text += `主结构：${summary.core_structure}\n`;
        text += `主要矛盾：${summary.main_conflict}\n\n`;
        
        if (summary.key_levers.length > 0) {
          text += "关键抓手：\n";
          summary.key_levers.forEach((lever: string) => {
            text += `• ${lever}\n`;
          });
          text += "\n";
        }
        
        if (summary.timing_strategy.length > 0) {
          text += "时机策略：\n";
          summary.timing_strategy.forEach((strategy: string) => {
            text += `• ${strategy}\n`;
          });
          text += "\n";
        }
        
        text += "【行动建议】\n\n";
        
        if (actionable_advice.do_more.length > 0) {
          text += "【宜多做】\n";
          actionable_advice.do_more.forEach((item: string) => {
            text += `• ${item}\n`;
          });
          text += "\n";
        }
        
        if (actionable_advice.do_less.length > 0) {
          text += "【宜少做】\n";
          actionable_advice.do_less.forEach((item: string) => {
            text += `• ${item}\n`;
          });
          text += "\n";
        }
        
        if (actionable_advice.risk_management.length > 0) {
          text += "【风险管理】\n";
          actionable_advice.risk_management.forEach((item: string) => {
            text += `• ${item}\n`;
          });
          text += "\n";
        }
        
        if (actionable_advice.resource_allocation.length > 0) {
          text += "【资源配置】\n";
          actionable_advice.resource_allocation.forEach((item: string) => {
            text += `• ${item}\n`;
          });
        }
        
        return text;
      }
      
      default:
        return JSON.stringify(result, null, 2);
    }
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


