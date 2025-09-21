export interface VoiceCommand {
  type: "usage" | "query" | "update" | "unknown";
  item?: string;
  quantity?: number;
  notes?: string;
}

export interface VoiceResponse {
  message: string;
  success: boolean;
  data?: any;
}

export interface ProcessVoiceResponse {
  transcript: string;
  command: VoiceCommand;
  response: VoiceResponse;
  audio_response?: string | null;
}

export class VoiceAssistant {
  private mediaRecorder: MediaRecorder | null = null;
  private audioChunks: Blob[] = [];
  private isListening = false;
  private synthesis: SpeechSynthesis | null = null;
  private silenceTimer: NodeJS.Timeout | null = null;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private silenceThreshold = 0.01;
  private silenceDuration = 1500;

  constructor() {
    if (typeof window !== "undefined") {
      this.synthesis = window.speechSynthesis;
    }
  }

  async startRecording(): Promise<void> {
    return new Promise(async (resolve, reject) => {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        reject(new Error("Media devices not supported"));
        return;
      }

      if (!window.MediaRecorder) {
        reject(new Error("MediaRecorder not supported"));
        return;
      }

      try {
        console.log("Requesting microphone access...");
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
        console.log("Microphone access granted");

        const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
          ? "audio/webm;codecs=opus"
          : MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : "audio/ogg";

        console.log("Using MIME type:", mimeType);
        this.mediaRecorder = new MediaRecorder(stream, {
          mimeType: mimeType,
        });
        this.audioChunks = [];

        this.mediaRecorder.ondataavailable = (event) => {
          console.log("Audio data available, size:", event.data.size);
          this.audioChunks.push(event.data);
        };

        this.mediaRecorder.onstop = () => {
          console.log("Recording stopped manually");
          stream.getTracks().forEach((track) => track.stop());
        };

        this.mediaRecorder.onerror = (event) => {
          console.error("MediaRecorder error:", event);
          reject(new Error("Recording failed"));
          stream.getTracks().forEach((track) => track.stop());
        };

        this.isListening = true;
        console.log("Starting recording...");
        this.mediaRecorder.start(100);
        resolve();
      } catch (error) {
        console.error("Microphone access error:", error);
        reject(
          new Error(
            "Could not access microphone: " +
              (error instanceof Error ? error.message : String(error))
          )
        );
      }
    });
  }

  async stopRecordingAndProcess(): Promise<ProcessVoiceResponse> {
    return new Promise(async (resolve, reject) => {
      if (!this.mediaRecorder || !this.isListening) {
        reject(new Error("No active recording"));
        return;
      }

      this.mediaRecorder.onstop = async () => {
        console.log("Recording stopped, processing audio...");

        const audioBlob = new Blob(this.audioChunks, {
          type: this.mediaRecorder?.mimeType || "audio/webm",
        });
        console.log("Audio blob created, size:", audioBlob.size);

        if (audioBlob.size < 1000) {
          reject(new Error("Recording too short or no audio detected"));
          return;
        }

        const audioData = await this.blobToBase64(audioBlob);
        console.log("Audio converted to base64, length:", audioData.length);

        try {
          console.log("Sending audio to server...");
          const response = await fetch(
            "http://localhost:8000/api/process-voice",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                audio: audioData,
                language: "en",
              }),
            }
          );

          console.log("Server response status:", response.status);
          if (!response.ok) {
            throw new Error("Server error: " + response.status);
          }

          const result: ProcessVoiceResponse = await response.json();
          console.log("Server response:", result);
          resolve(result);
        } catch (error) {
          console.error("Server error:", error);
          reject(
            new Error(
              "Failed to process audio: " +
                (error instanceof Error ? error.message : String(error))
            )
          );
        } finally {
          this.isListening = false;
        }
      };

      this.mediaRecorder.stop();
    });
  }

  async processText(
    text: string,
    language: string = "en"
  ): Promise<ProcessVoiceResponse> {
    const res = await fetch("http://localhost:8000/api/process-text", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, language }),
    });
    if (!res.ok) {
      throw new Error(`Server error: ${res.status}`);
    }
    return (await res.json()) as ProcessVoiceResponse;
  }

  stopListening() {
    if (this.mediaRecorder && this.isListening) {
      console.log("Stopping recording...");
      this.mediaRecorder.stop();
      this.isListening = false;
      this.cleanupAudioAnalysis();
    }
  }

  private setupAudioAnalysis(stream: MediaStream) {
    try {
      this.audioContext = new (window.AudioContext ||
        (window as any).webkitAudioContext)();
      this.analyser = this.audioContext.createAnalyser();
      const source = this.audioContext.createMediaStreamSource(stream);
      source.connect(this.analyser);

      this.analyser.fftSize = 256;
      const bufferLength = this.analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const checkSilence = () => {
        if (!this.isListening) return;

        this.analyser!.getByteFrequencyData(dataArray);

        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const average = sum / bufferLength;
        const normalizedVolume = average / 255;

        console.log("Audio level:", normalizedVolume.toFixed(3));

        if (normalizedVolume < this.silenceThreshold) {
          if (!this.silenceTimer) {
            console.log("Silence detected, starting timer...");
            this.silenceTimer = setTimeout(() => {
              console.log("Silence timeout reached, stopping recording");
              this.stopListening();
            }, this.silenceDuration);
          }
        } else {
          if (this.silenceTimer) {
            console.log("Speech detected, clearing silence timer");
            clearTimeout(this.silenceTimer);
            this.silenceTimer = null;
          }
        }

        requestAnimationFrame(checkSilence);
      };

      checkSilence();
    } catch (error) {
      console.warn("Audio analysis setup failed:", error);
    }
  }

  private cleanupAudioAnalysis() {
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    this.analyser = null;
  }

  private blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(",")[1]);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  parseCommand(transcript: string): VoiceCommand {
    return {
      type: "unknown",
      item: undefined,
      quantity: undefined,
      notes: undefined,
    };
  }

  speak(text: string): Promise<void> {
    return new Promise((resolve) => {
      if (!this.synthesis) {
        resolve();
        return;
      }

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      utterance.pitch = 1;
      utterance.volume = 0.8;

      utterance.onend = () => resolve();
      utterance.onerror = () => resolve();

      this.synthesis.speak(utterance);
    });
  }

  getIsListening(): boolean {
    return this.isListening;
  }

  async playBase64Audio(base64Wav: string): Promise<void> {
    try {
      const audio = new Audio(`data:audio/wav;base64,${base64Wav}`);
      await new Promise<void>((resolve) => {
        audio.onended = () => resolve();
        audio.onerror = () => resolve();
        audio.play().catch(() => resolve());
      });
    } catch {}
  }
}

let voiceAssistantInstance: VoiceAssistant | null = null;

export const getVoiceAssistant = (): VoiceAssistant => {
  if (!voiceAssistantInstance) {
    voiceAssistantInstance = new VoiceAssistant();
  }
  return voiceAssistantInstance;
};
