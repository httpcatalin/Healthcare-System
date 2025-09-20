"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Loader2, Stethoscope, Shield, User, UserCheck } from "lucide-react"
import { login } from "@/lib/auth"
import { useAuth } from "@/hooks/use-auth"

export function LoginForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const { login: setUser } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    try {
      const user = await login(email, password)
      setUser(user)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/30 to-background p-4">
      <div className="w-full max-w-md">
        <Card className="shadow-2xl border-0 bg-card/80 backdrop-blur-sm">
          <CardHeader className="text-center pb-8 pt-8">
            <div className="flex justify-center mb-6">
              <div className="p-4 bg-gradient-to-br from-primary to-secondary rounded-2xl shadow-lg">
                <Stethoscope className="h-10 w-10 text-white" />
              </div>
            </div>
            <CardTitle className="text-3xl font-bold text-balance font-heading mb-2">
              Healthcare Resource Manager
            </CardTitle>
            <CardDescription className="text-base text-muted-foreground">
              Sign in to access your clinic's inventory system
            </CardDescription>
          </CardHeader>
          <CardContent className="px-8 pb-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-3">
                <Label htmlFor="email" className="text-sm font-semibold">
                  Email Address
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-12 px-4 text-base border-2 focus:border-primary transition-colors"
                />
              </div>
              <div className="space-y-3">
                <Label htmlFor="password" className="text-sm font-semibold">
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-12 px-4 text-base border-2 focus:border-primary transition-colors"
                />
              </div>
              {error && (
                <Alert variant="destructive" className="border-destructive/50 bg-destructive/10">
                  <AlertDescription className="font-medium">{error}</AlertDescription>
                </Alert>
              )}
              <Button
                type="submit"
                className="w-full h-12 text-base font-semibold bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 transition-all duration-200 shadow-lg"
                disabled={isLoading}
              >
                {isLoading && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
                Sign In
              </Button>
            </form>

            <div className="mt-8 p-6 bg-muted/50 rounded-xl border border-border/50">
              <p className="font-semibold mb-4 text-foreground flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                Demo Accounts
              </p>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-background/60 rounded-lg border border-border/30">
                  <div className="flex items-center gap-3">
                    <div className="p-1.5 bg-primary/10 rounded-md">
                      <Shield className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">Administrator</p>
                      <p className="text-xs text-muted-foreground">admin@clinic.com</p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="bg-primary/20 text-primary border-primary/30">
                    Admin
                  </Badge>
                </div>

                <div className="flex items-center justify-between p-3 bg-background/60 rounded-lg border border-border/30">
                  <div className="flex items-center gap-3">
                    <div className="p-1.5 bg-secondary/10 rounded-md">
                      <UserCheck className="h-4 w-4 text-secondary" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">Doctor</p>
                      <p className="text-xs text-muted-foreground">doctor@clinic.com</p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="bg-secondary/20 text-secondary border-secondary/30">
                    Doctor
                  </Badge>
                </div>

                <div className="flex items-center justify-between p-3 bg-background/60 rounded-lg border border-border/30">
                  <div className="flex items-center gap-3">
                    <div className="p-1.5 bg-accent/10 rounded-md">
                      <User className="h-4 w-4 text-accent" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">Nurse</p>
                      <p className="text-xs text-muted-foreground">nurse@clinic.com</p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="bg-accent/20 text-accent border-accent/30">
                    Nurse
                  </Badge>
                </div>

                <div className="mt-4 p-3 bg-primary/5 rounded-lg border border-primary/20">
                  <p className="text-sm font-medium text-primary text-center">
                    Password: <span className="font-mono">password123</span>
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
