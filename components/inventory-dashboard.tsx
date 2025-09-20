"use client";

import { useState, useEffect, useMemo } from "react";
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
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [stockAdjustment, setStockAdjustment] = useState("");
  const [usageQuantity, setUsageQuantity] = useState("");
  const [usageNotes, setUsageNotes] = useState("");
  const { auth } = useAuth();
  const { online, saveOfflineChange } = useOffline();

  useEffect(() => {
    const loadInventoryData = async () => {
      try {
        let inventoryData: InventoryItem[];

        if (online) {
          // Load from API when online
          inventoryData = await getInventoryItems();
          // Save to offline storage
          await offlineStorage.saveInventory(inventoryData);
        } else {
          // Load from offline storage when offline
          inventoryData = await offlineStorage.getInventory();
          if (inventoryData.length === 0) {
            // Fallback to mock data if no offline data
            inventoryData = await getInventoryItems();
          }
        }

        setItems(inventoryData);
        setFilteredItems(inventoryData);
      } catch (error) {
        console.error("[v0] Failed to load inventory data:", error);
        // Fallback to mock data
        const inventoryData = await getInventoryItems();
        setItems(inventoryData);
        setFilteredItems(inventoryData);
      }
    };

    loadInventoryData();
  }, [online]);

  useEffect(() => {
    let filtered = items;

    if (searchTerm) {
      filtered = filtered.filter((item) => {
        const category = (item as any).category || "General";
        return (
          item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          category.toLowerCase().includes(searchTerm.toLowerCase())
        );
      });
    }

    if (categoryFilter !== "all") {
      filtered = filtered.filter(
        (item) => ((item as any).category || "General") === categoryFilter
      );
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((item) => item.status === statusFilter);
    }

    setFilteredItems(filtered);
  }, [items, searchTerm, categoryFilter, statusFilter]);

  const alerts = useMemo(
    () =>
      items.filter(
        (i) => i.status === "low-stock" || i.status === "out-of-stock"
      ),
    [items]
  );
  const categories = useMemo(
    () =>
      Array.from(new Set(items.map((i) => (i as any).category || "General"))),
    [items]
  );

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
        await updateStock(selectedItem.id, newStock);
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
        await logUsage(selectedItem.id, quantity, auth.user.name, usageNotes);
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
    (sum, item) => sum + item.currentStock * ((item as any).price || 10),
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

      <Alert className="border-red-600/20 bg-red-600/10 ">
        <div className="mr-2 flex items-center h-full">
          <AlertTriangle className="min-h-7 min-w-7 text-red-600" />
        </div>
        <AlertDescription className="text-red-600 ml-10 flex justify-between items-center">
          <div>
            <strong>{alerts.length} items</strong>
            <div>require attention: {alerts.length} low/out of stock</div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="bg-red-600 text-white hover:bg-red-400 cursor-pointer 
             ring-inset ring-[0.5px] ring-red-400 border-red-700"
          >
            Check Supplies
          </Button>
        </AlertDescription>
      </Alert>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-[#f1f1f1] py-4 overflow-hidden flex flex-col justify-between">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative">
            <CardTitle className="xl:text-xl text-lg font-lg tracking-tight">
              Total Items
            </CardTitle>
            <Package className="absolute min-h-40 min-w-40 top-0 2xl:left-[12rem] xl:left-[11vw] md:-right-10 right-0 opacity-30" />
          </CardHeader>
          <CardContent>
            <div className="xl:text-4xl text-xl font-bold">{items.length}</div>
            <p className="text-xs text-foreground">
              Across {categories.length} categories
            </p>
          </CardContent>
        </Card>

        <Card className="bg-yellow-600/10 py-4 border-yellow-600/20  overflow-hidden flex flex-col justify-between">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative">
            <CardTitle className="xl:text-xl text-lg font-lg tracking-tight text-yellow-400">
              Low Stock Alerts
            </CardTitle>
            <TrendingDown className="absolute min-h-40 min-w-40 text-yellow-600 top-0 2xl:left-[12rem] xl:left-[11vw] md:-right-10 right-0 opacity-30" />
          </CardHeader>
          <CardContent>
            <div className="xl:text-4xl text-xl font-bold text-yellow-400">
              {alerts.filter((item) => item.status === "low-stock").length}
            </div>
            <p className="text-xs text-foreground">Items below threshold</p>
          </CardContent>
        </Card>

        <Card className="bg-red-600/10 py-4 border-red-600/20  overflow-hidden flex flex-col justify-between">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative">
            <CardTitle className="xl:text-xl text-lg font-lg tracking-tight text-red-400">
              Out of Stock
            </CardTitle>
            <AlertTriangle className="absolute min-h-40 min-w-40 text-red-600 top-0 2xl:left-[12rem] xl:left-[11vw] md:-right-10 right-0 opacity-30 scale-x-[-1]" />
          </CardHeader>
          <CardContent>
            <div className="xl:text-4xl text-xl font-bold text-red-400">
              {alerts.filter((item) => item.status === "out-of-stock").length}
            </div>
            <p className="text-xs text-foreground">Items need reordering</p>
          </CardContent>
        </Card>

        <Card className="bg-sky-600/10 py-4 border-sky-600/20  overflow-hidden flex flex-col justify-between">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative">
            <CardTitle className="xl:text-xl text-lg font-lg tracking-tight text-sky-400">
              Total Value
            </CardTitle>
            <TrendingUp className="absolute min-h-40 min-w-40 text-sky-600 top-0 2xl:left-[12rem] xl:left-[11vw] md:-right-10 right-0 opacity-30 scale-x-[-1]" />
          </CardHeader>
          <CardContent>
            <div className="xl:text-4xl text-xl font-bold text-sky-400">
              ${totalValue.toFixed(2)}
            </div>
            <p className="text-xs text-foreground">Current inventory value</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle className="font-bold text-xl">
            Inventory Management
          </CardTitle>
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
                  className="pl-8 bg-white"
                />
              </div>
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full sm:w-[180px] bg-white">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px] bg-white">
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
          <div className="rounded-md border bg-white overflow-x-scroll max-w-[80vw]">
            <Table className="">
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Current Stock</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Last Restocked</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell>{(item as any).category || "General"}</TableCell>
                    <TableCell>
                      {item.currentStock} {item.unit}
                      <div className="text-xs text-muted-foreground">
                        Min: {item.minStock} {item.unit}
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(item.status)}</TableCell>
                    <TableCell>{(item as any).location || "-"}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        {(() => {
                          const lu = (item as any).lastUpdated;
                          return lu ? new Date(lu).toLocaleDateString() : "-";
                        })()}
                      </div>
                    </TableCell>
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
