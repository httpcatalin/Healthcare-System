import os
from pymongo import MongoClient
from pymongo.collection import Collection
from typing import List, Optional
from models import InventoryItem, UsageLog, Supplier, PurchaseOrder, PurchaseOrderItem
from datetime import datetime

class Database:
    def __init__(self):
        self._client = None
        self._db = None
        self._inventory = None
        self._usage_logs = None
        self._suppliers = None
        self._purchase_orders = None

    @property
    def client(self):
        if self._client is None:
            self._client = MongoClient(os.getenv("MONGODB_URI"))
        return self._client

    @property
    def db(self):
        if self._db is None:
            self._db = self.client["healthcare"]
        return self._db

    @property
    def inventory(self):
        if self._inventory is None:
            self._inventory = self.db["inventory"]
        return self._inventory

    @property
    def usage_logs(self):
        if self._usage_logs is None:
            self._usage_logs = self.db["usage_logs"]
        return self._usage_logs

    @property
    def suppliers(self):
        if self._suppliers is None:
            self._suppliers = self.db["suppliers"]
        return self._suppliers

    @property
    def purchase_orders(self):
        if self._purchase_orders is None:
            self._purchase_orders = self.db["purchase_orders"]
        return self._purchase_orders

    def get_inventory_items(self) -> List[InventoryItem]:
        items = []
        for item_data in self.inventory.find():
            # Calculate status if not present
            if 'status' not in item_data:
                current_stock = item_data.get('currentStock', 0)
                min_stock = item_data.get('minStock', 0)
                if current_stock <= 0:
                    item_data['status'] = 'out-of-stock'
                elif current_stock <= min_stock:
                    item_data['status'] = 'low-stock'
                else:
                    item_data['status'] = 'in-stock'

            try:
                item = InventoryItem(**item_data)
                items.append(item)
            except Exception as e:
                print(f"Error creating InventoryItem from {item_data.get('name', 'unknown')}: {e}")
                print(f"Item data: {item_data}")
                # Skip invalid items but continue processing others
                continue
        return items

    def get_inventory_item(self, item_id: str) -> Optional[InventoryItem]:
        item = self.inventory.find_one({"id": item_id})
        return InventoryItem(**item) if item else None

    def update_stock(self, item_id: str, new_stock: int):
        self.inventory.update_one({"id": item_id}, {"$set": {"currentStock": new_stock}})

    def log_usage(self, item_id: str, quantity: int, user: str, notes: Optional[str] = None):
        log = UsageLog(
            id=str(datetime.now().timestamp()),
            itemId=item_id,
            quantity=quantity,
            user=user,
            timestamp=datetime.now(),
            notes=notes
        )
        self.usage_logs.insert_one(log.model_dump())

    def get_usage_logs(self, item_id: Optional[str] = None) -> List[UsageLog]:
        query = {"itemId": item_id} if item_id else {}
        logs = []
        for log in self.usage_logs.find(query).sort("timestamp", -1):
            logs.append(UsageLog(**log))
        return logs

    def find_item_by_name(self, name: str) -> Optional[InventoryItem]:
        item = self.inventory.find_one({"name": {"$regex": name, "$options": "i"}})
        return InventoryItem(**item) if item else None

    def find_best_match_by_name(self, name: str, threshold: float = 0.6) -> Optional[InventoryItem]:
        """Fuzzy find the best matching inventory item by name with substring boost."""
        from difflib import SequenceMatcher
        best = None
        best_score = 0.0
        target = (name or "").lower().strip()
        if not target:
            return None
        for raw in self.inventory.find({}, {"_id": 0}):
            candidate = (raw.get("name") or "").lower().strip()
            if not candidate:
                continue
            # Base ratio
            score = SequenceMatcher(None, target, candidate).ratio()
            # Substring boost
            if target in candidate or candidate in target:
                score = max(score, 0.99)
            if score > best_score:
                best_score = score
                best = raw
        if best and best_score >= threshold:
            return InventoryItem(**best)
        return None

    def create_inventory_item(self, name: str, initial_stock: int = 0, unit: str = "units") -> InventoryItem:
        from datetime import datetime
        item_id = str(datetime.now().timestamp())
        doc = {
            "id": item_id,
            "name": name,
            "currentStock": int(initial_stock) if initial_stock is not None else 0,
            "unit": unit,
            "minStock": 0,
            "maxStock": 1000000,
            "description": None,
            "category": None,
            "location": None,
            "supplier": None,
            "lastUpdated": datetime.now(),
            "price": None,
        }
        self.inventory.insert_one(doc)
        return InventoryItem(**doc)

    def get_suppliers(self) -> List[Supplier]:
        out: List[Supplier] = []
        for raw in self.suppliers.find():
            try:
                sup_doc = {
                    "id": str(raw.get("id") or raw.get("_id")),
                    "name": raw.get("name") or "Unknown Supplier",
                    "email": raw.get("email") or raw.get("contact") or "unknown@example.com",
                    "phone": raw.get("phone") or "",
                    "address": raw.get("address") or "",
                    "paymentTerms": raw.get("paymentTerms") or "NET 30",
                    "leadTimeDays": int(raw.get("leadTimeDays") or 7),
                    "minimumOrder": float(raw.get("minimumOrder") or 0.0),
                }
                out.append(Supplier(**sup_doc))
            except Exception as e:
                print(f"Skipping supplier due to error: {e} | raw={raw}")
        return out

    def get_purchase_orders(self) -> List[PurchaseOrder]:
        return [PurchaseOrder(**o) for o in self.purchase_orders.find().sort("createdAt", -1)]

    def create_purchase_order(self, order: PurchaseOrder) -> PurchaseOrder:
        self.purchase_orders.insert_one(order.model_dump())
        return order

    def update_order_status(self, order_id: str, status: str, approved_by: Optional[str] = None):
        update = {"status": status}
        if status == "approved" and approved_by:
            update["approvedBy"] = approved_by
            update["approvedAt"] = datetime.now()
        self.purchase_orders.update_one({"id": order_id}, {"$set": update})

db = Database()