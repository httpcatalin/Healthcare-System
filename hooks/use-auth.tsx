"use client"

import { useState, useEffect, createContext, useContext, type ReactNode } from "react"
import { type User, type AuthState, getCurrentUser, logout as authLogout } from "@/lib/auth"

const AuthContext = createContext<{
  auth: AuthState
  login: (user: User) => void
  logout: () => void
} | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [auth, setAuth] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
  })

  useEffect(() => {
    const user = getCurrentUser()
    setAuth({
      user,
      isLoading: false,
      isAuthenticated: !!user,
    })
  }, [])

  const login = (user: User) => {
    setAuth({
      user,
      isLoading: false,
      isAuthenticated: true,
    })
  }

  const logout = async () => {
    await authLogout()
    setAuth({
      user: null,
      isLoading: false,
      isAuthenticated: false,
    })
  }

  return <AuthContext.Provider value={{ auth, login, logout }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
