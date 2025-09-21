from fastapi import APIRouter, HTTPException
from models import ProcessVoiceRequest, ProcessVoiceResponse, VoiceResponse, PurchaseOrder, PurchaseOrderItem
import components.stt as stt
import components.ai_structurer as ai_structurer
import components.db as db
import components.tts as tts
import components.forecasting as forecasting
import components.invoice_processor as inv
from fastapi import UploadFile, File, Form

router = APIRouter()

@router.get("/inventory")
async def get_inventory():
    try:
        items = db.db.get_inventory_items()
        return {"items": [item.model_dump() for item in items]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/inventory/{item_id}")
async def update_inventory(item_id: str, payload: dict):
    try:
        new_stock = int(payload.get("currentStock", 0))
        db.db.update_stock(item_id, new_stock)
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/usage-logs")
async def get_all_usage_logs():
    try:
        logs = db.db.get_usage_logs()
        return {"logs": [log.model_dump() for log in logs]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/usage-logs/{item_id}")
async def get_usage_logs(item_id: str):
    try:
        logs = db.db.get_usage_logs(item_id)
        return {"logs": [log.model_dump() for log in logs]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/usage")
async def create_usage(payload: dict):
    try:
        item_id = payload.get("itemId")
        quantity = int(payload.get("quantity", 0))
        user = payload.get("user", "unknown")
        notes = payload.get("notes")
        if not item_id:
            raise HTTPException(status_code=400, detail="itemId is required")
        db.db.log_usage(item_id, quantity, user, notes)
        return {"success": True}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/suppliers")
async def get_suppliers():
    try:
        suppliers = db.db.get_suppliers()
        return {"suppliers": [s.model_dump() for s in suppliers]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/purchase-orders")
async def list_purchase_orders():
    try:
        orders = db.db.get_purchase_orders()
        return {"orders": [o.model_dump() for o in orders]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/purchase-orders")
async def create_purchase_order(payload: dict):
    try:
        supplier_id = payload.get("supplierId")
        created_by = payload.get("createdBy", "system")
        notes = payload.get("notes")
        items_payload = payload.get("items", [])
        if not supplier_id or not items_payload:
            raise HTTPException(status_code=400, detail="supplierId and items are required")

        suppliers = db.db.get_suppliers()
        supplier = next((s for s in suppliers if s.id == supplier_id), None)
        if not supplier:
            raise HTTPException(status_code=404, detail="Supplier not found")

        items: list[PurchaseOrderItem] = []
        subtotal = 0.0
        for it in items_payload:
            poi = PurchaseOrderItem(**it)
            items.append(poi)
            subtotal += poi.totalPrice
        tax = round(subtotal * 0.08, 2)
        total = round(subtotal + tax, 2)

        from datetime import datetime, timedelta
        order_id = str(datetime.now().timestamp())
        order_number = f"PO-{datetime.now().year}-{int(datetime.now().timestamp())}"
        expected_delivery = datetime.now() + timedelta(days=supplier.leadTimeDays)

        order = PurchaseOrder(
            id=order_id,
            orderNumber=order_number,
            supplierId=supplier.id,
            supplierName=supplier.name,
            status="pending",
            items=items,
            subtotal=subtotal,
            tax=tax,
            total=total,
            createdBy=created_by,
            createdAt=datetime.now(),
            expectedDelivery=expected_delivery,
            notes=notes,
        )
        db.db.create_purchase_order(order)
        return {"order": order.model_dump()}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/purchase-orders/{order_id}/status")
async def set_order_status(order_id: str, payload: dict):
    try:
        status = payload.get("status")
        approved_by = payload.get("approvedBy")
        if not status:
            raise HTTPException(status_code=400, detail="status is required")
        db.db.update_order_status(order_id, status, approved_by)
        return {"success": True}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/stock-alerts")
async def get_stock_alerts():
    try:
        items = db.db.get_inventory_items()
        alerts = []
        for item in items:
            if item.currentStock <= 0:
                alerts.append({
                    "id": item.id,
                    "name": item.name,
                    "status": "out-of-stock",
                    "currentStock": item.currentStock,
                    "minStock": item.minStock
                })
            elif item.currentStock <= item.minStock:
                alerts.append({
                    "id": item.id,
                    "name": item.name,
                    "status": "low-stock",
                    "currentStock": item.currentStock,
                    "minStock": item.minStock
                })
        return {"alerts": alerts}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/analytics-data")
async def get_analytics_data():
    try:
        items = db.db.get_inventory_items()
        logs = db.db.get_usage_logs()
        forecasts, analytics = forecasting.compute_forecasts_and_analytics(items, logs)
        return {
            "items": [item.model_dump() for item in items],
            "forecasts": forecasts,
            "analytics": analytics,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/orders-bootstrap")
async def get_orders_bootstrap():
    try:
        suppliers = db.db.get_suppliers()
        orders = db.db.get_purchase_orders()
        items = db.db.get_inventory_items()
        logs = db.db.get_usage_logs()
        forecasts, _analytics = forecasting.compute_forecasts_and_analytics(items, logs)
        def recommend(items, forecasts):
            recs = []
            usage_by_id = {f['itemId']: f for f in forecasts}
            for it in items:
                f = usage_by_id.get(it.id)
                if not f:
                    continue
                if f.get('riskLevel') == 'high' or f.get('daysUntilStockout', 999) <= 7:
                    qty = int(max(0, f.get('recommendedOrderQuantity', 0)))
                    unit_price = float(getattr(it, 'price', 10.0) or 10.0)
                    recs.append({
                        'itemId': it.id,
                        'itemName': it.name,
                        'quantity': qty,
                        'unitPrice': unit_price,
                        'totalPrice': qty * unit_price,
                        'urgency': 'high' if f.get('riskLevel') == 'high' else 'medium',
                    })
            return recs
        recommendations = recommend(items, forecasts)
        return {
            "suppliers": [s.model_dump() for s in suppliers],
            "orders": [o.model_dump() for o in orders],
            "recommendations": recommendations,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/process-voice", response_model=ProcessVoiceResponse)
async def process_voice(request: ProcessVoiceRequest):
    try:
        print(f"Processing voice request with language: {request.language}")

        transcript = stt.stt.transcribe(request.audio, request.language)
        print(f"Transcription result: '{transcript}'")

        command = ai_structurer.ai_structurer.structure_command(transcript)
        print(f"Structured command: type={command.type}, item={command.item}, quantity={command.quantity}")

        response = execute_command(command)
        print(f"Command response: {response.message}")

        tts_text = response.message or command.notes or "Sorry, I couldn't process that."
        audio_response = tts.tts.get_audio_base64(tts_text)
        print("Voice response generated")

        return ProcessVoiceResponse(
            transcript=transcript,
            command=command,
            response=response,
            audio_response=audio_response
        )
    except Exception as e:
        print(f"Error processing voice: {str(e)}")
        import traceback
        traceback.print_exc()
        error_message = "Sorry, there was an error processing your request."
        try:
            audio_response = tts.tts.get_audio_base64(error_message)
        except:
            audio_response = None
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/process-text", response_model=ProcessVoiceResponse)
async def process_text(payload: dict):
    try:
        text = payload.get("text", "") or ""
        language = payload.get("language", "en") or "en"
        if not text.strip():
            raise HTTPException(status_code=400, detail="text is required")

        transcript = text.strip()
        print(f"Processing text request: '{transcript}' (lang={language})")

        command = ai_structurer.ai_structurer.structure_command(transcript)
        print(f"Structured command: type={command.type}, item={command.item}, quantity={command.quantity}")

        response = execute_command(command)
        print(f"Command response: {response.message}")

        tts_text = response.message or command.notes or "Sorry, I couldn't process that."
        audio_response = tts.tts.get_audio_base64(tts_text)

        return ProcessVoiceResponse(
            transcript=transcript,
            command=command,
            response=response,
            audio_response=audio_response
        )
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error processing text: {str(e)}")
        import traceback
        traceback.print_exc()
        error_message = "Sorry, there was an error processing your request."
        try:
            audio_response = tts.tts.get_audio_base64(error_message)
        except:
            audio_response = None
        raise HTTPException(status_code=500, detail=str(e))

def execute_command(command):
    if command.type == "usage" and command.item and command.quantity:
        item = db.db.find_best_match_by_name(command.item) or db.db.find_item_by_name(command.item)
        if not item:
            return VoiceResponse(message=f"I couldn't find {command.item} in inventory.", success=False)
        if item.currentStock >= command.quantity:
            db.db.log_usage(item.id, command.quantity, "voice_user")
            db.db.update_stock(item.id, item.currentStock - command.quantity)
            remaining = item.currentStock - command.quantity
            return VoiceResponse(
                message=f"Done. I deducted {command.quantity} {item.unit} of {item.name}. {remaining} left.",
                success=True
            )
        else:
            return VoiceResponse(message=f"Not enough {item.name} in stock to deduct {command.quantity}.", success=False)

    if command.type == "update" and command.item and command.quantity is not None:
        item = db.db.find_best_match_by_name(command.item) or db.db.find_item_by_name(command.item)
        if not item:
            created = db.db.create_inventory_item(command.item, command.quantity, unit="units")
            return VoiceResponse(message=f"Added {created.name} with a stock of {created.currentStock} {created.unit}.", success=True)
        db.db.update_stock(item.id, command.quantity)
        return VoiceResponse(
            message=f"All set. {item.name} is now {command.quantity} {item.unit}.",
            success=True
        )

    if command.type == "query" and command.item:
        item = db.db.find_best_match_by_name(command.item) or db.db.find_item_by_name(command.item)
        if item:
            return VoiceResponse(
                message=f"You have {item.currentStock} {item.unit} of {item.name} available.",
                success=True
            )
        return VoiceResponse(message=f"I couldn't find {command.item} in inventory.", success=False)

    return VoiceResponse(message="I didn't catch that. Please try again, like 'Add 20 masks' or 'I used 3 syringes'.", success=False)


@router.post("/invoice/extract")
async def invoice_extract(file: UploadFile = File(...)):
    try:
        content = await file.read()
        text = inv.extract_text(content)
        items = inv.generate_hardcoded_items()
        return {"text": text, "items": items}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/invoice/commit")
async def invoice_commit(payload: dict):
    try:
        items = payload.get("items") or []
        supplier_id = payload.get("supplierId")
        created_by = payload.get("createdBy")
        result = inv.commit_items(items, supplier_id, created_by)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))