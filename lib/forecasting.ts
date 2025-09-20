export interface UsagePattern {
  itemId: string;
  itemName: string;
  dailyUsage: number[];
  weeklyAverage: number;
  trend: "increasing" | "decreasing" | "stable";
  seasonality: number;
  confidence: number;
}

export interface ForecastData {
  itemId: string;
  itemName: string;
  currentStock: number;
  predictedUsage: number[];
  daysUntilStockout: number;
  recommendedReorderPoint: number;
  recommendedOrderQuantity: number;
  confidence: number;
  riskLevel: "low" | "medium" | "high";
}

export interface AnalyticsData {
  totalSpend: number;
  monthlySpend: number[];
  topExpensiveItems: Array<{
    name: string;
    totalCost: number;
    usage: number;
  }>;
  categoryBreakdown: Array<{
    category: string;
    items: number;
    totalValue: number;
    percentage: number;
  }>;
  usageTrends: Array<{
    date: string;
    totalUsage: number;
    categories: Record<string, number>;
  }>;
}

export interface SimulationResult {
  scenario: string;
  impactedItems: Array<{
    itemName: string;
    currentStock: number;
    projectedStock: number;
    daysUntilStockout: number;
    additionalOrderNeeded: number;
  }>;
  totalAdditionalCost: number;
  criticalItems: string[];
}

class SimpleNeuralNetwork {
  private weights: number[];
  private bias: number;

  constructor(inputSize: number) {
    this.weights = Array(inputSize)
      .fill(0)
      .map(() => Math.random() * 0.1 - 0.05);
    this.bias = Math.random() * 0.1 - 0.05;
  }

  predict(inputs: number[]): number {
    const sum =
      inputs.reduce((acc, input, i) => acc + input * this.weights[i], 0) +
      this.bias;
    return Math.max(0, sum);
  }

  train(inputs: number[], target: number, learningRate: number = 0.01): void {
    const prediction = this.predict(inputs);
    const error = target - prediction;

    this.weights = this.weights.map(
      (weight, i) => weight + learningRate * error * inputs[i]
    );
    this.bias += learningRate * error;
  }
}

const calculateTrend = (
  data: number[]
): { slope: number; trend: "increasing" | "decreasing" | "stable" } => {
  const n = data.length;
  const x = Array.from({ length: n }, (_, i) => i);
  const y = data;

  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
  const sumXX = x.reduce((sum, xi) => sum + xi * xi, 0);

  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);

  let trend: "increasing" | "decreasing" | "stable";
  if (Math.abs(slope) < 0.1) trend = "stable";
  else if (slope > 0) trend = "increasing";
  else trend = "decreasing";

  return { slope, trend };
};

const movingAverage = (data: number[], window: number = 7): number[] => {
  const result = [];
  for (let i = 0; i < data.length; i++) {
    const start = Math.max(0, i - window + 1);
    const slice = data.slice(start, i + 1);
    result.push(slice.reduce((a, b) => a + b, 0) / slice.length);
  }
  return result;
};

export class ForecastingEngine {
  private usageHistory: Map<string, number[]> = new Map();
  private neuralNetworks: Map<string, SimpleNeuralNetwork> = new Map();
  private trained: boolean = false;

  async initializeWithRealData(): Promise<void> {
    if (this.trained) return;

    try {
      const { getInventoryItems } = await import("@/lib/inventory");
      const items = await getInventoryItems();

      for (const item of items) {
        const usageData = await this.fetchHistoricalUsage(item.id);
        if (usageData.length > 0) {
          this.usageHistory.set(item.id, usageData);
          this.trainNeuralNetwork(item.id, usageData);
        } else {
          this.usageHistory.set(
            item.id,
            this.generateBaselineUsage(item.currentStock)
          );
        }
      }

      this.trained = true;
    } catch (error) {
      console.error("Failed to initialize forecasting engine:", error);
    }
  }

  private async fetchHistoricalUsage(itemId: string): Promise<number[]> {
    try {
      const response = await fetch(
        `http://localhost:8000/api/usage-logs/${itemId}`
      );
      if (!response.ok) return [];

      const data = await response.json();
      const logs = data.logs || [];

      const dailyUsage: Record<string, number> = {};
      logs.forEach((log: any) => {
        const date = new Date(log.timestamp).toISOString().split("T")[0];
        dailyUsage[date] = (dailyUsage[date] || 0) + log.quantity;
      });

      const dates = Object.keys(dailyUsage).sort();
      return dates.map((date) => dailyUsage[date]).slice(-30);
    } catch (error) {
      return [];
    }
  }

