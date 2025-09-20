'use client'

import { useAuth } from '@/hooks/use-auth'
import { LoginForm } from '@/components/login-form'
import { DashboardLayout } from '@/components/dashboard-layout'
import { Loader2 } from 'lucide-react'

export default function HomePage() {
  const { auth } = useAuth()

  if (auth.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!auth.isAuthenticated) {
    return <LoginForm />
  }

  return <DashboardLayout />
}
