import React, { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { ChevronLeft, Layers, Send, AlertCircle, CheckCircle2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/src/components/ui/button"
import { cn } from "@/src/lib/utils"

export function StrategyCreate() {
  const navigate = useNavigate()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [apps, setApps] = useState<any[]>([])
  const [formData, setFormData] = useState({
    name: "",
    appId: "",
    flowId: "",
    customerName: "",
    amount: "",
    scoreBase: "60",
    mobile: "",
    idCard: "",
    comment: ""
  })

  useEffect(() => {
    // Load real apps and their published flows
    const storedApps = JSON.parse(localStorage.getItem('apps') || '[]')
    const appsWithFlows = storedApps.map((app: any) => {
      const storedFlows = JSON.parse(localStorage.getItem(`flows_${app.id}`) || '[]')
      const publishedFlows = storedFlows.filter((f: any) => f.status === 'published')
      return { ...app, flows: publishedFlows }
    }).filter((app: any) => app.flows.length > 0) // Only keep apps that have at least one published flow

    setApps(appsWithFlows)
    
    if (appsWithFlows.length > 0) {
      setFormData(prev => ({
        ...prev,
        appId: appsWithFlows[0].id,
        flowId: appsWithFlows[0].flows[0].id
      }))
    }
  }, [])

  const currentApp = apps.find(a => a.id === formData.appId)
  const currentFlow = currentApp?.flows.find((f: any) => f.id === formData.flowId)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentApp || !currentFlow) {
      toast.error("请选择有效的应用和流程")
      return
    }
    
    setIsSubmitting(true)

    try {
      // Simulate calling Start Component API
      console.log(`[Start Component API] Calling POST /api/flow/start/${formData.flowId}`, {
        strategyId: "AUTO_GEN",
        appId: formData.appId,
        flowId: formData.flowId,
        formData: {
          customerName: formData.customerName,
          amount: formData.amount,
          mobile: formData.mobile,
          idCard: formData.idCard
        }
      })
      
      toast.loading(`正在调用 [${currentFlow.name}] 开始组件 API...`, { id: 'submit-strategy' })
      
      const response = await fetch(`/api/flow/start/${formData.flowId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          strategyId: "AUTO_GEN",
          appId: formData.appId,
          flowId: formData.flowId,
          formData: {
            requestId: `req_${Date.now()}`,
            bizNo: `biz_${Math.floor(Math.random() * 1000)}`,
            name: formData.customerName,
            scoreBase: formData.scoreBase,
            amount: formData.amount,
            mobile: formData.mobile,
            idCard: formData.idCard
          }
        })
      })

      if (!response.ok) throw new Error('API request failed')
      
      const data = await response.json()
      const runId = data.runId
      
      // Save to localStorage
      const stored = localStorage.getItem('strategies')
      const strategies = stored ? JSON.parse(stored) : []
      const newStrategy = {
        id: `ST-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`,
        name: formData.name,
        applicant: formData.customerName || "未知",
        creator: "admin",
        status: "processing",
        modelSuggestion: "--",
        score: null,
        appId: formData.appId,
        flowId: formData.flowId,
        runId: runId,
        amount: formData.amount,
        mobile: formData.mobile,
        idCard: formData.idCard,
        scoreBase: formData.scoreBase
      }
      localStorage.setItem('strategies', JSON.stringify([newStrategy, ...strategies]))

      toast.success(`策略已提交，流程实例 [${runId}] 已启动`, { id: 'submit-strategy' })
      navigate(`/strategies/${newStrategy.id}?runId=${runId}&app=${formData.appId}&flow=${formData.flowId}`) 
    } catch (error) {
      toast.error('启动失败', { id: 'submit-strategy' })
      setIsSubmitting(false)
    }
  }

  return (
    <div className="p-8 max-w-3xl mx-auto space-y-8">
      <div className="flex flex-col space-y-4">
        <button 
          onClick={() => navigate('/strategies')}
          className="flex items-center text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors w-fit"
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          返回列表
        </button>
        <h2 className="text-3xl font-bold text-gray-900 tracking-tight">新建策略申请</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="card p-8 space-y-6">
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Layers className="w-5 h-5 text-brand" />
              基础信息
            </h3>
            <div className="grid grid-cols-1 gap-6">
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-gray-700">策略名称</label>
                <input 
                  type="text" 
                  required
                  placeholder="例如：张三个人贷款申请"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand transition-all text-sm"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                />
              </div>
              
              {apps.length === 0 ? (
                <div className="col-span-2 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-bold text-amber-800">暂无可用的流程</h4>
                    <p className="text-sm text-amber-700 mt-1">您需要先在“应用管理”中创建一个应用，并发布至少一个流程，才能创建策略申请。</p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-gray-700">关联应用</label>
                    <select 
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand transition-all text-sm bg-white"
                      value={formData.appId}
                      onChange={(e) => {
                        const newAppId = e.target.value
                        const newApp = apps.find(a => a.id === newAppId)!
                        setFormData({
                          ...formData, 
                          appId: newAppId,
                          flowId: newApp.flows[0].id
                        })
                      }}
                    >
                      {apps.map(app => (
                        <option key={app.id} value={app.id}>{app.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-bold text-gray-700">关联流程</label>
                    <select 
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand transition-all text-sm bg-white"
                      value={formData.flowId}
                      onChange={(e) => setFormData({...formData, flowId: e.target.value})}
                    >
                      {currentApp?.flows.map((flow: any) => (
                        <option key={flow.id} value={flow.id}>{flow.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="h-px bg-gray-100" />

          <div className="space-y-4">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <FileText className="w-5 h-5 text-brand" />
              表单业务数据
            </h3>
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-gray-700">客户姓名</label>
                <input 
                  type="text" 
                  required
                  placeholder="请输入姓名"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand transition-all text-sm"
                  value={formData.customerName}
                  onChange={(e) => setFormData({...formData, customerName: e.target.value})}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-gray-700">申请金额 (元)</label>
                <input 
                  type="number" 
                  required
                  placeholder="请输入金额"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand transition-all text-sm"
                  value={formData.amount}
                  onChange={(e) => setFormData({...formData, amount: e.target.value})}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-gray-700">基础信用分</label>
                <input 
                  type="number" 
                  required
                  min="0"
                  max="100"
                  placeholder="请输入 0-100 的分值"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand transition-all text-sm"
                  value={formData.scoreBase}
                  onChange={(e) => setFormData({...formData, scoreBase: e.target.value})}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-gray-700">手机号</label>
                <input 
                  type="tel" 
                  required
                  placeholder="请输入手机号"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand transition-all text-sm"
                  value={formData.mobile}
                  onChange={(e) => setFormData({...formData, mobile: e.target.value})}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-gray-700">身份证号</label>
                <input 
                  type="text" 
                  required
                  placeholder="请输入身份证号"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand transition-all text-sm"
                  value={formData.idCard}
                  onChange={(e) => setFormData({...formData, idCard: e.target.value})}
                />
              </div>
              <div className="col-span-2 space-y-1.5">
                <label className="text-sm font-bold text-gray-700">补充说明</label>
                <textarea 
                  rows={3}
                  placeholder="请输入补充说明..."
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand transition-all text-sm resize-none"
                  value={formData.comment}
                  onChange={(e) => setFormData({...formData, comment: e.target.value})}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-brand/5 border border-brand/10 p-4 rounded-xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-brand shrink-0 mt-0.5" />
          <p className="text-xs text-gray-600 leading-relaxed">
            <span className="font-bold text-gray-900 block mb-1">提交说明</span>
            提交后系统将自动调用“{currentFlow?.name || '未知流程'}”的开始组件 API 启动流程。
          </p>
        </div>

        <div className="flex items-center justify-end gap-4">
          <Button 
            type="button" 
            variant="outline" 
            className="px-8 rounded-xl"
            onClick={() => navigate('/strategies')}
          >
            取消
          </Button>
          <button 
            type="submit" 
            disabled={isSubmitting || apps.length === 0}
            className={cn(
              "btn-primary px-8 py-2.5 flex items-center gap-2",
              (isSubmitting || apps.length === 0) && "opacity-50 cursor-not-allowed"
            )}
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            提交并启动决策
          </button>
        </div>
      </form>
    </div>
  )
}

function FileText({ className }: { className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <line x1="10" y1="9" x2="8" y2="9" />
    </svg>
  )
}

function Loader2({ className }: { className?: string }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  )
}
