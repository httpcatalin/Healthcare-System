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
import { Progress } from '@/components/ui/progress'
import { Heart, Package, AlertTriangle, Clock, Activity, Plus, Minus } from 'lucide-react'
import { getInventoryItems, getStockAlerts } from '@/lib/inventory'
import { cn } from '@/lib/utils'

export function NurseDashboard() {
  const [inventoryItems, setInventoryItems] = useState<any[]>([])
  const [alerts, setAlerts] = useState<any[]>([])

  useEffect(() => {
    const items = getInventoryItems()
    const stockAlerts = getStockAlerts()

    setInventoryItems(items)
    setAlerts(stockAlerts)
  }, [])

  // Mock shift data
  const shiftInfo = {
    startTime: '07:00',
    endTime: '19:00',
    patientsAssigned: 8,
    tasksCompleted: 12,
    totalTasks: 15
  }

  // Mock patient care data
  const patientCare = [
    {
      room: '101',
      patient: 'Alice Brown',
      condition: 'Stable',
      supplies: ['Gloves', 'Bandages']
    },
    {
      room: '102',
      patient: 'Tom Wilson',
      condition: 'Monitoring',
      supplies: ['Thermometer', 'Masks']
    },
    {
      room: '103',
      patient: 'Lisa Garcia',
      condition: 'Recovery',
      supplies: ['Antiseptic', 'Gloves']
    },
    {
      room: '104',
      patient: 'Mike Johnson',
      condition: 'Stable',
      supplies: ['Syringes', 'Gloves']
    }
  ]

  const criticalSupplies = alerts.filter((alert) => alert.status === 'out-of-stock')
  const lowSupplies = alerts.filter((alert) => alert.status === 'low-stock')

  // Most used supplies by nurses
  const nursingSupplies = inventoryItems.filter((item) =>
    ['PPE', 'Medical Supplies', 'Pharmaceuticals'].includes(item.category)
  )

  const getConditionBadge = (condition: string) => {
    const variants = {
      Stable: 'bg-green-100 text-green-800',
      Monitoring: 'bg-yellow-100 text-yellow-800',
      Recovery: 'bg-blue-100 text-blue-800',
      Critical: 'bg-red-100 text-red-800'
    }
    return (
      <Badge className={variants[condition as keyof typeof variants] || ''}>
        {condition}
      </Badge>
    )
  }

  return (
    <div className="space-y-6">
      {/* Nurse Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-pink-600/10 py-4 border-pink-600/20  overflow-hidden flex flex-col justify-between">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative">
            <CardTitle className="xl:text-xl text-lg font-lg tracking-tight text-pink-400">
              Total Inventory Value
            </CardTitle>
            <Heart className="absolute min-h-40 min-w-40 text-pink-600 top-0 2xl:left-[12rem] xl:left-[11vw] md:-right-10 right-0 opacity-30" />
          </CardHeader>
          <CardContent>
            <div className="xl:text-4xl text-xl font-bold text-pink-400">
              {shiftInfo.patientsAssigned}
            </div>
            <p className="text-xs text-foreground">Current shift patients</p>
          </CardContent>
        </Card>

        <Card className="bg-violet-600/10 py-4 border-violet-600/20 overflow-hidden flex flex-col justify-between">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative">
            <CardTitle className="xl:text-xl text-lg font-lg tracking-tight text-violet-400">
              Shift Progress
            </CardTitle>
            <Clock className="absolute min-h-40 min-w-40 top-0 2xl:left-[12rem] xl:left-[11vw] md:-right-10 right-0 opacity-30 text-violet-600" />
          </CardHeader>
          <CardContent>
            <div className="xl:text-4xl text-xl font-bold text-violet-400">
              {shiftInfo.tasksCompleted}/{shiftInfo.totalTasks}
            </div>
            <p className="text-xs text-foreground">Tasks completed</p>
          </CardContent>
        </Card>

        <Card className="bg-red-600/10 py-4 border-red-600/20 overflow-hidden flex flex-col justify-between">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative">
            <CardTitle className="xl:text-xl text-lg font-lg tracking-tight text-red-400">
              Supply Alerts
            </CardTitle>
            <AlertTriangle className="absolute min-h-40 min-w-40 text-red-600 top-0 2xl:left-[12rem] xl:left-[11vw] md:-right-10 right-0 opacity-30" />
          </CardHeader>
          <CardContent>
            <div className="xl:text-4xl text-xl font-bold text-red-400">
              {criticalSupplies.length}
            </div>{' '}
            <p className="text-xs text-foreground">{lowSupplies.length} running low</p>
          </CardContent>
        </Card>

        <Card className="bg-blue-600/10 py-4 border-blue-600/20  overflow-hidden flex flex-col justify-between">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative">
            <CardTitle className="xl:text-xl text-lg font-lg tracking-tight text-blue-400">
              Shift Time
            </CardTitle>
            <Activity className="absolute min-h-40 min-w-40 top-0 2xl:left-[12rem] text-blue-600 xl:left-[11vw] md:-right-10 right-0 opacity-30" />
          </CardHeader>
          <CardContent>
            <div className="xl:text-4xl text-xl font-bold text-blue-400">
              {shiftInfo.startTime} - {shiftInfo.endTime}
            </div>{' '}
            <p className="text-xs text-foreground">12-hour shift</p>
          </CardContent>
        </Card>
      </div>

      {/* Supply Alerts */}
      {alerts.length > 0 && (
        <Alert className="border-green-600/20 bg-green-600/10 ">
          <div className="mr-2 flex items-center h-full">
            <AlertTriangle className="min-h-7 min-w-7 text-green-600" />
          </div>
          <AlertDescription className="text-green-600 ml-10 flex justify-between items-center">
            <div>
              <strong>Supply Alert:</strong>
              <div>
                {criticalSupplies.length} critical supplies need restocking for patient
                care.
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="bg-green-600 text-white hover:bg-green-400 cursor-pointer 
             ring-inset ring-[0.5px] ring-green-400 border-green-700"
            >
              Check Supplies
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Patient Care Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-bold text-xl">
              <Heart className="h-5 w-5" />
              Patient Care Overview
            </CardTitle>
            <CardDescription>
              Your assigned patients and required supplies
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {patientCare.map((patient, index) => (
                <div key={index} className="border rounded-lg p-3 bg-white">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h4 className="font-medium">
                        Room {patient.room} - {patient.patient}
                      </h4>
                      <div className="flex items-center gap-2 mt-1">
                        {getConditionBadge(patient.condition)}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-1">
                    <span className="text-xs text-muted-foreground">
                      Supplies needed:
                    </span>
                    {patient.supplies.map((supply, idx) => (
                      <Badge
                        key={idx}
                        variant="outline"
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

        {/* Quick Supply Access */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-bold text-xl">
              <Package className="h-5 w-5" />
              Quick Supply Access
            </CardTitle>
            <CardDescription>Frequently used nursing supplies</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {nursingSupplies.slice(0, 6).map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-2 border rounded bg-white"
                >
                  <div className="flex-1">
                    <h4 className="font-medium text-sm">{item.name}</h4>
                    <p className="text-xs">
                      {item.currentStock} {item.unit} available
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={item.status === 'in-stock' ? 'default' : 'destructive'}
                      className={cn(item.status === 'in-stock' ? 'bg-[#256ef0]' : '')}
                    >
                      {item.status === 'in-stock' ? 'Available' : 'Low'}
                    </Badge>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-6 w-6 p-0 bg-transparent hover:bg-[#256ef0]"
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-6 w-6 p-0 bg-transparent hover:bg-[#256ef0]"
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Log Supply Usage</CardTitle>
            <CardDescription>Record supplies used during patient care</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Quickly log supplies used for accurate inventory tracking.
            </p>
            <Button className="w-full bg-[#256ef0] hover:bg-blue-500 cursor-pointer">
              Log Usage
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Request Supplies</CardTitle>
            <CardDescription>Request additional supplies for your shift</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Submit requests for supplies running low.
            </p>
            <Button className="w-full bg-[#256ef0] hover:bg-blue-500 cursor-pointer">
              Make Request
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Shift Handover</CardTitle>
            <CardDescription>Prepare handover notes</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Document patient status and supply usage.
            </p>
            <Button className="w-full bg-[#256ef0] hover:bg-blue-500 cursor-pointer">
              Create Notes
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
