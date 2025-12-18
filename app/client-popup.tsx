'use client'

import { PopupProvider } from '@/components/ui/popup'

export default function ClientPopup({ children }: { children: React.ReactNode }) {
  return <PopupProvider>{children}</PopupProvider>
}
