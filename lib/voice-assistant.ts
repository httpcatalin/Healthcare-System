export interface VoiceCommand {
  type: "usage" | "query" | "update" | "unknown"
  action: string
  item?: string
  quantity?: number
  notes?: string
  confidence: number
}

export interface VoiceResponse {
  message: string
  success: boolean
  data?: any
}

// Simple NLP patterns for healthcare inventory commands
const USAGE_PATTERNS = [
  /(?:used?|consumed?|took)\s+(\d+)\s+(.+?)(?:\s+(?:for|during|in)\s+(.+))?$/i,
  /(\d+)\s+(.+?)\s+(?:were?|was)\s+used?/i,
  /we\s+used?\s+(\d+)\s+(.+)/i,
]

const QUERY_PATTERNS = [
  /(?:how\s+many|what's\s+the\s+stock\s+of|check\s+stock\s+for)\s+(.+)/i,
  /(?:do\s+we\s+have|are\s+there)\s+(?:any\s+)?(.+)/i,
  /stock\s+(?:level\s+)?(?:of\s+|for\s+)?(.+)/i,
]

const UPDATE_PATTERNS = [
  /(?:add|restock|update)\s+(\d+)\s+(.+)/i,
  /set\s+(.+?)\s+(?:stock\s+)?(?:to\s+)?(\d+)/i,
  /(\d+)\s+(.+?)\s+(?:added|restocked)/i,
]

// Mock item name mapping for better recognition
const ITEM_ALIASES: Record<string, string> = {
  gloves: "Disposable Gloves",
  glove: "Disposable Gloves",
  masks: "Surgical Masks",
  mask: "Surgical Masks",
  syringes: "Syringes (10ml)",
  syringe: "Syringes (10ml)",
  bandages: "Bandages",
  bandage: "Bandages",
  thermometers: "Thermometers",
  thermometer: "Thermometers",
  antiseptic: "Antiseptic Solution",
}

declare const SpeechRecognition: any // Declare SpeechRecognition

export class VoiceAssistant {
  private recognition: any | null = null // Use any type for SpeechRecognition
  private synthesis: SpeechSynthesis | null = null
  private isListening = false

  constructor() {
    if (typeof window !== "undefined") {
      // Initialize speech recognition
      this.recognition = window.SpeechRecognition || (window as any).webkitSpeechRecognition
      if (this.recognition) {
        this.recognition.continuous = false
        this.recognition.interimResults = false
        this.recognition.lang = "en-US"
      }

      // Initialize speech synthesis
      this.synthesis = window.speechSynthesis
    }
  }

  async startListening(): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!this.recognition) {
        reject(new Error("Speech recognition not supported"))
        return
      }

      this.isListening = true

      this.recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript
        this.isListening = false
        resolve(transcript)
      }

      this.recognition.onerror = (event) => {
        this.isListening = false
        reject(new Error(`Speech recognition error: ${event.error}`))
      }

      this.recognition.onend = () => {
        this.isListening = false
      }

      this.recognition.start()
    })
  }

  stopListening() {
    if (this.recognition && this.isListening) {
      this.recognition.stop()
      this.isListening = false
    }
  }

  parseCommand(transcript: string): VoiceCommand {
    const cleanTranscript = transcript.toLowerCase().trim()

    // Check for usage patterns
    for (const pattern of USAGE_PATTERNS) {
      const match = cleanTranscript.match(pattern)
      if (match) {
        const quantity = Number.parseInt(match[1])
        const item = this.normalizeItemName(match[2])
        const notes = match[3] || ""

        return {
          type: "usage",
          action: "log_usage",
          item,
          quantity,
          notes,
          confidence: 0.8,
        }
      }
    }

    // Check for query patterns
    for (const pattern of QUERY_PATTERNS) {
      const match = cleanTranscript.match(pattern)
      if (match) {
        const item = this.normalizeItemName(match[1])

        return {
          type: "query",
          action: "check_stock",
          item,
          confidence: 0.8,
        }
      }
    }

    // Check for update patterns
    for (const pattern of UPDATE_PATTERNS) {
      const match = cleanTranscript.match(pattern)
      if (match) {
        let quantity: number
        let item: string

        if (pattern === UPDATE_PATTERNS[1]) {
          // "set item to quantity" pattern
          item = this.normalizeItemName(match[1])
          quantity = Number.parseInt(match[2])
        } else {
          quantity = Number.parseInt(match[1])
          item = this.normalizeItemName(match[2])
        }

        return {
          type: "update",
          action: "update_stock",
          item,
          quantity,
          confidence: 0.8,
        }
      }
    }

    return {
      type: "unknown",
      action: "unknown",
      confidence: 0.1,
    }
  }

  private normalizeItemName(rawName: string): string {
    const cleaned = rawName.toLowerCase().trim()

    // Check aliases first
    if (ITEM_ALIASES[cleaned]) {
      return ITEM_ALIASES[cleaned]
    }

    // Try partial matches
    for (const [alias, fullName] of Object.entries(ITEM_ALIASES)) {
      if (cleaned.includes(alias) || alias.includes(cleaned)) {
        return fullName
      }
    }

    // Return capitalized version if no match
    return rawName
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ")
  }

  speak(text: string): Promise<void> {
    return new Promise((resolve) => {
      if (!this.synthesis) {
        resolve()
        return
      }

      const utterance = new SpeechSynthesisUtterance(text)
      utterance.rate = 0.9
      utterance.pitch = 1
      utterance.volume = 0.8

      utterance.onend = () => resolve()
      utterance.onerror = () => resolve()

      this.synthesis.speak(utterance)
    })
  }

  getIsListening(): boolean {
    return this.isListening
  }
}

// Singleton instance
let voiceAssistantInstance: VoiceAssistant | null = null

export const getVoiceAssistant = (): VoiceAssistant => {
  if (!voiceAssistantInstance) {
    voiceAssistantInstance = new VoiceAssistant()
  }
  return voiceAssistantInstance
}
