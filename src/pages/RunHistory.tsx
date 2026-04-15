import React, { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { Search, Filter, Eye, Clock, CheckCircle2, XCircle, AlertCircle } from "lucide-react"
import { Button } from "@/src/components/ui/button"
import { cn } from "@/src/lib/utils"

export function RunHistory() {
  const navigate = useNavigate()
  const [searchTerm, setSearchTerm] = useState("")
  const [runs, setRuns] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchRuns = async () => {
      try {
        // 1. Get strategies from localStorage to find associated runs
        const storedStrategies = JSON.parse(localStorage.getItem('strategies') || '[]')
        
        // 2. Get actual execution results from backend
        const res = await fetch('/api/flow/results')
        const results = await res.json()

        // 3. Merge data
        const mergedRuns = results.map((result: any) => {
          const strategy = storedStrategies.find((s: any) => s.runId === result.run_id)
          return {
            id: result.run_id,
            flowName: strategy?.flowName || "测试流程",
            strategyName: strategy?.name || result.name || "未知策略",
            status: strategy?.status === 'approved' ? 'success' : 
                    strategy?.status === 'rejected' ? 'failed' : 
                    strategy?.status === 'pending_approval' ? 'suspended' : 'success',
            startTime: new Date(result.created_at).toLocaleString(),
            duration: "1.2s",
            trigger: "API",
            strategyId: strategy?.id
          }
        }).filter((run: any) => {
          // Only show if strategy exists in localStorage
          return storedStrategies.some((s: any) => s.id === run.strategyId || s.name === run.strategyName);
        })

        setRuns(mergedRuns)
      } catch (e) {
        console.error("Failed to fetch runs", e)
      } finally {
        setIsLoading(false)
      }
    }

    fetchRuns()
  }, [])

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">执行成功</span>
      case 'suspended':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">挂起中</span>
      case 'failed':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">执行失败</span>
      default:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">未知</span>
    }
  }

  const filteredRuns = runs.filter(run => 
    run.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    run.flowName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    run.strategyName.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">运行记录</h1>
        <p className="text-sm text-gray-500 mt-1">查看所有流程的执行历史与状态</p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="relative w-72">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input 
                type="text" 
                placeholder="搜索运行 ID 或流程名称..." 
                className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button variant="outline" size="sm">
              <Filter className="w-4 h-4 mr-2" />
              筛选
            </Button>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-600 font-medium border-b border-gray-200">
              <tr>
                <th className="px-6 py-4">运行 ID</th>
                <th className="px-6 py-4">关联策略</th>
                <th className="px-6 py-4">流程名称</th>
                <th className="px-6 py-4">状态</th>
                <th className="px-6 py-4">触发方式</th>
                <th className="px-6 py-4">开始时间</th>
                <th className="px-6 py-4 text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-400">
                    加载中...
                  </td>
                </tr>
              ) : filteredRuns.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-400">
                    暂无运行记录
                  </td>
                </tr>
              ) : (
                filteredRuns.map((run) => (
                  <tr key={run.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-mono text-xs text-gray-900">{run.id}</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="font-medium text-gray-900">{run.strategyName}</span>
                        {run.strategyId && <span className="text-[10px] text-gray-400">ID: {run.strategyId}</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4 font-medium text-gray-900">{run.flowName}</td>
                    <td className="px-6 py-4">{getStatusBadge(run.status)}</td>
                    <td className="px-6 py-4 text-gray-600">{run.trigger}</td>
                    <td className="px-6 py-4 text-gray-500">{run.startTime}</td>
                    <td className="px-6 py-4 text-right">
                      <Button variant="ghost" size="sm" onClick={() => navigate(`/runs/${run.id}`)}>
                        <Eye className="w-4 h-4 mr-1" />
                        详情
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="p-4 border-t border-gray-200 flex items-center justify-between text-sm text-gray-500">
          <span>共 {filteredRuns.length} 条记录</span>
          <div className="flex space-x-2">
            <Button variant="outline" size="sm" disabled>上一页</Button>
            <Button variant="outline" size="sm" disabled>下一页</Button>
          </div>
        </div>
      </div>
    </div>
  )
}
