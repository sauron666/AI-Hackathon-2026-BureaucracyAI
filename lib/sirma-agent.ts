/**
 * Sirma Agent API wrapper.
 * Handles agent execution via Sirma's AI platform.
 *
 * Key insight: Without user_id, Sirma creates a temp user and returns JSON.
 * With user_id (registered), response is SSE.
 */

export interface SirmaAgentOptions {
  userId?: string;
  sessionId?: string;
}

export interface SirmaAgentResponse {
  content: string;
  sessionId?: string;
  userId?: string;
  runId: string;
}

/**
 * Run Sirma agent - returns response content directly.
 * Handles both SSE mode (with user_id) and JSON mode (without user_id).
 */
export async function runSirmaAgent(
  agentId: string,
  message: string,
  options: SirmaAgentOptions = {}
): Promise<SirmaAgentResponse> {
  const apiKey = requiredEnv('SIRMA_API_KEY');
  const baseUrl = getSirmaBaseUrl();
  
  console.log('[SIRMA] Starting agent request:', { agentId, messageLength: message.length });

  // Build multipart form data
  const boundary = '----SirmaAgentBoundary' + Date.now();
  const parts: string[] = [];
  
  parts.push(`--${boundary}\r\nContent-Disposition: form-data; name="message"\r\n\r\n${message}`);
  
  if (options.userId) {
    parts.push(`--${boundary}\r\nContent-Disposition: form-data; name="user_id"\r\n\r\n${options.userId}`);
  }
  
  if (options.sessionId) {
    parts.push(`--${boundary}\r\nContent-Disposition: form-data; name="session_id"\r\n\r\n${options.sessionId}`);
  }
  
  parts.push(`--${boundary}--`);

  const body = parts.join('\r\n');
  
  const url = `${baseUrl}/agents/${agentId}/run`;
  console.log('[SIRMA] Calling API:', url);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
      'Content-Length': Buffer.byteLength(body).toString(),
    },
    body: body,
  });
  
  console.log('[SIRMA] Response status:', response.status);

  if (!response.ok) {
    const error = await response.text().catch(() => 'Unknown error');
    console.error('[SIRMA] Error response:', error);
    let errorMessage = `Agent execution failed: ${response.status}`;
    
    try {
      const errorData = JSON.parse(error);
      if (errorData.error?.message) {
        errorMessage = errorData.error.message;
      }
    } catch {
      // Use raw error if JSON parse fails
    }
    
    throw new SirmaAgentError(errorMessage, response.status, error);
  }

  const responseText = await response.text();
  console.log('[SIRMA] Raw response length:', responseText.length);
  
  // Try to parse as JSON first (when no user_id is provided)
  try {
    const jsonData = JSON.parse(responseText);
    console.log('[SIRMA] Parsed JSON response, keys:', Object.keys(jsonData));
    if (jsonData.success && jsonData.data) {
      console.log('[SIRMA] Returning content from JSON data');
      return {
        content: jsonData.data.content || '',
        sessionId: jsonData.data.session_id,
        userId: jsonData.data.user_id,
        runId: jsonData.data.run_id,
      };
    }
  } catch {
    // Not JSON, try SSE parsing
    console.log('[SIRMA] Response is not JSON, trying SSE parsing');
  }
  
  // Parse SSE format
  const content = parseSSEForText(responseText);
  console.log('[SIRMA] SSE parsed content length:', content.length);
  return {
    content,
    runId: '',
  };
}

/**
 * Run Sirma agent with streaming response (SSE).
 * Only use this when you have an existing user_id.
 */
