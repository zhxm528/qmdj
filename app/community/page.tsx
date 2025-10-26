import Layout from "@/components/Layout";

export default function Community() {
  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <div className="mb-8">
              <h1 className="text-4xl font-bold text-gray-900 mb-4">加入社群</h1>
              <p className="text-lg text-gray-600">
                与其他用户交流奇门遁甲心得，获取最新资讯
              </p>
            </div>

            <div className="space-y-6">
              <div className="border rounded-lg p-6 hover:shadow-lg transition-shadow">
                <h2 className="text-xl font-bold mb-2">官方社群</h2>
                <p className="text-gray-600 mb-4">
                  加入我们的官方交流群，与志同道合的朋友一起学习奇门遁甲
                </p>
                <a
                  href="https://x.com/qimen"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  前往 X 社群
                </a>
              </div>

              <div className="border rounded-lg p-6">
                <h2 className="text-xl font-bold mb-2">Coming soon</h2>
                <p className="text-gray-600">
                  站内社区功能即将上线，敬请期待
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