  private generateBaselineUsage(currentStock: number): number[] {
    const baseUsage = Math.max(1, Math.floor(currentStock / 30));
    return Array(30)
      .fill(0)
      .map(() => Math.floor(baseUsage * (0.5 + Math.random())));
  }

  private trainNeuralNetwork(itemId: string, usageData: number[]): void {
    const nn = new SimpleNeuralNetwork(7);

    for (let i = 7; i < usageData.length; i++) {
      const inputs = usageData.slice(i - 7, i);
      const target = usageData[i];
      nn.train(inputs, target);
    }

    this.neuralNetworks.set(itemId, nn);
  }

  async analyzeUsagePattern(
    itemId: string,
    itemName: string
  ): Promise<UsagePattern> {
    await this.initializeWithRealData();

    const usage = this.usageHistory.get(itemId) || [];
    if (usage.length === 0) {
      return {
        itemId,
        itemName,
        dailyUsage: [],
        weeklyAverage: 0,
        trend: "stable",
        seasonality: 0,
        confidence: 0.5,
      };
    }

    const smoothed = movingAverage(usage, 7);
    const { trend } = calculateTrend(smoothed);
    const weeklyAverage =
      usage.slice(0, 7).reduce((a, b) => a + b, 0) /
      Math.max(1, Math.min(7, usage.length));
    const seasonality = this.calculateSeasonality(usage);

    return {
      itemId,
      itemName,
      dailyUsage: usage,
      weeklyAverage,
      trend,
      seasonality,
      confidence: Math.min(0.95, 0.5 + usage.length / 100),
    };
  }

  private calculateSeasonality(usage: number[]): number {
    if (usage.length < 7) return 0;

    const dayAverages = Array(7).fill(0);
    const dayCounts = Array(7).fill(0);

    usage.forEach((value, index) => {
      const dayOfWeek = index % 7;
      dayAverages[dayOfWeek] += value;
      dayCounts[dayOfWeek]++;
    });

    for (let i = 0; i < 7; i++) {
      dayAverages[i] = dayCounts[i] > 0 ? dayAverages[i] / dayCounts[i] : 0;
    }

    const overallAverage = dayAverages.reduce((a, b) => a + b, 0) / 7;
    if (overallAverage === 0) return 0;

    const variance =
      dayAverages.reduce(
        (sum, avg) => sum + Math.pow(avg - overallAverage, 2),
        0
      ) / 7;
    return Math.sqrt(variance) / overallAverage;
  }

