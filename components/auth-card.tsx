'use client'

import { Button } from "@/components/ui/button"
import { motion } from "framer-motion"
import { createClient } from "@/lib/supabase/client"
import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"

interface AuthCardProps {
  mode: 'login' | 'signup'
}

export function AuthCard({ mode }: AuthCardProps) {
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const supabase = createClient()
  const router = useRouter()

  const handleGoogleLogin = async () => {
    setLoading(true)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    if (error) {
        console.error("Google Login Error:", error)
        alert("Error logging in with Google: " + error.message)
        setLoading(false)
    }
  }

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
        if (mode === 'signup') {
            const { error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    emailRedirectTo: `${window.location.origin}/auth/callback`,
                }
            })
            if (error) throw error
            
            // Check if session was established immediately (e.g. if email confirmation is disabled)
            const { data: { session } } = await supabase.auth.getSession()
            if (session) {
                router.push('/')
                router.refresh()
            } else {
                alert("Sign up successful! Please check your email to confirm your account.")
            }
        } else {
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password
            })
            if (error) throw error
            
            router.push('/')
            router.refresh()
        }
    } catch (error: any) {
        console.error("Auth Error:", error)
        if (mode === 'login' && (error.message.includes("Invalid login credentials") || error.message.includes("Email not confirmed"))) {
             if (confirm("Login failed. If you don't have an account, click OK to sign up.")) {
                 router.push('/signup')
             }
        } else {
            alert(error.message)
        }
    } finally {
        setLoading(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full max-w-md p-8 space-y-6 glass-panel rounded-2xl shadow-xl"
    >
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-[var(--color-pastel-text)]">
          {mode === 'login' ? 'Welcome Back' : 'Join Us'}
        </h1>
        <p className="text-gray-500">
          {mode === 'login' 
            ? 'Sign in to continue your shopping journey' 
            : 'Create an account to start buying and selling'}
        </p>
      </div>

      <div className="space-y-4">
        <Button 
          variant="outline" 
          className="w-full h-12 text-base border-2 hover:bg-slate-50 cursor-pointer"
          onClick={handleGoogleLogin}
          disabled={loading}
        >
          {loading ? 'Connecting...' : 'Continue with Google'}
        </Button>
        
        <div className="flex items-center gap-4">
          <div className="h-px bg-gray-200 flex-1" />
          <span className="text-xs uppercase text-gray-400">
            Or continue with email
          </span>
          <div className="h-px bg-gray-200 flex-1" />
        </div>

        <form className="space-y-4" onSubmit={handleEmailAuth}>
            <input 
                type="email" 
                placeholder="Email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full h-12 px-4 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[var(--color-pastel-primary)] bg-white/50"
            />
             <input 
                type="password" 
                placeholder="Password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full h-12 px-4 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[var(--color-pastel-primary)] bg-white/50"
            />
             <Button 
                className="w-full h-12 text-base shadow-md cursor-pointer" 
                type="submit"
                disabled={loading}
             >
                {loading ? 'Processing...' : (mode === 'login' ? 'Sign In' : 'Create Account')}
            </Button>
        </form>
      </div>

      <div className="text-center text-sm text-gray-500">
        {mode === 'login' ? (
          <>
            Don't have an account?{' '}
            <Link href="/signup" className="text-[var(--color-pastel-primary-hover)] font-semibold hover:underline">
              Sign up
            </Link>
          </>
        ) : (
          <>
            Already have an account?{' '}
            <Link href="/login" className="text-[var(--color-pastel-primary-hover)] font-semibold hover:underline">
              Log in
            </Link>
          </>
        )}
      </div>
    </motion.div>
  )
}
