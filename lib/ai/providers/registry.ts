/**
 * Central registry of all AI providers. The router consults this list
 * to look up providers by id and to enumerate availability for the UI.
 */

import { anthropicProvider } from './anthropic';
import { cohereProvider } from './cohere';
import { googleProvider } from './google';
import { ollamaProvider } from './ollama';
import { openaiProvider } from './openai';
import { sirmaProvider } from './sirma';
import type { AIProvider, AIProviderId } from './types';

export const allProviders: ReadonlyArray<AIProvider> = [
  sirmaProvider,
  anthropicProvider,
  openaiProvider,
  googleProvider,
  cohereProvider,
  ollamaProvider,
];

const providersById = new Map<AIProviderId, AIProvider>(
  allProviders.map((p) => [p.id, p]),
);

export function getProvider(id: AIProviderId): AIProvider | undefined {
  return providersById.get(id);
}

export function listConfiguredProviders(): AIProvider[] {
  return allProviders.filter((p) => p.isConfigured());
}

export function listAllProviderIds(): AIProviderId[] {
  return allProviders.map((p) => p.id);
}
