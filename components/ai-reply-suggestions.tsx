"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"

interface AIReplySuggestionsProps {
  messageContent: string
  threadContext: string[]
  organizationContext?: string
  onSuggestionSelect: (suggestion: string) => void
}

export function AIReplySuggestions({
  messageContent,
  threadContext,
  organizationContext,
  onSuggestionSelect,
}: AIReplySuggestionsProps) {
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleGenerateSuggestions = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/ai/reply", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messageContent,
          threadContext,
          organizationContext,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to generate suggestions")
      }

      const data = await response.json()
      setSuggestions(data.suggestions)
    } catch (err) {
      setError("Failed to generate suggestions. Please try again.")
      console.error("Error generating suggestions:", err)
    } finally {
      setIsLoading(false)
    }
  }

  if (suggestions.length === 0 && !isLoading && !error) {
    return (
      <div className="text-center">
        <Button
          variant="outline"
          size="sm"
          onClick={handleGenerateSuggestions}
          className="text-blue-400 hover:text-blue-300 hover:bg-blue-900/20"
        >
          Generate AI Reply Suggestions
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {isLoading ? (
        <div className="flex items-center justify-center py-2">
          <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
          <span className="ml-2 text-sm text-gray-400">Generating suggestions...</span>
        </div>
      ) : error ? (
        <div className="text-sm text-red-400">{error}</div>
      ) : (
        <div className="space-y-2">
          {suggestions.map((suggestion, index) => (
            <button
              key={index}
              onClick={() => onSuggestionSelect(suggestion)}
              className="w-full text-left p-2 rounded hover:bg-gray-700 text-sm text-gray-200"
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}
    </div>
  )
} 