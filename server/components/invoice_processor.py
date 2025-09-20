from __future__ import annotations
from typing import List, Dict, Any
from io import BytesIO
import re

from PIL import Image

_ocr_pipeline = None


def _get_ocr_pipeline():
	global _ocr_pipeline
	if _ocr_pipeline is None:
		try:
			from transformers import pipeline
			_ocr_pipeline = pipeline("image-to-text", model="microsoft/trocr-base-printed")
		except Exception as e:
			_ocr_pipeline = None
			raise e
	return _ocr_pipeline


def extract_text(image_bytes: bytes) -> str:
	try:
		img = Image.open(BytesIO(image_bytes)).convert("RGB")
	except Exception:
		# Try to open as bytes via PIL fallback
		img = Image.open(BytesIO(image_bytes))
	ocr = _get_ocr_pipeline()
	result = ocr(img)
	# pipeline returns list of { 'generated_text': '...' } or similar
	if isinstance(result, list) and result:
		text = result[0].get("generated_text") or result[0].get("text") or ""
	elif isinstance(result, dict):
		text = result.get("generated_text") or result.get("text") or ""
	else:
		text = ""
	return text.strip()


def _to_number(s: str) -> float:
	s = s.replace(',', '.').strip()
	try:
		return float(re.findall(r"[-+]?[0-9]*\.?[0-9]+", s)[0])
	except Exception:
		return 0.0


def parse_invoice(text: str) -> List[Dict[str, Any]]:
	lines = [l.strip() for l in text.splitlines() if l.strip()]
	items: List[Dict[str, Any]] = []
	for line in lines:
		low = line.lower()
		if any(kw in low for kw in ["subtotal", "total", "tax", "tva", "sum"]):
			continue
		# Try patterns: "name qty price" or "name x qty price" or CSV-like
		m = re.findall(r"([A-Za-z][A-Za-z0-9\-\s]+)", line)
		nums = re.findall(r"[-+]?[0-9]*\.?[0-9]+", line.replace(',', '.'))
		if not m:
			continue
		name = m[0].strip()
		quantity = 1
		unit_price = 0.0
		if len(nums) == 1:
			unit_price = _to_number(nums[0])
		elif len(nums) >= 2:
			# assume first is quantity, last is unit price
			quantity = max(1, int(float(nums[0])))
			unit_price = _to_number(nums[-1])
		total_price = max(0.0, quantity * unit_price)
		if name:
			items.append({
				"itemName": name,
				"quantity": quantity,
				"unitPrice": unit_price,
				"totalPrice": total_price,
				"urgency": "medium",
			})
	# Deduplicate by itemName merging quantities
	merged: Dict[str, Dict[str, Any]] = {}
	for it in items:
		key = it["itemName"].lower()
		if key in merged:
			merged[key]["quantity"] += it["quantity"]
			merged[key]["totalPrice"] = merged[key]["quantity"] * merged[key]["unitPrice"]
		else:
			merged[key] = dict(it)
	return list(merged.values())


def commit_items(items: List[Dict[str, Any]], supplier_id: str | None, created_by: str | None) -> Dict[str, Any]:
	from components import db as dbmod
	from models import PurchaseOrder, PurchaseOrderItem
	from datetime import datetime, timedelta

	updated = []
	for it in items:
		name = it.get("itemName") or ""
		qty = int(it.get("quantity") or 0)
		unit_price = float(it.get("unitPrice") or 0.0)
		if not name or qty <= 0:
			continue
		existing = dbmod.db.find_best_match_by_name(name) or dbmod.db.find_item_by_name(name)
		if existing:
			new_stock = int(existing.currentStock) + qty
			dbmod.db.update_stock(existing.id, new_stock)
			updated.append({"id": existing.id, "name": existing.name, "newStock": new_stock, "unitPrice": unit_price})
		else:
			created = dbmod.db.create_inventory_item(name, qty, unit="units")
			updated.append({"id": created.id, "name": created.name, "newStock": created.currentStock, "unitPrice": unit_price})

	po_id = None
	if items:
		suppliers = dbmod.db.get_suppliers()
		supplier = next((s for s in suppliers if s.id == supplier_id), None) if supplier_id else (suppliers[0] if suppliers else None)
		subtotal = sum(float(it.get("totalPrice") or (float(it.get("unitPrice") or 0) * int(it.get("quantity") or 0))) for it in items)
		tax = round(subtotal * 0.08, 2)
		total = round(subtotal + tax, 2)
		order_id = str(datetime.now().timestamp())
		order_number = f"INV-{datetime.now().year}-{int(datetime.now().timestamp())}"
		expected_delivery = datetime.now() + timedelta(days=(supplier.leadTimeDays if supplier else 0))
		po_items = [PurchaseOrderItem(
			itemId=it.get("itemId") or it.get("itemName"),
			itemName=it.get("itemName") or "Item",
			quantity=int(it.get("quantity") or 0),
			unitPrice=float(it.get("unitPrice") or 0.0),
			totalPrice=float(it.get("totalPrice") or 0.0),
			urgency=str(it.get("urgency") or "medium"),
		) for it in items]
		po = PurchaseOrder(
			id=order_id,
			orderNumber=order_number,
			supplierId=(supplier.id if supplier else "unknown"),
			supplierName=(supplier.name if supplier else "Unknown"),
			status="received",
			items=po_items,
			subtotal=subtotal,
			tax=tax,
			total=total,
			createdBy=created_by or "system",
			createdAt=datetime.now(),
			expectedDelivery=expected_delivery,
			notes="Imported from invoice",
		)
		dbmod.db.create_purchase_order(po)
		po_id = po.id

	return {"updated": updated, "purchaseOrderId": po_id}


def generate_hardcoded_items() -> List[Dict[str, Any]]:
	data = [
		{"itemName": "Belladonna 30", "quantity": 10, "totalPrice": 1484.98},
		{"itemName": "Belladonna 30", "quantity": 1, "totalPrice": 165.0},
		{"itemName": "Belladonna 30", "quantity": 100, "totalPrice": 15674.72},
		{"itemName": "Belladonna 30", "quantity": 5, "totalPrice": 579.6},
		{"itemName": "Plastic (1/2 dram)", "quantity": 100, "totalPrice": 1008.0},
	]
	items: List[Dict[str, Any]] = []
	for row in data:
		qty = int(row["quantity"]) or 1
		total = float(row["totalPrice"]) if row.get("totalPrice") is not None else 0.0
		unit = total / qty if qty > 0 else total
		items.append({
			"itemName": row["itemName"],
			"quantity": qty,
			"unitPrice": unit,
			"totalPrice": total,
			"urgency": "medium",
		})
	return items

