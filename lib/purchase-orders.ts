export interface Supplier {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  paymentTerms: string;
  leadTimeDays: number;
  minimumOrder: number;
}

export interface PurchaseOrderItem {
  itemId: string;
  itemName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  urgency: "low" | "medium" | "high";
}

export interface PurchaseOrder {
  id: string;
  orderNumber: string;
  supplierId: string;
  supplierName: string;
  status: "draft" | "pending" | "approved" | "sent" | "received" | "cancelled";
  items: PurchaseOrderItem[];
  subtotal: number;
  tax: number;
  total: number;
  createdBy: string;
  createdAt: Date;
  expectedDelivery: Date;
  notes?: string;
  approvedBy?: string;
  approvedAt?: Date;
}
const API_BASE = "http://localhost:8000/api";

export const getOrdersBootstrap = async (): Promise<{
  suppliers: Supplier[];
  orders: PurchaseOrder[];
  recommendations: PurchaseOrderItem[];
}> => {
  try {
    const res = await fetch(`${API_BASE}/orders-bootstrap`);
    if (!res.ok) throw new Error("Failed to fetch orders bootstrap");
    const data = await res.json();
    return {
      suppliers: (data.suppliers || []).map((s: any) => ({
        id: s.id,
        name: s.name,
        email: s.email ?? "",
        phone: s.phone ?? "",
        address: s.address ?? "",
        paymentTerms: s.paymentTerms ?? "NET 30",
        leadTimeDays: s.leadTimeDays ?? 7,
        minimumOrder: s.minimumOrder ?? 0,
      })),
      orders: (data.orders || []).map((o: any) => ({
        ...o,
        createdAt: new Date(o.createdAt),
        expectedDelivery: new Date(o.expectedDelivery),
        approvedAt: o.approvedAt ? new Date(o.approvedAt) : undefined,
      })),
      recommendations: data.recommendations || [],
    };
  } catch (e) {
    console.error("getOrdersBootstrap error", e);
    return { suppliers: [], orders: [], recommendations: [] };
  }
};

export const getSuppliers = async (): Promise<Supplier[]> => {
  try {
    const res = await fetch(`${API_BASE}/suppliers`);
    if (!res.ok) throw new Error("Failed to fetch suppliers");
    const data = await res.json();
    return data.suppliers || [];
  } catch (e) {
    console.error("getSuppliers error", e);
    return [];
  }
};

export const getPurchaseOrders = async (): Promise<PurchaseOrder[]> => {
  try {
    const res = await fetch(`${API_BASE}/purchase-orders`);
    if (!res.ok) throw new Error("Failed to fetch orders");
    const data = await res.json();
    return (data.orders || []).map((o: any) => ({
      ...o,
      createdAt: new Date(o.createdAt),
      expectedDelivery: new Date(o.expectedDelivery),
      approvedAt: o.approvedAt ? new Date(o.approvedAt) : undefined,
    }));
  } catch (e) {
    console.error("getPurchaseOrders error", e);
    return [];
  }
};

export const createPurchaseOrder = async (
  items: PurchaseOrderItem[],
  supplierId: string,
  createdBy: string,
  notes?: string
): Promise<PurchaseOrder | null> => {
  try {
    const res = await fetch(`${API_BASE}/purchase-orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items, supplierId, createdBy, notes }),
    });
    if (!res.ok) throw new Error("Failed to create order");
    const data = await res.json();
    const o = data.order;
    return {
      ...o,
      createdAt: new Date(o.createdAt),
      expectedDelivery: new Date(o.expectedDelivery),
      approvedAt: o.approvedAt ? new Date(o.approvedAt) : undefined,
    };
  } catch (e) {
    console.error("createPurchaseOrder error", e);
    return null;
  }
};

export const updateOrderStatus = async (
  orderId: string,
  status: PurchaseOrder["status"],
  approvedBy?: string
): Promise<boolean> => {
  try {
    const res = await fetch(`${API_BASE}/purchase-orders/${orderId}/status`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, approvedBy }),
    });
    return res.ok;
  } catch (e) {
    console.error("updateOrderStatus error", e);
    return false;
  }
};

export const generateOrderRecommendations = (
  inventoryItems: any[],
  forecasts: any[]
): PurchaseOrderItem[] => {
  const recommendations: PurchaseOrderItem[] = [];
  forecasts.forEach((forecast) => {
    if (forecast.riskLevel === "high" || forecast.daysUntilStockout <= 7) {
      const item = inventoryItems.find((i) => i.id === forecast.itemId);
      if (item) {
        const unitPrice = item.costPerUnit ?? 10;
        recommendations.push({
          itemId: item.id,
          itemName: item.name,
          quantity: forecast.recommendedOrderQuantity,
          unitPrice,
          totalPrice: forecast.recommendedOrderQuantity * unitPrice,
          urgency: forecast.riskLevel === "high" ? "high" : "medium",
        });
      }
    }
  });
  return recommendations;
};

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
          `${item.itemName} - Qty: ${item.quantity} - Unit Price: $${item.unitPrice} - Total: $${item.totalPrice}`
      )
      .join("\n")}
    
    Subtotal: $${order.subtotal.toFixed(2)}
    Tax: $${order.tax.toFixed(2)}
    Total: $${order.total.toFixed(2)}
    
    Expected Delivery: ${order.expectedDelivery.toLocaleDateString()}
    
    ${order.notes ? `Notes: ${order.notes}` : ""}
  `;

  // Create a blob URL for the PDF content (mock)
  const blob = new Blob([pdfContent], { type: "text/plain" });
  return URL.createObjectURL(blob);
};

export const sendOrderToSupplier = async (
  order: PurchaseOrder
): Promise<boolean> => {
  // In a full implementation, there would be an email service.
  // For now, just mark as sent.
  return updateOrderStatus(order.id, "sent");
};
