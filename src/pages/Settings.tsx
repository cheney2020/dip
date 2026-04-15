import { Button } from "@/src/components/ui/button"

export function Settings() {
  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">系统设置</h1>
        <p className="text-sm text-gray-500 mt-1">管理平台全局配置与集成</p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px px-6">
            <button className="border-b-2 border-blue-500 py-4 px-1 text-sm font-medium text-blue-600 mr-8">
              基础设置
            </button>
            <button className="border-b-2 border-transparent py-4 px-1 text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300 mr-8">
              API 密钥
            </button>
            <button className="border-b-2 border-transparent py-4 px-1 text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300">
              通知配置
            </button>
          </nav>
        </div>
        
        <div className="p-6 space-y-8">
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">平台信息</h3>
            <div className="space-y-4 max-w-xl">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">平台名称</label>
                <input type="text" defaultValue="智能决策流程平台" className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">时区</label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm">
                  <option>Asia/Shanghai (UTC+8)</option>
                  <option>UTC</option>
                </select>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 mb-4">数据保留策略</h3>
            <div className="space-y-4 max-w-xl">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">运行记录保留时间</label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm">
                  <option>30 天</option>
                  <option>90 天</option>
                  <option>180 天</option>
                  <option>永久保留</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">超过保留时间的运行记录将被自动清理。</p>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-gray-200 flex justify-end">
            <Button>保存设置</Button>
          </div>
        </div>
      </div>
    </div>
  )
}
