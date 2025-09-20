"use client"

import { useState } from "react"
import { useAuth } from "@/hooks/use-auth"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { OfflineIndicator } from "@/components/offline-indicator"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { Package, BarChart3, Mic, FileText, Settings, LogOut, Stethoscope, Home, Bell } from "lucide-react"
import { InventoryDashboard } from "@/components/inventory-dashboard"
import { VoiceAssistant } from "@/components/voice-assistant"
import { AnalyticsDashboard } from "@/components/analytics-dashboard"
import { PurchaseOrders } from "@/components/purchase-orders"
import { AdminDashboard } from "@/components/role-dashboards/admin-dashboard"
import { DoctorDashboard } from "@/components/role-dashboards/doctor-dashboard"
import { NurseDashboard } from "@/components/role-dashboards/nurse-dashboard"

export function DashboardLayout() {
  const { auth, logout } = useAuth()
  const [currentView, setCurrentView] = useState("Dashboard")

  const handleNavigation = (name: string) => {
    setCurrentView(name)
  }

  const renderCurrentView = () => {
    switch (currentView) {
      case "Inventory":
        return <InventoryDashboard />
      case "Voice Assistant":
        return <VoiceAssistant />
      case "Analytics":
        return <AnalyticsDashboard />
      case "Purchase Orders":
        return <PurchaseOrders />
      case "Dashboard":
        switch (auth.user?.role) {
          case "admin":
            return <AdminDashboard />
          case "doctor":
            return <DoctorDashboard />
          case "nurse":
            return <NurseDashboard />
          default:
            return (
              <div className="text-center py-12">
                <h2 className="text-3xl font-bold text-foreground mb-4">Dashboard Overview</h2>
                <p className="text-muted-foreground">
                  Your healthcare resource management system is ready. Navigate using the sidebar to access different
                  features.
                </p>
              </div>
            )
        }
      default:
        return (
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold text-foreground mb-4">{currentView}</h2>
            <p className="text-muted-foreground">This section will be implemented in the next steps.</p>
          </div>
        )
    }
  }

  const getNavigationItems = () => {
    const baseItems = [
      { name: "Dashboard", href: "#", icon: Home, current: true },
      { name: "Inventory", href: "#inventory", icon: Package, current: false },
      { name: "Voice Assistant", href: "#voice", icon: Mic, current: false },
    ]

    // Add role-specific navigation items
    if (auth.user?.role === "admin") {
      return [
        ...baseItems,
        { name: "Analytics", href: "#analytics", icon: BarChart3, current: false },
        { name: "Purchase Orders", href: "#orders", icon: FileText, current: false },
        { name: "Settings", href: "#settings", icon: Settings, current: false },
      ]
    } else if (auth.user?.role === "doctor") {
      return [
        ...baseItems,
        { name: "Analytics", href: "#analytics", icon: BarChart3, current: false },
        { name: "Purchase Orders", href: "#orders", icon: FileText, current: false },
      ]
    } else {
      // Nurse role - limited access
      return baseItems
    }
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gradient-to-br from-background via-muted/30 to-background">
        <Sidebar className="border-r border-sidebar-border/50 glass">
          <SidebarHeader className="border-b border-sidebar-border/30 p-6">
            <div className="flex items-center gap-4">
              <div className="relative p-3 bg-gradient-to-br from-primary via-primary to-secondary rounded-2xl shadow-premium hover-lift">
                <Stethoscope className="h-8 w-8 text-white drop-shadow-sm" />
                <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent rounded-2xl"></div>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-sidebar-foreground font-heading tracking-tight">
                  HealthCare RM
                </h2>
                <p className="text-sm text-sidebar-foreground font-medium tracking-wide">Resource Manager</p>
              </div>
            </div>
          </SidebarHeader>
          <SidebarContent className="p-6">
            <div className="mb-8 p-5 glass rounded-2xl border border-sidebar-border/30 shadow-premium hover-lift">
              <div className="flex items-center gap-4">
                <Avatar className="h-12 w-12 ring-2 ring-sidebar-accent/30 shadow-lg">
                  <AvatarImage src={auth.user?.avatar || "/placeholder.svg"} alt={auth.user?.name} />
                  <AvatarFallback className="bg-gradient-to-br from-sidebar-accent to-sidebar-primary text-white font-bold text-lg">
                    {auth.user?.name
                      ?.split(" ")
                      .map((n) => n[0])
                      .join("")}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-base font-bold text-sidebar-foreground truncate font-heading">{auth.user?.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge
                      variant="secondary"
                      className="text-xs px-3 py-1 bg-gradient-to-r from-sidebar-accent/30 to-sidebar-primary/30 text-sidebar-foreground font-semibold border border-sidebar-accent/30 shadow-sm"
                    >
                      {auth.user?.role}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>

            <SidebarMenu className="space-y-3">
              {getNavigationItems().map((item) => (
                <SidebarMenuItem key={item.name}>
                  <SidebarMenuButton
                    onClick={() => handleNavigation(item.name)}
                    isActive={currentView === item.name}
                    className="w-full justify-start gap-4 px-5 py-4 rounded-xl transition-all duration-300 hover:bg-sidebar-accent/10 hover:shadow-sm hover-lift data-[active=true]:bg-gradient-to-r data-[active=true]:from-sidebar-primary data-[active=true]:to-sidebar-accent data-[active=true]:text-white data-[active=true]:shadow-premium data-[active=true]:border data-[active=true]:border-sidebar-primary/20"
                  >
                    <item.icon className="h-5 w-5 flex-shrink-0" />
                    <span className="font-semibold tracking-wide">{item.name}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarContent>
        </Sidebar>

        <div className="flex-1 flex flex-col">
          <header className="border-b border-border/30 glass sticky top-0 z-20 px-8 py-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6">
                <SidebarTrigger className="lg:hidden" />
                <div>
                  <h1 className="text-4xl font-bold text-foreground font-heading text-balance tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
                    {currentView}
                  </h1>
                  <p className="text-lg text-foreground mt-2 font-medium">Welcome back, {auth.user?.name}</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  size="icon"
                  className="relative h-12 w-12 rounded-xl hover:bg-accent/10 hover-lift transition-all duration-300"
                >
                  <Bell className="h-6 w-6" />
                  <span className="absolute -top-1 -right-1 h-4 w-4 bg-gradient-to-r from-destructive to-destructive/80 rounded-full shadow-lg animate-pulse"></span>
                </Button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      className="relative h-14 w-14 rounded-2xl ring-2 ring-transparent hover:ring-primary/30 transition-all duration-300 hover-lift shadow-sm"
                    >
                      <Avatar className="h-14 w-14 shadow-lg">
                        <AvatarImage src={auth.user?.avatar || "/placeholder.svg"} alt={auth.user?.name} />
                        <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-white font-bold text-lg">
                          {auth.user?.name
                            ?.split(" ")
                            .map((n) => n[0])
                            .join("")}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-72 glass border-border/30 shadow-premium" align="end">
                    <DropdownMenuLabel>
                      <div className="flex flex-col space-y-3 p-2">
                        <p className="text-lg font-bold font-heading">{auth.user?.name}</p>
                        <p className="text-sm text-foreground">{auth.user?.email}</p>
                        <Badge
                          variant="secondary"
                          className="w-fit text-xs px-3 py-1 bg-gradient-to-r from-accent/30 to-primary/30 text-foreground font-semibold border border-accent/30"
                        >
                          {auth.user?.role}
                        </Badge>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {auth.user?.role === "admin" && (
                      <DropdownMenuItem
                        onClick={() => handleNavigation("Settings")}
                        className="py-3 hover:bg-accent/10"
                      >
                        <Settings className="mr-3 h-5 w-5" />
                        <span className="font-medium">Settings</span>
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={logout}
                      className="py-3 text-destructive focus:text-destructive hover:bg-destructive/10"
                    >
                      <LogOut className="mr-3 h-5 w-5" />
                      <span className="font-medium">Sign out</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </header>

          <main className="flex-1 p-8 bg-gradient-to-br from-background via-muted/20 to-accent/5 min-h-0">
            <div className="max-w-7xl mx-auto h-full">
              <div className="glass rounded-3xl border border-border/30 shadow-premium p-8 h-full backdrop-blur-xl">
                {renderCurrentView()}
              </div>
            </div>
          </main>
        </div>
        <OfflineIndicator />
      </div>
    </SidebarProvider>
  )
}
