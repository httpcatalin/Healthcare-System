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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts'
import {
  TrendingUp,
  AlertTriangle,
  DollarSign,
  Activity,
  Target,
  Zap
} from 'lucide-react'
import { getInventoryItems } from '@/lib/inventory'
import {
  getForecastingEngine,
  type ForecastData,
  type AnalyticsData,
  type SimulationResult,
  getAnalyticsBundle
} from '@/lib/forecasting'

export function AnalyticsDashboard() {
  const [items, setItems] = useState<any[]>([])
  const [forecasts, setForecasts] = useState<ForecastData[]>([])
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [simulation, setSimulation] = useState<SimulationResult | null>(null)
  const [simulationScenario, setSimulationScenario] = useState('patient-increase')
  const [simulationMultiplier, setSimulationMultiplier] = useState('1.2')
  const [selectedTimeframe, setSelectedTimeframe] = useState('30')

  const forecastingEngine = getForecastingEngine()

  useEffect(() => {
    const loadData = async () => {
      // Prefer single server call for performance
      const bundle = await getAnalyticsBundle()
      if (bundle) {
        setItems(bundle.items || [])
        setForecasts(bundle.forecasts || [])
        setAnalytics(bundle.analytics || null)
        return
      }

      // Fallback to legacy client-side path if server not available
      const inventoryData = await getInventoryItems()
      setItems(inventoryData)
      const forecastData = await Promise.all(
        inventoryData.map((item) =>
          forecastingEngine.generateForecast(
            item.id,
            item.name,
            item.currentStock,
            item.minStock
          )
        )
      )
      setForecasts(forecastData)
      const analyticsData = await forecastingEngine.generateAnalytics(inventoryData)
      setAnalytics(analyticsData)
    }
    loadData()
  }, [])

  const runSimulation = async () => {
    const multiplier = Number.parseFloat(simulationMultiplier)
    const scenarioName =
      {
        'patient-increase': `${((multiplier - 1) * 100).toFixed(
          0
        )}% Patient Load Increase`,
        'seasonal-surge': 'Seasonal Surge',
        emergency: 'Emergency Scenario'
      }[simulationScenario] || 'Custom Scenario'

    const result = await forecastingEngine.runSimulation(items, scenarioName, multiplier)
    setSimulation(result)
  }

  const getRiskBadge = (riskLevel: string) => {
    const variants = {
      low: 'default',
      medium: 'secondary',
      high: 'destructive'
    } as const

    return (
      <Badge variant={variants[riskLevel as keyof typeof variants]}>
        {riskLevel.toUpperCase()} RISK
      </Badge>
    )
  }

  const COLORS = ['#164e63', '#a16207', '#dc2626', '#059669', '#7c3aed', '#ea580c']

  if (!analytics) {
    return <div>Loading analytics...</div>
  }

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-[#f1f1f1] py-4  overflow-hidden flex flex-col justify-between">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative">
            <CardTitle className="xl:text-xl text-lg font-lg tracking-tight">
              Total Inventory Value
            </CardTitle>
            <DollarSign className="absolute min-h-40 min-w-40 top-0 2xl:left-[12rem] xl:left-[11vw] md:-right-10 right-0 opacity-30" />
          </CardHeader>
          <CardContent>
            <div className="xl:text-4xl text-xl font-bold">
              ${(analytics.totalSpend || 0).toFixed(2)}
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
              {forecasts.filter((f) => f.riskLevel === 'high').length}
            </div>
            <p className="text-xs text-foreground">High risk stockouts</p>
          </CardContent>
        </Card>

        <Card className="bg-sky-600/10 overflow-hidden border-sky-600/20  flex flex-col justify-between">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative">
            <CardTitle className="xl:text-xl text-lg font-lg tracking-tight text-sky-400">
              Avg Forecast Confidence
            </CardTitle>
            <Target className="absolute min-h-40 min-w-40 top-0 text-sky-600 2xl:left-[12rem] xl:left-[11vw] md:-right-10 right-0 opacity-30" />
          </CardHeader>
          <CardContent>
            <div className="xl:text-4xl text-xl font-bold text-sky-400">
              {forecasts.length > 0
                ? (
                    (forecasts.reduce((sum, f) => sum + f.confidence, 0) /
                      forecasts.length) *
                    100
                  ).toFixed(0)
                : '0'}
              %
            </div>
            <p className="text-xs text-foreground">AI prediction accuracy</p>
          </CardContent>
        </Card>

        <Card className="bg-green-600/10 overflow-hidden border-green-600/20  flex flex-col justify-between">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative">
            <CardTitle className="xl:text-xl text-lg font-lg tracking-tight text-green-600">
              Monthly Trend
            </CardTitle>
            <Activity className="absolute min-h-40 min-w-40 top-0 text-green-600 2xl:left-[12rem] xl:left-[11vw] md:-right-10 right-0 opacity-30" />
          </CardHeader>
          <CardContent>
            <div className="xl:text-4xl text-xl font-bold text-green-400">
              <TrendingUp className="h-6 w-6 text-green-600" />
              <span className="bg-gradient-to-r from-green-600 to-green-500 bg-clip-text text-transparent">
                +12%
              </span>
            </div>
            <p className="text-xs text-foreground">Usage vs last month</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-1 font-normal">
        <CardHeader className="pb-2 font-normal">
          <CardTitle className="flex items-center gap-3 text-2xl">
            <div className="p-2 bg-gradient-to-br from-destructive/20 to-destructive/10 rounded-xl">
              <AlertTriangle className="h-6 w-6 text-destructive" />
            </div>
            Stock Forecasting Alerts
          </CardTitle>
          <CardDescription className="text-base text-muted-foreground">
            AI-powered predictions for inventory management
          </CardDescription>
        </CardHeader>

        <CardContent>
          <div className="space-y-4">
            {forecasts
              .filter((forecast) => forecast.riskLevel !== 'low')
              .map((forecast) => (
                <Card
                  key={forecast.itemId}
                  className={`rounded-2xl transition-all duration-300 ${
                    forecast.riskLevel === 'high'
                      ? 'border border-destructive/30 bg-destructive/10'
                      : 'border border-secondary/30 bg-secondary/10'
                  }`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-4">
                      <h4 className="text-lg font-bold">{forecast.itemName}</h4>
                      {getRiskBadge(forecast.riskLevel)}
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-sm">
                      <div>
                        <span className="block text-xs font-semibold uppercase text-muted-foreground tracking-wide">
                          Days until stockout
                        </span>
                        <div className="text-2xl font-bold text-destructive">
                          {forecast.daysUntilStockout}
                        </div>
                      </div>
                      <div>
                        <span className="block text-xs font-semibold uppercase text-muted-foreground tracking-wide">
                          Current stock
                        </span>
                        <div className="text-lg font-semibold">
                          {forecast.currentStock} units
                        </div>
                      </div>
                      <div>
                        <span className="block text-xs font-semibold uppercase text-muted-foreground tracking-wide">
                          Reorder point
                        </span>
                        <div className="text-lg font-semibold text-accent">
                          {forecast.recommendedReorderPoint} units
                        </div>
                      </div>
                      <div>
                        <span className="block text-xs font-semibold uppercase text-muted-foreground tracking-wide">
                          Order quantity
                        </span>
                        <div className="text-lg font-semibold text-primary">
                          {forecast.recommendedOrderQuantity} units
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        </CardContent>
      </Card>

      <Card className="">
        <CardHeader className="pb-6">
          <CardTitle className="text-2xl">Usage Trends</CardTitle>
          <CardDescription className="text-base text-muted-foreground">
            Daily usage patterns over the last 30 days
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="p-4 bg-gradient-to-br from-muted/30 to-transparent rounded-2xl">
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={analytics.usageTrends}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="hsl(var(--border))"
                  strokeOpacity={0.3}
                />
                <XAxis
                  dataKey="date"
                  tickFormatter={(date) => new Date(date).toLocaleDateString()}
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  fontWeight={500}
                />
                <YAxis
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  fontWeight={500}
                />
                <Tooltip
                  labelFormatter={(date) => new Date(date).toLocaleDateString()}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '12px',
                    boxShadow: '0 10px 25px -3px rgba(0, 0, 0, 0.1)',
                    backdropFilter: 'blur(16px)'
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="totalUsage"
                  stroke="hsl(var(--primary))"
                  strokeWidth={3}
                  name="Total Usage"
                  dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 4 }}
                  activeDot={{
                    r: 6,
                    stroke: 'hsl(var(--primary))',
                    strokeWidth: 2,
                    fill: 'hsl(var(--background))'
                  }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card>
          <CardHeader className="pb-6">
            <CardTitle className="text-2xl">Category Breakdown</CardTitle>
            <CardDescription className="text-base text-muted-foreground">
              Inventory value distribution by category
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="p-4 bg-gradient-to-br from-muted/30 to-transparent rounded-2xl">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={analytics.categoryBreakdown}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ category, percentage }: any) =>
                      `${category} (${(percentage || 0).toFixed(1)}%)`
                    }
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="totalValue"
                    stroke="hsl(var(--background))"
                    strokeWidth={2}
                  >
                    {analytics.categoryBreakdown.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => [`$${value.toFixed(2)}`, 'Value']}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '12px',
                      boxShadow: '0 10px 25px -3px rgba(0, 0, 0, 0.1)',
                      backdropFilter: 'blur(16px)'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-6">
            <CardTitle className="text-2xl">Top Expensive Items</CardTitle>
            <CardDescription className="text-base text-muted-foreground">
              Items with highest inventory value
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics.topExpensiveItems.map((item, index) => (
                <div
                  key={item.name}
                  className="flex items-center justify-between p-4 border border-border/30 rounded-2xl transition-all duration-300 bg-white"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-2xl text-blue-500 border-blue-500 flex items-center justify-center text-xl font-bold">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-bold text-lg">{item.name}</p>
                      <p className="text-sm text-muted-foreground font-medium">
                        Weekly usage: {item.usage} units
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-xl bg-gradient-to-r from-primary to-secondary bg-clip-text text-blue-500">
                      ${(item.totalCost || 0).toFixed(2)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
