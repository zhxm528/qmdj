"use client";

import Layout from "@/components/Layout";
import Link from "next/link";

export default function PrivacyPage() {
  return (
    <Layout>
      <div className="min-h-screen bg-gray-50 py-12 px-4">
        <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-md p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">隐私政策</h1>
          
          <div className="text-sm text-gray-500 mb-8">
            最后更新时间：{new Date().toLocaleDateString("zh-CN", { year: "numeric", month: "long", day: "numeric" })}
          </div>

          <div className="prose max-w-none space-y-6 text-gray-700">
            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">1. 引言</h2>
              <p>
                我们（&ldquo;我们&rdquo;、&ldquo;我们的&rdquo;或&ldquo;本网站&rdquo;）非常重视您的隐私保护。本隐私政策说明了我们如何收集、使用、存储和保护您的个人信息。使用我们的服务即表示您同意本隐私政策的条款。
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">2. 信息收集</h2>
              <h3 className="text-xl font-medium text-gray-900 mb-3">2.1 我们收集的信息类型</h3>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>账户信息：</strong>当您注册账户时，我们收集您的邮箱地址和加密后的密码。</li>
                <li><strong>使用信息：</strong>我们收集您使用我们服务时产生的信息，包括但不限于排盘记录、查询历史等。</li>
                <li><strong>技术信息：</strong>我们自动收集某些技术信息，如IP地址、浏览器类型、设备信息、访问时间等。</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">3. 信息使用</h2>
              <p>我们使用收集的信息用于以下目的：</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>提供、维护和改进我们的服务</li>
                <li>处理您的注册请求并管理您的账户</li>
                <li>响应您的查询和请求</li>
                <li>发送服务相关的通知和更新</li>
                <li>检测、预防和解决技术问题</li>
                <li>遵守法律法规要求</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">4. 信息存储和安全</h2>
              <h3 className="text-xl font-medium text-gray-900 mb-3">4.1 数据存储</h3>
              <p>
                您的个人信息存储在安全的服务器上，我们采用行业标准的安全措施来保护您的数据，包括加密传输和存储。
              </p>
              <h3 className="text-xl font-medium text-gray-900 mb-3 mt-4">4.2 密码安全</h3>
              <p>
                您的密码经过加密处理后才存储在我们的数据库中，我们无法直接查看您的原始密码。
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">5. 信息共享</h2>
              <p>我们不会向第三方出售、交易或转让您的个人信息，除非：</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>获得您的明确同意</li>
                <li>法律法规要求或司法机关依法要求</li>
                <li>为保护我们的权利、财产或安全，或保护用户或公众的权利、财产或安全</li>
                <li>在业务转让、合并或收购的情况下，个人信息可能被转移</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">6. Cookie和跟踪技术</h2>
              <p>
                我们使用Cookie和类似技术来改善用户体验、分析网站流量和个性化内容。您可以通过浏览器设置管理Cookie偏好。
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">7. 您的权利</h2>
              <p>您对自己的个人信息享有以下权利：</p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>访问权：</strong>您可以随时访问和查看我们持有的您的个人信息</li>
                <li><strong>更正权：</strong>您可以要求更正不准确或不完整的个人信息</li>
                <li><strong>删除权：</strong>您可以要求删除您的个人信息，但某些法律要求保留的信息除外</li>
                <li><strong>撤回同意：</strong>您可以随时撤回对处理您个人信息的同意</li>
                <li><strong>数据可携权：</strong>您可以要求以结构化、常用和机器可读的格式获取您的数据</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">8. 数据保留</h2>
              <p>
                我们仅在实现本隐私政策所述目的所需的期间内保留您的个人信息，或根据法律法规要求保留。当不再需要您的个人信息时，我们将安全地删除或匿名化处理。
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">9. 儿童隐私</h2>
              <p>
                我们的服务不面向18岁以下的儿童。我们不会故意收集儿童的个人信息。如果我们发现收集了儿童的个人信息，我们将立即删除相关信息。
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">10. 第三方链接</h2>
              <p>
                我们的网站可能包含指向第三方网站的链接。我们不对这些第三方网站的隐私做法负责。我们建议您仔细阅读这些网站的隐私政策。
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">11. 隐私政策更新</h2>
              <p>
                我们可能会不时更新本隐私政策。重大变更时，我们会在网站上发布通知。继续使用我们的服务即表示您接受更新后的隐私政策。
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">12. 联系我们</h2>
              <p>
                如果您对本隐私政策有任何问题、意见或投诉，或希望行使您的权利，请通过以下方式联系我们：
              </p>
              <ul className="list-none pl-0 space-y-2 mt-4">
                <li>邮箱：yuanlaiyunshi@126.com</li>
                <li>地址：Boca Chica Boulevard, Brownsville, TX 78521</li>
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

