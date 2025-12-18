'use client'

import { createContext, useContext, useState, ReactNode } from 'react'

type PopupOptions = {
  title?: string
  message: string
  confirmText?: string
  cancelText?: string
  onConfirm?: () => void
  onCancel?: () => void
}

type PopupContextType = {
  show: (options: PopupOptions) => void
  hide: () => void
}

const PopupContext = createContext<PopupContextType | null>(null)

export function usePopup() {
  const ctx = useContext(PopupContext)
  if (!ctx) {
    throw new Error('usePopup must be used within PopupProvider')
  }
  return ctx
}

export function PopupProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const [opts, setOpts] = useState<PopupOptions | null>(null)

  const show = (options: PopupOptions) => {
    setOpts(options)
    setOpen(true)
  }

  const hide = () => {
    setOpen(false)
    setTimeout(() => setOpts(null), 200)
  }

  return (
    <PopupContext.Provider value={{ show, hide }}>
      {children}
      {open && opts && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30" onClick={hide} />
          <div className="relative w-full max-w-md mx-4 rounded-2xl glass-panel border border-[var(--color-pastel-border)] shadow-xl p-6 bg-white">
            {opts.title && (
              <div className="text-xl font-semibold mb-2 text-[var(--color-pastel-text)]">
                {opts.title}
              </div>
            )}
            <div className="text-gray-700 mb-6 whitespace-pre-wrap">
              {opts.message}
            </div>
            <div className="flex justify-end gap-3">
              {opts.cancelText && (
                <button
                  className="px-4 h-10 rounded-lg border border-gray-300 bg-white text-gray-700"
                  onClick={() => {
                    hide()
                    opts.onCancel?.()
                  }}
                >
                  {opts.cancelText}
                </button>
              )}
              <button
                className="px-4 h-10 rounded-lg bg-[var(--color-pastel-primary)] text-white font-semibold hover:bg-[var(--color-pastel-primary-hover)]"
                onClick={() => {
                  hide()
                  opts.onConfirm?.()
                }}
              >
                {opts.confirmText || 'OK'}
              </button>
            </div>
          </div>
        </div>
      )}
    </PopupContext.Provider>
  )
}
