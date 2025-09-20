"use client"

import { useState, useEffect } from "react"
import { offlineStorage, isOnline, getLastSyncTime, setLastSyncTime } from "@/lib/offline-storage"

export function useOffline() {
  const [online, setOnline] = useState(isOnline())
  const [syncing, setSyncing] = useState(false)
  const [lastSync, setLastSync] = useState(getLastSyncTime())
  const [pendingChanges, setPendingChanges] = useState(0)

  useEffect(() => {
    const handleOnline = () => {
      setOnline(true)
      syncPendingChanges()
    }

    const handleOffline = () => setOnline(false)

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    // Check for pending changes on mount
    checkPendingChanges()

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [])

  const checkPendingChanges = async () => {
    try {
      const queue = await offlineStorage.getSyncQueue()
      setPendingChanges(queue.length)
    } catch (error) {
      console.error("Failed to check pending changes:", error)
    }
  }

  const syncPendingChanges = async () => {
    if (!online || syncing) return

    setSyncing(true)
    try {
      const queue = await offlineStorage.getSyncQueue()

      // Simulate API sync (in real app, this would sync with backend)
      for (const item of queue) {
        console.log("Syncing offline change:", item.action, item.data)
        // await syncToServer(item.action, item.data)
      }

      await offlineStorage.clearSyncQueue()
      const now = Date.now()
      setLastSyncTime(now)
      setLastSync(now)
      setPendingChanges(0)

      console.log("Offline sync completed successfully")
    } catch (error) {
      console.error("Sync failed:", error)
    } finally {
      setSyncing(false)
    }
  }

  const saveOfflineChange = async (action: string, data: any) => {
    try {
      await offlineStorage.addToSyncQueue(action, data)
      await checkPendingChanges()
      console.log("Saved offline change:", action)
    } catch (error) {
      console.error(" Failed to save offline change:", error)
    }
  }

  return {
    online,
    syncing,
    lastSync,
    pendingChanges,
    syncPendingChanges,
    saveOfflineChange,
    checkPendingChanges,
  }
}
