import re
from typing import Dict, Any, Optional
from models import VoiceCommand
from components.llm import local_llm

class AIStructurer:
    """
    AI-powered multilingual intent + entity parser using Puter LLM.
    - Uses LLM for flexible, natural language structuring
    - No hardcoded mappings; handles EN/RO dynamically
    """

    def structure_command(self, transcript: str) -> VoiceCommand:
        print(f"AI structuring transcript: '{transcript}'")
        structured = local_llm.structure_command(transcript)
        print(f"LLM structured: {structured}")
        action = (structured.get("action") or "unknown").lower()
        item = structured.get("item")
        qty = structured.get("quantity")
        notes = structured.get("response") or transcript

        # Secondary simple fallback if LLM returned unknown or missing fields
        if action == "unknown" or (action in ["usage", "update"] and qty is None):
            import re
            text = transcript.strip()
            # try detect integer
            m_qty = re.search(r"(\d+)", text)
            if not m_qty:
                # number words
                words = text.lower().split()
                num_map = {
                    "one": 1, "two": 2, "three": 3, "four": 4, "five": 5, "six": 6, "seven": 7, "eight": 8, "nine": 9, "ten": 10,
                    "unu": 1, "doi": 2, "doua": 2, "două": 2, "trei": 3, "patru": 4, "cinci": 5, "sase": 6, "șase": 6,
                    "eleven": 11, "twelve": 12, "thirteen": 13, "fourteen": 14, "fifteen": 15, "sixteen": 16, "seventeen": 17, "eighteen": 18, "nineteen": 19,
                    "zece": 10, "unsprezece": 11, "doisprezece": 12, "douasprezece": 12, "douăsprezece": 12, "treisprezece": 13, "paisprezece": 14,
                    "cincisprezece": 15, "saisprezece": 16, "șaisprezece": 16, "saptesprezece": 17, "șaptesprezece": 17, "optsprezece": 18, "nouasprezece": 19, "nouăsprezece": 19,
                    "twenty": 20, "douazeci": 20, "douăzeci": 20
                }
                for w in words:
                    if w in num_map:
                        qty = num_map[w]
                        break
            else:
                qty = int(m_qty.group(1))

            low = text.lower()
            if any(k in low for k in ["use", "used", "take", "took", "am luat", "folos", "consum"]):
                action = "usage" if qty else action
            if any(k in low for k in ["add", "adauga", "adaugă", "update", "set", "restock"]):
                action = "update" if qty is not None else action
            if any(k in low for k in ["how many", "stock", "cât", "cat", "câte", "cate", "avem", "left", "available"]):
                action = "query"

            if not item:
                toks = re.findall(r"[A-Za-zăâîșț\-]+", low)
                item = toks[-1].title() if toks else None

        # Ensure a friendly, non-technical note
        if not notes or notes == transcript or action == "unknown":
            if action == "usage" and item and qty:
                notes = f"I deducted {qty} {item}."
            elif action == "update" and item and qty is not None:
                notes = f"I set {item} to {qty}."
            elif action == "query" and item:
                notes = f"Let me check {item}."
            else:
                notes = "I didn't quite catch that. You can say, for example, 'Add 10 masks' or 'I used 5 gloves'."

        return VoiceCommand(type=action, item=item, quantity=qty, notes=notes)

ai_structurer = AIStructurer()