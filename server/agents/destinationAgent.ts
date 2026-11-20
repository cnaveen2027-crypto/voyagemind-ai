import { getGeminiClient, GEMINI_MODELS, withRetryAndTimeout } from '../services/geminiClient';
import { GroundingLink } from '../../src/types/travel';

export interface DestinationAgentInput {
  destination: string;
  preferences: string[];
  budget: number;
  currency: string;
  days: number;
  userLatLng?: { latitude: number; longitude: number };
}

export interface DestinationAgentOutput {
  narrative: string;
  groundingLinks: GroundingLink[];
}

export async function runDestinationDiscoveryAgent(
  input: DestinationAgentInput
): Promise<DestinationAgentOutput> {
  const ai = getGeminiClient();

  const prompt = `As a Destination Discovery specialist, analyze ${input.destination} for a ${input.days}-day trip with a budget of ${input.budget} ${input.currency} and interests: ${input.preferences.join(', ') || 'sightseeing, local food, culture'}.
Provide:
1. Why ${input.destination} fits this traveller profile and budget.
2. Best season & local weather notes.
3. Top 5 verified attractions and neighbourhoods with practical tips.`;

  const config: Record<string, unknown> = {
    systemInstruction:
      'You are the Destination Discovery Agent for VoyageMind AI. Use Google Maps grounding to cite real, accurate places and attractions. Keep your response concise, structured in clean markdown, and grounded in real locations.',
    tools: [{ googleMaps: {} }],
  };

  if (input.userLatLng) {
    config.toolConfig = {
      retrievalConfig: {
        latLng: input.userLatLng,
      },
    };
  }

  const response = await withRetryAndTimeout(() =>
    ai.models.generateContent({
      model: GEMINI_MODELS.GENERAL_AND_MAPS,
      contents: prompt,
      config,
    })
  );

  const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
  const groundingLinks: GroundingLink[] = [];
  const seenUris = new Set<string>();

  for (const chunk of chunks) {
    const mapsObj = (chunk as { maps?: { uri?: string; title?: string; placeAnswerSources?: { reviewSnippets?: { content?: string }[] } } }).maps;
    if (mapsObj?.uri && !seenUris.has(mapsObj.uri)) {
      seenUris.add(mapsObj.uri);
      const snippet = mapsObj.placeAnswerSources?.reviewSnippets?.[0]?.content;
      groundingLinks.push({
        title: mapsObj.title || 'Google Maps Place',
        uri: mapsObj.uri,
        snippet,
      });
    }
  }

  return {
    narrative: response.text || `Curated highlights for ${input.destination}.`,
    groundingLinks,
  };
}