  async generateForecast(
    itemId: string,
    itemName: string,
    currentStock: number,
    minThreshold: number
  ): Promise<ForecastData> {
    const pattern = await this.analyzeUsagePattern(itemId, itemName);
    const forecastDays = 30;

    const predictedUsage = [];
    let trendMultiplier = 1;

    for (let day = 1; day <= forecastDays; day++) {
      let predicted: number;

      const nn = this.neuralNetworks.get(itemId);
      if (nn && pattern.dailyUsage.length >= 7) {
        const recentUsage = pattern.dailyUsage.slice(-7);
        predicted = Math.max(0, Math.round(nn.predict(recentUsage)));
      } else {
        if (pattern.trend === "increasing") trendMultiplier += 0.01;
        else if (pattern.trend === "decreasing") trendMultiplier -= 0.005;

        const dayOfWeek = day % 7;
        const seasonalMultiplier =
          1 + Math.sin((dayOfWeek * Math.PI) / 3.5) * pattern.seasonality;
        predicted = Math.max(
          0,
          Math.round(
            pattern.weeklyAverage * trendMultiplier * seasonalMultiplier
          )
        );
      }

      predictedUsage.push(predicted);
    }

    let remainingStock = currentStock;
    let daysUntilStockout = forecastDays;

    for (let i = 0; i < predictedUsage.length; i++) {
      remainingStock -= predictedUsage[i];
      if (remainingStock <= 0) {
        daysUntilStockout = i + 1;
        break;
      }
    }

    const avgDailyUsage = pattern.weeklyAverage;
    const leadTimeDays = 7;
    const safetyStock = avgDailyUsage * 3;

    const recommendedReorderPoint = avgDailyUsage * leadTimeDays + safetyStock;
    const recommendedOrderQuantity = Math.max(
      minThreshold * 2,
      avgDailyUsage * 30
    );

    let riskLevel: "low" | "medium" | "high";
    if (daysUntilStockout <= 3) riskLevel = "high";
    else if (daysUntilStockout <= 7) riskLevel = "medium";
    else riskLevel = "low";

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
    };
  }

  async generateAnalytics(items: any[]): Promise<AnalyticsData> {
    const totalSpend = items.reduce(
      (sum, item) => sum + item.currentStock * 10,
      0
    );

    const monthlySpend = Array.from({ length: 12 }, (_, i) => {
      const baseSpend = totalSpend * 0.8;
      const seasonal = Math.sin(((i + 1) * Math.PI) / 6) * totalSpend * 0.2;
      return Math.max(
        0,
        baseSpend + seasonal + (Math.random() - 0.5) * totalSpend * 0.1
      );
    });

    const topExpensiveItems = items
      .map((item) => ({
        name: item.name,
        totalCost: item.currentStock * 10,
        usage:
          this.usageHistory
            .get(item.id)
            ?.slice(0, 7)
            .reduce((a, b) => a + b, 0) || 0,
      }))
      .sort((a, b) => b.totalCost - a.totalCost)
      .slice(0, 5);

    const categoryMap = new Map<
      string,
      { items: number; totalValue: number }
    >();
    items.forEach((item) => {
      const category = "General";
      const existing = categoryMap.get(category) || { items: 0, totalValue: 0 };
      categoryMap.set(category, {
        items: existing.items + 1,
        totalValue: existing.totalValue + item.currentStock * 10,
      });
    });

    const categoryBreakdown = Array.from(categoryMap.entries()).map(
      ([category, data]) => ({
        category,
        items: data.items,
        totalValue: data.totalValue,
        percentage: (data.totalValue / totalSpend) * 100,
      })
    );

    const usageTrends = Array.from({ length: 30 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (29 - i));

      const categories: Record<string, number> = {};
      let totalUsage = 0;

      items.forEach((item) => {
        const usage = this.usageHistory.get(item.id)?.[29 - i] || 0;
        totalUsage += usage;
        categories["General"] = (categories["General"] || 0) + usage;
      });

      return {
        date: date.toISOString().split("T")[0],
        totalUsage,
        categories,
      };
    });

    return {
      totalSpend,
      monthlySpend,
      topExpensiveItems,
      categoryBreakdown,
      usageTrends,
    };
  }

  async runSimulation(
    items: any[],
    scenario: string,
    multiplier: number
  ): Promise<SimulationResult> {
    const impactedItems = await Promise.all(
      items.map(async (item) => {
        const forecast = await this.generateForecast(
          item.id,
          item.name,
          item.currentStock,
          item.minStock
        );
        const adjustedUsage = forecast.predictedUsage.map((usage) =>
          Math.round(usage * multiplier)
        );

        let remainingStock = item.currentStock;
        let daysUntilStockout = 30;

        for (let i = 0; i < adjustedUsage.length; i++) {
          remainingStock -= adjustedUsage[i];
          if (remainingStock <= 0) {
            daysUntilStockout = i + 1;
            break;
          }
        }

        const projectedStock = Math.max(0, remainingStock);
        const additionalOrderNeeded =
          remainingStock < 0 ? Math.abs(remainingStock) : 0;

        return {
          itemName: item.name,
          currentStock: item.currentStock,
          projectedStock,
          daysUntilStockout,
          additionalOrderNeeded,
        };
      })
    );

    const totalAdditionalCost = impactedItems.reduce((sum, item) => {
      return sum + item.additionalOrderNeeded * 10;
    }, 0);

    const criticalItems = impactedItems
      .filter((item) => item.daysUntilStockout <= 7)
      .map((item) => item.itemName);

    return {
      scenario,
      impactedItems,
      totalAdditionalCost,
      criticalItems,
    };
  }

  async addUsageData(itemId: string, usage: number): Promise<void> {
    const existing = this.usageHistory.get(itemId) || [];
    existing.unshift(usage);
    existing.splice(30);
    this.usageHistory.set(itemId, existing);

    const nn = this.neuralNetworks.get(itemId);
    if (nn && existing.length >= 8) {
      const inputs = existing.slice(1, 8);
      nn.train(inputs, usage);
    }
  }
}

let forecastingEngine: ForecastingEngine | null = null;

export const getForecastingEngine = (): ForecastingEngine => {
  if (!forecastingEngine) {
    forecastingEngine = new ForecastingEngine();
  }
  return forecastingEngine;
};
