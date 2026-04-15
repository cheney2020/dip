import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { Plus, ChevronLeft, Search, MoreVertical, Edit3, Copy, Trash2, Play, History, Info, Layers, Square } from "lucide-react"
import { Button } from "@/src/components/ui/button"
import { Modal } from "@/src/components/ui/modal"
import { INITIAL_APPS } from "@/src/constants"
import { cn } from "@/src/lib/utils"

const INITIAL_MOCK_FLOWS = [
  { id: "flow-test", name: "测试专用", status: "draft", version: "v1.0", updatedAt: "2026-04-09", desc: "用于验证决策引擎的最小可运行闭环能力。" },
  { id: "flow-1", name: "表单审核流程", status: "published", version: "v1.0", updatedAt: "2026-04-08", desc: "处理用户提交的业务申请表单，进行自动化合规性校验。" },
  { id: "flow-2", name: "风险复核流程", status: "draft", version: "draft-2", updatedAt: "2026-04-08", desc: "针对高风险交易进行二次人工复核与决策。" },
  { id: "flow-3", name: "历史回溯流程", status: "offline", version: "v0.8", updatedAt: "2026-04-05", desc: "对历史数据进行重新跑批与校验。" },
]

export function AppDetail() {
  const { appId } = useParams()
  const navigate = useNavigate()
  const [isCreateFlowModalOpen, setIsCreateFlowModalOpen] = useState(false)
  const [isEditAppModalOpen, setIsEditAppModalOpen] = useState(false)
  const [newFlowName, setNewFlowName] = useState("")
  const [newFlowDesc, setNewFlowDesc] = useState("")
  const [flows, setFlows] = useState<any[]>([])
  const [flowToDelete, setFlowToDelete] = useState<string | null>(null)
  const [appInfo, setAppInfo] = useState<any>(null)

  useEffect(() => {
    // Load app info
    let storedAppsStr = localStorage.getItem('apps')
    let storedApps = []
    
    if (storedAppsStr) {
      storedApps = JSON.parse(storedAppsStr)
    } else {
      storedApps = INITIAL_APPS
      localStorage.setItem('apps', JSON.stringify(INITIAL_APPS))
    }

    const currentApp = storedApps.find((a: any) => a.id === appId)
    if (currentApp) {
      setAppInfo(currentApp)
    }

    const storedFlows = localStorage.getItem(`flows_${appId}`)
    if (storedFlows) {
      let parsedFlows = JSON.parse(storedFlows);
      setFlows(parsedFlows)
    } else {
      setFlows(INITIAL_MOCK_FLOWS)
      localStorage.setItem(`flows_${appId}`, JSON.stringify(INITIAL_MOCK_FLOWS))
    }
  }, [appId])

  const handleCreateFlow = () => {
    const newFlowId = `flow-${Date.now()}`
    const newFlow = {
      id: newFlowId,
      name: newFlowName,
      status: "draft",
      version: "v1.0",
      updatedAt: new Date().toISOString().split('T')[0],
      desc: newFlowDesc || "新创建的决策流程"
    }
    const updatedFlows = [newFlow, ...flows]
    setFlows(updatedFlows)
    localStorage.setItem(`flows_${appId}`, JSON.stringify(updatedFlows))
    
    setIsCreateFlowModalOpen(false)
    setNewFlowName("")
    setNewFlowDesc("")
    navigate(`/apps/${appId}/flows/${newFlowId}?mode=edit`)
  }

  const handleOfflineFlow = (flowId: string) => {
    const updatedFlows = flows.map(f => 
      f.id === flowId ? { ...f, status: 'offline' } : f
    );
    setFlows(updatedFlows);
    localStorage.setItem(`flows_${appId}`, JSON.stringify(updatedFlows));
  }

  const confirmDeleteFlow = (flowId: string) => {
    setFlowToDelete(flowId);
  }

  const handleDeleteFlow = () => {
    if (!flowToDelete) return;
    const updatedFlows = flows.filter(f => f.id !== flowToDelete);
    setFlows(updatedFlows);
    localStorage.setItem(`flows_${appId}`, JSON.stringify(updatedFlows));
    setFlowToDelete(null);
  }

  const handleCopyFlow = (flow: any) => {
    const newFlowId = `flow-${Date.now()}`;
    const newFlow = {
      ...flow,
      id: newFlowId,
      name: `${flow.name} (副本)`,
      status: "draft",
      updatedAt: new Date().toISOString().split('T')[0],
    };
    const updatedFlows = [newFlow, ...flows];
    setFlows(updatedFlows);
    localStorage.setItem(`flows_${appId}`, JSON.stringify(updatedFlows));
  }

  return (
    <div className="min-h-screen bg-bg-main p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col space-y-4">
          <button 
            onClick={() => navigate('/apps')}
            className="flex items-center text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors w-fit"
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            返回应用列表
          </button>
          
          <div className="flex items-end justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-brand rounded-2xl flex items-center justify-center shadow-lg shadow-brand/20">
                <Layers className="w-8 h-8 text-gray-900" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">{appInfo?.name}</h1>
                <p className="text-gray-500 mt-1 flex items-center gap-2">
                  <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded border border-gray-200">{appId}</span>
                  <span className="text-gray-300">•</span>
                  <span className="text-sm">{appInfo?.description}</span>
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="rounded-xl" onClick={() => setIsEditAppModalOpen(true)}>
                <Edit3 className="w-4 h-4 mr-2" />
                编辑应用
              </Button>
              <button 
                onClick={() => setIsCreateFlowModalOpen(true)}
                className="btn-primary"
              >
                <Plus className="w-4 h-4 mr-2" />
                新建决策流程
              </button>
            </div>
          </div>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="card p-6 flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
              <Info className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">创建人</p>
              <p className="text-base font-bold text-gray-900">admin</p>
            </div>
          </div>
          <div className="card p-6 flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
              <History className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">更新时间</p>
              <p className="text-base font-bold text-gray-900">2026-04-08 14:20</p>
            </div>
          </div>
          <div className="card p-6 flex items-center gap-4">
            <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">流程统计</p>
              <p className="text-base font-bold text-gray-900">
                {flows.length} 个流程 / {flows.filter(f => f.status === 'published').length} 个已发布
              </p>
            </div>
          </div>
        </div>

        {/* Flow List Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">决策流程列表</h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input 
                type="text" 
                placeholder="搜索流程..." 
                className="pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent transition-all w-64"
              />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">流程名称</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">状态</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">当前版本</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">更新时间</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {flows.map((flow) => (
                  <tr key={flow.id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="px-6 py-5">
                      <div>
                        <p className="text-sm font-bold text-gray-900 group-hover:text-brand transition-colors cursor-pointer" onClick={() => navigate(`/apps/${appId}/flows/${flow.id}?mode=view`)}>
                          {flow.name}
                        </p>
                        <p className="text-xs text-gray-400 mt-1 line-clamp-1">{flow.desc}</p>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      {flow.status === 'published' ? (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-100 uppercase tracking-wider">
                          已发布
                        </span>
                      ) : flow.status === 'offline' ? (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-bold bg-red-50 text-red-600 border border-red-100 uppercase tracking-wider">
                          已下线
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-bold bg-gray-100 text-gray-500 border border-gray-200 uppercase tracking-wider">
                          草稿
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-5">
                      <span className="font-mono text-xs text-gray-500 bg-gray-50 px-2 py-0.5 rounded border border-gray-100">
                        {flow.version}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-sm text-gray-500">{flow.updatedAt}</td>
                    <td className="px-6 py-5">
                      <div className="flex items-center justify-end gap-2">
                        {flow.status !== 'published' ? (
                          <>
                            <button 
                              className="p-2 text-gray-400 hover:text-brand hover:bg-brand/10 rounded-lg transition-all"
                              onClick={() => navigate(`/apps/${appId}/flows/${flow.id}?mode=edit`)}
                              title="编辑流程"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button 
                              className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all" 
                              title="复制流程"
                              onClick={() => handleCopyFlow(flow)}
                            >
                              <Copy className="w-4 h-4" />
                            </button>
                            <button 
                              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all" 
                              title="删除流程"
                              onClick={() => confirmDeleteFlow(flow.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        ) : (
                          <>
                            <button 
                              className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all" 
                              title="复制流程"
                              onClick={() => handleCopyFlow(flow)}
                            >
                              <Copy className="w-4 h-4" />
                            </button>
                            <button 
                              className="p-2 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-all" 
                              title="下线流程"
                              onClick={() => handleOfflineFlow(flow.id)}
                            >
                              <Square className="w-4 h-4" />
                            </button>
                            <span className="text-[10px] font-bold text-gray-300 ml-2 uppercase tracking-tight">已发布不可编辑</span>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Delete Flow Modal */}
      <Modal
        isOpen={!!flowToDelete}
        onClose={() => setFlowToDelete(null)}
        title="确认删除流程"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setFlowToDelete(null)}>取消</Button>
            <button 
              onClick={handleDeleteFlow} 
              className="px-6 py-2 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700 transition-colors"
            >
              确认删除
            </button>
          </div>
        }
      >
        <div className="p-4 bg-red-50 border border-red-100 rounded-xl">
          <p className="text-sm text-red-800 leading-relaxed">
            您确定要删除该流程吗？此操作不可恢复。
          </p>
        </div>
      </Modal>

      {/* Edit App Modal */}
      <Modal
        isOpen={isEditAppModalOpen}
        onClose={() => setIsEditAppModalOpen(false)}
        title="编辑应用信息"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setIsEditAppModalOpen(false)}>取消</Button>
            <button onClick={() => setIsEditAppModalOpen(false)} className="btn-primary px-6">保存修改</button>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-gray-900 mb-1.5">应用名称</label>
            <input 
              type="text" 
              defaultValue={appInfo?.name || "风控策略平台"}
              className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand transition-all text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-900 mb-1.5">应用描述</label>
            <textarea 
              defaultValue={appInfo?.description || "面向表单智能审核的流程应用"}
              rows={3}
              className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand transition-all text-sm resize-none"
            />
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isCreateFlowModalOpen}
        onClose={() => setIsCreateFlowModalOpen(false)}
        title="新建决策流程"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setIsCreateFlowModalOpen(false)}>取消</Button>
            <button 
              onClick={handleCreateFlow} 
              disabled={!newFlowName}
              className={cn("btn-primary px-6", !newFlowName && "opacity-50 cursor-not-allowed")}
            >
              创建流程
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-gray-900 mb-1.5">流程名称</label>
            <input 
              type="text" 
              value={newFlowName}
              onChange={(e) => setNewFlowName(e.target.value)}
              placeholder="例如：反欺诈评分引擎" 
              className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand transition-all text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-900 mb-1.5">所属应用</label>
            <div className="px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-gray-500 text-sm">
              {appInfo?.name || "风控策略平台"}
            </div>
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-900 mb-1.5">流程描述 (可选)</label>
            <textarea 
              value={newFlowDesc}
              onChange={(e) => setNewFlowDesc(e.target.value)}
              placeholder="简要描述该流程的业务用途..." 
              rows={3}
              className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand transition-all text-sm resize-none"
            />
          </div>
        </div>
      </Modal>
    </div>
  )
}
