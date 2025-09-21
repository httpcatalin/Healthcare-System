import json
from typing import Dict, Any, Optional
from transformers import pipeline
import re

class LocalLLM:
    def __init__(self):
        self.generator = None
        self._load_model()

    def _load_model(self):
        if self.generator is None:
            print("Loading local MT5 model for multilingual text generation...")
            self.generator = pipeline("text2text-generation", model="google/mt5-small", device=-1)  # CPU
            print("Local MT5 model loaded successfully")

    def chat(self, prompt: str) -> str:
        try:
            result = self.generator(
                prompt,
                do_sample=False,
                num_beams=2,
                repetition_penalty=1.1,
                max_new_tokens=128,
            )
            text = result[0]['generated_text']
            return text
        except Exception as e:
            print(f"Error with local model: {e}")
            return "Sorry, I couldn't process that."

    def structure_command(self, transcript: str) -> Dict[str, Any]:
        def normalize_transcript(text: str) -> str:
            t = text.strip()
            low = t.lower()
            fillers = ["whatever", "please", "um", "uh", "like", "you know"]
            for f in fillers:
                low = re.sub(rf"\b{re.escape(f)}\b", "", low)
            homophones = {
                "free": "three",
                "tree": "three",
                "to": "two",
                "too": "two",
                "for": "four",
                "won": "one",
                "oh": "zero",
                "o": "one",
                "ate": "eight",
            }
            for src, dst in homophones.items():
                low = re.sub(rf"\b{re.escape(src)}\b", dst, low)
            low = re.sub(r"\s+", " ", low).strip()
            return low

        normalized = normalize_transcript(transcript)
        prompt = (
            "You are an assistant for medical inventory. Read the user's command (English or Romanian) and output ONLY a JSON object with keys: action, item, quantity, response. No other text.\n"
            "- action: one of usage | update | query | unknown\n"
            "- item: name or null\n"
            "- quantity: integer or null\n"
            "- response: short, friendly sentence to speak back\n"
            "- Correct small ASR mistakes in number words (e.g., free->three, to/too->two, for->four, won->one, ate->eight).\n"
            "Examples:\n"
            "Input: I used 5 gloves\n"
            "Output: {\"action\": \"usage\", \"item\": \"Gloves\", \"quantity\": 5, \"response\": \"I deducted 5 Gloves.\"}\n"
            "Input: I took 3 syringes\n"
            "Output: {\"action\": \"usage\", \"item\": \"Syringes\", \"quantity\": 3, \"response\": \"I deducted 3 Syringes.\"}\n"
            "Input: I took free syringes\n"
            "Output: {\"action\": \"usage\", \"item\": \"Syringes\", \"quantity\": 3, \"response\": \"I deducted 3 Syringes.\"}\n"
            "Input: Add 20 masks\n"
            "Output: {\"action\": \"update\", \"item\": \"Masks\", \"quantity\": 20, \"response\": \"Set Masks to 20.\"}\n"
            "Input: How many syringes do we have?\n"
            "Output: {\"action\": \"query\", \"item\": \"Syringes\", \"quantity\": null, \"response\": \"Checking Syringes.\"}\n"
            "Input: Am folosit 3 măști\n"
            "Output: {\"action\": \"usage\", \"item\": \"Măști\", \"quantity\": 3, \"response\": \"Am scăzut 3 Măști.\"}\n"
            "Input: Am luat 2 seringi\n"
            "Output: {\"action\": \"usage\", \"item\": \"Seringi\", \"quantity\": 2, \"response\": \"Am scăzut 2 Seringi.\"}\n"
            "Input: Adaugă 10 seringi\n"
            "Output: {\"action\": \"update\", \"item\": \"Seringi\", \"quantity\": 10, \"response\": \"Am setat Seringi la 10.\"}\n"
            "Input: Câte bandaje avem?\n"
            "Output: {\"action\": \"query\", \"item\": \"Bandaje\", \"quantity\": null, \"response\": \"Verific Bandaje.\"}\n"
            f"Input: {normalized}\n"
            "Output: "
        )
        response = self.chat(prompt)
        json_text = None
        if response:
            m = re.search(r"\{[\s\S]*\}", response)
            if m:
                json_text = m.group(0)
            else:
                json_text = response.strip()
        
        def repair_json(text: str) -> str:
            if not text:
                return text
            t = text.strip()
            if "'" in t and '"' not in t:
                t = t.replace("'", '"')
            t = re.sub(r",\s*([}\]])", r"\1", t)
            t = re.sub(r"\bNone\b", "null", t)
            t = re.sub(r"\bTrue\b", "true", t)
            t = re.sub(r"\bFalse\b", "false", t)
            return t

        try:
            structured = json.loads(repair_json(json_text))
            print(f"LLM structured: {structured}")
            return structured
            
        except json.JSONDecodeError:
            text = transcript.lower().strip()

            en_ro_numbers = {
                "zero": 0, "one": 1, "unu": 1, "o": 1, "a": 1, "two": 2, "doi": 2, "doua": 2, "două": 2,
                "three": 3, "trei": 3, "four": 4, "patru": 4, "five": 5, "cinci": 5, "six": 6, "șase": 6, "sase": 6,
                "seven": 7, "sapte": 7, "șapte": 7, "eight": 8, "opt": 8, "nine": 9, "noua": 9, "nouă": 9,
                "ten": 10, "zece": 10, "eleven": 11, "unsprezece": 11, "twelve": 12, "doisprezece": 12, "douasprezece": 12, "douăsprezece": 12,
                "thirteen": 13, "treisprezece": 13, "fourteen": 14, "paisprezece": 14, "fifteen": 15, "cincisprezece": 15,
                "sixteen": 16, "saisprezece": 16, "șaisprezece": 16, "seventeen": 17, "saptesprezece": 17, "șaptesprezece": 17,
                "eighteen": 18, "optsprezece": 18, "nineteen": 19, "nouasprezece": 19, "nouăsprezece": 19,
                "twenty": 20, "douazeci": 20, "douăzeci": 20,
                "thirty": 30, "treizeci": 30, "forty": 40, "patruzeci": 40, "fifty": 50, "cincizeci": 50,
                "sixty": 60, "saizeci": 60, "șaizeci": 60, "seventy": 70, "saptezeci": 70, "șaptezeci": 70,
                "eighty": 80, "optzeci": 80, "ninety": 90, "nouazeci": 90, "nouăzeci": 90,
            }

            def words_to_num(words: list[str]) -> Optional[int]:
                total = 0
                i = 0
                while i < len(words):
                    w = words[i]
                    if w in en_ro_numbers:
                        val = en_ro_numbers[w]
                        total += val
                        i += 1
                        continue
                    if i + 1 < len(words):
                        pair = f"{words[i]} {words[i+1]}"
                        if words[i] in ("twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety",
                                        "douazeci", "douăzeci", "treizeci", "patruzeci", "cincizeci", "saizeci", "șaizeci", "saptezeci", "șaptezeci", "optzeci", "nouazeci", "nouăzeci") and words[i+1] in en_ro_numbers:
                            total += en_ro_numbers[words[i]] + en_ro_numbers[words[i+1]]
                            i += 2
                            continue
                        if words[i+1] in ("si", "și") and i + 2 < len(words) and words[i] in en_ro_numbers and words[i+2] in en_ro_numbers:
                            total += en_ro_numbers[words[i]] + en_ro_numbers[words[i+2]]
                            i += 3
                            continue
                    i += 1
                return total or None

            qty = None
            m_qty_digit = re.search(r"(\d+)", text)
            if m_qty_digit:
                qty = int(m_qty_digit.group(1))
            else:
                qty = words_to_num(text.split())

            action = "unknown"
            if any(k in text for k in ["use", "used", "take", "took", "consume", "consumed", "folos", "consum", "am luat", "am folosit", "iau ", "am luat"]):
                action = "usage" if qty else "unknown"
            if any(k in text for k in ["add", "adauga", "adaugă", "update", "set", "restock", "re-stock", "pun "]):
                action = "update" if qty is not None else action
            if any(k in text for k in ["how many", "do we have", "cat avem", "cât avem", "stoc", "stock", "have left", "available"]):
                action = "query"

            item = None
            if action == "query":
                m = re.search(r"(?:how many|cate|câte|cat|cât)\s+([a-zăâîșț\s\-]+?)(?:\s+(?:do we have|avem))?\??$", text)
                if m:
                    item = m.group(1).strip().title()
            else:
                m = re.search(r"(?:add|adauga|adaugă|update|set|use|used|take|took|consume|consumed|folos|consum|am folosit|iau|pun|am luat)\s+(?:\d+|[a-zăâîșț]+)\s+([a-zăâîșț0-9\s\-]+)", text)
                if m:
                    item = m.group(1).strip().title()
                else:
                    tokens = re.findall(r"[A-Za-zăâîșț\-]+", text)
                    item = tokens[-1] if tokens else None
                    item = item.title() if item else None
            fallback = {
                "action": action,
                "item": item,
                "quantity": qty,
                "response": transcript,
            }
            print(f"LLM JSON parse failed, fallback: {fallback}")
            return fallback

local_llm = LocalLLM()
