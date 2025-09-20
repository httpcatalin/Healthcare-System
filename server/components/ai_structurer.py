import torchimport torch

from transformers import pipeline, AutoTokenizer, AutoModelForTokenClassificationfrom transformers import pipeline, AutoTokenizer, AutoModelForSequenceClassification

import spacyfrom typing import Dict, Any, Optional

from typing import Dict, Any, Optional, Listimport re

import refrom models import VoiceCommand

from models import VoiceCommand

import numpy as npclass AIStructurer:

    def __init__(self):

class AIStructurer:        self.classifier = None

    def __init__(self):        self.tokenizer = None

        self.intent_classifier = None        self._model_loaded = False

        self.entity_extractor = None

        self.nlp_en = None    def _load_model(self):

        self.nlp_ro = None        if not self._model_loaded:

        self._models_loaded = False            print("Loading lightweight AI model for command structuring...")

            # Use a small, fast model for intent classification

    def _load_models(self):            self.classifier = pipeline(

        if not self._models_loaded:                "text-classification",

            print("Loading lightweight multilingual AI models...")                model="cardiffnlp/twitter-roberta-base-sentiment-latest",

                device=0 if torch.cuda.is_available() else -1

            # Lightweight intent classification model (multilingual)            )

            self.intent_classifier = pipeline(            self._model_loaded = True

                "text-classification",            print("AI model loaded successfully")

                model="cardiffnlp/twitter-xlm-roberta-base-sentiment",

                device=0 if torch.cuda.is_available() else -1,    def _extract_entities(self, text: str) -> Dict[str, Any]:

                return_all_scores=True        """Extract quantity, item, and action from text using regex and simple NLP"""

            )        text = text.lower().strip()



            # Entity extraction model (multilingual)        # Enhanced patterns for better entity extraction

            self.entity_extractor = pipeline(        quantity_patterns = [

                "ner",            r'(\d+)\s+(?:units?|pieces?|boxes?|packs?|bottles?|tubes?)',

                model="dbmdz/bert-large-cased-finetuned-conll03-english",            r'(\d+)\s+(\w+)',

                device=0 if torch.cuda.is_available() else -1,            r'(\d+)',

                aggregation_strategy="simple"        ]

            )

        item_patterns = [

            # spaCy models for Romanian and English            r'(?:of|for)\s+([a-zA-Z\s]+?)(?:\s+(?:units?|pieces?|boxes?|packs?|bottles?|tubes?)|$)',

            try:            r'([a-zA-Z\s]+?)(?:\s+\d+|$)',

                self.nlp_ro = spacy.load("ro_core_news_sm")        ]

            except:

                print("Romanian spaCy model not found, installing...")        # Extract quantity

                import subprocess        quantity = None

                subprocess.run(["python", "-m", "spacy", "download", "ro_core_news_sm"], check=True)        for pattern in quantity_patterns:

                self.nlp_ro = spacy.load("ro_core_news_sm")            match = re.search(pattern, text)

            if match:

            try:                try:

                self.nlp_en = spacy.load("en_core_web_sm")                    quantity = int(match.group(1))

            except:                    break

                print("English spaCy model not found, installing...")                except:

                import subprocess                    continue

                subprocess.run(["python", "-m", "spacy", "download", "en_core_web_sm"], check=True)

                self.nlp_en = spacy.load("en_core_web_sm")        # Extract item

        item = None

            self._models_loaded = True        for pattern in item_patterns:

            print("AI models loaded successfully")            match = re.search(pattern, text)

            if match:

    def _detect_language(self, text: str) -> str:                item = match.group(1).strip()

        """Detect if text is Romanian or English"""                break

        # Simple heuristic: count Romanian-specific characters and words

        ro_chars = sum(1 for c in text.lower() if c in 'ăâîșț')        return {

        ro_words = sum(1 for word in text.lower().split() if word in [            'quantity': quantity,

            'și', 'în', 'cu', 'pe', 'la', 'de', 'din', 'pentru', 'care', 'sunt',            'item': item,

            'este', 'au', 'am', 'folosit', 'luat', 'adăugat', 'cât', 'multe'            'text': text

        ])        }



        if ro_chars > 2 or ro_words > 1:    def _classify_intent(self, text: str) -> str:

            return 'ro'        """Classify the intent of the voice command"""

        return 'en'        text = text.lower()



    def _classify_intent_advanced(self, text: str, lang: str) -> Dict[str, Any]:        # Simple keyword-based intent classification (fast and reliable)

        """Advanced intent classification using NLP"""        usage_keywords = ['used', 'took', 'consumed', 'gave', 'administered', 'applied']

        text_lower = text.lower()        update_keywords = ['add', 'restock', 'increase', 'put', 'set', 'update', 'change']

        query_keywords = ['how many', 'what\'s the stock', 'check stock', 'do we have', 'inventory']

        # Define intent keywords for both languages

        intent_keywords = {        if any(keyword in text for keyword in usage_keywords):

            'usage': {            return 'usage'

                'en': ['used', 'took', 'consumed', 'gave', 'administered', 'applied', 'spent', 'utilized'],        elif any(keyword in text for keyword in update_keywords):

                'ro': ['folosit', 'luat', 'consumat', 'dat', 'administrat', 'aplicat', 'cheltuit', 'utilizat']            return 'update'

            },        elif any(keyword in text for keyword in query_keywords):

            'query': {            return 'query'

                'en': ['how many', 'what\'s the stock', 'check stock', 'do we have', 'inventory', 'remaining', 'left'],        else:

                'ro': ['cât', 'ce stoc', 'verifica stoc', 'avem', 'inventar', 'rămas', 'rămase']            return 'unknown'

            },

            'update': {    def structure_command(self, transcript: str) -> VoiceCommand:

                'en': ['add', 'restock', 'increase', 'put', 'set', 'update', 'change', 'received', 'got'],        """Structure the voice transcript into a proper database command"""

                'ro': ['adaug', 'reaprovizionez', 'cresc', 'pun', 'setez', 'actualizez', 'schimb', 'primit', 'primit']        print(f"AI structuring transcript: '{transcript}'")

            },

            'create': {        # Classify intent

                'en': ['new', 'create', 'add product', 'register', 'introduce'],        intent = self._classify_intent(transcript)

                'ro': ['nou', 'creez', 'adaug produs', 'înregistrez', 'introduc']        print(f"Detected intent: {intent}")

            }

        }        # Extract entities

        entities = self._extract_entities(transcript)

        # Calculate intent scores        print(f"Extracted entities: {entities}")

        intent_scores = {}

        for intent, keywords in intent_keywords.items():        # Normalize item name

            score = 0        item = self._normalize_item_name(entities.get('item', ''))

            for keyword in keywords[lang]:        quantity = entities.get('quantity')

                if keyword in text_lower:

                    score += 1        return VoiceCommand(

            # Also check for partial matches            type=intent,

            for keyword in keywords[lang]:            item=item,

                for word in text_lower.split():            quantity=quantity,

                    if keyword in word or word in keyword:            notes=transcript

                        score += 0.5        )

            intent_scores[intent] = score

    def _normalize_item_name(self, raw_name: str) -> Optional[str]:

        # Get the highest scoring intent        """Normalize item names to match database entries"""

        best_intent = max(intent_scores, key=intent_scores.get)        if not raw_name:

        confidence = intent_scores[best_intent] / max(1, sum(intent_scores.values()))            return None



        return {        name = raw_name.lower().strip()

            'intent': best_intent if confidence > 0.1 else 'unknown',

            'confidence': confidence,        item_mappings = {

            'scores': intent_scores            'glove': 'Disposable Gloves',

        }            'gloves': 'Disposable Gloves',

            'mask': 'Surgical Masks',

    def _extract_entities_flexible(self, text: str, lang: str) -> Dict[str, Any]:            'masks': 'Surgical Masks',

        """Flexible entity extraction using NLP and pattern matching"""            'syringe': 'Syringes (10ml)',

        # Use appropriate spaCy model            'syringes': 'Syringes (10ml)',

        nlp = self.nlp_ro if lang == 'ro' else self.nlp_en            'bandage': 'Bandages',

        doc = nlp(text)            'bandages': 'Bandages',

            'thermometer': 'Thermometers',

        entities = {            'thermometers': 'Thermometers',

            'quantity': None,            'antiseptic': 'Antiseptic Solution',

            'item': None,            'solution': 'Antiseptic Solution',

            'unit': None,            'alcohol': 'Antiseptic Solution',

            'action': None            'gauze': 'Bandages',

        }            'tape': 'Medical Tape',

            'tape': 'Medical Tape',

        # Extract quantities with various formats            'needle': 'Syringes (10ml)',

        quantity_patterns = [            'needles': 'Syringes (10ml)',

            r'(\d+(?:\.\d+)?)\s*(?:buc|unit|pieces?|pcs?|cut|ml|mg|g|kg|l|liters?|tablets?|capsules?|vials?|syringes?|boxes?|packs?|tubes?|bottles?)',        }

            r'(\d+(?:\.\d+)?)',

        ]        # Direct mapping

        if name in item_mappings:

        for pattern in quantity_patterns:            return item_mappings[name]

            match = re.search(pattern, text, re.IGNORECASE)

            if match:        # Fuzzy matching

                try:        for key, value in item_mappings.items():

                    entities['quantity'] = float(match.group(1))            if key in name or name in key:

                    # Extract unit if present                return value

                    unit_match = re.search(r'\d+(?:\.\d+)?\s*(.+)', match.group(0))

                    if unit_match:        # Return title case if no mapping found

                        entities['unit'] = unit_match.group(1).strip().lower()        return raw_name.title() if raw_name else None

                    break

                except:ai_structurer = AIStructurer()
                    continue

        # Extract product names using NLP
        # Look for noun phrases that could be product names
        product_candidates = []

        # Romanian product keywords
        ro_product_keywords = ['măști', 'mască', 'mănuși', 'mănușă', 'seringi', 'seringă', 'bandaje', 'bandaj',
                              'termometre', 'termometru', 'antiseptice', 'antiseptic', 'dezinfectant', 'pastile',
                              'comprimate', 'fiole', 'fiolă', 'tuburi', 'tub', 'sticla', 'sticle']

        # English product keywords
        en_product_keywords = ['masks', 'mask', 'gloves', 'glove', 'syringes', 'syringe', 'bandages', 'bandage',
                              'thermometers', 'thermometer', 'antiseptic', 'tablets', 'capsules', 'vials', 'vial',
                              'tubes', 'tube', 'bottles', 'bottle']

        keywords = ro_product_keywords if lang == 'ro' else en_product_keywords

        # Find product mentions
        for token in doc:
            if token.pos_ in ['NOUN', 'PROPN']:
                # Check if token or its lemma matches product keywords
                token_text = token.text.lower()
                token_lemma = token.lemma_.lower()

                for keyword in keywords:
                    if keyword in token_text or keyword in token_lemma or token_text in keyword or token_lemma in keyword:
                        product_candidates.append(token.text)
                        break

                # Also check noun chunks
                for chunk in doc.noun_chunks:
                    chunk_text = chunk.text.lower()
                    for keyword in keywords:
                        if keyword in chunk_text or any(word in chunk_text for word in keyword.split()):
                            product_candidates.append(chunk.text)
                            break

        # Remove duplicates and select the most likely product
        product_candidates = list(set(product_candidates))
        if product_candidates:
            # Prefer longer, more specific names
            entities['item'] = max(product_candidates, key=len)

        # If no product found, try to extract from context
        if not entities['item']:
            # Look for unknown nouns that might be products
            for token in doc:
                if token.pos_ == 'NOUN' and len(token.text) > 2:
                    # Skip common non-product words
                    skip_words = ['time', 'day', 'way', 'man', 'woman', 'thing', 'part', 'case', 'work', 'group',
                                 'problem', 'fact', 'moment', 'world', 'life', 'hand', 'child', 'place', 'week',
                                 'timp', 'zi', 'mod', 'om', 'femeie', 'lucru', 'parte', 'caz', 'muncă', 'grup',
                                 'problemă', 'fapt', 'moment', 'lume', 'viață', 'mână', 'copil', 'loc', 'săptămână']

                    if token.lemma_.lower() not in skip_words:
                        entities['item'] = token.text
                        break

        return entities

    def structure_command(self, transcript: str) -> VoiceCommand:
        """Structure the voice transcript into a proper database command using NLP"""
        print(f"AI structuring transcript: '{transcript}'")

        self._load_models()

        # Detect language
        lang = self._detect_language(transcript)
        print(f"Detected language: {lang}")

        # Classify intent
        intent_result = self._classify_intent_advanced(transcript, lang)
        print(f"Intent classification: {intent_result}")

        # Extract entities
        entities = self._extract_entities_flexible(transcript, lang)
        print(f"Entity extraction: {entities}")

        # Normalize item name
        item = self._normalize_item_name(entities.get('item', ''), lang)

        return VoiceCommand(
            type=intent_result['intent'],
            item=item,
            quantity=entities.get('quantity'),
            notes=transcript
        )

    def _normalize_item_name(self, raw_name: str, lang: str) -> Optional[str]:
        """Normalize item names with multilingual support"""
        if not raw_name:
            return None

        name = raw_name.lower().strip()

        # Multilingual item mappings
        item_mappings = {
            # English
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
            'tablet': 'Tablets',
            'tablets': 'Tablets',
            'capsule': 'Capsules',
            'capsules': 'Capsules',
            'vial': 'Vials',
            'vials': 'Vials',
            'tube': 'Tubes',
            'tubes': 'Tubes',
            'bottle': 'Bottles',
            'bottles': 'Bottles',

            # Romanian
            'mănușă': 'Disposable Gloves',
            'mănuși': 'Disposable Gloves',
            'mască': 'Surgical Masks',
            'măști': 'Surgical Masks',
            'seringă': 'Syringes (10ml)',
            'seringi': 'Syringes (10ml)',
            'bandaj': 'Bandages',
            'bandaje': 'Bandages',
            'termometru': 'Thermometers',
            'termometre': 'Thermometers',
            'antiseptic': 'Antiseptic Solution',
            'dezinfectant': 'Antiseptic Solution',
            'pastilă': 'Tablets',
            'pastile': 'Tablets',
            'comprimate': 'Tablets',
            'capsulă': 'Capsules',
            'capsule': 'Capsules',
            'fiolă': 'Vials',
            'fiole': 'Vials',
            'tub': 'Tubes',
            'tuburi': 'Tubes',
            'sticlă': 'Bottles',
            'sticle': 'Bottles'
        }

        # Direct mapping
        if name in item_mappings:
            return item_mappings[name]

        # Fuzzy matching
        for key, value in item_mappings.items():
            if key in name or name in key:
                return value

        # If no mapping found, return title case (could be a new product)
        return raw_name.title() if raw_name else None

ai_structurer = AIStructurer()