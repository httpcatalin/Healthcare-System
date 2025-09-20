'use client';

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
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts'
import {
  Users,
  DollarSign,
  Package,
  AlertTriangle,
  TrendingUp,
  FileText,
  Activity,
  Shield
} from 'lucide-react'
import { getInventoryItems, getStockAlerts } from '@/lib/inventory'
import { getPurchaseOrders } from '@/lib/purchase-orders'
import { getForecastingEngine } from '@/lib/forecasting'

export function AdminDashboard() {
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [alerts, setAlerts] = useState<any[]>([]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const [items, orders, stockAlerts] = await Promise.all([
          getInventoryItems(),
          getPurchaseOrders(),
          getStockAlerts(),
        ]);

        if (!mounted) return;
        setInventoryItems(Array.isArray(items) ? items : []);
        setPurchaseOrders(Array.isArray(orders) ? orders : []);
        setAlerts(Array.isArray(stockAlerts) ? stockAlerts : []);

        const forecastingEngine = getForecastingEngine();
        const analyticsData = await forecastingEngine.generateAnalytics(
          Array.isArray(items) ? items : []
        );
        if (!mounted) return;
        setAnalytics(analyticsData);
      } catch (e) {
        if (!mounted) return;
        setInventoryItems([]);
        setPurchaseOrders([]);
        setAlerts([]);
        setAnalytics(null);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, []);

  const totalInventoryValue = inventoryItems.reduce(
    (sum, item) => sum + item.currentStock * item.costPerUnit,
    0
  )
  const pendingOrders = purchaseOrders.filter(
    (order) => order.status === 'pending' || order.status === 'approved'
  )
  const monthlySpend = analytics?.monthlySpend || []
  const criticalAlerts = alerts.filter((alert) => alert.status === 'out-of-stock').length
  const lowStockAlerts = alerts.filter((alert) => alert.status === 'low-stock').length

  // Mock user activity data
  const userActivity = [
    { name: 'Mon', logins: 12, orders: 3, usage: 45 },
    { name: 'Tue', logins: 15, orders: 5, usage: 52 },
    { name: 'Wed', logins: 18, orders: 2, usage: 38 },
    { name: 'Thu', logins: 14, orders: 7, usage: 61 },
    { name: 'Fri', logins: 16, orders: 4, usage: 48 },
    { name: 'Sat', logins: 8, orders: 1, usage: 22 },
    { name: 'Sun', logins: 6, orders: 0, usage: 15 }
  ]

  return (
    <div className="space-y-6">
      {/* Admin Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-[#f1f1f1] py-4  overflow-hidden flex flex-col justify-between">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative">
            <CardTitle className="xl:text-xl text-lg font-lg tracking-tight">
              Total Inventory Value
            </CardTitle>
            <DollarSign className="absolute min-h-40 min-w-40 top-0 2xl:left-[12rem] xl:left-[11vw] md:-right-10 right-0 opacity-30" />
          </CardHeader>
          <CardContent>
            <div className="xl:text-4xl text-xl font-bold">
              ${totalInventoryValue.toFixed(2)}
            </div>
            <p className="text-xs text-foreground">
              <TrendingUp className="inline h-3 w-3 mr-1" />
              +12% from last month
            </p>
          </CardContent>
        </Card>

        <Card className="bg-red-600/10 overflow-hidden border-red-600/20  flex flex-col justify-between">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative">
            <CardTitle className="xl:text-xl text-lg font-lg tracking-tight text-red-400">
              Critical Alerts
            </CardTitle>
            <AlertTriangle className="absolute min-h-40 min-w-40 top-0 text-red-600 2xl:left-[12rem] xl:left-[11vw] md:-right-10 right-0 opacity-30" />
          </CardHeader>
          <CardContent>
            <div className="xl:text-4xl text-xl font-bold text-red-400">
              {criticalAlerts}
            </div>
            <p className="text-xs text-foreground">{lowStockAlerts} low stock warnings</p>
          </CardContent>
        </Card>

        <Card className="bg-blue-600/10 border-blue-600/20 overflow-hidden  flex flex-col justify-between">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative">
            <CardTitle className="xl:text-xl text-lg font-lg tracking-tight text-blue-400">
              Pending Orders
            </CardTitle>
            <FileText className="absolute min-h-40 min-w-40 top-0 text-blue-600 2xl:left-[12rem] xl:left-[11vw] md:-right-10 right-0 opacity-30" />
          </CardHeader>
          <CardContent>
            <div className="xl:text-4xl text-xl font-bold text-blue-400">
              {pendingOrders.length}
            </div>
            <p className="text-xs text-foreground">
              ${pendingOrders.reduce((sum, order) => sum + order.total, 0).toFixed(2)}{' '}
              total value
            </p>
          </CardContent>
        </Card>

        <Card className="bg-green-600/10 border-green-600/20 overflow-hidden flex flex-col justify-between">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative">
            <CardTitle className="xl:text-xl text-lg font-lg tracking-tight text-green-600">
              System Health
            </CardTitle>
            <Shield className="absolute min-h-40 min-w-40 top-0 text-green-600 2xl:left-[12rem] xl:left-[11vw] md:-right-10 right-0 opacity-30" />
          </CardHeader>
          <CardContent>
            <div className="xl:text-4xl text-xl font-bold text-green-600">98.5%</div>
            <p className="text-xs text-foreground">Uptime this month</p>
          </CardContent>
        </Card>
      </div>

      {/* Critical Alerts Section */}
      {alerts.length > 0 && (
        <Alert className="border-red-600/20 bg-red-600/10 ">
          <div className="mr-2 flex items-center h-full">
            <AlertTriangle className="min-h-7 min-w-7 text-red-600" />
          </div>
          <AlertDescription className="text-red-600 ml-10 flex justify-between items-center">
            <div>
              <strong>System Alerts:</strong>
              <div>
                <span className="font-bold">{criticalAlerts}</span> critical items need
                immediate attention, <span className="font-bold">{lowStockAlerts}</span>{' '}
                items are running low.
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="bg-[#e24141] text-white hover:bg-red-400 cursor-pointer 
             ring-inset ring-[0.5px] ring-red-400 border-red-700"
            >
              View All Alerts
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-blue-600/5">
          <CardHeader>
            <CardTitle className="font-bold text-xl">Monthly Spending Trends</CardTitle>
            <CardDescription>Inventory spending over the last 12 months</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart
                data={monthlySpend.map((spend: any, index: number) => ({
                  month: index + 1,
                  spend
                }))}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip
                  formatter={(value: number) => [`$${value.toFixed(2)}`, 'Spending']}
                />
                <Line type="monotone" dataKey="spend" stroke="#164e63" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="bg-blue-600/5">
          <CardHeader>
            <CardTitle className="font-bold text-xl">Weekly User Activity</CardTitle>
            <CardDescription>System usage and order activity</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={userActivity}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="logins" fill="#164e63" name="Logins" />
                <Bar dataKey="orders" fill="#a16207" name="Orders" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Management Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="bg-blue-600/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-bold text-xl">
              <Users className="h-5 w-5" />
              User Management
            </CardTitle>
            <CardDescription>
              Manage staff access and permissions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Active Users:</span>
                <Badge className="bg-[#256ef0]">3</Badge>
              </div>
              <div className="flex justify-between">
                <span>Admins:</span>
                <Badge className="bg-[#256ef0]">1</Badge>
              </div>
              <div className="flex justify-between">
                <span>Doctors:</span>
                <Badge className="bg-[#256ef0]">1</Badge>
              </div>
              <div className="flex justify-between">
                <span>Nurses:</span>
                <Badge className="bg-[#256ef0]">1</Badge>
              </div>
            </div>
            <Button className="w-full mt-4 bg-transparent" variant="outline">
              Manage Users
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-blue-600/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-bold text-xl">
              <Package className="h-5 w-5" />
              Inventory Overview
            </CardTitle>
            <CardDescription>Quick inventory status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Total Items:</span>
                <Badge className="bg-[#256ef0]">{inventoryItems.length}</Badge>
              </div>
              <div className="flex justify-between">
                <span>In Stock:</span>
                <Badge className="bg-[#256ef0]" variant="default">
                  {inventoryItems.filter((item) => item.status === 'in-stock').length}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span>Low Stock:</span>
                <Badge className="bg-[#256ef0]" variant="secondary">
                  {lowStockAlerts}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span>Out of Stock:</span>
                <Badge variant="destructive">{criticalAlerts}</Badge>
              </div>
            </div>
            <Button className="w-full mt-4 bg-transparent" variant="outline">
              View Inventory
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-blue-600/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2  font-bold text-xl">
              <Activity className="h-5 w-5" />
              System Performance
            </CardTitle>
            <CardDescription>
              System health and performance metrics
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Uptime:</span>
                <Badge className="bg-[#256ef0] text-white border-blue-700">98.5%</Badge>
              </div>
              <div className="flex justify-between">
                <span>Response Time:</span>
                <Badge className="bg-[#256ef0] text-white border-blue-700">120ms</Badge>
              </div>
              <div className="flex justify-between">
                <span>Active Sessions:</span>
                <Badge className="bg-[#256ef0]">3</Badge>
              </div>
              <div className="flex justify-between">
                <span>Data Sync:</span>
                <Badge className="bg-[#256ef0] text-white border-blue-700">Online</Badge>
              </div>
            </div>
            <Button className="w-full mt-4 bg-transparent" variant="outline">
              System Settings
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
