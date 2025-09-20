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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Package,
  AlertTriangle,
  Plus,
  Minus,
  Search,
  TrendingDown,
  TrendingUp,
  Clock,
  WifiOff,
} from "lucide-react";
import {
  getInventoryItems,
  getStockAlerts,
  updateStock,
  logUsage,
  type InventoryItem,
} from "@/lib/inventory";
import { useAuth } from "@/hooks/use-auth";
import { useOffline } from "@/hooks/use-offline";
import { offlineStorage } from "@/lib/offline-storage";

export function InventoryDashboard() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<InventoryItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [stockAdjustment, setStockAdjustment] = useState("");
  const [usageQuantity, setUsageQuantity] = useState("");
  const [usageNotes, setUsageNotes] = useState("");
  const [alerts, setAlerts] = useState<InventoryItem[]>([]);

  const { auth } = useAuth();
  const { online, saveOfflineChange } = useOffline();

  useEffect(() => {
    const loadInventoryData = async () => {
      try {
        let inventoryData: InventoryItem[];

        if (online) {
          inventoryData = await getInventoryItems();
          await offlineStorage.saveInventory(inventoryData);
        } else {
          inventoryData = await offlineStorage.getInventory();
          if (inventoryData.length === 0) {
            inventoryData = await getInventoryItems();
          }
        }

        setItems(inventoryData);
        setFilteredItems(inventoryData);

        const alertsData = await getStockAlerts();
        setAlerts(alertsData);
      } catch (error) {
        console.error("[v0] Failed to load inventory data:", error);
        const inventoryData = await getInventoryItems();
        setItems(inventoryData);
        setFilteredItems(inventoryData);
        setAlerts([]);
      }
    };

    loadInventoryData();
  }, [online]);

  useEffect(() => {
    let filtered = items;

    if (searchTerm) {
      filtered = filtered.filter(
        (item) =>
          item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          item.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((item) => item.status === statusFilter);
    }

    setFilteredItems(filtered);
  }, [items, searchTerm, statusFilter]);

  const getStatusBadge = (status: InventoryItem["status"]) => {
    const variants = {
      "in-stock": "default",
      "low-stock": "secondary",
      "out-of-stock": "destructive",
      expired: "destructive",
    } as const;

    const labels = {
      "in-stock": "In Stock",
      "low-stock": "Low Stock",
      "out-of-stock": "Out of Stock",
      expired: "Expired",
    };

    return <Badge variant={variants[status]}>{labels[status]}</Badge>;
  };

  const handleStockUpdate = async () => {
    if (selectedItem && stockAdjustment) {
      const newStock = Number.parseInt(stockAdjustment);

      if (online) {
        updateStock(selectedItem.id, newStock);
      } else {
        // Save change for offline sync
        await saveOfflineChange("updateStock", {
          itemId: selectedItem.id,
          newStock,
          timestamp: Date.now(),
        });
      }

      // Update local state immediately
      const updatedItems = items.map((item) =>
        item.id === selectedItem.id
          ? {
              ...item,
              currentStock: newStock,
              status: (newStock <= item.minStock
                ? "low-stock"
                : "in-stock") as InventoryItem["status"],
            }
          : item
      );
      setItems(updatedItems);

      setStockAdjustment("");
      setSelectedItem(null);
    }
  };

  const handleUsageLog = async () => {
    if (selectedItem && usageQuantity && auth.user) {
      const quantity = Number.parseInt(usageQuantity);

      if (online) {
        logUsage(selectedItem.id, quantity, auth.user.name, usageNotes);
      } else {
        // Save change for offline sync
        await saveOfflineChange("logUsage", {
          itemId: selectedItem.id,
          quantity,
          userName: auth.user.name,
          notes: usageNotes,
          timestamp: Date.now(),
        });
      }

      // Update local state immediately
      const newStock = selectedItem.currentStock - quantity;
      const updatedItems = items.map((item) =>
        item.id === selectedItem.id
          ? {
              ...item,
              currentStock: Math.max(0, newStock),
              status: (newStock <= 0
                ? "out-of-stock"
                : newStock <= item.minStock
                ? "low-stock"
                : "in-stock") as InventoryItem["status"],
            }
          : item
      );
      setItems(updatedItems);

      setUsageQuantity("");
      setUsageNotes("");
      setSelectedItem(null);
    }
  };

  const totalValue = items.reduce(
    (sum, item) => sum + item.currentStock * 10,
    0
  );

  return (
    <div className="space-y-6">
      {!online && (
        <Alert className="border-accent/50 bg-accent/10">
          <WifiOff className="h-4 w-4" />
          <AlertDescription>
            <strong>Offline Mode:</strong> Changes will be saved locally and
            synced when connection is restored.
          </AlertDescription>
        </Alert>
      )}

      {/* Alerts Section */}
      {alerts.length > 0 && (
        <Alert className="border-destructive/50 bg-destructive/10">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>{alerts.length} items</strong> require attention:{" "}
            {alerts.length} low/out of stock
          </AlertDescription>
        </Alert>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Items</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{items.length}</div>
            <p className="text-xs text-muted-foreground">In inventory</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Low Stock Alerts
            </CardTitle>
            <TrendingDown className="h-4 w-4 text-secondary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-secondary">
              {alerts.filter((item) => item.status === "low-stock").length}
            </div>
            <p className="text-xs text-muted-foreground">
              Items below threshold
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Out of Stock</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {alerts.filter((item) => item.status === "out-of-stock").length}
            </div>
            <p className="text-xs text-muted-foreground">
              Items need reordering
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalValue.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              Current inventory value
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle>Inventory Management</CardTitle>
          <CardDescription>
            Track and manage your medical supplies and equipment
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search items..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="in-stock">In Stock</SelectItem>
                <SelectItem value="low-stock">Low Stock</SelectItem>
                <SelectItem value="out-of-stock">Out of Stock</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Inventory Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Current Stock</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell>
                      {item.currentStock} {item.unit}
                      <div className="text-xs text-muted-foreground">
                        Min: {item.minStock} {item.unit}
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(item.status)}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedItem(item)}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>
                                Update Stock - {item.name}
                              </DialogTitle>
                              <DialogDescription>
                                Adjust the current stock level for this item.
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <Label htmlFor="stock">New Stock Level</Label>
                                <Input
                                  id="stock"
                                  type="number"
                                  placeholder={`Current: ${item.currentStock} ${item.unit}`}
                                  value={stockAdjustment}
                                  onChange={(e) =>
                                    setStockAdjustment(e.target.value)
                                  }
                                />
                              </div>
                            </div>
                            <DialogFooter>
                              <Button onClick={handleStockUpdate}>
                                Update Stock
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>

                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedItem(item)}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Log Usage - {item.name}</DialogTitle>
                              <DialogDescription>
                                Record usage of this item and update stock
                                levels.
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <Label htmlFor="quantity">Quantity Used</Label>
                                <Input
                                  id="quantity"
                                  type="number"
                                  placeholder={`Available: ${item.currentStock} ${item.unit}`}
                                  value={usageQuantity}
                                  onChange={(e) =>
                                    setUsageQuantity(e.target.value)
                                  }
                                />
                              </div>
                              <div>
                                <Label htmlFor="notes">Notes (Optional)</Label>
                                <Input
                                  id="notes"
                                  placeholder="e.g., Patient examination, routine procedure"
                                  value={usageNotes}
                                  onChange={(e) =>
                                    setUsageNotes(e.target.value)
                                  }
                                />
                              </div>
                            </div>
                            <DialogFooter>
                              <Button onClick={handleUsageLog}>
                                Log Usage
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
