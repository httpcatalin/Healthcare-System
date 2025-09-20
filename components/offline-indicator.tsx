"use client"

import { useOffline } from "@/hooks/use-offline"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Wifi, WifiOff, RefreshCw, Clock, AlertCircle, CheckCircle2 } from "lucide-react"
import { formatLastSync } from "@/lib/offline-storage"

export function OfflineIndicator() {
  const { online, syncing, lastSync, pendingChanges, syncPendingChanges } = useOffline()

  if (online && pendingChanges === 0) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Badge variant="secondary" className="bg-primary/30 text-primary border-primary/50 font-semibold">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Online
        </Badge>
      </div>
    )
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Card className="w-80 shadow-lg border-2 border-border/50 bg-card/95 backdrop-blur-sm">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              {online ? <Wifi className="h-4 w-4 text-primary" /> : <WifiOff className="h-4 w-4 text-destructive" />}
              <span className="font-semibold text-sm text-foreground">{online ? "Online" : "Offline"}</span>
            </div>
            <Badge variant={online ? "secondary" : "destructive"} className="text-xs font-semibold">
              {online ? "Connected" : "Disconnected"}
            </Badge>
          </div>

          {pendingChanges > 0 && (
            <div className="flex items-center gap-2 mb-3 p-2 bg-accent/20 rounded-lg border border-accent/30">
              <AlertCircle className="h-4 w-4 text-accent" />
              <span className="text-sm font-medium text-foreground">{pendingChanges} pending changes</span>
            </div>
          )}

          <div className="flex items-center justify-between text-xs text-foreground mb-3">
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>Last sync: {formatLastSync(lastSync)}</span>
            </div>
          </div>

          {online && pendingChanges > 0 && (
            <Button onClick={syncPendingChanges} disabled={syncing} size="sm" className="w-full">
              {syncing ? (
                <>
                  <RefreshCw className="h-3 w-3 mr-2 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <RefreshCw className="h-3 w-3 mr-2" />
                  Sync Now
                </>
              )}
            </Button>
          )}

          {!online && (
            <div className="text-xs text-foreground bg-muted/80 p-2 rounded border">
              Changes will be saved locally and synced when connection is restored.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
