"use client";

import Layout from "@/components/Layout";
import Link from "next/link";

export default function TermsPage() {
  return (
    <Layout>
      <div className="min-h-screen bg-gray-50 py-12 px-4">
        <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-md p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">服务条款</h1>
          
          <div className="text-sm text-gray-500 mb-8">
            最后更新时间：{new Date().toLocaleDateString("zh-CN", { year: "numeric", month: "long", day: "numeric" })}
          </div>

          <div className="prose max-w-none space-y-6 text-gray-700">
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. 接受条款</h2>
              <p>
                欢迎使用我们的服务。通过访问和使用本网站，您同意遵守本服务条款的所有规定。如果您不同意这些条款，请不要使用我们的服务。
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. 服务描述</h2>
              <p>
                我们提供奇门遁甲在线排盘和预测服务。我们保留随时修改、暂停或终止任何服务的权利，恕不另行通知。
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. 用户账户</h2>
              <h3 className="text-xl font-medium text-gray-900 mb-3">3.1 账户注册</h3>
              <p>要使用某些服务功能，您需要注册账户。注册时，您同意：</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>提供准确、完整和最新的信息</li>
                <li>维护并及时更新您的账户信息</li>
                <li>对您账户下的所有活动负责</li>
                <li>立即通知我们任何未经授权的使用</li>
              </ul>
              <h3 className="text-xl font-medium text-gray-900 mb-3 mt-4">3.2 账户安全</h3>
              <p>
                您有责任维护账户密码的机密性。您同意对使用您的账户和密码进行的所有活动负责。
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. 使用规则</h2>
              <p>您同意不会：</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>以任何非法或未经授权的方式使用服务</li>
                <li>违反任何适用的法律法规</li>
                <li>侵犯他人的知识产权或其他权利</li>
                <li>传输任何病毒、恶意代码或其他有害内容</li>
                <li>干扰或破坏服务的正常运行</li>
                <li>尝试未经授权访问服务、其他账户、计算机系统或网络</li>
                <li>收集或存储其他用户的个人信息</li>
                <li>使用自动化系统（如机器人、爬虫）访问服务</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. 知识产权</h2>
              <p>
                本网站及其所有内容，包括但不限于文本、图形、徽标、图标、图像、音频、视频、软件和数据，均为我们的财产或我们授权的内容，受版权、商标和其他知识产权法保护。
              </p>
              <p className="mt-4">
                未经我们明确书面许可，您不得复制、修改、分发、出售或出租本网站的任何部分。
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. 用户内容</h2>
              <p>
                您保留对您通过服务提交、发布或显示的任何内容的所有权利。通过提交内容，您授予我们使用、复制、修改、公开执行和展示该内容的全球性、免版税、非独占性许可。
              </p>
              <p className="mt-4">
                您声明并保证您拥有提交内容的权利，且内容不侵犯任何第三方的权利。
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. 免责声明</h2>
              <h3 className="text-xl font-medium text-gray-900 mb-3">7.1 服务&ldquo;按现状&rdquo;提供</h3>
              <p>
                我们按&ldquo;现状&rdquo;和&ldquo;可用&rdquo;的基础提供服务，不提供任何明示或暗示的保证，包括但不限于适销性、特定用途适用性和非侵权性的保证。
              </p>
              <h3 className="text-xl font-medium text-gray-900 mb-3 mt-4">7.2 预测结果</h3>
              <p>
                本网站提供的预测结果仅供参考，不构成任何形式的建议或保证。我们不对预测结果的准确性、可靠性或适用性承担任何责任。
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. 责任限制</h2>
              <p>
                在法律允许的最大范围内，我们不对任何间接、偶然、特殊、后果性或惩罚性损害承担责任，包括但不限于利润损失、数据丢失或业务中断，无论是否基于合同、侵权或其他理论。
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">9. 赔偿</h2>
              <p>
                您同意赔偿、辩护并使我们免受因您使用服务、违反本条款或侵犯任何第三方权利而产生的任何索赔、损害、损失、责任和费用（包括合理的律师费）。
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">10. 服务终止</h2>
              <p>
                我们保留随时终止或暂停您的账户和访问服务的权利，无论是否事先通知，原因包括但不限于违反本服务条款。
              </p>
              <p className="mt-4">
                您也可以随时通过删除账户来终止您的账户。账户终止后，您访问服务的权利将立即终止。
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">11. 第三方服务</h2>
              <p>
                我们的服务可能包含指向第三方网站或服务的链接。我们不控制这些第三方网站或服务，不对其内容、隐私政策或做法负责。您访问任何第三方网站或服务需自行承担风险。
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">12. 修改条款</h2>
              <p>
                我们保留随时修改本服务条款的权利。重大变更时，我们会在网站上发布通知。您继续使用服务即表示您接受修改后的条款。如果您不同意修改后的条款，请停止使用服务。
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">13. 适用法律</h2>
              <p>
                本服务条款受中华人民共和国法律管辖。因本条款引起的任何争议，双方应友好协商解决；协商不成的，应提交有管辖权的人民法院解决。
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">14. 可分割性</h2>
              <p>
                如果本服务条款的任何条款被认定为无效或不可执行，其余条款仍将完全有效。无效或不可执行的条款将被视为已修改，以使其在法律允许的范围内有效和可执行。
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">15. 完整协议</h2>
              <p>
                本服务条款构成您与我们之间关于使用服务的完整协议，取代所有先前的口头或书面协议。
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">16. 联系我们</h2>
              <p>
                如果您对本服务条款有任何问题，请通过以下方式联系我们：
              </p>
              <ul className="list-none pl-0 space-y-2 mt-4">
                <li>邮箱：support@example.com</li>
                <li>地址：[您的公司地址]</li>
              </ul>
            </section>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-200">
            <Link 
              href="/register" 
              className="text-amber-600 hover:underline"
            >
              ← 返回注册页面
            </Link>
          </div>
        </div>
      </div>
    </Layout>
  );
}

