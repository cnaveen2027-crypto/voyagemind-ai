import { Type } from '@google/genai';
import { getGeminiClient, GEMINI_MODELS, withRetryAndTimeout } from '../services/geminiClient';
import { getHotelProviderAdapter, HotelSearchParams } from '../services/providerAdapters';
import { HotelOption } from '../../src/types/travel';

const HOTEL_RANK_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    matches: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          aiMatchReason: { type: Type.STRING },
        },
        required: ['id', 'aiMatchReason'],
      },
    },
  },
  required: ['matches'],
};

export async function runHotelIntelligenceAgent(
  params: HotelSearchParams & { travelStyle?: string; preferences?: string[] }
): Promise<{ hotels: HotelOption[]; providerBanner: string; isLive: boolean }> {
  const adapter = getHotelProviderAdapter();
  const hotels = await adapter.searchHotels(params);

  try {
    const ai = getGeminiClient();
    const summaryInput = hotels.map((h) => ({
      id: h.id,
      name: h.name,
      location: h.location,
      rating: h.rating,
      pricePerNight: `${h.pricePerNight} ${h.currency}`,
      amenities: h.amenities,
    }));

    const response = await withRetryAndTimeout(
      () =>
        ai.models.generateContent({
          model: GEMINI_MODELS.FAST_EXTRACTION,
          contents: `Evaluate these accommodations in ${params.destination} for ${params.guests} guest(s), style "${params.travelStyle || 'balanced'}", interests: ${(params.preferences || []).join(', ') || 'comfort and location'}. Hotels: ${JSON.stringify(summaryInput)}`,
          config: {
            systemInstruction:
              'You are the Hotel Intelligence Agent. Return a crisp 1-sentence match rationale for each hotel id focusing on location, value, and amenities.',
            responseMimeType: 'application/json',
            responseSchema: HOTEL_RANK_SCHEMA,
          },
        }),
      20000,
      0
    );

    const parsed = JSON.parse((response.text ?? '{"matches":[]}').trim()) as {
      matches: { id: string; aiMatchReason: string }[];
    };
    const matchMap: Record<string, string> = {};
    for (const m of parsed.matches || []) {
      matchMap[m.id] = m.aiMatchReason;
    }

    return {
      hotels: hotels.map((h) => ({
        ...h,
        aiMatchReason: matchMap[h.id] || `Rated ${h.rating}/5 in ${h.location}`,
      })),
      providerBanner: adapter.providerName,
      isLive: adapter.isLive,
    };
  } catch {
    return {
      hotels,
      providerBanner: adapter.providerName,
      isLive: adapter.isLive,
    };
  }
}
