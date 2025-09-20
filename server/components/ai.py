import re
from typing import Optional
from models import VoiceCommand

class AIProcessor:
    def __init__(self):
        self.usage_patterns = [
            r'(?:we\s+)?(?:used?|took|consumed|have\s+used)\s+(\d+)\s+(\w+)',
            r'(?:used?|took|consumed)\s+(\d+)\s+(\w+)',
            r'(\d+)\s+(\w+)\s+(?:used?|taken|consumed)',
            r'(?:we\s+)?(?:have\s+)?used\s+(\d+)\s+(\w+)',
        ]
        self.update_patterns = [
            r'(?:add|restock|increase|put)\s+(\d+)\s+(?:more\s+)?(\w+)',
            r'(?:set|update|change)\s+(\w+)\s+(?:to|at)\s+(\d+)',
            r'(?:add|restock)\s+(\d+)\s+(\w+)',
            r'(\d+)\s+(\w+)\s+(?:added|restocked)',
        ]
        self.query_patterns = [
            r'(?:how\s+many|what\'s\s+the\s+stock\s+of|check\s+stock\s+for|how\s+much)\s+(\w+)',
            r'(?:do\s+we\s+have|are\s+there)\s+(?:any\s+)?(\w+)',
            r'(?:stock|inventory)\s+(?:of|for)\s+(\w+)',
            r'(\w+)\s+(?:stock|inventory|count)',
        ]

    def parse_command(self, transcript: str) -> VoiceCommand:
        transcript = transcript.lower().strip()
        print(f"Processing transcript: '{transcript}'")

        for pattern in self.usage_patterns:
            match = re.search(pattern, transcript, re.IGNORECASE)
            if match:
                try:
                    quantity = int(match.group(1))
                    item = match.group(2)
                    item = self.normalize_item_name(item)
                    print(f"Matched usage pattern: quantity={quantity}, item={item}")
                    return VoiceCommand(type="usage", item=item, quantity=quantity)
                except (ValueError, IndexError) as e:
                    print(f"Error parsing usage match: {e}")
                    continue

        for pattern in self.update_patterns:
            match = re.search(pattern, transcript, re.IGNORECASE)
            if match:
                try:
                    if len(match.groups()) >= 2:
                        if 'set' in pattern or 'update' in pattern or 'change' in pattern:
                            item = match.group(1)
                            quantity = int(match.group(2))
                        else:
                            quantity = int(match.group(1))
                            item = match.group(2)
                        item = self.normalize_item_name(item)
                        print(f"Matched update pattern: quantity={quantity}, item={item}")
                        return VoiceCommand(type="update", item=item, quantity=quantity)
                except (ValueError, IndexError) as e:
                    print(f"Error parsing update match: {e}")
                    continue

        for pattern in self.query_patterns:
            match = re.search(pattern, transcript, re.IGNORECASE)
            if match:
                try:
                    item = match.group(1)
                    item = self.normalize_item_name(item)
                    print(f"Matched query pattern: item={item}")
                    return VoiceCommand(type="query", item=item)
                except (ValueError, IndexError) as e:
                    print(f"Error parsing query match: {e}")
                    continue

        print("No pattern matched, returning unknown")
        return VoiceCommand(type="unknown")

    def normalize_item_name(self, raw_name: str) -> str:
        if not raw_name:
            return ""
            
        name = raw_name.lower().strip()
        
        item_mappings = {
            'glove': 'Disposable Gloves',
            'gloves': 'Disposable Gloves',
            'mask': 'Surgical Masks', 
            'masks': 'Surgical Masks',
            'syringe': 'Syringes (10ml)',
            'syringes': 'Syringes (10ml)',
            'bandage': 'Bandages',
            'bandages': 'Bandages',
            'thermometer': 'Thermometers',
            'thermometers': 'Thermometers',
            'antiseptic': 'Antiseptic Solution',
            'solution': 'Antiseptic Solution',
        }
        
        if name in item_mappings:
            return item_mappings[name]
        
        for key, value in item_mappings.items():
            if key in name or name in key:
                return value
                
        return raw_name.title()

ai_processor = AIProcessor()