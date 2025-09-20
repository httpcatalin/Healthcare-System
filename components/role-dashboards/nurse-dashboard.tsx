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
import { Progress } from "@/components/ui/progress";
import {
  Heart,
  Package,
  AlertTriangle,
  Clock,
  Activity,
  Plus,
  Minus,
} from "lucide-react";
import { getInventoryItems, getStockAlerts } from "@/lib/inventory";

export function NurseDashboard() {
  const [inventoryItems, setInventoryItems] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const [items, stockAlerts] = await Promise.all([
          getInventoryItems(),
          getStockAlerts(),
        ]);
        if (!mounted) return;
        setInventoryItems(Array.isArray(items) ? items : []);
        setAlerts(Array.isArray(stockAlerts) ? stockAlerts : []);
      } catch (e) {
        if (!mounted) return;
        setInventoryItems([]);
        setAlerts([]);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, []);

  // Mock shift data
  const shiftInfo = {
    startTime: "07:00",
    endTime: "19:00",
    patientsAssigned: 8,
    tasksCompleted: 12,
    totalTasks: 15,
  };

  // Mock patient care data
  const patientCare = [
    {
      room: "101",
      patient: "Alice Brown",
      condition: "Stable",
      supplies: ["Gloves", "Bandages"],
    },
    {
      room: "102",
      patient: "Tom Wilson",
      condition: "Monitoring",
      supplies: ["Thermometer", "Masks"],
    },
    {
      room: "103",
      patient: "Lisa Garcia",
      condition: "Recovery",
      supplies: ["Antiseptic", "Gloves"],
    },
    {
      room: "104",
      patient: "Mike Johnson",
      condition: "Stable",
      supplies: ["Syringes", "Gloves"],
    },
  ];

  const criticalSupplies = alerts.filter(
    (alert) => alert.status === "out-of-stock"
  );
  const lowSupplies = alerts.filter((alert) => alert.status === "low-stock");

  // Most used supplies by nurses
  const nursingSupplies = Array.isArray(inventoryItems) ? inventoryItems : [];

  const getConditionBadge = (condition: string) => {
    const variants = {
      Stable: "bg-green-100 text-green-800",
      Monitoring: "bg-yellow-100 text-yellow-800",
      Recovery: "bg-blue-100 text-blue-800",
      Critical: "bg-red-100 text-red-800",
    };
    return (
      <Badge className={variants[condition as keyof typeof variants] || ""}>
        {condition}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Nurse Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Assigned Patients
            </CardTitle>
            <Heart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {shiftInfo.patientsAssigned}
            </div>
            <p className="text-xs text-muted-foreground">
              Current shift patients
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Shift Progress
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {shiftInfo.tasksCompleted}/{shiftInfo.totalTasks}
            </div>
            <Progress
              value={(shiftInfo.tasksCompleted / shiftInfo.totalTasks) * 100}
              className="mt-2"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Tasks completed
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
            <CardTitle className="text-sm font-medium">Shift Time</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {shiftInfo.startTime} - {shiftInfo.endTime}
            </div>
            <p className="text-xs text-muted-foreground">12-hour shift</p>
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
                critical supplies need restocking for patient care.
              </div>
              <Button variant="outline" size="sm">
                Check Supplies
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Patient Care Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Heart className="h-5 w-5" />
              Patient Care Overview
            </CardTitle>
            <CardDescription>
              Your assigned patients and required supplies
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {patientCare.map((patient, index) => (
                <div key={index} className="border rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h4 className="font-medium">
                        Room {patient.room} - {patient.patient}
                      </h4>
                      <div className="flex items-center gap-2 mt-1">
                        {getConditionBadge(patient.condition)}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    <span className="text-xs text-muted-foreground">
                      Supplies needed:
                    </span>
                    {patient.supplies.map((supply, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        {supply}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quick Supply Access */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Quick Supply Access
            </CardTitle>
            <CardDescription>Frequently used nursing supplies</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {nursingSupplies.slice(0, 6).map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-2 border rounded"
                >
                  <div className="flex-1">
                    <h4 className="font-medium text-sm">{item.name}</h4>
                    <p className="text-xs text-muted-foreground">
                      {item.currentStock} {item.unit} available
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        item.status === "in-stock" ? "default" : "destructive"
                      }
                      className="text-xs"
                    >
                      {item.status === "in-stock" ? "Available" : "Low"}
                    </Badge>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-6 w-6 p-0 bg-transparent"
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-6 w-6 p-0 bg-transparent"
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Log Supply Usage</CardTitle>
            <CardDescription>
              Record supplies used during patient care
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Quickly log supplies used for accurate inventory tracking.
            </p>
            <Button className="w-full">Log Usage</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Request Supplies</CardTitle>
            <CardDescription>
              Request additional supplies for your shift
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Submit requests for supplies running low.
            </p>
            <Button className="w-full bg-transparent" variant="outline">
              Make Request
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Shift Handover</CardTitle>
            <CardDescription>Prepare handover notes</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Document patient status and supply usage.
            </p>
            <Button className="w-full bg-transparent" variant="outline">
              Create Notes
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
