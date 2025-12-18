"use client";

import Link from "next/link";
import Layout from "@/components/Layout";

interface MenuItem {
  title: string;
  path: string;
}

interface Panel {
  title: string;
  id: string;
  icon: string;
  menus?: MenuItem[];
}

export default function Admin() {
  const panels: Panel[] = [
    {
      title: "系统管理",
      id: "system",
      icon: "⚙️",
      menus: [
        {
          title: "用户管理",
          path: "/admin/system/users",
        },
      ],
    },
    {
      title: "会员管理",
      id: "member",
      icon: "👥",
      menus: [
        {
          title: "会员等级",
          path: "/admin/member/membership_level",
        },
        {
          title: "会员信息",
          path: "/admin/member/member",
        },
        {
          title: "会员卡号",
          path: "/admin/member/member_card",
        },
        {
          title: "会员账户",
          path: "/admin/member/member_account",
        },
        {
          title: "积分变动",
          path: "/admin/member/points_transaction",
        },
        {
          title: "消费记录",
          path: "/admin/member/consumption_transaction",
        },
        {
          title: "充值记录",
          path: "/admin/member/recharge_transaction",
        },
      ],
    },
    {
      title: "上下文管理",
      id: "context",
      icon: "📚",
      menus: [
        {
          title: "项目管理",
          path: "/admin/context/projects",
        },
        {
          title: "提示词模板",
          path: "/admin/context/prompt_templates",
        },
        {
          title: "模板版本",
          path: "/admin/context/prompt_template_versions",
        },
        {
          title: "模板变量",
          path: "/admin/context/prompt_template_variables",
        },
        {
          title: "标签",
          path: "/admin/context/prompt_tags",
        },
        {
          title: "模板标签关联",
          path: "/admin/context/prompt_template_tags",
        },
        {
          title: "环境",
          path: "/admin/context/environments",
        },
        {
          title: "环境版本映射",
          path: "/admin/context/prompt_env_versions",
        },
        {
          title: "流程",
          path: "/admin/context/prompt_flows",
        },
        {
          title: "流程步骤",
          path: "/admin/context/prompt_flow_steps",
        },
      ],
    },
    {
      title: "术语管理",
      id: "term",
      icon: "📖",
      menus: [
        {
          title: "分类",
          path: "/admin/term/term_category",
        },
        {
          title: "术语",
          path: "/admin/term/term",
        },
        {
          title: "术语关系",
          path: "/admin/term/term_relation",
        },
      ],
    },
    {
      title: "数据分析",
      id: "analytics",
      icon: "📊",
    },
  ];

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white py-12 px-4">
        <div className="max-w-7xl mx-auto">
         

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {panels.map((panel) => (
              <div
                key={panel.id}
                className="bg-white rounded-lg shadow-md p-6 border border-gray-200 hover:shadow-xl transition-shadow"
              >
                <div className="text-4xl mb-4">{panel.icon}</div>
                <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                  {panel.title}
                </h2>
                <div className="text-gray-600">
                  {panel.menus && panel.menus.length > 0 ? (
                    <ul className="space-y-2">
                      {panel.menus.map((menu, index) => (
                        <li key={index}>
                          <Link
                            href={menu.path}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-amber-600 hover:text-amber-700 hover:underline transition-colors"
                          >
                            {menu.title}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm">暂无菜单项</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
}

