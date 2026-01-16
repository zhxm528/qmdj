"use client";

export type AdminMenuItem = {
  key: string;
  label: string;
  href?: string;
  icon?: JSX.Element;
  children?: AdminMenuItem[];
};

const IconSettings = (
  <svg
    viewBox="0 0 24 24"
    className="h-5 w-5"
    aria-hidden="true"
    stroke="currentColor"
    strokeWidth="1.8"
    fill="none"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="3.5" />
    <path d="M19 12a7 7 0 0 0-.08-1l2.02-1.56-2-3.46-2.46.6a7.2 7.2 0 0 0-1.74-1L14.5 2h-5l-.24 2.58a7.2 7.2 0 0 0-1.74 1l-2.46-.6-2 3.46L5.08 11A7 7 0 0 0 5 12c0 .34.03.67.08 1l-2.02 1.56 2 3.46 2.46-.6c.52.43 1.11.78 1.74 1l.24 2.58h5l.24-2.58c.63-.22 1.22-.57 1.74-1l2.46.6 2-3.46L18.92 13c.05-.33.08-.66.08-1Z" />
  </svg>
);

const IconUsers = (
  <svg
    viewBox="0 0 24 24"
    className="h-5 w-5"
    aria-hidden="true"
    stroke="currentColor"
    strokeWidth="1.8"
    fill="none"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="9" cy="8" r="3.5" />
    <path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
    <circle cx="17" cy="9" r="2.5" />
    <path d="M15.5 20a5.5 5.5 0 0 1 6 0" />
  </svg>
);

const IconMember = (
  <svg
    viewBox="0 0 24 24"
    className="h-5 w-5"
    aria-hidden="true"
    stroke="currentColor"
    strokeWidth="1.8"
    fill="none"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="8" r="3.5" />
    <path d="M4 20a8 8 0 0 1 16 0" />
  </svg>
);

const IconContext = (
  <svg
    viewBox="0 0 24 24"
    className="h-5 w-5"
    aria-hidden="true"
    stroke="currentColor"
    strokeWidth="1.8"
    fill="none"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="3" y="4" width="18" height="14" rx="2" />
    <path d="M7 8h10M7 12h6" />
    <path d="M9 20h6" />
  </svg>
);

const IconTerm = (
  <svg
    viewBox="0 0 24 24"
    className="h-5 w-5"
    aria-hidden="true"
    stroke="currentColor"
    strokeWidth="1.8"
    fill="none"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M4 6h9l7 6-7 6H4Z" />
    <path d="M7 10h4M7 14h4" />
  </svg>
);

const IconTag = (
  <svg
    viewBox="0 0 24 24"
    className="h-5 w-5"
    aria-hidden="true"
    stroke="currentColor"
    strokeWidth="1.8"
    fill="none"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M20 12l-8 8-9-9V4h7l10 8Z" />
    <circle cx="7.5" cy="7.5" r="1.5" />
  </svg>
);

const IconCard = (
  <svg
    viewBox="0 0 24 24"
    className="h-5 w-5"
    aria-hidden="true"
    stroke="currentColor"
    strokeWidth="1.8"
    fill="none"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="M3 9h18" />
    <path d="M7 14h4" />
  </svg>
);

const IconList = (
  <svg
    viewBox="0 0 24 24"
    className="h-5 w-5"
    aria-hidden="true"
    stroke="currentColor"
    strokeWidth="1.8"
    fill="none"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M8 6h12M8 12h12M8 18h12" />
    <path d="M4 6h0M4 12h0M4 18h0" />
  </svg>
);

const IconFlow = (
  <svg
    viewBox="0 0 24 24"
    className="h-5 w-5"
    aria-hidden="true"
    stroke="currentColor"
    strokeWidth="1.8"
    fill="none"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="5" cy="5" r="2" />
    <circle cx="19" cy="12" r="2" />
    <circle cx="5" cy="19" r="2" />
    <path d="M7 5h6a4 4 0 0 1 4 4v1" />
    <path d="M17 14v1a4 4 0 0 1-4 4H7" />
  </svg>
);

const IconChart = (
  <svg
    viewBox="0 0 24 24"
    className="h-5 w-5"
    aria-hidden="true"
    stroke="currentColor"
    strokeWidth="1.8"
    fill="none"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M4 19h16" />
    <path d="M7 16V9" />
    <path d="M12 16V5" />
    <path d="M17 16v-7" />
  </svg>
);

export const adminMenu: AdminMenuItem[] = [
  {
    key: "system",
    label: "系统管理",
    icon: IconSettings,
    children: [
      { key: "system-users", label: "用户管理", href: "/admin/system/users", icon: IconUsers },
    ],
  },
  {
    key: "member",
    label: "会员管理",
    icon: IconMember,
    children: [
      { key: "member-level", label: "会员等级", href: "/admin/member/membership_level", icon: IconChart },
      { key: "member-info", label: "会员信息", href: "/admin/member/member", icon: IconUsers },
      { key: "member-card", label: "会员卡号", href: "/admin/member/member_card", icon: IconCard },
      { key: "member-account", label: "会员账户", href: "/admin/member/member_account", icon: IconList },
      { key: "member-points", label: "积分变动", href: "/admin/member/points_transaction", icon: IconChart },
      { key: "member-consumption", label: "消费记录", href: "/admin/member/consumption_transaction", icon: IconList },
      { key: "member-recharge", label: "充值记录", href: "/admin/member/recharge_transaction", icon: IconList },
    ],
  },
  {
    key: "context",
    label: "上下文管理",
    icon: IconContext,
    children: [
      { key: "context-projects", label: "项目管理", href: "/admin/context/projects", icon: IconList },
      { key: "context-templates", label: "提示词模板", href: "/admin/context/prompt_templates", icon: IconTag },
      { key: "context-template-versions", label: "模板版本", href: "/admin/context/prompt_template_versions", icon: IconList },
      { key: "context-template-variables", label: "模板变量", href: "/admin/context/prompt_template_variables", icon: IconList },
      { key: "context-tags", label: "标签", href: "/admin/context/prompt_tags", icon: IconTag },
      { key: "context-template-tags", label: "模板标签关联", href: "/admin/context/prompt_template_tags", icon: IconTag },
      { key: "context-envs", label: "环境", href: "/admin/context/environments", icon: IconList },
      { key: "context-env-versions", label: "环境版本映射", href: "/admin/context/prompt_env_versions", icon: IconList },
      { key: "context-flows", label: "流程", href: "/admin/context/prompt_flows", icon: IconFlow },
      { key: "context-flow-steps", label: "流程步骤", href: "/admin/context/prompt_flow_steps", icon: IconFlow },
    ],
  },
  {
    key: "term",
    label: "术语管理",
    icon: IconTerm,
    children: [
      { key: "term-category", label: "分类", href: "/admin/term/term_category", icon: IconTag },
      { key: "term", label: "术语", href: "/admin/term/term", icon: IconList },
      { key: "term-relation", label: "术语关系", href: "/admin/term/term_relation", icon: IconFlow },
    ],
  },
];
