export interface UsagePattern {
  itemId: string
  itemName: string
  dailyUsage: number[]
  weeklyAverage: number
  trend: "increasing" | "decreasing" | "stable"
  seasonality: number
  confidence: number
}

export interface ForecastData {
  itemId: string
  itemName: string
  currentStock: number
  predictedUsage: number[]
  daysUntilStockout: number
  recommendedReorderPoint: number
  recommendedOrderQuantity: number
  confidence: number
  riskLevel: "low" | "medium" | "high"
}

export interface AnalyticsData {
  totalSpend: number
  monthlySpend: number[]
  topExpensiveItems: Array<{
    name: string
    totalCost: number
    usage: number
  }>
  categoryBreakdown: Array<{
    category: string
    items: number
    totalValue: number
    percentage: number
  }>
  usageTrends: Array<{
    date: string
    totalUsage: number
    categories: Record<string, number>
  }>
}

export interface SimulationResult {
  scenario: string
  impactedItems: Array<{
    itemName: string
    currentStock: number
    projectedStock: number
    daysUntilStockout: number
    additionalOrderNeeded: number
  }>
  totalAdditionalCost: number
  criticalItems: string[]
}

// Mock historical usage data for forecasting
const generateMockUsageHistory = (itemId: string, days = 30): number[] => {
  const baseUsage =
    {
      "1": 8, // Gloves
      "2": 12, // Masks
      "3": 3, // Syringes
      "4": 5, // Bandages
      "5": 1, // Thermometers
      "6": 2, // Antiseptic
    }[itemId] || 5

  const usage = []
  for (let i = 0; i < days; i++) {
    // Add some randomness and weekly patterns
    const weekdayMultiplier = [0.7, 1.0, 1.1, 1.0, 1.2, 0.8, 0.6][i % 7]
    const randomFactor = 0.7 + Math.random() * 0.6
    const trendFactor = 1 + Math.sin(i / 10) * 0.2

    usage.push(Math.max(0, Math.round(baseUsage * weekdayMultiplier * randomFactor * trendFactor)))
  }
  return usage.reverse() // Most recent first
}

// Simple linear regression for trend analysis
const calculateTrend = (data: number[]): { slope: number; trend: "increasing" | "decreasing" | "stable" } => {
  const n = data.length
  const x = Array.from({ length: n }, (_, i) => i)
  const y = data

  const sumX = x.reduce((a, b) => a + b, 0)
  const sumY = y.reduce((a, b) => a + b, 0)
  const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0)
  const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0)

  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX)

  let trend: "increasing" | "decreasing" | "stable"
  if (Math.abs(slope) < 0.1) trend = "stable"
  else if (slope > 0) trend = "increasing"
  else trend = "decreasing"

  return { slope, trend }
}

// Moving average for smoothing
const movingAverage = (data: number[], window = 7): number[] => {
  const result = []
  for (let i = 0; i < data.length; i++) {
    const start = Math.max(0, i - window + 1)
    const slice = data.slice(start, i + 1)
    result.push(slice.reduce((a, b) => a + b, 0) / slice.length)
  }
  return result
}

export class ForecastingEngine {
  private usageHistory: Map<string, number[]> = new Map()

  constructor() {
    // Initialize with mock data
    ;["1", "2", "3", "4", "5", "6"].forEach((itemId) => {
      this.usageHistory.set(itemId, generateMockUsageHistory(itemId, 30))
    })
  }

  analyzeUsagePattern(itemId: string, itemName: string): UsagePattern {
    const usage = this.usageHistory.get(itemId) || []
    const smoothed = movingAverage(usage, 7)
    const { trend } = calculateTrend(smoothed)

    const weeklyAverage = usage.slice(0, 7).reduce((a, b) => a + b, 0) / 7
    const seasonality = this.calculateSeasonality(usage)

    return {
      itemId,
      itemName,
      dailyUsage: usage,
      weeklyAverage,
      trend,
      seasonality,
      confidence: 0.75 + Math.random() * 0.2, // Mock confidence
    }
  }

  private calculateSeasonality(usage: number[]): number {
    // Simple seasonality calculation based on day-of-week patterns
    const dayAverages = Array(7).fill(0)
    const dayCounts = Array(7).fill(0)

    usage.forEach((value, index) => {
      const dayOfWeek = index % 7
      dayAverages[dayOfWeek] += value
      dayCounts[dayOfWeek]++
    })

    for (let i = 0; i < 7; i++) {
      dayAverages[i] = dayCounts[i] > 0 ? dayAverages[i] / dayCounts[i] : 0
    }

    const overallAverage = dayAverages.reduce((a, b) => a + b, 0) / 7
    const variance = dayAverages.reduce((sum, avg) => sum + Math.pow(avg - overallAverage, 2), 0) / 7

    return Math.sqrt(variance) / overallAverage // Coefficient of variation
  }

