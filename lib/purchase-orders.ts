export interface Supplier {
  id: string
  name: string
  email: string
  phone: string
  address: string
  paymentTerms: string
  leadTimeDays: number
  minimumOrder: number
}

export interface PurchaseOrderItem {
  itemId: string
  itemName: string
  quantity: number
  unitPrice: number
  totalPrice: number
  urgency: "low" | "medium" | "high"
}

export interface PurchaseOrder {
  id: string
  orderNumber: string
  supplierId: string
  supplierName: string
  status: "draft" | "pending" | "approved" | "sent" | "received" | "cancelled"
  items: PurchaseOrderItem[]
  subtotal: number
  tax: number
  total: number
  createdBy: string
  createdAt: Date
  expectedDelivery: Date
  notes?: string
  approvedBy?: string
  approvedAt?: Date
}

// Mock suppliers data
export const mockSuppliers: Supplier[] = [
  {
    id: "1",
    name: "MedSupply Co",
    email: "orders@medsupply.com",
    phone: "(555) 123-4567",
    address: "123 Medical Way, Healthcare City, HC 12345",
    paymentTerms: "Net 30",
    leadTimeDays: 5,
    minimumOrder: 500,
  },
  {
    id: "2",
    name: "HealthCare Plus",
    email: "purchasing@healthcareplus.com",
    phone: "(555) 234-5678",
    address: "456 Supply Street, Medical District, MD 67890",
    paymentTerms: "Net 15",
    leadTimeDays: 3,
    minimumOrder: 300,
  },
  {
    id: "3",
    name: "MedEquip Ltd",
    email: "sales@medequip.com",
    phone: "(555) 345-6789",
    address: "789 Equipment Ave, Device Town, DT 54321",
    paymentTerms: "Net 45",
    leadTimeDays: 7,
    minimumOrder: 1000,
  },
]

// Mock purchase orders
export const mockPurchaseOrders: PurchaseOrder[] = [
  {
    id: "1",
    orderNumber: "PO-2024-001",
    supplierId: "1",
    supplierName: "MedSupply Co",
    status: "pending",
    items: [
      {
        itemId: "1",
        itemName: "Disposable Gloves",
        quantity: 100,
        unitPrice: 12.99,
        totalPrice: 1299.0,
        urgency: "high",
      },
      {
        itemId: "5",
        itemName: "Thermometers",
        quantity: 15,
        unitPrice: 45.0,
        totalPrice: 675.0,
        urgency: "medium",
      },
    ],
    subtotal: 1974.0,
    tax: 157.92,
    total: 2131.92,
    createdBy: "Dr. Sarah Johnson",
    createdAt: new Date("2024-01-22"),
    expectedDelivery: new Date("2024-01-27"),
    notes: "Urgent order for PPE supplies",
  },
  {
    id: "2",
    orderNumber: "PO-2024-002",
    supplierId: "2",
    supplierName: "HealthCare Plus",
    status: "approved",
    items: [
      {
        itemId: "2",
        itemName: "Surgical Masks",
        quantity: 200,
        unitPrice: 8.5,
        totalPrice: 1700.0,
        urgency: "low",
      },
    ],
    subtotal: 1700.0,
    tax: 136.0,
    total: 1836.0,
    createdBy: "Nurse Emily Davis",
    createdAt: new Date("2024-01-20"),
    expectedDelivery: new Date("2024-01-23"),
    approvedBy: "Dr. Sarah Johnson",
    approvedAt: new Date("2024-01-21"),
  },
]

export const getSuppliers = (): Supplier[] => {
  return mockSuppliers
}

export const getPurchaseOrders = (): PurchaseOrder[] => {
  return mockPurchaseOrders
}

export const createPurchaseOrder = (
  items: PurchaseOrderItem[],
  supplierId: string,
  createdBy: string,
  notes?: string,
): PurchaseOrder => {
  const supplier = mockSuppliers.find((s) => s.id === supplierId)
  if (!supplier) throw new Error("Supplier not found")

  const subtotal = items.reduce((sum, item) => sum + item.totalPrice, 0)
  const tax = subtotal * 0.08 // 8% tax
  const total = subtotal + tax

  const orderNumber = `PO-${new Date().getFullYear()}-${String(mockPurchaseOrders.length + 1).padStart(3, "0")}`

  const expectedDelivery = new Date()
  expectedDelivery.setDate(expectedDelivery.getDate() + supplier.leadTimeDays)

  const newOrder: PurchaseOrder = {
    id: Date.now().toString(),
    orderNumber,
    supplierId,
    supplierName: supplier.name,
    status: "draft",
    items,
    subtotal,
    tax,
    total,
    createdBy,
    createdAt: new Date(),
    expectedDelivery,
    notes,
  }

  mockPurchaseOrders.unshift(newOrder)
  return newOrder
}

export const updateOrderStatus = (orderId: string, status: PurchaseOrder["status"], approvedBy?: string): void => {
  const order = mockPurchaseOrders.find((o) => o.id === orderId)
  if (order) {
    order.status = status
    if (status === "approved" && approvedBy) {
      order.approvedBy = approvedBy
      order.approvedAt = new Date()
    }
  }
}

export const generateOrderRecommendations = (inventoryItems: any[], forecasts: any[]): PurchaseOrderItem[] => {
  const recommendations: PurchaseOrderItem[] = []

  forecasts.forEach((forecast) => {
    if (forecast.riskLevel === "high" || forecast.daysUntilStockout <= 7) {
      const item = inventoryItems.find((i) => i.id === forecast.itemId)
      if (item) {
        recommendations.push({
          itemId: item.id,
          itemName: item.name,
          quantity: forecast.recommendedOrderQuantity,
          unitPrice: item.costPerUnit,
          totalPrice: forecast.recommendedOrderQuantity * item.costPerUnit,
          urgency: forecast.riskLevel === "high" ? "high" : "medium",
        })
      }
    }
  })

  return recommendations
}

// PDF Generation (mock implementation)
export const generatePurchaseOrderPDF = (order: PurchaseOrder): string => {
  // In a real implementation, this would use a PDF library like jsPDF or PDFKit
  // For now, we'll return a mock PDF URL
  const pdfContent = `
    PURCHASE ORDER
    
    Order Number: ${order.orderNumber}
    Date: ${order.createdAt.toLocaleDateString()}
    
    Supplier: ${order.supplierName}
    
    Items:
    ${order.items
      .map(
        (item) =>
          `${item.itemName} - Qty: ${item.quantity} - Unit Price: $${item.unitPrice} - Total: $${item.totalPrice}`,
      )
      .join("\n")}
    
    Subtotal: $${order.subtotal.toFixed(2)}
    Tax: $${order.tax.toFixed(2)}
    Total: $${order.total.toFixed(2)}
    
    Expected Delivery: ${order.expectedDelivery.toLocaleDateString()}
    
    ${order.notes ? `Notes: ${order.notes}` : ""}
  `

  // Create a blob URL for the PDF content (mock)
  const blob = new Blob([pdfContent], { type: "text/plain" })
  return URL.createObjectURL(blob)
}

export const sendOrderToSupplier = async (order: PurchaseOrder): Promise<boolean> => {
  // Mock email sending
  console.log(`Sending order ${order.orderNumber} to ${order.supplierName}`)

  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 1000))

  // Update order status
  updateOrderStatus(order.id, "sent")

  return true
}
