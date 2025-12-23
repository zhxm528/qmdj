"use client";

import { useState } from "react";
import { Steps, Modal, Button } from "antd";
import Link from "next/link";

interface StepInfo {
  title: string;
  content: string;
  href: string;
}

interface TermTimelineProps {
  currentStep?: number; // 当前步骤索引，从0开始，默认为0
}

const stepConfig: StepInfo[] = [
  {
    title: "术语分类",
    content: "管理术语的分类体系，用于组织和归类术语。",
    href: "/admin/term/term_category",
  },
  {
    title: "术语",
    content: "管理具体的术语及其详细信息，包括名称、别名、拼音、简要说明和详细解释。",
    href: "/admin/term/term",
  },
  {
    title: "术语关系",
    content: "管理术语之间的关系，包括相关、父级、子级、同义词、反义词等关系类型。",
    href: "/admin/term/term_relation",
  },
];

export default function TermTimeline({ currentStep = 0 }: TermTimelineProps) {
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

