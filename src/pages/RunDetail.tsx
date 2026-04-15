import React, { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { CheckCircle2, XCircle, Clock, AlertCircle, ChevronLeft, Loader2, FileJson } from "lucide-react"
import { Button } from "@/src/components/ui/button"
import { cn } from "@/src/lib/utils"

export function RunDetail() {
  const { runId } = useParams()
  const navigate = useNavigate()
  const [data, setData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedNode, setSelectedNode] = useState<string>("node-start")

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const res = await fetch(`/api/flow/logs/${runId}`)
        if (!res.ok) throw new Error("Failed to fetch logs")
        const result = await res.json()
        setData(result)
      } catch (e) {
        console.error(e)
      } finally {
        setIsLoading(false)
      }
    }
    fetchLogs()
  }, [runId])

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
        <Loader2 className="w-8 h-8 text-brand animate-spin" />
        <p className="text-sm text-gray-500 font-medium">正在获取运行日志...</p>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="p-8 max-w-7xl mx-auto text-center space-y-4">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto opacity-20" />
        <h2 className="text-xl font-bold text-gray-900">未找到运行记录</h2>
        <Button variant="outline" onClick={() => navigate('/runs')}>返回列表</Button>
      </div>
    )
  }

  const { logs, result } = data
  const storedStrategies = JSON.parse(localStorage.getItem('strategies') || '[]')
  const strategy = storedStrategies.find((s: any) => s.runId === runId)

  const nodes = [
    { id: "node-start", label: "Webhook API 触发", time: result.created_at ? new Date(result.created_at).toLocaleTimeString() : "--:--:--" },
    { id: "node-model", label: "算法/模型调用", time: result.created_at ? new Date(result.created_at).toLocaleTimeString() : "--:--:--" },
    { id: "node-db", label: "写入 SQLite", time: result.created_at ? new Date(result.created_at).toLocaleTimeString() : "--:--:--" }
  ]

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div className="mb-6">
        <button 
          onClick={() => navigate('/runs')}
          className="flex items-center text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          返回运行记录
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center space-x-3">
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">运行详情</h1>
              <span className={cn(
                "inline-flex items-center px-3 py-1 rounded-lg text-xs font-bold border uppercase tracking-wider",
                strategy?.status === 'approved' ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                strategy?.status === 'rejected' ? "bg-red-50 text-red-600 border-red-100" :
                "bg-amber-50 text-amber-600 border-amber-100"
              )}>
                {strategy?.status === 'approved' ? '执行成功' : 
                 strategy?.status === 'rejected' ? '执行失败' : '挂起中'}
              </span>
            </div>
            <p className="text-gray-400 font-mono text-xs">RUN_ID: {runId}</p>
          </div>
        </div>
        <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-8 border-t border-gray-100 pt-8">
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">关联策略</p>
            <p className="text-sm font-bold text-gray-900">{strategy?.name || result.name || "未知策略"}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">所属流程</p>
            <p className="text-sm font-bold text-gray-900">{strategy?.flowName || "测试流程"}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">开始时间</p>
            <p className="text-sm font-medium text-gray-900">{new Date(result.created_at).toLocaleString()}</p>
          </div>
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">触发方式</p>
            <p className="text-sm font-medium text-gray-900">API 调用</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">执行路径 (Execution Path)</h2>
          <div className="space-y-4 relative">
            {nodes.map((node, index) => (
              <div 
                key={node.id}
                onClick={() => setSelectedNode(node.id)}
                className={cn(
                  "relative flex items-center gap-4 p-4 rounded-xl border transition-all cursor-pointer group",
                  selectedNode === node.id 
                    ? "bg-brand/5 border-brand shadow-sm" 
                    : "bg-white border-gray-100 hover:border-gray-300"
                )}
              >
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center shrink-0 z-10",
                  selectedNode === node.id ? "bg-brand text-white" : "bg-gray-100 text-gray-400"
                )}>
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <h3 className={cn(
                    "text-sm font-bold",
                    selectedNode === node.id ? "text-brand" : "text-gray-900"
                  )}>
                    {node.label}
                  </h3>
                  <p className="text-[10px] text-gray-400 font-medium">{node.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 h-full flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
              <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                <FileJson className="w-4 h-4 text-brand" />
                节点详情: {nodes.find(n => n.id === selectedNode)?.label}
              </h2>
            </div>
            <div className="p-8 flex-1 space-y-8">
              {selectedNode === 'node-db' && strategy?.status === 'pending_approval' && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 flex items-start gap-4">
                  <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
                  <div>
                    <h4 className="text-sm font-bold text-amber-900">流程已挂起</h4>
                    <p className="text-xs text-amber-700 mt-1 leading-relaxed">
                      当前节点配置为“人工确认”，流程已暂停执行。请在策略详情页完成审批后，流程将自动恢复。
                    </p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 gap-8">
                <div className="space-y-3">
                  <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">节点输入 (Input)</h4>
                  <div className="bg-gray-900 rounded-xl p-5 overflow-x-auto shadow-inner">
                    <pre className="text-xs text-emerald-400 font-mono leading-relaxed">
                      {JSON.stringify(logs[selectedNode]?.input, null, 2)}
                    </pre>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">节点输出 (Output)</h4>
                  <div className="bg-gray-900 rounded-xl p-5 overflow-x-auto shadow-inner">
                    <pre className="text-xs text-brand font-mono leading-relaxed">
                      {JSON.stringify(logs[selectedNode]?.output, null, 2)}
                    </pre>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
