'use client'

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Search, ShoppingBag, MessageCircle, User, LogOut } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

export function Navbar() {
  const [user, setUser] = useState<any>(null)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setUser(session?.user ?? null)
    }
    checkUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.refresh()
  }

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-[var(--color-pastel-border)] bg-white/80 backdrop-blur-md">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link href="/" className="text-2xl font-bold text-[var(--color-pastel-primary)] flex items-center gap-2">
          <ShoppingBag className="h-6 w-6" />
          <span>ShopSphere</span>
        </Link>

        {/* Search Bar - Hidden on mobile for simplicity in MVP, but good to have */}
        <div className="hidden md:flex flex-1 max-w-md relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input 
            type="text"
            placeholder="Search for products..."
            className="w-full h-10 pl-10 pr-4 rounded-full border border-gray-200 bg-[var(--color-pastel-bg)] focus:outline-none focus:ring-2 focus:ring-[var(--color-pastel-primary)]"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
           <Button variant="ghost" size="icon" asChild>
            <Link href="/chat">
              <MessageCircle className="h-5 w-5 text-gray-600" />
            </Link>
          </Button>
          
          <Button variant="pastelAccent" className="rounded-full px-6 font-semibold" asChild>
             <Link href="/sell">
                Sell Item
             </Link>
          </Button>

          <div className="w-px h-6 bg-gray-200 mx-2" />

          {user ? (
            <div className="flex items-center gap-2">
               <div className="w-8 h-8 rounded-full bg-[var(--color-pastel-primary)]/20 flex items-center justify-center text-[var(--color-pastel-primary)] font-bold">
                  {user.email?.[0].toUpperCase()}
               </div>
               <Button variant="ghost" size="sm" asChild>
                 <Link href="/account">Account</Link>
               </Button>
               <Button variant="ghost" size="sm" onClick={handleSignOut} className="text-gray-500 hover:text-red-500">
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
               </Button>
            </div>
          ) : (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/login">Log in</Link>
              </Button>
              <Button size="sm" asChild>
                <Link href="/signup">Sign up</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}
