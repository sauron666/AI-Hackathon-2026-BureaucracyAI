// Hot-swappable AI provider configuration
// Change AI_PROVIDER env var to switch between providers

export type AIProvider = "google" | "openai" | "anthropic"

export function getModelId(): string {
  const provider = (process.env.AI_PROVIDER || "google") as AIProvider
  
  switch (provider) {
    case "google":
      return "google/gemini-2.0-flash"
    case "openai":
      return "openai/gpt-4o"
    case "anthropic":
      return "anthropic/claude-sonnet-4-20250514"
    default:
      return "google/gemini-2.0-flash"
  }
}

export function getProviderName(): string {
  const provider = (process.env.AI_PROVIDER || "google") as AIProvider
  
  switch (provider) {
    case "google":
      return "Gemini"
    case "openai":
      return "GPT-4"
    case "anthropic":
      return "Claude"
    default:
      return "AI"
  }
}
