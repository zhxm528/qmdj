"use client";

import { useState } from "react";
import { Steps, Modal, Button } from "antd";
import Link from "next/link";

interface StepInfo {
  title: string;
  content: string;
  href: string;
}

interface ContextTimelineProps {
  currentStep?: number; // 当前步骤索引，从0开始，默认为0
}

const stepConfig: StepInfo[] = [
  {
    title: "项目",
    content: "按照项目管理提示词，例如：奇门遁甲、生辰八字等。",
    href: "/admin/context/projects",
  },
  {
    title: "提示词模板",
    content: "定义这个提示词是谁、在什么场景、什么角色（逻辑身份）；\n\n按【分层scene + 场景scene + 角色role】建档，每一行代表【一个逻辑 prompt】，例如：qmdj 看盘 system 层提示词；\n\n分层：全局 global / 项目 project / 场景 scene，提示词在对话中的角色：system / user / assistant / tool / fewshot；\n\n逻辑身份（这条 prompt 属于哪个层级、哪个场景、哪个角色）。",
    href: "/admin/context/prompt_templates",
  },
  {
    title: "模板版本",
    content: "定义这一版具体怎么说、用什么模型、什么参数（版本快照）；\n\n同一个提示词，在不同时期的不同「快照」。内容、参数、模型设置变了，就新建一个版本，不去改旧的。\n\n时间维度（这条 prompt 在某个时刻的具体内容 + 参数快照）",
    href: "/admin/context/prompt_template_versions",
  },
  {
    title: "流程",
    content: "【流程（Flow）】 = 一次完整调用 LLM 的【剧本】；\n\n针对一个业务场景，把需要用到的多条 Prompt、它们的顺序、角色、版本选择方式，统一打包成一个「配置化的调用方案」，\n\n【流程】 ≈ 某个场景下【一次 LLM 调用要用到的所有 Prompt 组合】，\n\nFlow 决定：【这次调用要执行哪几步、按什么顺序】",
    href: "/admin/context/prompt_flows",
  },
  {
    title: "流程步骤",
    content: "【流程步骤（Flow Step）】 = 这个剧本里的每一句【台词 / 动作】；\n\n流程中的一小步，通常对应一个 prompt_templates 里的模板（加上版本选择策略）。\n\nFlow Step 决定：【每一步用哪个 Prompt、用哪个版本、是不是可选、以什么角色发给模型】",
    href: "/admin/context/prompt_flow_steps",
  },
];

export default function ContextTimeline({ currentStep = 0 }: ContextTimelineProps) {
  const [tipModalVisible, setTipModalVisible] = useState(false);
  const [tipContent, setTipContent] = useState<StepInfo | null>(null);

  const items = stepConfig.map((step, index) => {
    const isCurrent = index === currentStep;
    const isFinished = index < currentStep;
    
    return {
      title: (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
          <span 
            style={{ 
              fontSize: '14px', 
              fontWeight: 'bold',
              color: isCurrent ? '#1890ff' : '#8c8c8c',
              marginBottom: '8px',
              lineHeight: '1',
              height: '20px',
              display: 'flex',
              alignItems: 'center',
              position: 'absolute',
              top: '-28px',
            }}
          >
            {index + 1}
          </span>
          <Link 
            href={step.href}
            className={isCurrent ? "text-blue-600 hover:text-blue-800 font-medium" : "text-gray-600 hover:text-blue-600 font-medium"}
          >
            {step.title}
          </Link>
        </div>
      ),
      status: isFinished ? 'finish' as const : (isCurrent ? 'finish' as const : 'wait' as const),
    };
  });

  return (
    <>
      <div className="mb-8 pb-6 border-b border-gray-200">
        <Steps
          current={currentStep}
          progressDot={(dot, { index, status }) => {
            return (
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  setTipContent(stepConfig[index!]);
                  setTipModalVisible(true);
                }}
                style={{
                  cursor: 'pointer',
                  display: 'inline-block',
                }}
              >
                {dot}
              </span>
            );
          }}
          items={items}
          style={{ marginBottom: 0 }}
        />
      </div>

      {/* 提示弹窗 */}
      <Modal
        title={tipContent?.title || "提示"}
        open={tipModalVisible}
        onCancel={() => setTipModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setTipModalVisible(false)}>
            关闭
          </Button>,
        ]}
        maskClosable={false}
        width={600}
      >
        <div style={{ whiteSpace: 'pre-line', lineHeight: '1.8' }}>
          {tipContent?.content}
        </div>
      </Modal>
    </>
  );
}
