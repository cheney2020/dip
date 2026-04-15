import * as React from "react"
import { X } from "lucide-react"
import { cn } from "@/src/lib/utils"

interface DrawerProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  footer?: React.ReactNode
  className?: string
  hasBackdrop?: boolean
}

export function Drawer({ isOpen, onClose, title, children, footer, className, hasBackdrop = true }: DrawerProps) {
  if (!isOpen) return null

  return (
    <div className={cn("fixed inset-0 z-50 flex justify-end", hasBackdrop && "bg-black/20 backdrop-blur-sm pointer-events-auto", !hasBackdrop && "pointer-events-none")}>
      <div className={cn("bg-white w-full max-w-md h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300 pointer-events-auto", className)}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          {children}
        </div>
        {footer && (
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end space-x-2">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
