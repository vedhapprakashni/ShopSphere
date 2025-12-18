import { AuthCard } from "@/components/auth-card"

export default function SignupPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-[var(--color-pastel-bg)] to-[var(--color-pastel-secondary)]/20">
      <AuthCard mode="signup" />
    </div>
  )
}
