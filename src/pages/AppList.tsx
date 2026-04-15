import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { Plus, Search, MoreVertical, ExternalLink, Edit3, Trash2, Calendar, Layers, ChevronRight } from "lucide-react"
import { Button } from "@/src/components/ui/button"
import { Modal } from "@/src/components/ui/modal"
import { INITIAL_APPS } from "@/src/constants"
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/src/components/ui/dropdown-menu"
import { cn } from "@/src/lib/utils"


export function AppList() {
  const navigate = useNavigate()
  const [apps, setApps] = useState<any[]>([])
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editingApp, setEditingApp] = useState<any>(null)
  const [newAppName, setNewAppName] = useState("")
  const [newAppDesc, setNewAppDesc] = useState("")

  useEffect(() => {
    let storedApps = localStorage.getItem('apps')
    let parsedApps = []
    
    if (storedApps) {
      parsedApps = JSON.parse(storedApps)
    } else {
      parsedApps = INITIAL_APPS
      localStorage.setItem('apps', JSON.stringify(INITIAL_APPS))
    }

    const appsWithCounts = parsedApps.map((app: any) => {
      const flows = JSON.parse(localStorage.getItem(`flows_${app.id}`) || '[]')
      return { ...app, flowCount: flows.length }
    })
    setApps(appsWithCounts)
  }, [])

  const handleCreate = () => {
    const newApp = {
      id: `app-${Date.now()}`,
      name: newAppName,
      description: newAppDesc,
      updatedAt: new Date().toISOString().split('T')[0]
    }
    const updatedApps = [newApp, ...apps]
    localStorage.setItem('apps', JSON.stringify(updatedApps.map(({flowCount, ...rest}) => rest)))
    setApps([{...newApp, flowCount: 0}, ...apps])
    setIsCreateModalOpen(false)
    setNewAppName("")
    setNewAppDesc("")
  }

  const handleEdit = (app: any) => {
    setEditingApp(app)
    setNewAppName(app.name)
    setNewAppDesc(app.description)
    setIsEditModalOpen(true)
  }

  const handleUpdate = () => {
    const updatedApps = apps.map(a => {
      if (a.id === editingApp.id) {
        return { ...a, name: newAppName, description: newAppDesc }
      }
      return a
    })
    localStorage.setItem('apps', JSON.stringify(updatedApps.map(({flowCount, ...rest}) => rest)))
    setApps(updatedApps)
    setIsEditModalOpen(false)
  }

  const handleDelete = (appId: string) => {
    const updatedApps = apps.filter(a => a.id !== appId)
    localStorage.setItem('apps', JSON.stringify(updatedApps.map(({flowCount, ...rest}) => rest)))
    localStorage.removeItem(`flows_${appId}`)
    setApps(updatedApps)
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">应用管理</h2>
          <p className="text-gray-500 mt-1">管理您的智能决策应用及其关联流程</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              placeholder="搜索应用..." 
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent transition-all"
            />
          </div>
          <button onClick={() => setIsCreateModalOpen(true)} className="btn-primary">
            <Plus className="w-4 h-4" />
            新建应用
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {apps.map((app) => (
          <div 
            key={app.id} 
            className="card-base card-hover flex flex-col group cursor-pointer"
            onClick={() => navigate(`/apps/${app.id}`)}
          >
            <div className="p-6 flex-1">
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 bg-brand/10 rounded-xl flex items-center justify-center text-brand">
                  <Layers className="w-6 h-6" />
                </div>
                <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors">
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40">
                      <DropdownMenuItem onClick={() => handleEdit(app)} className="gap-2">
                        <Edit3 className="w-4 h-4" />
                        编辑应用
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDelete(app.id)} className="gap-2 text-red-600 focus:text-red-600">
                        <Trash2 className="w-4 h-4" />
                        删除应用
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
              
              <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-brand transition-colors">
                {app.name}
              </h3>
              <p className="text-sm text-gray-500 line-clamp-2 mb-6 min-h-[40px]">
                {app.description}
              </p>

              <div className="flex items-center justify-between mt-auto">
                <div className="flex items-center gap-4 text-xs text-gray-400">
                  <div className="flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5" />
                    <span>{app.flowCount} 个流程</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{app.updatedAt}</span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-brand group-hover:translate-x-1 transition-all" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Create Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="新建应用"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>取消</Button>
            <button onClick={handleCreate} disabled={!newAppName} className="btn-primary px-6">确认创建</button>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">应用名称 <span className="text-red-500">*</span></label>
            <input 
              type="text" 
              value={newAppName}
              onChange={(e) => setNewAppName(e.target.value)}
              placeholder="请输入应用名称" 
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">应用描述</label>
            <textarea 
              value={newAppDesc}
              onChange={(e) => setNewAppDesc(e.target.value)}
              placeholder="请输入应用描述" 
              rows={3}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand transition-all resize-none"
            />
          </div>
        </div>
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="编辑应用信息"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>取消</Button>
            <button onClick={handleUpdate} disabled={!newAppName} className="btn-primary px-6">保存修改</button>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">应用名称 <span className="text-red-500">*</span></label>
            <input 
              type="text" 
              value={newAppName}
              onChange={(e) => setNewAppName(e.target.value)}
              placeholder="请输入应用名称" 
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">应用描述</label>
            <textarea 
              value={newAppDesc}
              onChange={(e) => setNewAppDesc(e.target.value)}
              placeholder="请输入应用描述" 
              rows={3}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand transition-all resize-none"
            />
          </div>
        </div>
      </Modal>
    </div>
  )
}
