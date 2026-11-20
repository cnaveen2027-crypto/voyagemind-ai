import { Type } from '@google/genai';
import { getGeminiClient, GEMINI_MODELS, withRetryAndTimeout } from '../services/geminiClient';
import { FlightSearchParams, getFlightProviderAdapter } from '../services/providerAdapters';
import { FlightOption } from '../../src/types/travel';

const RANK_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    rankings: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          aiRankReason: { type: Type.STRING },
        },
        required: ['id', 'aiRankReason'],
      },
    },
  },
  required: ['rankings'],
};

export async function runFlightIntelligenceAgent(
  params: FlightSearchParams & { budget?: number; preferences?: string[] }
): Promise<{ flights: FlightOption[]; providerBanner: string; isLive: boolean }> {
  const adapter = getFlightProviderAdapter();
  const flights = await adapter.searchFlights(params);

  try {
    const ai = getGeminiClient();
    const summaryInput = flights.map((f) => ({
      id: f.id,
      airline: f.airline,
      departure: f.departureTime,
      duration: f.durationLabel,
      stops: f.stops,
      price: `${f.price} ${f.currency}`,
    }));

    const response = await withRetryAndTimeout(
      () =>
        ai.models.generateContent({
          model: GEMINI_MODELS.FAST_EXTRACTION,
          contents: `Rank and annotate these flight options from ${params.origin} to ${params.destination} for ${params.passengers} passenger(s) in ${params.cabinClass}. Total trip budget: ${params.budget || 'flexible'} ${params.currency || 'INR'}. Flights: ${JSON.stringify(summaryInput)}`,
          config: {
            systemInstruction:
              'You are the Flight Intelligence Agent. Provide a crisp 1-sentence evaluation (e.g., "Best value non-stop morning departure", "Lowest fare with short layover") for each flight id.',
            responseMimeType: 'application/json',
            responseSchema: RANK_SCHEMA,
          },
        }),
      20000,
      0
    );

    const parsed = JSON.parse((response.text ?? '{"rankings":[]}').trim()) as {
      rankings: { id: string; aiRankReason: string }[];
    };
    const reasonMap: Record<string, string> = {};
    for (const r of parsed.rankings || []) {
      reasonMap[r.id] = r.aiRankReason;
    }

    const enriched = flights.map((f) => ({
      ...f,
      aiRankReason: reasonMap[f.id] || (f.stops === 0 ? 'Direct connection' : 'Budget connecting option'),
    }));

    return {
      flights: enriched,
      providerBanner: adapter.providerName,
      isLive: adapter.isLive,
    };
  } catch {
    // Preserve provider results even if annotation fails
    return {
      flights,
      providerBanner: adapter.providerName,
      isLive: adapter.isLive,
    };
  }
}
