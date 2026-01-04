/**
 * 日主五行工具函数
 * 从日干获取日主五行、阴阳等信息
 */

// 天干五行映射表
export const GAN_TO_ELEMENT: Record<string, string> = {
  甲: "木", 乙: "木", 丙: "火", 丁: "火", 戊: "土",
  己: "土", 庚: "金", 辛: "金", 壬: "水", 癸: "水",
};

// 天干阴阳映射表
export const GAN_TO_YINYANG: Record<string, string> = {
  甲: "阳", 乙: "阴", 丙: "阳", 丁: "阴", 戊: "阳",
  己: "阴", 庚: "阳", 辛: "阴", 壬: "阳", 癸: "阴",
};

export interface DayMasterInfo {
  stem: string;        // 日干（如 "甲"、"乙"）
  element: string;     // 日主五行（如 "木"、"火"、"土"、"金"、"水"）
  yin_yang: string;    // 阴阳属性（"阳" 或 "阴"）
}

/**
 * 从日干获取日主五行
 * @param dayStem 日干（如 "甲"、"乙"、"丙" 等）
 * @returns 日主五行（如 "木"、"火"、"土"、"金"、"水"），如果日干无效则返回空字符串
 */
export function getDayMasterElement(dayStem: string): string {
  return GAN_TO_ELEMENT[dayStem] || "";
}

/**
 * 从日干获取日主完整信息（包括五行和阴阳）
 * @param dayStem 日干（如 "甲"、"乙"、"丙" 等）
 * @returns 日主信息对象，包含日干、五行、阴阳
 */
export function getDayMasterInfo(dayStem: string): DayMasterInfo {
  return {
    stem: dayStem,
    element: GAN_TO_ELEMENT[dayStem] || "",
    yin_yang: GAN_TO_YINYANG[dayStem] || "",
  };
}

/**
 * 从四柱中提取日干并获取日主信息
 * @param fourPillars 四柱对象，格式：{ year: "甲子", month: "乙丑", day: "丙寅", hour: "丁卯" }
 * @returns 日主信息对象
 */
export function getDayMasterFromPillars(fourPillars: {
  year: string;
  month: string;
  day: string;
  hour: string;
}): DayMasterInfo {
  const dayStem = fourPillars.day.charAt(0);
  return getDayMasterInfo(dayStem);
}

