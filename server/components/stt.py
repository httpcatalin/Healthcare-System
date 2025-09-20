import torch
import numpy as np
import io
import base64
import librosa
from pydub import AudioSegment

class SpeechToText:
    def __init__(self):
        self.pipe = None
        self._pipeline_imported = False
        self._is_multilingual = False
        self._model_id = "openai/whisper-tiny.en"

    def _load_model(self):
        if self.pipe is None:
            print("Loading Whisper tiny.en model...")
            if not self._pipeline_imported:
                from transformers import pipeline
                self._pipeline_imported = True

            # English-only model: do NOT pass language/task
            self._is_multilingual = False
            self.pipe = pipeline(
                "automatic-speech-recognition",
                model=self._model_id,
                device=0 if torch.cuda.is_available() else -1,
                torch_dtype=torch.float16 if torch.cuda.is_available() else None,
                chunk_length_s=15,
            )
            print("Whisper tiny.en model loaded successfully")

    def transcribe(self, audio_data: str, language: str = "en") -> str:
        try:
            print(f"Starting transcription, audio data length: {len(audio_data)}")
            self._load_model()
            
            audio_bytes = base64.b64decode(audio_data)
            print(f"Decoded audio bytes: {len(audio_bytes)}")
            
            # Use pydub to handle different audio formats
            print("Converting audio format with pydub...")
            audio_segment = AudioSegment.from_file(io.BytesIO(audio_bytes))
            
            # Export as WAV for librosa compatibility
            wav_buffer = io.BytesIO()
            audio_segment.export(wav_buffer, format="wav")
            wav_buffer.seek(0)
            
            print("Loading audio with librosa...")
            audio_array, sample_rate = librosa.load(wav_buffer, sr=16000, mono=True)
            # Keep only first 15 seconds to ensure snappy processing
            max_len = 16000 * 15
            if audio_array.shape[0] > max_len:
                audio_array = audio_array[:max_len]
            print(f"Audio loaded - shape: {audio_array.shape}, sample_rate: {sample_rate}")
            
            if len(audio_array) == 0:
                return "No audio data received"
            
            print(f"Audio array stats - min: {audio_array.min():.6f}, max: {audio_array.max():.6f}, mean: {audio_array.mean():.6f}")
            
            # Only set forced decoder ids for multilingual models
            if self._is_multilingual:
                lang = language if language in ("en", "ro") else "en"
                self.pipe.model.generation_config.forced_decoder_ids = self.pipe.tokenizer.get_decoder_prompt_ids(
                    language=lang,
                    task="transcribe",
                )
            else:
                # Ensure no language/task is forced for english-only model
                if hasattr(self.pipe.model, "generation_config"):
                    self.pipe.model.generation_config.forced_decoder_ids = None
            
            print("Running Whisper inference...")
            result = self.pipe(audio_array)
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