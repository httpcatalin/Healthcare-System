'use client'

import { useState } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { OfflineIndicator } from '@/components/offline-indicator'
import { LuMail, LuIdCard, LuLinkedin, LuCircleUser } from 'react-icons/lu'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger
} from '@/components/ui/sidebar'
import {
  Package,
  BarChart3,
  Mic,
  FileText,
  Settings,
  LogOut,
  Stethoscope,
  Home,
  Bell
} from 'lucide-react'
import { InventoryDashboard } from '@/components/inventory-dashboard'
import { VoiceAssistant } from '@/components/voice-assistant'
import { AnalyticsDashboard } from '@/components/analytics-dashboard'
import { PurchaseOrders } from '@/components/purchase-orders'
import { AdminDashboard } from '@/components/role-dashboards/admin-dashboard'
import { DoctorDashboard } from '@/components/role-dashboards/doctor-dashboard'
import { NurseDashboard } from '@/components/role-dashboards/nurse-dashboard'

export function DashboardLayout() {
  const { auth, logout } = useAuth()
  const [currentView, setCurrentView] = useState('Dashboard')

  const handleNavigation = (name: string) => {
    setCurrentView(name)
  }

  const renderCurrentView = () => {
    switch (currentView) {
      case 'Inventory':
        return <InventoryDashboard />
      case 'Voice Assistant':
        return <VoiceAssistant />
      case 'Analytics':
        return <AnalyticsDashboard />
      case 'Purchase Orders':
        return <PurchaseOrders />
      case 'Dashboard':
        switch (auth.user?.role) {
          case 'admin':
            return <AdminDashboard />
          case 'doctor':
            return <DoctorDashboard />
          case 'nurse':
            return <NurseDashboard />
          default:
            return (
              <div className="text-center py-12">
                <h2 className="text-3xl font-bold text-foreground mb-4">
                  Dashboard Overview
                </h2>
                <p className="text-muted-foreground">
                  Your healthcare resource management system is ready. Navigate using the
                  sidebar to access different features.
                </p>
              </div>
            )
        }
      default:
        return (
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold text-foreground mb-4">{currentView}</h2>
            <p className="text-muted-foreground">
              This section will be implemented in the next steps.
            </p>
          </div>
        )
    }
  }

  const getNavigationItems = () => {
    const baseItems = [
      { name: 'Dashboard', href: '#', icon: Home, current: true },
      { name: 'Inventory', href: '#inventory', icon: Package, current: false },
      { name: 'Voice Assistant', href: '#voice', icon: Mic, current: false }
    ]

    // Add role-specific navigation items
    if (auth.user?.role === 'admin') {
      return [
        ...baseItems,
        { name: 'Analytics', href: '#analytics', icon: BarChart3, current: false },
        { name: 'Purchase Orders', href: '#orders', icon: FileText, current: false }
        // { name: 'Settings', href: '#settings', icon: Settings, current: false }
      ]
    } else if (auth.user?.role === 'doctor') {
      return [
        ...baseItems,
        { name: 'Analytics', href: '#analytics', icon: BarChart3, current: false },
        { name: 'Purchase Orders', href: '#orders', icon: FileText, current: false }
      ]
    } else {
      // Nurse role - limited access
      return baseItems
    }
  }

  // #f1f1f1

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <Sidebar className="border-r border-sidebar-border/50">
          <SidebarHeader className="border-b border-sidebar-border/30 py-2.5 px-4 bg-[#f1f1f1]">
            <div className="flex items-center gap-3">
              <div className="relative p-3 bg-[#256ef0] rounded-2xl shadow-premium hover-lift">
                <Stethoscope className="h-6 w-6 text-white drop-shadow-sm" />
                <div className="absolute inset-0  to-transparent rounded-2xl"></div>
              </div>
              <div>
                <h2 className="text-xl font-bold text-sidebar-foreground font-heading tracking-tight">
                  HealthCare RM
                </h2>
                <p className="text-sm text-sidebar-foreground font-medium tracking-wide">
                  Resource Manager
                </p>
              </div>
            </div>
          </SidebarHeader>

          <SidebarContent className="p-3 bg-[#f1f1f1]">
            <div className="mb-3 bg-white p-3 rounded-md border-neutral-200 border-1">
              <div className="">
                <div className="flex items-center gap-2 mb-4">
                  <Avatar className="h-8 w-8 ring-1 ring-neutral-400">
                    <AvatarImage
                      src={auth.user?.avatar || '/placeholder.svg'}
                      alt={auth.user?.name}
                    />
                    <AvatarFallback className="bg-gradient-to-br from-sidebar-accent to-sidebar-primary text-white font-bold text-lg">
                      {auth.user?.name
                        ?.split(' ')
                        .map((n) => n[0])
                        .join('')}
                    </AvatarFallback>
                  </Avatar>
                  <p className="text-base font-semibold text-sidebar-foreground truncate font-heading tracking-tight">
                    {auth.user?.name}
                  </p>
                </div>
                <div className="flex-1 min-w-0 text-sm flex flex-col gap-2">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2 text-sm opacity-65 text-bold">
                      <LuMail /> Email
                    </div>
                    <span className="truncate text-blue-500 border-1 border-blue-500 px-1 rounded-sm text-[12px]">
                      {auth.user?.email}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2 text-sm opacity-65 text-bold">
                      <LuIdCard /> Role
                    </div>
                    <span className="truncate text-[12px] opacity-100 font-semibold">
                      {auth.user?.role}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2 text-sm opacity-65 text-bold">
                      <LuLinkedin /> LinkedIn
                    </div>
                    <span className="truncate text-[12px] opacity-100 font-semibold">
                      /
                      {auth.user?.name
                        ?.toLowerCase()
                        .replace(' ', '')
                        .replace('.', '')
                        .replace(' ', '')}
                    </span>
                  </div>
                </div>

                <button className="text-red hover:before:bg-redborder-red-500 text-sm relative w-full overflow-hidden px-3 text-white py-0.5 font-semibold rounded-sm shadow-2xl transition-all before:absolute before:bottom-0 before:left-0 before:top-0 before:z-0 before:h-full before:w-0 before:bg-white before:transition-all before:duration-500 hover:shadow-blue-500 hover:before:left-0 hover:before:w-full bg-[#256ef0] border-1 border-blue-600 hover:text-[#256ef0] mt-3 cursor-pointer">
                  <span className="relative z-10 flex gap-2 items-center justify-center">
                    <LuCircleUser />
                    Go to Profile
                  </span>
                </button>
              </div>
            </div>

            <hr className="border-0 h-[1px] bg-gray-200" />

            <SidebarMenu className="flex flex-col justify-between h-full">
              <div className="space-y-1">
                {getNavigationItems().map((item) => (
                  <SidebarMenuItem key={item.name}>
                    <SidebarMenuButton
                      onClick={() => handleNavigation(item.name)}
                      isActive={currentView === item.name}
                      className="w-full justify-start gap-2 px-5 py-5 rounded-sm hover:bg-gray-200 hover:text-foreground active:bg-[#256ef0] data-[active=true]:bg-[#256ef0]  data-[active=true]:text-white"
                    >
                      <item.icon className="h-5 w-5 flex-shrink-0" />
                      <span className="font-semibold tracking-wide">{item.name}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </div>

              <SidebarMenuItem key={'Settings'}>
                <SidebarMenuButton
                  onClick={() => handleNavigation('Settings')}
                  isActive={currentView === 'Settings'}
                  className="w-full justify-start gap-2 px-5 py-5 rounded-sm hover:bg-gray-200 hover:text-foreground active:bg-[#256ef0] data-[active=true]:bg-[#256ef0]  data-[active=true]:text-white"
                >
                  <Settings className="h-5 w-5 flex-shrink-0" />
                  <span className="font-semibold tracking-wide">Settings</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarContent>
        </Sidebar>

        <div className="flex-1 flex flex-col">
          <header className="border-b border-border/30 glass sticky top-0 z-20 px-8 py-2 bg-[#f1f1f1]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <SidebarTrigger className="lg:hidden hover:bg-blue-500  " />
                <div className="">
                  <h1 className="md:text-2xl text-xl font-bold text-foreground font-heading text-balance tracking-tight  bg-clip-text">
                    {currentView}
                  </h1>
                  <p className="text-sm text-foreground font-medium opacity-45 md:block hidden">
                    Welcome back, {auth.user?.name}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <DropdownMenu>
                  <DropdownMenuTrigger>
                    <Button
                      variant="ghost"
                      className="relative h-10 w-10 rounded-full ring-2 ring-transparent hover:ring-[#256ef0] shadow-sm"
                    >
                      <Avatar className="h-10 w-10 shadow-lg">
                        <AvatarImage
                          src={auth.user?.avatar || '/placeholder.svg'}
                          alt={auth.user?.name}
                        />
                        <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-white font-bold text-lg">
                          {auth.user?.name
                            ?.split(' ')
                            .map((n) => n[0])
                            .join('')}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>

                  <DropdownMenuContent
                    className="w-72 glass border-border/30 shadow-premium px-0"
                    align="end"
                  >
                    <DropdownMenuLabel>
                      <div className="flex flex-col space-y-3 ">
                        <p className="text-lg font-heading flex items-center gap-2 tracking-tighter font-semibold">
                          <Avatar className="h-11 w-11 shadow-lg">
                            <AvatarImage
                              src={auth.user?.avatar || '/placeholder.svg'}
                              alt={auth.user?.name}
                            />
                            <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-white font-bold text-lg">
                              {auth.user?.name
                                ?.split(' ')
                                .map((n) => n[0])
                                .join('')}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <span className="text-md">{auth.user?.name}</span>
                            <p className="text-sm font-normal">
                              <Badge className="bg-[#256ef0]">{auth.user?.role}</Badge>
                            </p>
                          </div>
                        </p>
                      </div>
                    </DropdownMenuLabel>

                    <DropdownMenuSeparator className="opacity-30" />

                    {auth.user?.role === 'admin' && (
                      <DropdownMenuItem
                        onClick={() => handleNavigation('Settings')}
                        className="py-2 hover:bg-[#256ef0] hover:text-white rounded-none opacity-75"
                      >
                        <Settings className="mr-1 h-5 w-5 hover:text-white" />
                        <span className="text-sm">Settings</span>
                      </DropdownMenuItem>
                    )}

                    <DropdownMenuItem
                      onClick={logout}
                      className="py-2 hover:bg-[#256ef0] rounded-none opacity-75 text-red-600 hover:text-white"
                    >
                      <LogOut
                        className="mr-1 h-5 w-5 hover:text-white"
                        // color="oklch(57.7% 0.245 27.325)"
                      />
                      <span className="font-medium">Sign out</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </header>

          <main className="flex-1 p-8 bg-gradient-to-br from-background via-muted/20 to-accent/5 min-h-0">
            {/* <div className="max-w-7xl mx-auto h-full">
              <div className="glass rounded-3xl border border-border/30 shadow-premium p-8 h-full backdrop-blur-xl"> */}
            <div className="max-w-[85rem] mx-auto">{renderCurrentView()}</div>
            {/* </div>
            </div> */}
          </main>
        </div>
        <OfflineIndicator />
      </div>
    </SidebarProvider>
  )
}
