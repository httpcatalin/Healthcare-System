interface OfflineData {
  inventory: any[]
  usageLogs: any[]
  purchaseOrders: any[]
  lastSync: number
}

class OfflineStorage {
  private dbName = "healthcare-rm-db"
  private version = 1
  private db: IDBDatabase | null = null

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        this.db = request.result
        resolve()
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result

        // Create object stores
        if (!db.objectStoreNames.contains("inventory")) {
          const inventoryStore = db.createObjectStore("inventory", { keyPath: "id" })
          inventoryStore.createIndex("category", "category", { unique: false })
        }

        if (!db.objectStoreNames.contains("usageLogs")) {
          const usageStore = db.createObjectStore("usageLogs", { keyPath: "id" })
          usageStore.createIndex("timestamp", "timestamp", { unique: false })
        }

        if (!db.objectStoreNames.contains("purchaseOrders")) {
          const ordersStore = db.createObjectStore("purchaseOrders", { keyPath: "id" })
          ordersStore.createIndex("status", "status", { unique: false })
        }

        if (!db.objectStoreNames.contains("syncQueue")) {
          db.createObjectStore("syncQueue", { keyPath: "id", autoIncrement: true })
        }
      }
    })
  }

  async saveInventory(inventory: any[]): Promise<void> {
    if (!this.db) await this.init()

    const transaction = this.db!.transaction(["inventory"], "readwrite")
    const store = transaction.objectStore("inventory")

    // Clear existing data
    await store.clear()

    // Add new data
    for (const item of inventory) {
      await store.add(item)
    }
  }

  async getInventory(): Promise<any[]> {
    if (!this.db) await this.init()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(["inventory"], "readonly")
      const store = transaction.objectStore("inventory")
      const request = store.getAll()

      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  async addToSyncQueue(action: string, data: any): Promise<void> {
    if (!this.db) await this.init()

    const transaction = this.db!.transaction(["syncQueue"], "readwrite")
    const store = transaction.objectStore("syncQueue")

    await store.add({
      action,
      data,
      timestamp: Date.now(),
    })
  }

  async getSyncQueue(): Promise<any[]> {
    if (!this.db) await this.init()

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(["syncQueue"], "readonly")
      const store = transaction.objectStore("syncQueue")
      const request = store.getAll()

      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  async clearSyncQueue(): Promise<void> {
    if (!this.db) await this.init()

    const transaction = this.db!.transaction(["syncQueue"], "readwrite")
    const store = transaction.objectStore("syncQueue")
    await store.clear()
  }
}

export const offlineStorage = new OfflineStorage()

// Utility functions for offline detection
export const isOnline = (): boolean => {
  return navigator.onLine
}

export const getLastSyncTime = (): number => {
  return Number.parseInt(localStorage.getItem("lastSyncTime") || "0")
}

export const setLastSyncTime = (timestamp: number): void => {
  localStorage.setItem("lastSyncTime", timestamp.toString())
}

export const formatLastSync = (timestamp: number): string => {
  if (!timestamp) return "Never"

  const now = Date.now()
  const diff = now - timestamp
  const minutes = Math.floor(diff / (1000 * 60))
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))

  if (minutes < 1) return "Just now"
  if (minutes < 60) return `${minutes} minutes ago`
  if (hours < 24) return `${hours} hours ago`
  return `${days} days ago`
}
