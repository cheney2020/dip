import * as React from "react"
import { X } from "lucide-react"
import { cn } from "@/src/lib/utils"

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  footer?: React.ReactNode
  className?: string
}

export function Modal({ isOpen, onClose, title, children, footer, className }: ModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className={cn("bg-white rounded-lg shadow-lg w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200", className)}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6">
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
