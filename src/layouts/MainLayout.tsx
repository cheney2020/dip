import { Link, Outlet, NavLink, useLocation } from "react-router-dom"
import { LayoutGrid, Cpu, Settings as SettingsIcon, LogOut, ChevronRight } from "lucide-react"
import { cn } from "@/src/lib/utils"

export function MainLayout() {
  const location = useLocation()

  return (
    <div className="min-h-screen bg-bg-main flex flex-col">
      {/* Top Navigation Bar */}
      <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-8 shrink-0 z-50 sticky top-0">
        <Link to="/apps" className="flex items-center hover:opacity-80 transition-opacity">
          <div className="w-8 h-8 bg-brand rounded-lg flex items-center justify-center mr-3 shadow-sm">
            <Cpu className="w-5 h-5 text-gray-900" />
          </div>
          <span className="font-bold text-gray-900 text-lg tracking-tight">智能决策引擎</span>
        </Link>

        <div className="flex items-center gap-8 ml-12">
          <NavLink 
            to="/strategies" 
            className={({ isActive }) => cn(
              "text-sm font-bold transition-colors hover:text-brand",
              isActive ? "text-brand" : "text-gray-500"
            )}
          >
            策略管理
          </NavLink>
          <NavLink 
            to="/apps" 
            className={({ isActive }) => cn(
              "text-sm font-bold transition-colors hover:text-brand",
              isActive ? "text-brand" : "text-gray-500"
            )}
          >
            应用管理
          </NavLink>
          <NavLink 
            to="/database" 
            className={({ isActive }) => cn(
              "text-sm font-bold transition-colors hover:text-brand",
              isActive ? "text-brand" : "text-gray-500"
            )}
          >
            数据管理
          </NavLink>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 px-3 py-1.5 rounded-xl border border-gray-100 bg-gray-50/50">
            <div className="w-7 h-7 rounded-full bg-brand flex items-center justify-center text-gray-900 font-bold text-[10px] shadow-sm">
              AD
            </div>
            <div className="hidden sm:block">
              <p className="text-xs font-bold text-gray-900 leading-none">admin</p>
              <p className="text-[10px] text-gray-400 mt-0.5 leading-none">Administrator</p>
            </div>
          </div>
          <button className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-h-0">
        <div className="flex-1 overflow-auto">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
