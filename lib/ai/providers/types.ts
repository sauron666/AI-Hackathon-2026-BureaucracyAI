/**
 * Common types and interfaces for all AI providers.
 * Each provider must implement the AIProvider interface.
 */

export type AIProviderId =
  | 'sirma'
  | 'anthropic'
  | 'openai'
  | 'google'
  | 'cohere'
  | 'ollama';

export interface AIProviderRequest {
  /** Combined user + system message. Providers that distinguish split internally. */
  message: string;
  /** Optional system prompt override (provider may merge into message if not natively supported). */
  systemPrompt?: string;
  /** Conversation history for multi-turn. */
  history?: Array<{ role: 'user' | 'assistant'; content: string }>;
  /** Sirma-specific: continue an existing conversation. */
  sessionId?: string;
  /** Sirma-specific: identify a registered user. */
  userId?: string;
  /** Generation tuning. */
  temperature?: number;
  maxTokens?: number;
  /** Specific model id within the provider (e.g. 'claude-sonnet-4-20250514'). */
  model?: string;
  /** Caller-controlled timeout in ms. */
  timeoutMs?: number;
}

export interface AIProviderResponse {
  /** The textual content the model produced. */
  content: string;
  /** Provider that produced the response. */
  provider: AIProviderId;
  /** Concrete model that handled the request. */
  model: string;
  /** Sirma-specific: opaque session id for continuation. */
  sessionId?: string;
  /** Sirma-specific: opaque run id for tracing. */
  runId?: string;
  /** Token usage if the provider reports it. */
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
  /** Latency from request to first byte (ms). */
  latencyMs?: number;
}

export type AIProviderHealth =
  | { status: 'ok'; configured: true; reachable: true }
  | { status: 'unconfigured'; configured: false; reachable: false; reason: string }
  | { status: 'unreachable'; configured: true; reachable: false; reason: string };

export interface AIProvider {
  readonly id: AIProviderId;
  readonly displayName: string;
  /** Models this provider exposes by default. UI shows these in the model dropdown. */
  readonly availableModels: ReadonlyArray<{
    id: string;
    label: string;
    notes?: string;
  }>;
  /** Default model when caller does not specify. */
  readonly defaultModel: string;
  /** Returns true if env vars / config are set. Cheap, no network call. */
  isConfigured(): boolean;
  /** Network probe. Cached at the router level. */
  checkHealth(): Promise<AIProviderHealth>;
  /** Run a single message-response turn. Throws on errors. */
  run(req: AIProviderRequest): Promise<AIProviderResponse>;
}

export class AIProviderError extends Error {
  constructor(
    message: string,
    public readonly providerId: AIProviderId,
    public readonly statusCode?: number,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'AIProviderError';
  }
}

export class AIProviderUnconfiguredError extends AIProviderError {
  constructor(providerId: AIProviderId, reason: string) {
    super(`Provider "${providerId}" is not configured: ${reason}`, providerId);
    this.name = 'AIProviderUnconfiguredError';
  }
}
