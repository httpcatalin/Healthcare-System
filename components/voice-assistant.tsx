'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Mic,
  MicOff,
  Volume2,
  Loader2,
  MessageSquare,
  CheckCircle,
  XCircle
} from 'lucide-react'
import {
  getVoiceAssistant,
  type VoiceCommand,
  type VoiceResponse
} from '@/lib/voice-assistant'
import { getInventoryItems, logUsage, updateStock } from '@/lib/inventory'
import { useAuth } from '@/hooks/use-auth'
import { cn } from '@/lib/utils'

interface CommandHistory {
  id: string
  timestamp: Date
  transcript: string
  command: VoiceCommand
  response: VoiceResponse
}

export function VoiceAssistant() {
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [commandHistory, setCommandHistory] = useState<CommandHistory[]>([])
  const [error, setError] = useState('')
  const [lastResponse, setLastResponse] = useState<VoiceResponse | null>(null)
  const [textCommand, setTextCommand] = useState('')
  const { auth } = useAuth()

  const voiceAssistant = getVoiceAssistant()

  const handleMicToggle = async () => {
    if (isListening) {
      // Stop recording and process
      try {
        setIsProcessing(true)
        const result = await voiceAssistant.stopRecordingAndProcess()
        setTranscript(result.transcript)
        setIsListening(false)
        await processCommand(result)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to process recording')
        setIsListening(false)
        setIsProcessing(false)
      }
    } else {
      // Start recording
      try {
        setError('')
        setTranscript('')
        setLastResponse(null)
        await voiceAssistant.startRecording()
        setIsListening(true)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to start recording')
      }
    }
  }

  const handleStopListening = () => {
    if (isListening) {
      voiceAssistant.stopListening()
      setIsListening(false)
      setError('Recording cancelled')
    }
  }

  const processCommand = async (serverResponse: any) => {
    setIsProcessing(true)

    try {
      const historyEntry: CommandHistory = {
        id: Date.now().toString(),
        timestamp: new Date(),
        transcript: serverResponse.transcript,
        command: serverResponse.command,
        response: serverResponse.response
      }

      setCommandHistory((prev) => [historyEntry, ...prev.slice(0, 9)])
      setLastResponse(serverResponse.response)

      if (serverResponse.audio_response) {
        await voiceAssistant.playBase64Audio(serverResponse.audio_response)
      } else if (serverResponse.response?.message) {
        await voiceAssistant.speak(serverResponse.response.message)
      }
    } catch (err) {
      const errorResponse: VoiceResponse = {
        message: "Sorry, I couldn't process that command.",
        success: false
      }
      setLastResponse(errorResponse)
      await voiceAssistant.speak(errorResponse.message)
    } finally {
      setIsProcessing(false)
    }
  }

  const submitTextCommand = async () => {
    if (!textCommand.trim()) return
    setIsProcessing(true)
    setError('')
    try {
      const result = await voiceAssistant.processText(textCommand, 'en')
      setTranscript(result.transcript)
      setLastResponse(result.response)
      setCommandHistory((prev) => [
        {
          id: Date.now().toString(),
          timestamp: new Date(),
          transcript: result.transcript,
          command: result.command,
          response: result.response
        },
        ...prev.slice(0, 9)
      ])

      if (result.audio_response) {
        await voiceAssistant.playBase64Audio(result.audio_response)
      } else if (result.response?.message) {
        await voiceAssistant.speak(result.response.message)
      }
      setTextCommand('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to process text')
    } finally {
      setIsProcessing(false)
    }
  }

  const executeCommand = async (command: VoiceCommand): Promise<VoiceResponse> => {
    const items = await getInventoryItems()

    switch (command.type) {
      case 'usage':
        if (command.item && command.quantity && auth.user) {
          const item = items.find(
            (i: any) =>
              i.name.toLowerCase().includes(command.item!.toLowerCase()) ||
              command.item!.toLowerCase().includes(i.name.toLowerCase())
          )

          if (item) {
            if (item.currentStock >= command.quantity) {
              await logUsage(item.id, command.quantity, auth.user.name, command.notes)
              return {
                message: `Logged usage of ${command.quantity} ${item.unit} of ${
                  item.name
                }. Remaining stock: ${item.currentStock - command.quantity} ${
                  item.unit
                }.`,
                success: true,
                data: { item: item.name, quantity: command.quantity }
              }
            } else {
              return {
                message: `Insufficient stock. Only ${item.currentStock} ${item.unit} of ${item.name} available.`,
                success: false
              }
            }
          } else {
            return {
              message: `Item "${command.item}" not found in inventory.`,
              success: false
            }
          }
        }
        break

      case 'query':
        if (command.item) {
          const item = items.find(
            (i: any) =>
              i.name.toLowerCase().includes(command.item!.toLowerCase()) ||
              command.item!.toLowerCase().includes(i.name.toLowerCase())
          )

          if (item) {
            const statusText =
              item.status === 'low-stock'
                ? 'low stock alert'
                : item.status === 'out-of-stock'
                ? 'out of stock'
                : 'in stock'
            return {
              message: `${item.name}: ${item.currentStock} ${item.unit} available. Status: ${statusText}.`,
              success: true,
              data: {
                item: item.name,
                stock: item.currentStock,
                status: item.status
              }
            }
          } else {
            return {
              message: `Item "${command.item}" not found in inventory.`,
              success: false
            }
          }
        }
        break

      case 'update':
        if (command.item && command.quantity !== undefined) {
          const item = items.find(
            (i: any) =>
              i.name.toLowerCase().includes(command.item!.toLowerCase()) ||
              command.item!.toLowerCase().includes(i.name.toLowerCase())
          )

          if (item) {
            await updateStock(item.id, command.quantity)
            return {
              message: `Updated ${item.name} stock to ${command.quantity} ${item.unit}.`,
              success: true,
              data: { item: item.name, newStock: command.quantity }
            }
          } else {
            return {
              message: `Item "${command.item}" not found in inventory.`,
              success: false
            }
          }
        }
        break

      default:
        return {
          message:
            "I didn't understand that command. Try saying something like 'We used 5 gloves' or 'How many masks do we have?'",
          success: false
        }
    }

    return {
      message: "Sorry, I couldn't process that command.",
      success: false
    }
  }

  const getCommandTypeColor = (type: VoiceCommand['type']) => {
    switch (type) {
      case 'usage':
        return 'bg-blue-100 text-blue-800'
      case 'query':
        return 'bg-green-100 text-green-800'
      case 'update':
        return 'bg-purple-100 text-purple-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="space-y-6">
      {/* Voice Control Panel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-bold text-xl">
            <MessageSquare className="h-5 w-5" />
            Voice Assistant
          </CardTitle>
          <CardDescription>
            Use voice commands to manage inventory. Click the microphone once to start
            recording, then click again when you're finished speaking to send your
            request. Try saying "We used 10 gloves" or "How many masks do we have?"
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center space-y-4">
            {/* Microphone Button */}
            <div className="relative">
              <Button
                size="lg"
                variant={isListening ? 'destructive' : 'default'}
                className={cn(
                  `h-20 w-20 rounded-full`,
                  isListening ? 'animate-pulse' : ''
                )}
                onClick={handleMicToggle}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <Loader2 className="h-8 w-8 animate-spin" />
                ) : isListening ? (
                  <MicOff className="h-8 w-8" />
                ) : (
                  <Mic className="h-8 w-8" />
                )}
              </Button>
              {isListening && (
                <div
                  className="absolute -inset-2 rounded-full border-2 border-destructive animate-ping pointer-events-none"
                  aria-hidden="true"
                />
              )}
            </div>

            {/* Status */}
            <div className="text-center">
              {isListening && (
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground animate-pulse">
                    🔴 Recording... Click again when finished
                  </p>
                  <p className="text-xs text-muted-foreground">Say your command now</p>
                </div>
              )}
              {isProcessing && (
                <p className="text-sm text-muted-foreground">Processing command...</p>
              )}
              {!isListening && !isProcessing && (
                <p className="text-sm text-muted-foreground">
                  Click the microphone to start recording
                </p>
              )}
            </div>

            {/* Last Transcript */}
            {transcript && (
              <div className="w-full max-w-md">
                <p className="text-sm font-medium mb-1">You said:</p>
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm">"{transcript}"</p>
                </div>
              </div>
            )}

            {/* Last Response */}
            {lastResponse && (
              <div className="w-full max-w-md">
                <div
                  className={`p-3 rounded-lg flex items-start gap-2 ${
                    lastResponse.success
                      ? 'bg-green-50 border border-green-200'
                      : 'bg-red-50 border border-red-200'
                  }`}
                >
                  {lastResponse.success ? (
                    <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                  )}
                  <div className="flex-1">
                    <p className="text-sm font-medium mb-1">Assistant Response:</p>
                    <p className="text-sm">{lastResponse.message}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => voiceAssistant.speak(lastResponse.message)}
                  >
                    <Volume2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            )}

            {/* Error Display */}
            {error && (
              <Alert variant="destructive" className="max-w-md">
                <AlertDescription>
                  <strong>Error:</strong> {error}
                  <br />
                  <small>Check browser console for more details</small>
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Text Command Input */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-bold text-xl">
            <MessageSquare className="h-5 w-5" />
            Text Command
          </CardTitle>
          <CardDescription>
            Prefer typing? Enter the same kind of command here (English or Romanian).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3 max-w-xl">
            <Input
              placeholder="e.g., We used 5 gloves / Câte măști mai sunt?"
              value={textCommand}
              onChange={(e) => setTextCommand(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !isProcessing) submitTextCommand()
              }}
              disabled={isProcessing}
            />
            <Button
              onClick={submitTextCommand}
              disabled={isProcessing || !textCommand.trim()}
            >
              {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Send'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Command Examples */}
      <Card>
        <CardHeader>
          <CardTitle>Voice Command Examples</CardTitle>
          <CardDescription>Here are some example commands you can try</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <h4 className="font-medium mb-2 text-blue-700">Usage Commands</h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>"We used 10 gloves"</li>
                <li>"Used 5 masks for procedures"</li>
                <li>"Took 3 syringes"</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2 text-green-700">Stock Queries</h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>"How many gloves do we have?"</li>
                <li>"Check stock for masks"</li>
                <li>"Do we have any bandages?"</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2 text-purple-700">Stock Updates</h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>"Add 50 gloves"</li>
                <li>"Set masks to 100"</li>
                <li>"Restock 25 syringes"</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Command History */}
      {commandHistory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Commands</CardTitle>
            <CardDescription>History of your recent voice commands</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {commandHistory.map((entry) => (
                <div key={entry.id} className="border rounded-lg p-3">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Badge className={getCommandTypeColor(entry.command.type)}>
                        {entry.command.type}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {entry.timestamp.toLocaleTimeString()}
                      </span>
                    </div>
                    {entry.response.success ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-600" />
                    )}
                  </div>
                  <p className="text-sm mb-1">
                    <strong>You:</strong> "{entry.transcript}"
                  </p>
                  <p className="text-sm text-muted-foreground">
                    <strong>Assistant:</strong> {entry.response.message}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
