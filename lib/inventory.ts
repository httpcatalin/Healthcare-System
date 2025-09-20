export interface InventoryItem {
  id: string;
  name: string;
  currentStock: number;
  unit: string;
  status: "in-stock" | "low-stock" | "out-of-stock";
  minStock: number;
  maxStock: number;
  price?: number;
}

export interface UsageLog {
  id: string;
  itemId: string;
  quantity: number;
  user: string;
  timestamp: string;
  notes?: string;
}

const API_BASE = "http://localhost:8000/api";

export const getInventoryItems = async (): Promise<InventoryItem[]> => {
  try {
    const response = await fetch(`${API_BASE}/inventory`);
    if (!response.ok) throw new Error("Failed to fetch inventory");
    const data = await response.json();
    return data.items || [];
  } catch (error) {
    console.error("Error fetching inventory:", error);
    return [];
  }
};

export const getUsageLogs = async (): Promise<UsageLog[]> => {
  try {
    const response = await fetch(`${API_BASE}/usage-logs`);
    if (!response.ok) throw new Error("Failed to fetch usage logs");
    const data = await response.json();
    return data.logs || [];
  } catch (error) {
    console.error("Error fetching usage logs:", error);
    return [];
  }
};

export const updateStock = async (
  itemId: string,
  newStock: number
): Promise<boolean> => {
  try {
    const response = await fetch(`${API_BASE}/inventory/${itemId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentStock: newStock }),
    });
    return response.ok;
  } catch (error) {
    console.error("Error updating stock:", error);
    return false;
  }
};

export const logUsage = async (
  itemId: string,
  quantity: number,
  user: string,
  notes?: string
): Promise<boolean> => {
  try {
    const response = await fetch(`${API_BASE}/usage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId, quantity, user, notes }),
    });
    return response.ok;
  } catch (error) {
    console.error("Error logging usage:", error);
    return false;
  }
};

export const getStockAlerts = async (): Promise<InventoryItem[]> => {
  const items = await getInventoryItems();
  return items.filter(
    (item) => item.status === "low-stock" || item.status === "out-of-stock"
  );
};

export const getCategorySummary = async () => {
  const items = await getInventoryItems();
  const categories = items.reduce((acc, item) => {
    const category = "General";
    if (!acc[category]) {
      acc[category] = { total: 0, lowStock: 0, outOfStock: 0 };
    }
    acc[category].total++;
    if (item.status === "low-stock") acc[category].lowStock++;
    if (item.status === "out-of-stock") acc[category].outOfStock++;
    return acc;
  }, {} as Record<string, { total: number; lowStock: number; outOfStock: number }>);

  return categories;
};
