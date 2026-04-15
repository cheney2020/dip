import React, { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { ChevronLeft, Clock, User, CheckCircle2, AlertCircle, Loader2, FileText, Activity, ShieldCheck, Zap, Send, MessageSquare, Layers, Edit3 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/src/components/ui/button"
import { cn } from "@/src/lib/utils"

const STATUS_MAP = {
  draft: { label: "草稿", color: "bg-gray-100 text-gray-500 border-gray-200", icon: FileText },
  processing: { label: "决策中", color: "bg-blue-50 text-blue-600 border-blue-100", icon: Loader2 },
  pending_approval: { label: "待审批", color: "bg-amber-50 text-amber-600 border-amber-100", icon: Clock },
  approved: { label: "已通过", color: "bg-emerald-50 text-emerald-600 border-emerald-100", icon: CheckCircle2 },
  rejected: { label: "已拒绝", color: "bg-red-50 text-red-600 border-red-100", icon: AlertCircle },
  terminated: { label: "已终止", color: "bg-gray-100 text-gray-500 border-gray-200", icon: Clock },
}

export function StrategyDetail() {
  const { strategyId } = useParams()
  const navigate = useNavigate()
  const queryParams = new URLSearchParams(window.location.search)
  const runIdParam = queryParams.get('runId')
  const appParam = queryParams.get('app')
  const flowParam = queryParams.get('flow')

  const storedStrategies = JSON.parse(localStorage.getItem('strategies') || '[]')
  const storedStrategy = storedStrategies.find((s: any) => s.id === strategyId)

  const [status, setStatus] = useState<string>(storedStrategy?.status || "processing")
  const [isLoadingSuggestion, setIsLoadingSuggestion] = useState(true)
  const [suggestionData, setSuggestionData] = useState<any>(null)
  const [isSubmittingApproval, setIsSubmittingApproval] = useState(false)
  const [approvalConclusion, setApprovalConclusion] = useState<"pass" | "reject" | null>(null)
  const [approvalComment, setApprovalComment] = useState("")
  const [isEditing, setIsEditing] = useState(false)
  const [editFormData, setEditFormData] = useState({
    name: storedStrategy?.name || "",
    applicant: storedStrategy?.applicant || "",
    amount: storedStrategy?.amount || "",
    mobile: storedStrategy?.mobile || "",
    idCard: storedStrategy?.idCard || "",
    scoreBase: storedStrategy?.scoreBase || 0
  })

  // Load real app and flow
  const storedApps = JSON.parse(localStorage.getItem('apps') || '[]')
  const realApp = storedApps.find((a: any) => a.id === (appParam || storedStrategy?.appId))
  const storedFlows = JSON.parse(localStorage.getItem(`flows_${realApp?.id}`) || '[]')
  const realFlow = storedFlows.find((f: any) => f.id === (flowParam || storedStrategy?.flowId))

  const strategyInfo = {
    id: strategyId || "ST-001",
    name: storedStrategy?.name || (strategyId === "ST-001" ? "个人小额贷款" : "企业信用提额"),
    applicant: storedStrategy?.applicant || "张三",
    submitTime: new Date().toLocaleString(),
    runId: runIdParam || storedStrategy?.runId || "R-20260409-001",
    appId: storedStrategy?.appId || "app-1",
    flowId: storedStrategy?.flowId || "flow-test",
    appName: realApp?.name || "未知应用",
    flowName: realFlow?.name || "未知流程",
    originalData: {
      name: storedStrategy?.applicant || "张三",
      amount: storedStrategy?.amount || "50,000",
      source: "Web端提交",
      mobile: storedStrategy?.mobile || "13800138000",
      idCard: storedStrategy?.idCard || "110101199001011234",
      scoreBase: storedStrategy?.scoreBase || 0
    }
  }

  useEffect(() => {
    const fetchRunData = async (runId: string) => {
      try {
        const res = await fetch(`/api/flow/run/${runId}`)
        if (!res.ok) return null
        const data = await res.json()
        const modelOutput = data.logs?.["node-model"]?.output
        if (modelOutput) {
          return {
            score: modelOutput.totalScore || modelOutput.total_score,
            rating: `随机数: ${modelOutput.randomA || modelOutput.random_a}, ${modelOutput.randomB || modelOutput.random_b}, ${modelOutput.randomC || modelOutput.random_c}, ${modelOutput.randomD || modelOutput.random_d}`,
            creditStatus: modelOutput.creditStatus || modelOutput.credit_status,
            diagnosis: modelOutput.diagnosis,
            scoreBase: modelOutput.scoreBase || modelOutput.score_base,
            ruleHit: "流程执行成功",
            nodes: Object.keys(data.logs || {}).map(k => {
              const map: any = {
                "node-start": "API 触发",
                "node-model": "模型调用",
                "node-http": "回调通知",
                "node-manual": "人工确认",
                "node-db": "数据入库",
                "node-kafka": "消息下发"
              }
              return map[k] || k
            })
          }
        }
      } catch (e) {
        console.error("Failed to fetch run data", e)
      }
      return null
    }

    const getIntelligentFallback = () => {
      const amountNum = parseFloat(String(strategyInfo.originalData.amount).replace(/,/g, '')) || 0
      const scoreBaseNum = 60 // Default
      
      let creditStatus = "正常"
      let diagnosis = "客户信用良好"
      
      if (amountNum > 500000) {
        creditStatus = "风险"
        diagnosis = `申请金额(¥${amountNum.toLocaleString()})过高，超出常规授信范围(¥500,000)`
      } else if (scoreBaseNum < 40) {
        creditStatus = "异常"
        diagnosis = `客户基础信用分(${scoreBaseNum})较低`
      }
      
      return {
        score: 85,
        rating: "高信誉",
        creditStatus,
        diagnosis,
        scoreBase: scoreBaseNum,
        ruleHit: "准入通过",
        nodes: ["模型调用", "数据库写入"]
      }
    }

    // If strategy is already in a final state, don't trigger automated processing
    if (status === 'approved' || status === 'rejected' || status === 'terminated') {
      // Mock some suggestion data if it's missing but we're in a final state
      if (!suggestionData) {
        const fetchExistingResult = async () => {
          if (strategyInfo.runId) {
            const runData = await fetchRunData(strategyInfo.runId)
            if (runData) {
              setSuggestionData(runData)
              setIsLoadingSuggestion(false)
              return
            }
          }
          setSuggestionData(getIntelligentFallback())
          setIsLoadingSuggestion(false)
        }
        fetchExistingResult()
      } else {
        setIsLoadingSuggestion(false)
      }
      return
    }

    // If it's ST-001, it's already pending approval
    if (strategyId === "ST-001") {
      setStatus("pending_approval")
      setIsLoadingSuggestion(false)
      setSuggestionData({
        score: 85,
        rating: "高信誉",
        ruleHit: "准入通过",
        nodes: ["模型调用", "数据库写入"]
      })
    } else {
      // If already pending_approval, try to fetch results immediately
      if (status === 'pending_approval') {
        const fetchResults = async () => {
          if (strategyInfo.runId) {
            const runData = await fetchRunData(strategyInfo.runId)
            if (runData) {
              setSuggestionData(runData)
              setIsLoadingSuggestion(false)
            }
          }
        }
        fetchResults()
      }

      // Simulate engine processing delay for new processing strategies
      if (status === 'processing') {
        const timer = setTimeout(async () => {
          let mockData: any = getIntelligentFallback()

          if (strategyInfo.runId) {
            const runData = await fetchRunData(strategyInfo.runId)
            if (runData) {
              mockData = runData
            }
          }

          setSuggestionData(mockData)
          setIsLoadingSuggestion(false)
          const newStatus = "pending_approval"
          setStatus(newStatus)
          
          // Persist automated status update
          const strategies = JSON.parse(localStorage.getItem('strategies') || '[]')
          const updated = strategies.map((s: any) => 
            s.id === strategyId ? { 
              ...s, 
              status: newStatus,
              modelSuggestion: mockData.score > 60 ? "建议通过" : "建议拒绝",
              score: mockData.score
            } : s
          )
          localStorage.setItem('strategies', JSON.stringify(updated))

          toast.success("决策引擎已完成自动化处理，等待人工审批")
        }, 3000)
        return () => clearTimeout(timer)
      }
    }
  }, [strategyId, flowParam, runIdParam, status])

  const handleApprove = async () => {
    if (!approvalConclusion) {
      toast.error("请选择审批结论")
      return
    }
    setIsSubmittingApproval(true)
    
    try {
      const runId = runIdParam || storedStrategy?.runId;
      if (runId) {
        const res = await fetch(`/api/flow/resume/${runId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: approvalConclusion === "pass" ? "approve" : "reject",
            comment: approvalComment
          })
        });
        
        if (!res.ok) {
          throw new Error("Failed to resume flow");
        }
      } else {
        // Fallback for mock data without runId
        await new Promise(resolve => setTimeout(resolve, 1500));
      }
      
      setIsSubmittingApproval(false)
      const newStatus = approvalConclusion === "pass" ? "approved" : "rejected"
      setStatus(newStatus)

      // Update localStorage
      const strategies = JSON.parse(localStorage.getItem('strategies') || '[]')
      const updated = strategies.map((s: any) => 
        s.id === strategyId ? { 
          ...s, 
          status: newStatus,
          modelSuggestion: suggestionData?.score ? (suggestionData.score > 60 ? "建议通过" : "建议拒绝") : s.modelSuggestion,
          score: suggestionData?.score || s.score
        } : s
      )
      localStorage.setItem('strategies', JSON.stringify(updated))
      
      if (approvalConclusion === "pass") {
        toast.success("审批已通过", {
          description: "信号已回传决策流程，流程继续流转（已写入数据库）。"
        })
      } else {
        toast.error("申请已驳回", {
          description: "决策流程已终止，请重新编辑提交。"
        })
      }
    } catch (e) {
      setIsSubmittingApproval(false)
      toast.error("审批提交失败，请重试")
    }
  }

  const handleSaveEdit = async () => {
    setIsLoadingSuggestion(true)
    try {
      // Start a new flow run
      const response = await fetch(`/api/flow/start/${strategyInfo.flowId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          strategyId: strategyId,
          appId: strategyInfo.appId,
          flowId: strategyInfo.flowId,
          formData: {
            requestId: `req_${Date.now()}`,
            bizNo: `biz_${Math.floor(Math.random() * 1000)}`,
            name: editFormData.applicant,
            scoreBase: editFormData.scoreBase,
            amount: editFormData.amount,
            mobile: editFormData.mobile,
            idCard: editFormData.idCard
          }
        })
      })

      if (!response.ok) throw new Error('Failed to restart flow')
      const data = await response.json()
      const newRunId = data.runId

      const strategies = JSON.parse(localStorage.getItem('strategies') || '[]')
      const updated = strategies.map((s: any) => 
        s.id === strategyId ? { 
          ...s, 
          ...editFormData,
          runId: newRunId,
          status: "processing" 
        } : s
      )
      localStorage.setItem('strategies', JSON.stringify(updated))
      
      // Update URL with new runId
      navigate(`/strategies/${strategyId}?runId=${newRunId}&app=${strategyInfo.appId}&flow=${strategyInfo.flowId}`, { replace: true })
      
      setIsEditing(false)
      setStatus("processing")
      toast.success("策略已更新，重新进入决策流程")
    } catch (error) {
      toast.error("更新失败，请重试")
      setIsLoadingSuggestion(false)
    }
  }

  const currentStatus = STATUS_MAP[status as keyof typeof STATUS_MAP]
  const StatusIcon = currentStatus.icon

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 pb-24">
      {/* Header */}
      <div className="flex flex-col space-y-4">
        <button 
          onClick={() => navigate('/strategies')}
          className="flex items-center text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors w-fit"
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          返回列表
        </button>
        
        <div className="flex items-end justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-brand rounded-2xl flex items-center justify-center shadow-lg shadow-brand/20">
              <ShieldCheck className="w-8 h-8 text-gray-900" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
                  {isEditing ? (
                    <input 
                      type="text"
                      className="px-2 py-1 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand text-2xl"
                      value={editFormData.name}
                      onChange={(e) => setEditFormData({...editFormData, name: e.target.value})}
                    />
                  ) : (
                    <>策略详情: {strategyInfo.name} <span className="text-gray-400 text-xl font-normal ml-2">({strategyInfo.id})</span></>
                  )}
                </h1>
                <span className={cn(
                   "inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold border uppercase tracking-wider",
                   currentStatus.color
                )}>
                  <StatusIcon className={cn("w-3.5 h-3.5", status === 'processing' && "animate-spin")} />
                  {currentStatus.label}
                </span>
                {(status === 'rejected' || status === 'terminated') && !isEditing && (
                  <button 
                    onClick={() => setIsEditing(true)}
                    className="flex items-center gap-1.5 px-3 py-1 bg-brand/10 text-brand rounded-lg text-xs font-bold hover:bg-brand/20 transition-colors"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    编辑并重新提交
                  </button>
                )}
                {isEditing && (
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={handleSaveEdit}
                      className="px-3 py-1 bg-brand text-white rounded-lg text-xs font-bold hover:bg-brand-dark transition-colors"
                    >
                      保存
                    </button>
                    <button 
                      onClick={() => setIsEditing(false)}
                      className="px-3 py-1 bg-gray-100 text-gray-600 rounded-lg text-xs font-bold hover:bg-gray-200 transition-colors"
                    >
                      取消
                    </button>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-4 mt-2">
                <div className="flex items-center gap-1.5 px-2 py-0.5 bg-gray-100 rounded text-[10px] font-bold text-gray-500 border border-gray-200 uppercase tracking-wider">
                  <Layers className="w-3 h-3" />
                  {strategyInfo.appName}
                </div>
                <div className="flex items-center gap-1.5 px-2 py-0.5 bg-brand/5 rounded text-[10px] font-bold text-brand border border-brand/10 uppercase tracking-wider">
                  <Zap className="w-3 h-3" />
                  {strategyInfo.flowName}
                </div>
                <div className="flex items-center gap-1.5 text-xs text-gray-400">
                  <Activity className="w-3.5 h-3.5" />
                  运行实例: 
                  <span className="font-mono text-brand font-bold bg-gray-50 px-1.5 py-0.5 rounded border border-gray-100">
                    {strategyInfo.runId}
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={() => navigate(`/apps/${strategyInfo.appId || 'app-1'}/flows/${strategyInfo.flowId || 'flow-test'}?runId=${strategyInfo.runId || strategyId}&mode=view`)}>
              <Activity className="w-4 h-4 mr-2" />
              查看执行轨迹
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Original Data */}
        <div className="card overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <FileText className="w-4 h-4 text-brand" />
              业务原始数据
            </h3>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Client Data</span>
          </div>
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-2 gap-y-6 gap-x-12">
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">客户姓名</p>
                {isEditing ? (
                  <input 
                    type="text"
                    className="w-full px-2 py-1 border border-gray-200 rounded-lg text-sm"
                    value={editFormData.applicant}
                    onChange={(e) => setEditFormData({...editFormData, applicant: e.target.value})}
                  />
                ) : (
                  <p className="text-sm font-bold text-gray-900">{strategyInfo.originalData.name}</p>
                )}
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">申请金额</p>
                {isEditing ? (
                  <input 
                    type="text"
                    className="w-full px-2 py-1 border border-gray-200 rounded-lg text-sm"
                    value={editFormData.amount}
                    onChange={(e) => setEditFormData({...editFormData, amount: e.target.value})}
                  />
                ) : (
                  <p className="text-sm font-bold text-gray-900">¥ {strategyInfo.originalData.amount}</p>
                )}
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">手机号</p>
                {isEditing ? (
                  <input 
                    type="text"
                    className="w-full px-2 py-1 border border-gray-200 rounded-lg text-sm"
                    value={editFormData.mobile}
                    onChange={(e) => setEditFormData({...editFormData, mobile: e.target.value})}
                  />
                ) : (
                  <p className="text-sm font-bold text-gray-900">{strategyInfo.originalData.mobile}</p>
                )}
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">身份证号</p>
                {isEditing ? (
                  <input 
                    type="text"
                    className="w-full px-2 py-1 border border-gray-200 rounded-lg text-sm"
                    value={editFormData.idCard}
                    onChange={(e) => setEditFormData({...editFormData, idCard: e.target.value})}
                  />
                ) : (
                  <p className="text-sm font-bold text-gray-900">{strategyInfo.originalData.idCard}</p>
                )}
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">基础信用分</p>
                {isEditing ? (
                  <input 
                    type="number"
                    className="w-full px-2 py-1 border border-gray-200 rounded-lg text-sm"
                    value={editFormData.scoreBase}
                    onChange={(e) => setEditFormData({...editFormData, scoreBase: parseInt(e.target.value) || 0})}
                  />
                ) : (
                  <p className="text-sm font-bold text-gray-900">{suggestionData?.scoreBase ?? strategyInfo.originalData.scoreBase ?? 0}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Engine Suggestions */}
        <div className="card overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <Zap className="w-4 h-4 text-brand" />
              决策引擎建议 (流程回传)
            </h3>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Engine Output</span>
          </div>
          <div className="p-6 h-full min-h-[200px] flex flex-col justify-center">
            {isLoadingSuggestion ? (
              <div className="flex flex-col items-center justify-center space-y-4 py-8">
                <Loader2 className="w-8 h-8 text-brand animate-spin" />
                <div className="text-center">
                  <p className="text-sm font-bold text-gray-900">引擎正在计算中...</p>
                  <p className="text-xs text-gray-400 mt-1">正在执行: 模型调用 -&gt; 规则引擎校验</p>
                </div>
              </div>
            ) : suggestionData ? (
              <div className="space-y-6 animate-in fade-in duration-500">
                <div className="grid grid-cols-2 gap-6">
                  <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                    <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mb-1">模型评分</p>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-bold text-emerald-700">{suggestionData.score}</span>
                      <span className="text-xs font-bold text-emerald-600">({suggestionData.rating})</span>
                    </div>
                  </div>
                  <div className={cn(
                    "p-4 rounded-2xl border",
                    suggestionData.creditStatus === '风险' ? "bg-red-50 border-red-100" : 
                    suggestionData.creditStatus === '异常' ? "bg-amber-50 border-amber-100" :
                    suggestionData.creditStatus === '关注' ? "bg-blue-50 border-blue-100" :
                    "bg-emerald-50 border-emerald-100"
                  )}>
                    <p className={cn(
                      "text-[10px] font-bold uppercase tracking-wider mb-1",
                      suggestionData.creditStatus === '风险' ? "text-red-600" : 
                      suggestionData.creditStatus === '异常' ? "text-amber-600" :
                      suggestionData.creditStatus === '关注' ? "text-blue-600" :
                      "text-emerald-600"
                    )}>信用诊断</p>
                    <div className="flex items-baseline gap-1">
                      <p className={cn(
                        "text-lg font-bold",
                        suggestionData.creditStatus === '风险' ? "text-red-700" : 
                        suggestionData.creditStatus === '异常' ? "text-amber-700" :
                        suggestionData.creditStatus === '关注' ? "text-blue-700" :
                        "text-emerald-700"
                      )}>{suggestionData.creditStatus || "正常"}</p>
                      {suggestionData.scoreBase !== undefined && (
                        <span className="text-[10px] font-bold text-gray-400 ml-1">(基础分: {suggestionData.scoreBase})</span>
                      )}
                    </div>
                  </div>
                </div>

                {suggestionData.diagnosis && (
                  <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">诊断建议</p>
                    <p className="text-sm text-gray-700 leading-relaxed font-medium">
                      {suggestionData.diagnosis}
                    </p>
                  </div>
                )}

                <div className="p-4 bg-amber-50/50 rounded-xl border border-amber-100">
                  <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wider mb-2 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    风险识别逻辑说明
                  </p>
                  <ul className="text-[10px] text-amber-800 space-y-1 list-disc pl-3 leading-relaxed">
                    <li>申请金额 &gt; 50万 或 模型评分 &lt; 100：判定为“风险”</li>
                    <li>基础信用分 &lt; 40 或 模型评分 &lt; 180：判定为“异常”</li>
                    <li>(金额 &gt; 10万 且 信用分 &lt; 60) 或 模型评分 &lt; 240：判定为“关注”</li>
                    <li>其他情况判定为“正常”</li>
                  </ul>
                </div>

                <div className="space-y-2">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">已处理节点路径</p>
                  <div className="flex flex-wrap items-center gap-2">
                    {suggestionData.nodes?.map((node: string, index: number) => (
                      <div key={`${node}-${index}`} className="flex items-center gap-2">
                        <span className="px-2 py-1 bg-gray-100 rounded text-[10px] font-bold text-gray-600 border border-gray-200">
                          {node}
                        </span>
                        {index < (suggestionData.nodes?.length || 0) - 1 && (
                          <div className="w-4 h-px bg-gray-300" />
                        )}
                      </div>
                    ))}
                    
                    {status === 'pending_approval' && (
                      <>
                        <div className="w-4 h-px bg-gray-300" />
                        <span className="px-2 py-1 bg-amber-50 rounded text-[10px] font-bold text-amber-600 border border-amber-200 animate-pulse">
                          人工确认 (挂起中)
                        </span>
                      </>
                    )}
                    
                    {(status === 'approved' || status === 'rejected') && (
                      <>
                        <div className="w-4 h-px bg-gray-300" />
                        <span className={cn(
                          "px-2 py-1 rounded text-[10px] font-bold border",
                          status === 'approved' ? "bg-emerald-50 text-emerald-600 border-emerald-200" : "bg-red-50 text-red-600 border-red-200"
                        )}>
                          流程结束
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                <AlertCircle className="w-8 h-8 mb-2 opacity-20" />
                <p className="text-xs">暂无决策数据</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Approval Section */}
      {status === 'pending_approval' && (
        <div className="card p-8 border-2 border-brand/20 shadow-xl shadow-brand/5 animate-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-brand rounded-xl flex items-center justify-center shadow-lg shadow-brand/20">
              <User className="w-5 h-5 text-gray-900" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900">审批操作 (流程在此挂起)</h3>
              <p className="text-xs text-gray-500">请根据引擎建议及业务原始数据给出最终审批结论</p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="space-y-3">
              <label className="text-sm font-bold text-gray-700">审批结论</label>
              <div className="flex gap-4">
                <button 
                  onClick={() => setApprovalConclusion("pass")}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 transition-all font-bold text-sm",
                    approvalConclusion === 'pass' 
                      ? "bg-emerald-50 border-emerald-500 text-emerald-700 shadow-lg shadow-emerald-100" 
                      : "bg-white border-gray-100 text-gray-400 hover:border-emerald-200 hover:text-emerald-600"
                  )}
                >
                  <CheckCircle2 className="w-4 h-4" />
                  通过
                </button>
                <button 
                  onClick={() => setApprovalConclusion("reject")}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 transition-all font-bold text-sm",
                    approvalConclusion === 'reject' 
                      ? "bg-red-50 border-red-500 text-red-700 shadow-lg shadow-red-100" 
                      : "bg-white border-gray-100 text-gray-400 hover:border-red-200 hover:text-red-600"
                  )}
                >
                  <AlertCircle className="w-4 h-4" />
                  驳回
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-gray-400" />
                审批意见
              </label>
              <textarea 
                rows={3}
                placeholder="请输入审批意见 (可选)..."
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand transition-all text-sm resize-none"
                value={approvalComment}
                onChange={(e) => setApprovalComment(e.target.value)}
              />
            </div>

            <div className="flex justify-end">
              <button 
                onClick={handleApprove}
                disabled={isSubmittingApproval || !approvalConclusion}
                className={cn(
                  "btn-primary px-12 py-3 flex items-center gap-2 text-base",
                  (isSubmittingApproval || !approvalConclusion) && "opacity-50 cursor-not-allowed"
                )}
              >
                {isSubmittingApproval ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
                提交审批结果
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Post-Approval Info */}
      {(status === 'approved' || status === 'rejected') && (
        <div className={cn(
          "card p-6 flex items-center gap-4 border-l-4 animate-in fade-in duration-500",
          status === 'approved' ? "border-l-emerald-500 bg-emerald-50/30" : "border-l-red-500 bg-red-50/30"
        )}>
          {status === 'approved' ? (
            <CheckCircle2 className="w-8 h-8 text-emerald-500" />
          ) : (
            <AlertCircle className="w-8 h-8 text-red-500" />
          )}
          <div>
            <h3 className="text-base font-bold text-gray-900">
              审批结论: {status === 'approved' ? '已通过' : '已驳回'}
            </h3>
            <p className="text-sm text-gray-500 mt-0.5">
              {status === 'approved' 
                ? '流程已恢复运行，最终决策数据已通过 Kafka 节点下发至下游生产系统。' 
                : '决策流程已终止，相关业务申请已关闭。'}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
