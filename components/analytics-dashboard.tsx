"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
  ResponsiveContainer,
} from "recharts";
import {
  TrendingUp,
  AlertTriangle,
  DollarSign,
  Activity,
  Target,
  Zap,
} from "lucide-react";
import { getInventoryItems } from "@/lib/inventory";
import {
  getForecastingEngine,
  type ForecastData,
  type AnalyticsData,
  type SimulationResult,
  getAnalyticsBundle,
} from "@/lib/forecasting";

export function AnalyticsDashboard() {
  const [items, setItems] = useState<any[]>([]);
  const [forecasts, setForecasts] = useState<ForecastData[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [simulation, setSimulation] = useState<SimulationResult | null>(null);
  const [simulationScenario, setSimulationScenario] =
    useState("patient-increase");
  const [simulationMultiplier, setSimulationMultiplier] = useState("1.2");
  const [selectedTimeframe, setSelectedTimeframe] = useState("30");

  const forecastingEngine = getForecastingEngine();

  useEffect(() => {
    const loadData = async () => {
      // Prefer single server call for performance
      const bundle = await getAnalyticsBundle();
      if (bundle) {
        setItems(bundle.items || []);
        setForecasts(bundle.forecasts || []);
        setAnalytics(bundle.analytics || null);
        return;
      }

      // Fallback to legacy client-side path if server not available
      const inventoryData = await getInventoryItems();
      setItems(inventoryData);
      const forecastData = await Promise.all(
        inventoryData.map((item) =>
          forecastingEngine.generateForecast(
            item.id,
            item.name,
            item.currentStock,
            item.minStock
          )
        )
      );
      setForecasts(forecastData);
      const analyticsData = await forecastingEngine.generateAnalytics(
        inventoryData
      );
      setAnalytics(analyticsData);
    };
    loadData();
  }, []);

  const runSimulation = async () => {
    const multiplier = Number.parseFloat(simulationMultiplier);
    const scenarioName =
      {
        "patient-increase": `${((multiplier - 1) * 100).toFixed(
          0
        )}% Patient Load Increase`,
        "seasonal-surge": "Seasonal Surge",
        emergency: "Emergency Scenario",
      }[simulationScenario] || "Custom Scenario";

    const result = await forecastingEngine.runSimulation(
      items,
      scenarioName,
      multiplier
    );
    setSimulation(result);
  };

  const getRiskBadge = (riskLevel: string) => {
    const variants = {
      low: "default",
      medium: "secondary",
      high: "destructive",
    } as const;

    return (
      <Badge variant={variants[riskLevel as keyof typeof variants]}>
        {riskLevel.toUpperCase()} RISK
      </Badge>
    );
  };

  const COLORS = [
    "#164e63",
    "#a16207",
    "#dc2626",
    "#059669",
    "#7c3aed",
    "#ea580c",
  ];

  if (!analytics) {
    return <div>Loading analytics...</div>;
  }

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="glass border-border/30 shadow-premium hover-lift transition-all duration-300 hover:shadow-xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-bold text-muted-foreground uppercase tracking-wider">
              Total Inventory Value
            </CardTitle>
            <div className="p-2 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-xl">
              <DollarSign className="h-5 w-5 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold font-heading bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              ${(analytics.totalSpend || 0).toFixed(2)}
            </div>
            <p className="text-sm text-muted-foreground mt-2 font-medium">
              Current stock value
            </p>
          </CardContent>
        </Card>

        <Card className="glass border-border/30 shadow-premium hover-lift transition-all duration-300 hover:shadow-xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-bold text-muted-foreground uppercase tracking-wider">
              Critical Items
            </CardTitle>
            <div className="p-2 bg-gradient-to-br from-destructive/20 to-destructive/10 rounded-xl">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold font-heading text-destructive">
              {forecasts.filter((f) => f.riskLevel === "high").length}
            </div>
            <p className="text-sm text-muted-foreground mt-2 font-medium">
              High risk stockouts
            </p>
          </CardContent>
        </Card>

        <Card className="glass border-border/30 shadow-premium hover-lift transition-all duration-300 hover:shadow-xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-bold text-muted-foreground uppercase tracking-wider">
              Avg Forecast Confidence
            </CardTitle>
            <div className="p-2 bg-gradient-to-br from-accent/20 to-primary/20 rounded-xl">
              <Target className="h-5 w-5 text-accent" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold font-heading bg-gradient-to-r from-accent to-primary bg-clip-text text-transparent">
              {forecasts.length > 0
                ? (
                    (forecasts.reduce((sum, f) => sum + f.confidence, 0) /
                      forecasts.length) *
                    100
                  ).toFixed(0)
                : "0"}
              %
            </div>
            <p className="text-sm text-muted-foreground mt-2 font-medium">
              AI prediction accuracy
            </p>
          </CardContent>
        </Card>

        <Card className="glass border-border/30 shadow-premium hover-lift transition-all duration-300 hover:shadow-xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-bold text-muted-foreground uppercase tracking-wider">
              Monthly Trend
            </CardTitle>
            <div className="p-2 bg-gradient-to-br from-green-500/20 to-green-600/20 rounded-xl">
              <Activity className="h-5 w-5 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold font-heading flex items-center gap-2">
              <TrendingUp className="h-6 w-6 text-green-600" />
              <span className="bg-gradient-to-r from-green-600 to-green-500 bg-clip-text text-transparent">
                +12%
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-2 font-medium">
              Usage vs last month
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="glass border-border/30 shadow-premium">
        <CardHeader className="pb-6">
          <CardTitle className="flex items-center gap-3 text-2xl font-heading">
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
          <div className="space-y-6">
            {forecasts
              .filter((forecast) => forecast.riskLevel !== "low")
              .map((forecast) => (
                <Alert
                  key={forecast.itemId}
                  className={`glass border-l-4 shadow-sm hover-lift transition-all duration-300 ${
                    forecast.riskLevel === "high"
                      ? "border-l-destructive border-destructive/30 bg-destructive/5"
                      : "border-l-secondary border-secondary/30 bg-secondary/5"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <h4 className="font-bold text-lg font-heading">
                          {forecast.itemName}
                        </h4>
                        {getRiskBadge(forecast.riskLevel)}
                      </div>
                      <AlertDescription>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-sm">
                          <div className="space-y-1">
                            <span className="font-semibold text-muted-foreground uppercase tracking-wide text-xs">
                              Days until stockout:
                            </span>
                            <div className="text-2xl font-bold font-heading text-destructive">
                              {forecast.daysUntilStockout}
                            </div>
                          </div>
                          <div className="space-y-1">
                            <span className="font-semibold text-muted-foreground uppercase tracking-wide text-xs">
                              Current stock:
                            </span>
                            <div className="text-lg font-semibold">
                              {forecast.currentStock} units
                            </div>
                          </div>
                          <div className="space-y-1">
                            <span className="font-semibold text-muted-foreground uppercase tracking-wide text-xs">
                              Reorder point:
                            </span>
                            <div className="text-lg font-semibold text-accent">
                              {forecast.recommendedReorderPoint} units
                            </div>
                          </div>
                          <div className="space-y-1">
                            <span className="font-semibold text-muted-foreground uppercase tracking-wide text-xs">
                              Order quantity:
                            </span>
                            <div className="text-lg font-semibold text-primary">
                              {forecast.recommendedOrderQuantity} units
                            </div>
                          </div>
                        </div>
                      </AlertDescription>
                    </div>
                  </div>
                </Alert>
              ))}
          </div>
        </CardContent>
      </Card>

      <Card className="glass border-border/30 shadow-premium">
        <CardHeader className="pb-6">
          <CardTitle className="text-2xl font-heading">Usage Trends</CardTitle>
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
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "12px",
                    boxShadow: "0 10px 25px -3px rgba(0, 0, 0, 0.1)",
                    backdropFilter: "blur(16px)",
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="totalUsage"
                  stroke="hsl(var(--primary))"
                  strokeWidth={3}
                  name="Total Usage"
                  dot={{ fill: "hsl(var(--primary))", strokeWidth: 2, r: 4 }}
                  activeDot={{
                    r: 6,
                    stroke: "hsl(var(--primary))",
                    strokeWidth: 2,
                    fill: "hsl(var(--background))",
                  }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="glass border-border/30 shadow-premium">
          <CardHeader className="pb-6">
            <CardTitle className="text-2xl font-heading">
              Category Breakdown
            </CardTitle>
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
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => [
                      `$${value.toFixed(2)}`,
                      "Value",
                    ]}
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "12px",
                      boxShadow: "0 10px 25px -3px rgba(0, 0, 0, 0.1)",
                      backdropFilter: "blur(16px)",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="glass border-border/30 shadow-premium">
          <CardHeader className="pb-6">
            <CardTitle className="text-2xl font-heading">
              Top Expensive Items
            </CardTitle>
            <CardDescription className="text-base text-muted-foreground">
              Items with highest inventory value
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics.topExpensiveItems.map((item, index) => (
                <div
                  key={item.name}
                  className="flex items-center justify-between p-4 glass border border-border/30 rounded-2xl hover-lift transition-all duration-300 hover:shadow-lg"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center text-sm font-bold font-heading text-primary">
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-bold text-lg font-heading">
                        {item.name}
                      </p>
                      <p className="text-sm text-muted-foreground font-medium">
                        Weekly usage: {item.usage} units
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-xl font-heading bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                      ${(item.totalCost || 0).toFixed(2)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Scenario Simulation */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Scenario Simulation
          </CardTitle>
          <CardDescription>
            Predict inventory needs under different scenarios
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
              <Label htmlFor="scenario">Scenario Type</Label>
              <Select
                value={simulationScenario}
                onValueChange={setSimulationScenario}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="patient-increase">
                    Patient Load Increase
                  </SelectItem>
                  <SelectItem value="seasonal-surge">Seasonal Surge</SelectItem>
                  <SelectItem value="emergency">Emergency Scenario</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <Label htmlFor="multiplier">Usage Multiplier</Label>
              <Input
                id="multiplier"
                type="number"
                step="0.1"
                min="0.5"
                max="3.0"
                value={simulationMultiplier}
                onChange={(e) => setSimulationMultiplier(e.target.value)}
                placeholder="1.2"
              />
            </div>
            <div className="flex items-end">
              <Button onClick={runSimulation}>Run Simulation</Button>
            </div>
          </div>

          {simulation && (
            <div className="space-y-4">
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Scenario:</strong> {simulation.scenario}
                  <br />
                  <strong>Critical Items:</strong>{" "}
                  {simulation.criticalItems.length} items need immediate
                  attention
                  <br />
                  <strong>Additional Cost:</strong> $
                  {simulation.totalAdditionalCost.toFixed(2)}
                </AlertDescription>
              </Alert>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {simulation.impactedItems
                  .filter((item) => item.daysUntilStockout <= 14)
                  .map((item) => (
                    <Card
                      key={item.itemName}
                      className="border-l-4 border-l-destructive"
                    >
                      <CardContent className="pt-4">
                        <h4 className="font-medium mb-2">{item.itemName}</h4>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span>Current Stock:</span>
                            <span>{item.currentStock}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Projected Stock:</span>
                            <span
                              className={
                                item.projectedStock <= 0
                                  ? "text-destructive font-medium"
                                  : ""
                              }
                            >
                              {item.projectedStock}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Days Until Stockout:</span>
                            <span className="font-medium">
                              {item.daysUntilStockout}
                            </span>
                          </div>
                          {item.additionalOrderNeeded > 0 && (
                            <div className="flex justify-between text-destructive">
                              <span>Additional Order:</span>
                              <span className="font-medium">
                                +{item.additionalOrderNeeded}
                              </span>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
