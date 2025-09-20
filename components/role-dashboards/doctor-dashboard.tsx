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
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Stethoscope,
  Package,
  AlertTriangle,
  Clock,
  Activity,
  FileText,
  Mic,
} from "lucide-react";
import { getInventoryItems, getStockAlerts } from "@/lib/inventory";
import { getPurchaseOrders } from "@/lib/purchase-orders";

export function DoctorDashboard() {
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const [items, stockAlerts, orders] = await Promise.all([
          getInventoryItems(),
          getStockAlerts(),
          getPurchaseOrders(),
        ]);
        if (!mounted) return;
        setInventoryItems(Array.isArray(items) ? items : []);
        setAlerts(Array.isArray(stockAlerts) ? stockAlerts : []);
        setRecentOrders((Array.isArray(orders) ? orders : []).slice(0, 3));
      } catch (e) {
        if (!mounted) return;
        setInventoryItems([]);
        setAlerts([]);
        setRecentOrders([]);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, []);

  // Mock patient-related data
  const patientSchedule = [
    {
      time: "09:00",
      patient: "John Smith",
      type: "Consultation",
      supplies: ["Gloves", "Stethoscope"],
    },
    {
      time: "10:30",
      patient: "Mary Johnson",
      type: "Check-up",
      supplies: ["Thermometer", "Gloves"],
    },
    {
      time: "14:00",
      patient: "Robert Davis",
      type: "Follow-up",
      supplies: ["Bandages", "Antiseptic"],
    },
    {
      time: "15:30",
      patient: "Sarah Wilson",
      type: "Consultation",
      supplies: ["Gloves", "Masks"],
    },
  ];

  const medicalSupplies = Array.isArray(inventoryItems) ? inventoryItems : [];

  const criticalSupplies = alerts.filter(
    (alert) => alert.status === "out-of-stock"
  );
  const lowSupplies = alerts.filter((alert) => alert.status === "low-stock");

  // Mock usage data for the week
  const weeklyUsage = [
    { day: "Mon", gloves: 15, masks: 8, syringes: 3 },
    { day: "Tue", gloves: 12, masks: 6, syringes: 5 },
    { day: "Wed", gloves: 18, masks: 10, syringes: 2 },
    { day: "Thu", gloves: 14, masks: 7, syringes: 4 },
    { day: "Fri", gloves: 16, masks: 9, syringes: 3 },
    { day: "Sat", gloves: 8, masks: 4, syringes: 1 },
    { day: "Sun", gloves: 6, masks: 3, syringes: 0 },
  ];

  return (
    <div className="space-y-6">
      {/* Doctor Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Today's Patients
            </CardTitle>
            <Stethoscope className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{patientSchedule.length}</div>
            <p className="text-xs text-muted-foreground">
              Scheduled appointments
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Available Supplies
            </CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{medicalSupplies.length}</div>
            <p className="text-xs text-muted-foreground">
              Medical supplies in stock
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Supply Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {criticalSupplies.length}
            </div>
            <p className="text-xs text-muted-foreground">
              {lowSupplies.length} running low
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Next Appointment
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {patientSchedule[0]?.time || "None"}
            </div>
            <p className="text-xs text-muted-foreground">
              {patientSchedule[0]?.patient || "No appointments"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Supply Alerts */}
      {alerts.length > 0 && (
        <Alert className="border-secondary/50 bg-secondary/10">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="flex items-center justify-between">
              <div>
                <strong>Supply Alert:</strong> {criticalSupplies.length}{" "}
                critical supplies need attention before your next appointments.
              </div>
              <Button variant="outline" size="sm">
                View Supplies
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's Schedule */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Today's Schedule
            </CardTitle>
            <CardDescription>
              Your patient appointments and required supplies
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {patientSchedule.map((appointment, index) => (
                <div key={index} className="border rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h4 className="font-medium">{appointment.patient}</h4>
                      <p className="text-sm text-muted-foreground">
                        {appointment.type}
                      </p>
                    </div>
                    <Badge variant="outline">{appointment.time}</Badge>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    <span className="text-xs text-muted-foreground">
                      Supplies needed:
                    </span>
                    {appointment.supplies.map((supply, idx) => (
                      <Badge key={idx} variant="secondary" className="text-xs">
                        {supply}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Weekly Supply Usage */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Weekly Supply Usage
            </CardTitle>
            <CardDescription>
              Your personal supply consumption patterns
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={weeklyUsage}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="gloves"
                  stroke="#164e63"
                  strokeWidth={2}
                  name="Gloves"
                />
                <Line
                  type="monotone"
                  dataKey="masks"
                  stroke="#a16207"
                  strokeWidth={2}
                  name="Masks"
                />
                <Line
                  type="monotone"
                  dataKey="syringes"
                  stroke="#dc2626"
                  strokeWidth={2}
                  name="Syringes"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mic className="h-5 w-5" />
              Voice Assistant
            </CardTitle>
            <CardDescription>Log supply usage quickly</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Use voice commands to log supply usage during patient visits.
            </p>
            <Button className="w-full">Start Voice Assistant</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Check Supplies
            </CardTitle>
            <CardDescription>View available medical supplies</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 mb-4">
              {medicalSupplies.slice(0, 3).map((item) => (
                <div key={item.id} className="flex justify-between text-sm">
                  <span>{item.name}</span>
                  <Badge
                    variant={
                      item.status === "in-stock" ? "default" : "destructive"
                    }
                  >
                    {item.currentStock} {item.unit}
                  </Badge>
                </div>
              ))}
            </div>
            <Button className="w-full bg-transparent" variant="outline">
              View All Supplies
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Recent Orders
            </CardTitle>
            <CardDescription>Your recent supply requests</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 mb-4">
              {recentOrders.map((order) => (
                <div key={order.id} className="flex justify-between text-sm">
                  <span>{order.orderNumber}</span>
                  <Badge variant="outline">{order.status}</Badge>
                </div>
              ))}
            </div>
            <Button className="w-full bg-transparent" variant="outline">
              View All Orders
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
