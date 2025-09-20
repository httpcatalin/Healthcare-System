from fastapi import APIRouter, HTTPException
from models import ProcessVoiceRequest, ProcessVoiceResponse, VoiceResponse, PurchaseOrder, PurchaseOrderItem
import components.stt as stt
import components.ai_structurer as ai_structurer
import components.db as db
import components.tts as tts

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

@router.post("/process-voice", response_model=ProcessVoiceResponse)
async def process_voice(request: ProcessVoiceRequest):
    try:
        print(f"Processing voice request with language: {request.language}")

        # Step 1: Transcribe audio to text using optimized STT
        transcript = stt.stt.transcribe(request.audio, request.language)
        print(f"Transcription result: '{transcript}'")

        # Step 2: Structure the command using AI
        command = ai_structurer.ai_structurer.structure_command(transcript)
        print(f"Structured command: type={command.type}, item={command.item}, quantity={command.quantity}")

        # Step 3: Execute the command on database
        response = execute_command(command)
        print(f"Command response: {response.message}")

        # Step 4: Generate voice response using optimized TTS
        if response.success:
            audio_response = tts.tts.get_audio_base64(response.message)
            print("Voice response generated successfully")
        else:
            error_message = "Sorry, I couldn't process that request. Please try again."
            audio_response = tts.tts.get_audio_base64(error_message)
            print("Error voice response generated")

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

def execute_command(command):
    items = db.db.get_inventory_items()
    
    if command.type == "usage" and command.item and command.quantity:
        item = db.db.find_item_by_name(command.item)
        if item:
            if item.currentStock >= command.quantity:
                db.db.log_usage(item.id, command.quantity, "voice_user")
                db.db.update_stock(item.id, item.currentStock - command.quantity)
                return VoiceResponse(
                    message=f"Logged usage of {command.quantity} {item.unit} of {item.name}. Remaining: {item.currentStock - command.quantity}",
                    success=True
                )
            else:
                return VoiceResponse(message=f"Insufficient stock of {item.name}", success=False)
        else:
            return VoiceResponse(message=f"Item {command.item} not found", success=False)
    
    elif command.type == "update" and command.item and command.quantity is not None:
        item = db.db.find_item_by_name(command.item)
        if item:
            db.db.update_stock(item.id, command.quantity)
            return VoiceResponse(
                message=f"Updated {item.name} stock to {command.quantity} {item.unit}",
                success=True
            )
        else:
            return VoiceResponse(message=f"Item {command.item} not found", success=False)
    
    elif command.type == "query" and command.item:
        item = db.db.find_item_by_name(command.item)
        if item:
            return VoiceResponse(
                message=f"{item.name}: {item.currentStock} {item.unit} available",
                success=True
            )
        else:
            return VoiceResponse(message=f"Item {command.item} not found", success=False)
    
    return VoiceResponse(message="Command not recognized", success=False)