export async function runSirmaAgentStream(
  agentId: string,
  message: string,
  options: SirmaAgentOptions = {}
): Promise<Response> {
  const apiKey = requiredEnv('SIRMA_API_KEY');
  const baseUrl = getSirmaBaseUrl();

  // Build multipart form data
  const boundary = '----SirmaAgentBoundary' + Date.now();
  const parts: string[] = [];
  
  parts.push(`--${boundary}\r\nContent-Disposition: form-data; name="message"\r\n\r\n${message}`);
  
  if (options.userId) {
    parts.push(`--${boundary}\r\nContent-Disposition: form-data; name="user_id"\r\n\r\n${options.userId}`);
  }
  
  if (options.sessionId) {
    parts.push(`--${boundary}\r\nContent-Disposition: form-data; name="session_id"\r\n\r\n${options.sessionId}`);
  }
  
  parts.push(`--${boundary}--`);

  const body = parts.join('\r\n');

  const response = await fetch(`${baseUrl}/agents/${agentId}/run`, {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
      'Content-Length': Buffer.byteLength(body).toString(),
    },
    body: body,
  });

  if (!response.ok) {
    const error = await response.text().catch(() => 'Unknown error');
    let errorMessage = `Agent execution failed: ${response.status}`;
    
    try {
      const errorData = JSON.parse(error);
      if (errorData.error?.message) {
        errorMessage = errorData.error.message;
      }
    } catch {
      // Use raw error
    }
    
    throw new SirmaAgentError(errorMessage, response.status, error);
  }

  return response;
}

/**
 * Run Sirma agent and parse SSE events incrementally.
 */
export async function* streamSirmaAgent(
  agentId: string,
  message: string,
  options: SirmaAgentOptions = {}
): AsyncGenerator<string, void, unknown> {
  const response = await runSirmaAgentStream(agentId, message, options);
  const reader = response.body?.getReader();
  if (!reader) throw new Error('No response body');

  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const text = parseSSELine(line);
        if (text) yield text;
      }
    }
  } finally {
    reader.releaseLock();
  }
}

/**
 * Get information about an agent.
 */
export async function getSirmaAgent(agentId: string): Promise<unknown> {
  const apiKey = requiredEnv('SIRMA_API_KEY');
  const baseUrl = getSirmaBaseUrl();

  const response = await fetch(`${baseUrl}/agents/${agentId}`, {
    method: 'GET',
    headers: {
      'x-api-key': apiKey,
    },
  });

  if (!response.ok) {
    const error = await response.text().catch(() => 'Unknown error');
    throw new SirmaAgentError(`Failed to get agent: ${response.status}`, response.status, error);
  }

  return response.json();
}

/**
 * List all agents for the current account.
 */
export async function listSirmaAgents(): Promise<unknown> {
  const apiKey = requiredEnv('SIRMA_API_KEY');
  const baseUrl = getSirmaBaseUrl();

  const response = await fetch(`${baseUrl}/agents`, {
    method: 'GET',
    headers: {
      'x-api-key': apiKey,
    },
  });

  if (!response.ok) {
    const error = await response.text().catch(() => 'Unknown error');
    throw new SirmaAgentError(`Failed to list agents: ${response.status}`, response.status, error);
  }

  return response.json();
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function getSirmaBaseUrl(): string {
  const explicit = process.env.SIRMA_BASE_URL?.replace(/\/+$/, '');
  if (explicit) return explicit;

  const domain = process.env.SIRMA_AI_DOMAIN?.replace(/\/+$/, '');
  if (domain) return `${domain}/client/api/v1`;

  throw new Error('Missing SIRMA_BASE_URL or SIRMA_AI_DOMAIN.');
}

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

/**
 * Parse SSE line format: data: {"type": "text", "content": "..."}
 */
function parseSSELine(line: string): string | null {
  const trimmed = line.trim();
  if (!trimmed.startsWith('data: ')) return null;

  const jsonStr = trimmed.slice(6);
  try {
    const data = JSON.parse(jsonStr);
    if (data.type === 'text' && typeof data.content === 'string') {
      return data.content;
    }
    if (data.type === 'finish' && typeof data.content === 'string') {
      return data.content;
}
    return null;
  } catch {
    return null;
  }
}

/**
 * Parse accumulated SSE text for final response.
 */
function parseSSEForText(sseText: string): string {
  const lines = sseText.split('\n');
  const texts: string[] = [];

  for (const line of lines) {
    const text = parseSSELine(line);
    if (text) texts.push(text);
  }

  return texts.join('');
}

// ---------------------------------------------------------------------------
// Error class
// ---------------------------------------------------------------------------

export class SirmaAgentError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly body?: string
  ) {
    super(message);
    this.name = 'SirmaAgentError';
  }
}
