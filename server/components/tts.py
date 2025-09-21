import torch
import numpy as np
import io
import base64
from transformers import VitsModel, AutoTokenizer
import scipy.io.wavfile

class TextToSpeech:
    def __init__(self):
        self.model = None
        self.tokenizer = None
        self._model_loaded = False

    def _load_model(self):
        if not self._model_loaded:
            print("Loading lightweight TTS model (facebook/mms-tts-eng)...")
            self.model = VitsModel.from_pretrained("facebook/mms-tts-eng")
            self.tokenizer = AutoTokenizer.from_pretrained("facebook/mms-tts-eng")
            self._model_loaded = True
            print("TTS model loaded successfully")

    def speak(self, text: str) -> bytes:
        self._load_model()

        inputs = self.tokenizer(text, return_tensors="pt")
        inputs["input_ids"] = inputs["input_ids"].long()

        with torch.no_grad():
            output = self.model(**inputs).waveform

        audio_array = output.squeeze().numpy()

        audio_array = (audio_array * 32767).astype(np.int16)

        wav_buffer = io.BytesIO()
        scipy.io.wavfile.write(wav_buffer, rate=self.model.config.sampling_rate, data=audio_array)
        wav_buffer.seek(0)

        return wav_buffer.getvalue()

    def get_audio_base64(self, text: str) -> str:
        audio_data = self.speak(text)
        return base64.b64encode(audio_data).decode('utf-8')

tts = TextToSpeech()
