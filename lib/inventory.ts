export interface InventoryItem {
  id: string
  name: string
  category: string
  currentStock: number
  minThreshold: number
  maxCapacity: number
  unit: string
  costPerUnit: number
  supplier: string
  lastRestocked: Date
  expiryDate?: Date
  location: string
  status: "in-stock" | "low-stock" | "out-of-stock" | "expired"
}

export interface UsageLog {
  id: string
  itemId: string
  quantity: number
  usedBy: string
  usedAt: Date
  notes?: string
}

// Mock inventory data
export const mockInventoryItems: InventoryItem[] = [
  {
    id: "1",
    name: "Disposable Gloves",
    category: "PPE",
    currentStock: 45,
    minThreshold: 50,
    maxCapacity: 500,
    unit: "boxes",
    costPerUnit: 12.99,
    supplier: "MedSupply Co",
    lastRestocked: new Date("2024-01-15"),
    location: "Storage Room A",
    status: "low-stock",
  },
  {
    id: "2",
    name: "Surgical Masks",
    category: "PPE",
    currentStock: 120,
    minThreshold: 100,
    maxCapacity: 1000,
    unit: "boxes",
    costPerUnit: 8.5,
    supplier: "HealthCare Plus",
    lastRestocked: new Date("2024-01-20"),
    location: "Storage Room A",
    status: "in-stock",
  },
  {
    id: "3",
    name: "Syringes (10ml)",
    category: "Medical Supplies",
    currentStock: 0,
    minThreshold: 25,
    maxCapacity: 200,
    unit: "packs",
    costPerUnit: 15.75,
    supplier: "MedEquip Ltd",
    lastRestocked: new Date("2024-01-10"),
    location: "Medical Cabinet B",
    status: "out-of-stock",
  },
  {
    id: "4",
    name: "Bandages",
    category: "Medical Supplies",
    currentStock: 85,
    minThreshold: 30,
    maxCapacity: 150,
    unit: "rolls",
    costPerUnit: 3.25,
    supplier: "WoundCare Inc",
    lastRestocked: new Date("2024-01-18"),
    location: "Medical Cabinet A",
    status: "in-stock",
  },
  {
    id: "5",
    name: "Thermometers",
    category: "Equipment",
    currentStock: 8,
    minThreshold: 10,
    maxCapacity: 25,
    unit: "units",
    costPerUnit: 45.0,
    supplier: "TechMed Solutions",
    lastRestocked: new Date("2024-01-12"),
    location: "Equipment Room",
    status: "low-stock",
  },
  {
    id: "6",
    name: "Antiseptic Solution",
    category: "Pharmaceuticals",
    currentStock: 22,
    minThreshold: 15,
    maxCapacity: 50,
    unit: "bottles",
    costPerUnit: 8.99,
    supplier: "PharmaCorp",
    lastRestocked: new Date("2024-01-08"),
    expiryDate: new Date("2024-12-31"),
    location: "Pharmacy Cabinet",
    status: "in-stock",
  },
]

export const mockUsageLogs: UsageLog[] = [
  {
    id: "1",
    itemId: "1",
    quantity: 2,
    usedBy: "Dr. Sarah Johnson",
    usedAt: new Date("2024-01-22T10:30:00"),
    notes: "Patient examination",
  },
  {
    id: "2",
    itemId: "2",
    quantity: 5,
    usedBy: "Nurse Emily Davis",
    usedAt: new Date("2024-01-22T14:15:00"),
    notes: "Routine procedures",
  },
  {
    id: "3",
    itemId: "4",
    quantity: 3,
    usedBy: "Dr. Michael Chen",
    usedAt: new Date("2024-01-22T16:45:00"),
    notes: "Wound dressing",
  },
]

export const getInventoryItems = (): InventoryItem[] => {
  return mockInventoryItems
}

export const getUsageLogs = (): UsageLog[] => {
  return mockUsageLogs
}

export const updateStock = (itemId: string, newStock: number): void => {
  const item = mockInventoryItems.find((i) => i.id === itemId)
  if (item) {
    item.currentStock = newStock
    item.status = getStockStatus(newStock, item.minThreshold)
  }
}

export const logUsage = (itemId: string, quantity: number, usedBy: string, notes?: string): void => {
  const item = mockInventoryItems.find((i) => i.id === itemId)
  if (item) {
    item.currentStock = Math.max(0, item.currentStock - quantity)
    item.status = getStockStatus(item.currentStock, item.minThreshold)

    const newLog: UsageLog = {
      id: Date.now().toString(),
      itemId,
      quantity,
      usedBy,
      usedAt: new Date(),
      notes,
    }
    mockUsageLogs.unshift(newLog)
  }
}

const getStockStatus = (currentStock: number, minThreshold: number): InventoryItem["status"] => {
  if (currentStock === 0) return "out-of-stock"
  if (currentStock <= minThreshold) return "low-stock"
  return "in-stock"
}

export const getStockAlerts = (): InventoryItem[] => {
  return mockInventoryItems.filter((item) => item.status === "low-stock" || item.status === "out-of-stock")
}

export const getCategorySummary = () => {
  const categories = mockInventoryItems.reduce(
    (acc, item) => {
      if (!acc[item.category]) {
        acc[item.category] = { total: 0, lowStock: 0, outOfStock: 0 }
      }
      acc[item.category].total++
      if (item.status === "low-stock") acc[item.category].lowStock++
      if (item.status === "out-of-stock") acc[item.category].outOfStock++
      return acc
    },
    {} as Record<string, { total: number; lowStock: number; outOfStock: number }>,
  )

  return categories
}
