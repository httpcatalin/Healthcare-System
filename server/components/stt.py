import torch
import numpy as np
import io
import base64
import librosa
from pydub import AudioSegment

import os

class SpeechToText:
    def __init__(self):
        self.pipe = None
        self._pipeline_imported = False
        self._is_multilingual = True
        env_model = os.getenv("STT_MODEL")
        if env_model:
            self._model_id = env_model
        else:
            if torch.cuda.is_available():
                self._model_id = "openai/whisper-large-v3"
            else:
                self._model_id = "openai/whisper-base"

    def _load_model(self):
        if self.pipe is None:
            print(f"Loading Whisper model: {self._model_id} ...")
            if not self._pipeline_imported:
                from transformers import pipeline
                self._pipeline_imported = True

            self._is_multilingual = True
            self.pipe = pipeline(
                "automatic-speech-recognition",
                model=self._model_id,
                device=0 if torch.cuda.is_available() else -1,
                torch_dtype=torch.float16 if torch.cuda.is_available() else None,
                chunk_length_s=15,
            )
            print(f"Whisper model '{self._model_id}' loaded successfully")

    def transcribe(self, audio_data: str, language: str = "en") -> str:
        try:
            print(f"Starting transcription, audio data length: {len(audio_data)}")
            self._load_model()
            
            audio_bytes = base64.b64decode(audio_data)
            print(f"Decoded audio bytes: {len(audio_bytes)}")
            
            print("Converting audio format with pydub...")
            audio_segment = AudioSegment.from_file(io.BytesIO(audio_bytes))
            
            wav_buffer = io.BytesIO()
            audio_segment.export(wav_buffer, format="wav")
            wav_buffer.seek(0)
            
            print("Loading audio with librosa...")
            audio_array, sample_rate = librosa.load(wav_buffer, sr=16000, mono=True)
            max_len = 16000 * 15
            if audio_array.shape[0] > max_len:
                audio_array = audio_array[:max_len]
            print(f"Audio loaded - shape: {audio_array.shape}, sample_rate: {sample_rate}")
            
            if len(audio_array) == 0:
                return "No audio data received"
            
            print(f"Audio array stats - min: {audio_array.min():.6f}, max: {audio_array.max():.6f}, mean: {audio_array.mean():.6f}")
            
            lang_in = (language or "en").lower()
            lang = "ro" if lang_in.startswith("ro") else "en"
            
            print("Running Whisper inference...")
            result = self.pipe(audio_array, generate_kwargs={"task": "transcribe", "language": lang})
            transcript = result["text"].strip()
            print(f"Transcription result: '{transcript}'")
            
            return transcript if transcript else "No speech detected"
            
        except Exception as e:
            error_msg = f"Error processing audio: {str(e)}"
            print(error_msg)
            import traceback
            traceback.print_exc()
            return error_msg

stt = SpeechToText()