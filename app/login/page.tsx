import { AuthCard } from "@/components/auth-card"

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-[var(--color-pastel-bg)] to-[var(--color-pastel-primary)]/20">
      <AuthCard mode="login" />
    </div>
  )
}
