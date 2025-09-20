"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FileText, Plus, Send, Download, CheckCircle, Clock, AlertTriangle, DollarSign, Package } from "lucide-react"
import {
  getPurchaseOrders,
  getSuppliers,
  createPurchaseOrder,
  updateOrderStatus,
  generateOrderRecommendations,
  generatePurchaseOrderPDF,
  sendOrderToSupplier,
  type PurchaseOrder,
  type PurchaseOrderItem,
  type Supplier,
} from "@/lib/purchase-orders"
import { getInventoryItems } from "@/lib/inventory"
import { getForecastingEngine } from "@/lib/forecasting"
import { useAuth } from "@/hooks/use-auth"

export function PurchaseOrders() {
  const [orders, setOrders] = useState<PurchaseOrder[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [recommendations, setRecommendations] = useState<PurchaseOrderItem[]>([])
  const [isCreatingOrder, setIsCreatingOrder] = useState(false)
  const [selectedSupplier, setSelectedSupplier] = useState("")
  const [orderItems, setOrderItems] = useState<PurchaseOrderItem[]>([])
  const [orderNotes, setOrderNotes] = useState("")
  const [newItemName, setNewItemName] = useState("")
  const [newItemQuantity, setNewItemQuantity] = useState("")
  const [newItemPrice, setNewItemPrice] = useState("")
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null)
  const { auth } = useAuth()

  useEffect(() => {
    setOrders(getPurchaseOrders())
    setSuppliers(getSuppliers())

    // Generate recommendations
    const inventoryItems = getInventoryItems()
    const forecastingEngine = getForecastingEngine()
    const forecasts = inventoryItems.map((item) =>
      forecastingEngine.generateForecast(item.id, item.name, item.currentStock, item.minThreshold),
    )
    const recs = generateOrderRecommendations(inventoryItems, forecasts)
    setRecommendations(recs)
  }, [])

  const getStatusBadge = (status: PurchaseOrder["status"]) => {
    const variants = {
      draft: "secondary",
      pending: "default",
      approved: "default",
      sent: "default",
      received: "default",
      cancelled: "destructive",
    } as const

    const colors = {
      draft: "bg-gray-100 text-gray-800",
      pending: "bg-yellow-100 text-yellow-800",
      approved: "bg-blue-100 text-blue-800",
      sent: "bg-purple-100 text-purple-800",
      received: "bg-green-100 text-green-800",
      cancelled: "bg-red-100 text-red-800",
    }

    return <Badge className={colors[status]}>{status.toUpperCase()}</Badge>
  }

  const getUrgencyBadge = (urgency: "low" | "medium" | "high") => {
    const colors = {
      low: "bg-green-100 text-green-800",
      medium: "bg-yellow-100 text-yellow-800",
      high: "bg-red-100 text-red-800",
    }

    return <Badge className={colors[urgency]}>{urgency.toUpperCase()}</Badge>
  }

  const addItemToOrder = () => {
    if (newItemName && newItemQuantity && newItemPrice) {
      const quantity = Number.parseInt(newItemQuantity)
      const unitPrice = Number.parseFloat(newItemPrice)
      const totalPrice = quantity * unitPrice

      const newItem: PurchaseOrderItem = {
        itemId: Date.now().toString(),
        itemName: newItemName,
        quantity,
        unitPrice,
        totalPrice,
        urgency: "medium",
      }

      setOrderItems([...orderItems, newItem])
      setNewItemName("")
      setNewItemQuantity("")
      setNewItemPrice("")
    }
  }

  const removeItemFromOrder = (index: number) => {
    setOrderItems(orderItems.filter((_, i) => i !== index))
  }

  const createOrder = () => {
    if (selectedSupplier && orderItems.length > 0 && auth.user) {
      const newOrder = createPurchaseOrder(orderItems, selectedSupplier, auth.user.name, orderNotes)
      setOrders(getPurchaseOrders())
      setIsCreatingOrder(false)
      setOrderItems([])
      setOrderNotes("")
      setSelectedSupplier("")
    }
  }

  const approveOrder = (orderId: string) => {
    if (auth.user) {
      updateOrderStatus(orderId, "approved", auth.user.name)
      setOrders(getPurchaseOrders())
    }
  }

  const sendOrder = async (order: PurchaseOrder) => {
    try {
      await sendOrderToSupplier(order)
      setOrders(getPurchaseOrders())
    } catch (error) {
      console.error("Failed to send order:", error)
    }
  }

  const downloadPDF = (order: PurchaseOrder) => {
    const pdfUrl = generatePurchaseOrderPDF(order)
    const link = document.createElement("a")
    link.href = pdfUrl
    link.download = `${order.orderNumber}.txt`
    link.click()
  }

  const addRecommendationToOrder = (recommendation: PurchaseOrderItem) => {
    setOrderItems([...orderItems, { ...recommendation }])
  }

  const totalOrderValue = orders.reduce((sum, order) => sum + order.total, 0)
  const pendingOrders = orders.filter((order) => order.status === "pending" || order.status === "approved").length

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{orders.length}</div>
            <p className="text-xs text-muted-foreground">All time orders</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Orders</CardTitle>
            <Clock className="h-4 w-4 text-secondary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-secondary">{pendingOrders}</div>
            <p className="text-xs text-muted-foreground">Awaiting processing</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalOrderValue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">All orders value</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recommendations</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{recommendations.length}</div>
            <p className="text-xs text-muted-foreground">AI suggested orders</p>
          </CardContent>
        </Card>
      </div>

      {/* AI Recommendations Alert */}
      {recommendations.length > 0 && (
        <Alert className="border-secondary/50 bg-secondary/10">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>AI Recommendations:</strong> {recommendations.length} items are recommended for reordering based on
            current stock levels and usage forecasts.
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="orders" className="space-y-4">
        <TabsList>
          <TabsTrigger value="orders">Purchase Orders</TabsTrigger>
          <TabsTrigger value="recommendations">AI Recommendations</TabsTrigger>
          <TabsTrigger value="suppliers">Suppliers</TabsTrigger>
        </TabsList>

        <TabsContent value="orders" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Purchase Orders</CardTitle>
                  <CardDescription>Manage and track your purchase orders</CardDescription>
                </div>
                <Dialog open={isCreatingOrder} onOpenChange={setIsCreatingOrder}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="mr-2 h-4 w-4" />
                      Create Order
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Create Purchase Order</DialogTitle>
                      <DialogDescription>
                        Add items and select a supplier for your new purchase order.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="supplier">Supplier</Label>
                        <Select value={selectedSupplier} onValueChange={setSelectedSupplier}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select supplier" />
                          </SelectTrigger>
                          <SelectContent>
                            {suppliers.map((supplier) => (
                              <SelectItem key={supplier.id} value={supplier.id}>
                                {supplier.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid grid-cols-4 gap-2">
                        <div>
                          <Label htmlFor="itemName">Item Name</Label>
                          <Input
                            id="itemName"
                            value={newItemName}
                            onChange={(e) => setNewItemName(e.target.value)}
                            placeholder="Item name"
                          />
                        </div>
                        <div>
                          <Label htmlFor="quantity">Quantity</Label>
                          <Input
                            id="quantity"
                            type="number"
                            value={newItemQuantity}
                            onChange={(e) => setNewItemQuantity(e.target.value)}
                            placeholder="Qty"
                          />
                        </div>
                        <div>
                          <Label htmlFor="price">Unit Price</Label>
                          <Input
                            id="price"
                            type="number"
                            step="0.01"
                            value={newItemPrice}
                            onChange={(e) => setNewItemPrice(e.target.value)}
                            placeholder="Price"
                          />
                        </div>
                        <div className="flex items-end">
                          <Button onClick={addItemToOrder}>Add Item</Button>
                        </div>
                      </div>

                      {orderItems.length > 0 && (
                        <div>
                          <h4 className="font-medium mb-2">Order Items</h4>
                          <div className="border rounded-lg">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Item</TableHead>
                                  <TableHead>Quantity</TableHead>
                                  <TableHead>Unit Price</TableHead>
                                  <TableHead>Total</TableHead>
                                  <TableHead>Actions</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {orderItems.map((item, index) => (
                                  <TableRow key={index}>
                                    <TableCell>{item.itemName}</TableCell>
                                    <TableCell>{item.quantity}</TableCell>
                                    <TableCell>${item.unitPrice.toFixed(2)}</TableCell>
                                    <TableCell>${item.totalPrice.toFixed(2)}</TableCell>
                                    <TableCell>
                                      <Button variant="outline" size="sm" onClick={() => removeItemFromOrder(index)}>
                                        Remove
                                      </Button>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                          <div className="mt-2 text-right">
                            <p className="font-medium">
                              Total: ${orderItems.reduce((sum, item) => sum + item.totalPrice, 0).toFixed(2)}
                            </p>
                          </div>
                        </div>
                      )}

                      <div>
                        <Label htmlFor="notes">Notes (Optional)</Label>
                        <Textarea
                          id="notes"
                          value={orderNotes}
                          onChange={(e) => setOrderNotes(e.target.value)}
                          placeholder="Additional notes for this order"
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button onClick={createOrder} disabled={!selectedSupplier || orderItems.length === 0}>
                        Create Order
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order Number</TableHead>
                      <TableHead>Supplier</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Expected Delivery</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-medium">{order.orderNumber}</TableCell>
                        <TableCell>{order.supplierName}</TableCell>
                        <TableCell>{getStatusBadge(order.status)}</TableCell>
                        <TableCell>${order.total.toFixed(2)}</TableCell>
                        <TableCell>{order.createdAt.toLocaleDateString()}</TableCell>
                        <TableCell>{order.expectedDelivery.toLocaleDateString()}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => downloadPDF(order)}>
                              <Download className="h-3 w-3" />
                            </Button>
                            {order.status === "pending" && auth.user?.role === "admin" && (
                              <Button variant="outline" size="sm" onClick={() => approveOrder(order.id)}>
                                <CheckCircle className="h-3 w-3" />
                              </Button>
                            )}
                            {order.status === "approved" && (
                              <Button variant="outline" size="sm" onClick={() => sendOrder(order)}>
                                <Send className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recommendations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>AI Order Recommendations</CardTitle>
              <CardDescription>
                Items recommended for reordering based on current stock and usage patterns
              </CardDescription>
            </CardHeader>
            <CardContent>
              {recommendations.length === 0 ? (
                <div className="text-center py-8">
                  <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No recommendations at this time</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {recommendations.map((rec, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{rec.itemName}</h4>
                          {getUrgencyBadge(rec.urgency)}
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => addRecommendationToOrder(rec)}
                          disabled={isCreatingOrder}
                        >
                          Add to Order
                        </Button>
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="font-medium">Recommended Quantity:</span>
                          <div>{rec.quantity} units</div>
                        </div>
                        <div>
                          <span className="font-medium">Unit Price:</span>
                          <div>${rec.unitPrice.toFixed(2)}</div>
                        </div>
                        <div>
                          <span className="font-medium">Total Cost:</span>
                          <div>${rec.totalPrice.toFixed(2)}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="suppliers" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Suppliers</CardTitle>
              <CardDescription>Manage your supplier information and contacts</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {suppliers.map((supplier) => (
                  <Card key={supplier.id}>
                    <CardContent className="pt-4">
                      <h4 className="font-medium mb-2">{supplier.name}</h4>
                      <div className="space-y-1 text-sm text-muted-foreground">
                        <p>{supplier.email}</p>
                        <p>{supplier.phone}</p>
                        <p>{supplier.address}</p>
                        <div className="flex justify-between pt-2">
                          <span>Lead Time:</span>
                          <span>{supplier.leadTimeDays} days</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Min Order:</span>
                          <span>${supplier.minimumOrder}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Payment:</span>
                          <span>{supplier.paymentTerms}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
