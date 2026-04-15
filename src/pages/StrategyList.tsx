import React, { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { Plus, Search, Filter, ChevronRight, MoreHorizontal, FileText, Clock, User, CheckCircle2, AlertCircle, Loader2, Trash2, XCircle, Copy } from "lucide-react"
import { cn } from "@/src/lib/utils"
import { toast } from "sonner"
import { INITIAL_APPS } from "@/src/constants"

const INITIAL_MOCK_STRATEGIES = [
  { 
    id: "ST-001", 
    name: "个人小额贷款申请", 
    applicant: "张三", 
    status: "pending_approval", 
    modelSuggestion: "建议通过", 
    submitTime: "2026-04-09 10:20",
    score: 85,
    appId: "app-1",
    flowId: "flow-1",
    flowName: "表单审核流程 v1.0"
  },
  { 
    id: "ST-002", 
    name: "企业信用提额申请", 
    applicant: "李四", 
    status: "processing", 
    modelSuggestion: "--", 
    submitTime: "2026-04-09 10:45",
    score: null,
    appId: "app-2",
    flowId: "flow-3",
    flowName: "企业信用评估流程 v2.1"
  },
]

const STATUS_MAP = {
  draft: { label: "草稿", color: "bg-gray-100 text-gray-500 border-gray-200", icon: FileText },
  processing: { label: "决策中", color: "bg-blue-50 text-blue-600 border-blue-100", icon: Loader2 },
  pending_approval: { label: "待审批", color: "bg-amber-50 text-amber-600 border-amber-100", icon: Clock },
  approved: { label: "已通过", color: "bg-emerald-50 text-emerald-600 border-emerald-100", icon: CheckCircle2 },
  rejected: { label: "已拒绝", color: "bg-red-50 text-red-600 border-red-100", icon: AlertCircle },
  terminated: { label: "已终止", color: "bg-gray-100 text-gray-500 border-gray-200", icon: XCircle },
}

export function StrategyList() {
  const navigate = useNavigate()
  const [searchTerm, setSearchTerm] = useState("")
  const [strategies, setStrategies] = useState<any[]>([])
  const [apps, setApps] = useState<any[]>([])

  useEffect(() => {
    let storedAppsStr = localStorage.getItem('apps')
    let storedApps = []
    
    if (storedAppsStr) {
      storedApps = JSON.parse(storedAppsStr)
    } else {
      storedApps = INITIAL_APPS
      localStorage.setItem('apps', JSON.stringify(INITIAL_APPS))
    }
    setApps(storedApps)

    const stored = localStorage.getItem('strategies')
    if (stored) {
      setStrategies(JSON.parse(stored))
    } else {
      // Only set initial mock strategies if localStorage is completely empty
      setStrategies([])
    }
  }, [])

  const getAppName = (appId: string, appName?: string) => {
    if (appName) return appName
    const app = apps.find(a => a.id === appId)
    return app ? app.name : "未知应用"
  }

  const getFlowName = (appId: string, flowId: string, flowName?: string) => {
    if (flowName) return flowName
    const flows = JSON.parse(localStorage.getItem(`flows_${appId}`) || '[]')
    const flow = flows.find((f: any) => f.id === flowId)
    return flow ? flow.name : "未知流程"
  }

  const handleTerminate = (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    const updated = strategies.map(s => s.id === id ? { ...s, status: 'terminated' } : s)
    setStrategies(updated)
    localStorage.setItem('strategies', JSON.stringify(updated))
    toast.success("策略已终止")
  }

  const handleCopy = (e: React.MouseEvent, strategy: any) => {
    e.stopPropagation()
    const newId = `ST-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`
    const newStrategy = {
      ...strategy,
      id: newId,
      name: `${strategy.name} (副本)`,
      status: "draft",
      modelSuggestion: "--",
      score: null,
      runId: null,
      submitTime: new Date().toLocaleString()
    }
    const updated = [newStrategy, ...strategies]
    setStrategies(updated)
    localStorage.setItem('strategies', JSON.stringify(updated))
    toast.success("策略已复制为草稿")
  }

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    const updated = strategies.filter(s => s.id !== id)
    setStrategies(updated)
    localStorage.setItem('strategies', JSON.stringify(updated))
    toast.success("策略已删除")
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">策略申请列表</h2>
          <p className="text-gray-500 mt-1">管理业务策略申请及其决策全链路状态</p>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate("/strategies/new")}
            className="btn-primary"
          >
            <Plus className="w-4 h-4 mr-2" />
            新建策略申请
          </button>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input 
            type="text" 
            placeholder="搜索策略 ID 或名称..." 
            className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">
          <Filter className="w-4 h-4" />
          筛选状态
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-gray-50/50 border-b border-gray-200">
              <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">策略 ID</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">策略名称</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">关联应用/流程</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">创建人</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">当前状态</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">模型建议</th>
              <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {strategies.map((strategy) => {
              const status = STATUS_MAP[strategy.status as keyof typeof STATUS_MAP] || STATUS_MAP.draft
              const StatusIcon = status.icon
              
              return (
                <tr 
                  key={strategy.id} 
                  className="group hover:bg-gray-50/50 transition-colors cursor-pointer"
                  onClick={() => navigate(`/strategies/${strategy.id}`)}
                >
                  <td className="px-6 py-5">
                    <span className="font-mono text-xs font-bold text-gray-900 bg-gray-100 px-2 py-1 rounded border border-gray-200">
                      {strategy.id}
                    </span>
                  </td>
                  <td className="px-6 py-5">
                    <p className="text-sm font-bold text-gray-900 group-hover:text-brand transition-colors">{strategy.name}</p>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex flex-col gap-1">
                      <span className="text-xs font-medium text-gray-900">{getAppName(strategy.appId, strategy.appName)}</span>
                      <span className="text-[10px] text-gray-500">{getFlowName(strategy.appId, strategy.flowId, strategy.flowName)}</span>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-600">
                        {(strategy.creator || "a")[0].toUpperCase()}
                      </div>
                      <span className="text-sm text-gray-600">{strategy.creator || "admin"}</span>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <span className={cn(
                      "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold border uppercase tracking-wider",
                      status.color
                    )}>
                      <StatusIcon className={cn("w-3 h-3", strategy.status === 'processing' && "animate-spin")} />
                      {status.label}
                    </span>
                  </td>
                  <td className="px-6 py-5">
                    <span className={cn(
                      "text-sm font-medium",
                      strategy.modelSuggestion === '建议通过' ? "text-emerald-600" : 
                      strategy.modelSuggestion === '建议拒绝' ? "text-red-600" : "text-gray-400"
                    )}>
                      {strategy.modelSuggestion}
                    </span>
                  </td>
                  <td className="px-6 py-5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={(e) => handleCopy(e, strategy)}
                        className="px-2 py-1 text-xs font-medium text-brand hover:bg-brand/10 rounded transition-colors flex items-center gap-1"
                        title="复制策略"
                      >
                        <Copy className="w-3 h-3" />
                        复制
                      </button>
                      {(strategy.status === 'processing' || strategy.status === 'pending_approval') && (
                        <button 
                          onClick={(e) => handleTerminate(e, strategy.id)}
                          className="px-2 py-1 text-xs font-medium text-amber-600 hover:bg-amber-50 rounded transition-colors"
                        >
                          终止
                        </button>
                      )}
                      {(strategy.status === 'terminated' || strategy.status === 'rejected' || strategy.status === 'approved') && (
                        <button 
                          onClick={(e) => handleDelete(e, strategy.id)}
                          className="px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 rounded transition-colors"
                        >
                          删除
                        </button>
                      )}
                      <button className="p-2 text-gray-400 hover:text-brand hover:bg-brand/10 rounded-lg transition-all">
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
