'use client'

import { useState, useEffect } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts'
import {
  Stethoscope,
  Package,
  AlertTriangle,
  Clock,
  Activity,
  FileText,
  Mic
} from 'lucide-react'
import { getInventoryItems, getStockAlerts } from '@/lib/inventory'
import { getPurchaseOrders } from '@/lib/purchase-orders'
import { cn } from '@/lib/utils'

export function DoctorDashboard() {
  const [inventoryItems, setInventoryItems] = useState<any[]>([])
  const [alerts, setAlerts] = useState<any[]>([])
  const [recentOrders, setRecentOrders] = useState<any[]>([])

  useEffect(() => {
    const items = getInventoryItems()
    const stockAlerts = getStockAlerts()
    const orders = getPurchaseOrders().slice(0, 3) // Recent orders

    setInventoryItems(items)
    setAlerts(stockAlerts)
    setRecentOrders(orders)
  }, [])

  // Mock patient-related data
  const patientSchedule = [
    {
      time: '09:00',
      patient: 'John Smith',
      type: 'Consultation',
      supplies: ['Gloves', 'Stethoscope']
    },
    {
      time: '10:30',
      patient: 'Mary Johnson',
      type: 'Check-up',
      supplies: ['Thermometer', 'Gloves']
    },
    {
      time: '14:00',
      patient: 'Robert Davis',
      type: 'Follow-up',
      supplies: ['Bandages', 'Antiseptic']
    },
    {
      time: '15:30',
      patient: 'Sarah Wilson',
      type: 'Consultation',
      supplies: ['Gloves', 'Masks']
    }
  ]

  const medicalSupplies = inventoryItems.filter((item) =>
    ['Medical Supplies', 'PPE', 'Pharmaceuticals'].includes(item.category)
  )

  const criticalSupplies = alerts.filter((alert) => alert.status === 'out-of-stock')
  const lowSupplies = alerts.filter((alert) => alert.status === 'low-stock')

  // Mock usage data for the week
  const weeklyUsage = [
    { day: 'Mon', gloves: 15, masks: 8, syringes: 3 },
    { day: 'Tue', gloves: 12, masks: 6, syringes: 5 },
    { day: 'Wed', gloves: 18, masks: 10, syringes: 2 },
    { day: 'Thu', gloves: 14, masks: 7, syringes: 4 },
    { day: 'Fri', gloves: 16, masks: 9, syringes: 3 },
    { day: 'Sat', gloves: 8, masks: 4, syringes: 1 },
    { day: 'Sun', gloves: 6, masks: 3, syringes: 0 }
  ]

  return (
    <div className="space-y-6">
      {/* Doctor Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-[#f1f1f1] py-4  overflow-hidden flex flex-col justify-between">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative">
            <CardTitle className="xl:text-xl text-lg font-lg tracking-tight">
              Today's Patients
            </CardTitle>
            <Stethoscope className="absolute min-h-40 min-w-40 top-0 2xl:left-[12rem] xl:left-[11vw] md:-right-10 right-0 opacity-30" />
          </CardHeader>
          <CardContent>
            <div className="xl:text-4xl text-xl font-bold">{patientSchedule.length}</div>
            <p className="text-xs text-foreground">Scheduled appointments</p>
          </CardContent>
        </Card>

        <Card className="bg-blue-600/10 py-4 overflow-hidden border-blue-600/20 flex flex-col justify-between">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative">
            <CardTitle className="xl:text-xl text-lg font-lg tracking-tight text-blue-400">
              Available Supplies
            </CardTitle>
            <Package className="absolute min-h-40 min-w-40 top-0 text-blue-600 2xl:left-[12rem] xl:left-[11vw] md:-right-10 right-0 opacity-30" />
          </CardHeader>
          <CardContent>
            <div className="xl:text-4xl text-xl font-bold text-blue-400">
              {medicalSupplies.length}
            </div>
            <p className="text-xs text-foreground">Medical supplies in stock</p>
          </CardContent>
        </Card>

        <Card className="bg-red-600/10 py-4  overflow-hidden border-red-600/20 flex flex-col justify-between">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative">
            <CardTitle className="xl:text-xl text-lg font-lg tracking-tight text-red-400">
              Supply Alerts
            </CardTitle>
            <AlertTriangle className="absolute min-h-40 min-w-40 top-0 text-red-600 2xl:left-[12rem] xl:left-[11vw] md:-right-10 right-0 opacity-30" />
          </CardHeader>
          <CardContent>
            <div className="xl:text-4xl text-xl font-bold text-red-400">
              {criticalSupplies.length}
            </div>
            <p className="text-xs text-foreground">{lowSupplies.length} running low</p>
          </CardContent>
        </Card>

        <Card className="bg-violet-600/10 py-4 overflow-hidden border-violet-600/20 flex flex-col justify-between">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative">
            <CardTitle className="xl:text-xl text-lg font-lg tracking-tight text-violet-400">
              Next Appointment
            </CardTitle>
            <Clock className="absolute min-h-40 min-w-40 top-0 text-violet-600 2xl:left-[12rem] xl:left-[11vw] md:-right-10 right-0 opacity-30" />
          </CardHeader>
          <CardContent>
            <div className="xl:text-4xl text-xl font-bold text-violet-400">
              {patientSchedule[0]?.time || 'None'}
            </div>
            <p className="text-xs text-foreground">
              {patientSchedule[0]?.patient || 'No appointments'}
            </p>
          </CardContent>
        </Card>
      </div>

      {alerts.length > 0 && (
        <Alert className="border-blue-600/20 bg-blue-600/10 ">
          <div className="mr-2 flex items-center h-full">
            <AlertTriangle className="min-h-7 min-w-7 text-blue-900" />
          </div>
          <AlertDescription className="text-blue-900 ml-10 flex justify-between items-center">
            <div>
              <strong>Supply Alert:</strong>
              <div>
                {criticalSupplies.length} critical supplies need attention before your
                next appointments.
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="bg-[#256ef0] text-white hover:bg-blue-400 cursor-pointer 
             ring-inset ring-[0.5px] ring-blue-400 border-blue-700"
            >
              View Supplies
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's Schedule */}
        <Card className="bg-blue-600/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-bold text-xl">
              <Clock className="h-5 w-5" />
              Today's Schedule
            </CardTitle>
            <CardDescription>
              Your patient appointments and required supplies
            </CardDescription>
          </CardHeader>

          <CardContent>
            <div className="space-y-4">
              {patientSchedule.map((appointment, index) => (
                <div key={index} className="border rounded-lg p-3 bg-white">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h4 className="font-medium text-lg">{appointment.patient}</h4>
                      <p className="text-sm text-muted-foreground opacity-75">
                        {appointment.type}
                      </p>
                    </div>
                    <Badge className="bg-[#256ef0] text-white" variant="outline">
                      {appointment.time}
                    </Badge>
                  </div>
                  <div className="flex items-center flex-wrap gap-1">
                    <span className="text-xs text-muted-foreground opacity-75">
                      Supplies needed:
                    </span>
                    {appointment.supplies.map((supply, idx) => (
                      <Badge
                        key={idx}
                        variant="secondary"
                        className="text-xs bg-[#256ef0] text-white"
                      >
                        {supply}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Weekly Supply Usage */}
        <Card className="bg-blue-600/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-bold text-xl">
              <Activity className="h-5 w-5" />
              Weekly Supply Usage
            </CardTitle>
            <CardDescription>Your personal supply consumption patterns</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={weeklyUsage}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="gloves"
                  stroke="#164e63"
                  strokeWidth={2}
                  name="Gloves"
                />
                <Line
                  type="monotone"
                  dataKey="masks"
                  stroke="#a16207"
                  strokeWidth={2}
                  name="Masks"
                />
                <Line
                  type="monotone"
                  dataKey="syringes"
                  stroke="#dc2626"
                  strokeWidth={2}
                  name="Syringes"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-blue-600/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-bold text-xl">
              <Mic className="h-5 w-5" />
              Voice Assistant
            </CardTitle>
            <CardDescription>Log supply usage quickly</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col justify-end h-full">
            <p className="text-sm text-muted-foreground mb-4">
              Use voice commands to log supply usage during patient visits.
            </p>
            <Button className="w-full bg-[#256ef0] hover:bg-blue-500 cursor-pointer">
              Start Voice Assistant
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-blue-600/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-bold text-xl">
              <Package className="h-5 w-5" />
              Check Supplies
            </CardTitle>
            <CardDescription>View available medical supplies</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 mb-4">
              {medicalSupplies.slice(0, 3).map((item) => (
                <div key={item.id} className="flex justify-between text-sm">
                  <span>{item.name}</span>
                  <Badge
                    className={cn(item.status === 'in-stock' ? 'bg-[#256ef0]' : '')}
                    variant={item.status === 'in-stock' ? 'default' : 'destructive'}
                  >
                    {item.currentStock} {item.unit}
                  </Badge>
                </div>
              ))}
            </div>
            <Button className="w-full bg-[#256ef0] hover:bg-blue-500 cursor-pointer">
              View All Supplies
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-blue-600/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-bold text-xl">
              <FileText className="h-5 w-5" />
              Recent Orders
            </CardTitle>
            <CardDescription>Your recent supply requests</CardDescription>
          </CardHeader>
          <CardContent className="h-full flex flex-col justify-between">
            <div className="space-y-2 mb-4">
              {recentOrders.map((order) => (
                <div key={order.id} className="flex justify-between text-sm">
                  <span>{order.orderNumber}</span>
                  <Badge className="bg-[#256ef0]">{order.status}</Badge>
                </div>
              ))}
            </div>
            <Button className="w-full bg-[#256ef0] hover:bg-blue-500 cursor-pointer">
              View All Orders
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
