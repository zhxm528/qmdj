/**
 * 步骤7：取用神、喜神、忌神（落到可用结论）
 * 基于：强弱、格局、调候、合冲刑害的破坏与扶助，确定：
 * 用神：最关键的平衡点/抓手
 * 喜神：有利的辅助力量
 * 忌神：会破坏结构或加剧失衡的力量
 * 同时标注：哪些五行/十神属于喜忌（例如"喜水木""忌火土"等）。
 */

export interface Step7Result {
  useful_gods: {
    yong_shen: {
      element: string;
      ten_god: string;
      why: string;
    };
    xi_shen: Array<{
      element: string;
      ten_god: string;
      why: string;
    }>;
    ji_shen: Array<{
      element: string;
      ten_god: string;
      why: string;
    }>;
  };
  element_preference: {
    favorable: string[];
    neutral: string[];
    unfavorable: string[];
  };
}

export function step7(
  step4Result: any,
  step5Result: any,
  step6Result: any
): Step7Result {
  const bodyState = step4Result.strength_judgement.body_state;
  const climateNeeds = step5Result.climate_balance.needs || [];

  // 根据身态和调候取用神
  let yongShen = { element: "", ten_god: "", why: "" };
  const xiShen: Array<{ element: string; ten_god: string; why: string }> = [];
  const jiShen: Array<{ element: string; ten_god: string; why: string }> = [];
  const favorable: string[] = [];
  let unfavorable: string[] = [];

  if (bodyState === "身弱") {
    // 身弱用印比
    yongShen = { element: "土", ten_god: "印", why: "身弱需印生扶" };
    xiShen.push({ element: "金", ten_god: "比劫", why: "助身" });
    favorable.push("土", "金");
    unfavorable.push("火", "木");
  } else if (bodyState === "身强") {
    // 身强用财官食伤
    yongShen = { element: "水", ten_god: "食伤", why: "身强需泄秀" };
    xiShen.push({ element: "木", ten_god: "财", why: "耗身" });
    favorable.push("水", "木");
    unfavorable.push("土", "金");
  } else {
    // 平衡
    yongShen = { element: "水", ten_god: "食伤", why: "平衡需流通" };
    favorable.push("水", "木");
    unfavorable.push("火", "土");
  }

  // 调候修正
  if (climateNeeds.includes("适度水润")) {
    if (!favorable.includes("水")) favorable.push("水");
    if (unfavorable.includes("火")) {
      unfavorable = unfavorable.filter(e => e !== "火");
    }
  }
  if (climateNeeds.includes("适度火暖")) {
    if (!favorable.includes("火")) favorable.push("火");
    if (unfavorable.includes("水")) {
      unfavorable = unfavorable.filter(e => e !== "水");
    }
  }

  // 构建忌神
  unfavorable.forEach(element => {
    const tenGodMap: Record<string, string> = {
      木: "财", 火: "官杀", 土: "印", 金: "比劫", 水: "食伤",
    };
    jiShen.push({
      element,
      ten_god: tenGodMap[element] || "",
      why: `对${bodyState}不利`,
    });
  });

  return {
    useful_gods: {
      yong_shen: yongShen,
      xi_shen: xiShen,
      ji_shen: jiShen,
    },
    element_preference: {
      favorable,
      neutral: [],
      unfavorable,
    },
  };
}