  generateForecast(itemId: string, itemName: string, currentStock: number, minThreshold: number): ForecastData {
    const pattern = this.analyzeUsagePattern(itemId, itemName)
    const forecastDays = 30

    // Predict future usage based on trend and seasonality
    const predictedUsage = []
    let trendMultiplier = 1

    for (let day = 1; day <= forecastDays; day++) {
      // Apply trend
      if (pattern.trend === "increasing") trendMultiplier += 0.01
      else if (pattern.trend === "decreasing") trendMultiplier -= 0.005

      // Apply seasonality (day of week pattern)
      const dayOfWeek = day % 7
      const seasonalMultiplier = 1 + Math.sin((dayOfWeek * Math.PI) / 3.5) * pattern.seasonality

      const predicted = Math.max(0, Math.round(pattern.weeklyAverage * trendMultiplier * seasonalMultiplier))

      predictedUsage.push(predicted)
    }

    // Calculate days until stockout
    let remainingStock = currentStock
    let daysUntilStockout = forecastDays

    for (let i = 0; i < predictedUsage.length; i++) {
      remainingStock -= predictedUsage[i]
      if (remainingStock <= 0) {
        daysUntilStockout = i + 1
        break
      }
    }

    // Calculate reorder recommendations
    const avgDailyUsage = pattern.weeklyAverage
    const leadTimeDays = 7 // Assume 7-day lead time
    const safetyStock = avgDailyUsage * 3 // 3 days safety stock

    const recommendedReorderPoint = avgDailyUsage * leadTimeDays + safetyStock
    const recommendedOrderQuantity = Math.max(
      minThreshold * 2,
      avgDailyUsage * 30, // 30-day supply
    )

    // Determine risk level
    let riskLevel: "low" | "medium" | "high"
    if (daysUntilStockout <= 3) riskLevel = "high"
    else if (daysUntilStockout <= 7) riskLevel = "medium"
    else riskLevel = "low"

    return {
      itemId,
      itemName,
      currentStock,
      predictedUsage,
      daysUntilStockout,
      recommendedReorderPoint,
      recommendedOrderQuantity,
      confidence: pattern.confidence,
      riskLevel,
    }
  }

  generateAnalytics(items: any[]): AnalyticsData {
    const totalSpend = items.reduce((sum, item) => sum + item.currentStock * item.costPerUnit, 0)

    // Mock monthly spend data
    const monthlySpend = Array.from({ length: 12 }, (_, i) => {
      const baseSpend = totalSpend * 0.8
      const seasonal = Math.sin(((i + 1) * Math.PI) / 6) * totalSpend * 0.2
      return Math.max(0, baseSpend + seasonal + (Math.random() - 0.5) * totalSpend * 0.1)
    })

    // Top expensive items
    const topExpensiveItems = items
      .map((item) => ({
        name: item.name,
        totalCost: item.currentStock * item.costPerUnit,
        usage:
          this.usageHistory
            .get(item.id)
            ?.slice(0, 7)
            .reduce((a, b) => a + b, 0) || 0,
      }))
      .sort((a, b) => b.totalCost - a.totalCost)
      .slice(0, 5)

    // Category breakdown
    const categoryMap = new Map<string, { items: number; totalValue: number }>()
    items.forEach((item) => {
      const existing = categoryMap.get(item.category) || { items: 0, totalValue: 0 }
      categoryMap.set(item.category, {
        items: existing.items + 1,
        totalValue: existing.totalValue + item.currentStock * item.costPerUnit,
      })
    })

    const categoryBreakdown = Array.from(categoryMap.entries()).map(([category, data]) => ({
      category,
      items: data.items,
      totalValue: data.totalValue,
      percentage: (data.totalValue / totalSpend) * 100,
    }))

    // Usage trends (last 30 days)
    const usageTrends = Array.from({ length: 30 }, (_, i) => {
      const date = new Date()
      date.setDate(date.getDate() - (29 - i))

      const categories: Record<string, number> = {}
      let totalUsage = 0

      items.forEach((item) => {
        const usage = this.usageHistory.get(item.id)?.[29 - i] || 0
        totalUsage += usage
        categories[item.category] = (categories[item.category] || 0) + usage
      })

      return {
        date: date.toISOString().split("T")[0],
        totalUsage,
        categories,
      }
    })

    return {
      totalSpend,
      monthlySpend,
      topExpensiveItems,
      categoryBreakdown,
      usageTrends,
    }
  }

  runSimulation(items: any[], scenario: string, multiplier: number): SimulationResult {
    const impactedItems = items.map((item) => {
      const forecast = this.generateForecast(item.id, item.name, item.currentStock, item.minThreshold)
      const adjustedUsage = forecast.predictedUsage.map((usage) => Math.round(usage * multiplier))

      let remainingStock = item.currentStock
      let daysUntilStockout = 30

      for (let i = 0; i < adjustedUsage.length; i++) {
        remainingStock -= adjustedUsage[i]
        if (remainingStock <= 0) {
          daysUntilStockout = i + 1
          break
        }
      }

      const projectedStock = Math.max(0, remainingStock)
      const additionalOrderNeeded = remainingStock < 0 ? Math.abs(remainingStock) : 0

      return {
        itemName: item.name,
        currentStock: item.currentStock,
        projectedStock,
        daysUntilStockout,
        additionalOrderNeeded,
      }
    })

    const totalAdditionalCost = impactedItems.reduce((sum, item) => {
      const originalItem = items.find((i) => i.name === item.itemName)
      return sum + item.additionalOrderNeeded * (originalItem?.costPerUnit || 0)
    }, 0)

    const criticalItems = impactedItems.filter((item) => item.daysUntilStockout <= 7).map((item) => item.itemName)

    return {
      scenario,
      impactedItems,
      totalAdditionalCost,
      criticalItems,
    }
  }

  addUsageData(itemId: string, usage: number): void {
    const existing = this.usageHistory.get(itemId) || []
    existing.unshift(usage) // Add to beginning (most recent)
    existing.splice(30) // Keep only last 30 days
    this.usageHistory.set(itemId, existing)
  }
}

// Singleton instance
let forecastingEngine: ForecastingEngine | null = null

export const getForecastingEngine = (): ForecastingEngine => {
  if (!forecastingEngine) {
    forecastingEngine = new ForecastingEngine()
  }
  return forecastingEngine
}
