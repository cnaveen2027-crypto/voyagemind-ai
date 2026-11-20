import { Type } from '@google/genai';
import { getGeminiClient, GEMINI_MODELS, withRetryAndTimeout } from '../services/geminiClient';
import { ItineraryDay } from '../../src/types/travel';

export interface ItineraryAgentInput {
  origin: string;
  destination: string;
  days: number;
  departureDate: string;
  travellers: number;
  budget: number;
  currency: string;
  travelStyle: string;
  preferences: string[];
  accommodationPreference?: string;
  transportationPreference?: string;
}

const ITINERARY_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    days: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          day: { type: Type.INTEGER },
          theme: { type: Type.STRING },
          estimatedDayCost: { type: Type.NUMBER },
          activities: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                timeSlot: { type: Type.STRING, enum: ['morning', 'afternoon', 'evening'] },
                title: { type: Type.STRING },
                location: { type: Type.STRING },
                description: { type: Type.STRING },
                estimatedCost: { type: Type.NUMBER },
                travelTime: { type: Type.STRING },
                transportMode: { type: Type.STRING },
                category: { type: Type.STRING },
                lat: { type: Type.NUMBER },
                lng: { type: Type.NUMBER },
              },
              required: [
                'id',
                'timeSlot',
                'title',
                'location',
                'description',
                'estimatedCost',
                'travelTime',
                'transportMode',
                'category',
              ],
            },
          },
          suggestedRestaurants: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                cuisine: { type: Type.STRING },
                estimatedCost: { type: Type.NUMBER },
                area: { type: Type.STRING },
              },
              required: ['name', 'cuisine', 'estimatedCost', 'area'],
            },
          },
        },
        required: ['day', 'theme', 'estimatedDayCost', 'activities', 'suggestedRestaurants'],
      },
    },
  },
  required: ['days'],
};

function computeDateForDay(startDate: string, offset: number): string | undefined {
  if (!startDate) return undefined;
  const parsed = new Date(startDate);
  if (Number.isNaN(parsed.getTime())) return undefined;
  parsed.setDate(parsed.getDate() + offset);
  return parsed.toISOString().slice(0, 10);
}

export async function runItineraryPlanningAgent(
  input: ItineraryAgentInput
): Promise<ItineraryDay[]> {
  const ai = getGeminiClient();
  const targetDays = Math.max(1, Math.min(14, Math.round(input.days || 3)));

  const prompt = `Generate an exact ${targetDays}-day itinerary from ${input.origin} to ${input.destination} for ${input.travellers} traveller(s).
Departure date: ${input.departureDate}.
Total trip budget: ${input.budget} ${input.currency} (all activity & restaurant prices must be realistic estimates in ${input.currency}).
Travel style: ${input.travelStyle}.
Interests: ${input.preferences.join(', ') || 'highlights, food, culture'}.
Accommodation style: ${input.accommodationPreference || 'balanced'}.
Preferred local transport: ${input.transportationPreference || 'public transit & cabs'}.

Requirements:
- Return EXACTLY ${targetDays} days numbered 1 to ${targetDays}.
- Each day MUST include 1 morning, 1 afternoon, and 1 evening activity grouped geographically to avoid unrealistic transit zig-zags.
- Include realistic travelTime (e.g., "20 mins"), transportMode, and approximate lat/lng coordinates in ${input.destination} for map plotting.
- Include 2 suggested restaurants per day.`;

  const response = await withRetryAndTimeout(() =>
    ai.models.generateContent({
      model: GEMINI_MODELS.GENERAL_AND_MAPS,
      contents: prompt,
      config: {
        systemInstruction:
          'You are the Itinerary Planning Agent for VoyageMind AI. Design logistically sound, geographically clustered day-by-day itineraries with realistic transit times and estimated local costs.',
        responseMimeType: 'application/json',
        responseSchema: ITINERARY_SCHEMA,
      },
    })
  );

  const parsed = JSON.parse((response.text ?? '{"days":[]}').trim()) as { days: ItineraryDay[] };
  let days = Array.isArray(parsed.days) ? parsed.days : [];

  // Validate exact day count
  if (days.length > targetDays) {
    days = days.slice(0, targetDays);
  }
  while (days.length < targetDays) {
    const nextNum = days.length + 1;
    days.push({
      day: nextNum,
      theme: `Explore ${input.destination} — Day ${nextNum}`,
      estimatedDayCost: Math.round((input.budget / targetDays) * 0.4),
      activities: [
        {
          id: `d${nextNum}-morning`,
          timeSlot: 'morning',
          title: `Morning neighbourhood walk in ${input.destination}`,
          location: `${input.destination} Central District`,
          description: 'Relaxed local exploration and artisan coffee stop.',
          estimatedCost: 0,
          travelTime: '15 mins',
          transportMode: 'Walk',
          category: 'Sightseeing',
        },
        {
          id: `d${nextNum}-afternoon`,
          timeSlot: 'afternoon',
          title: `Cultural landmark & market visit`,
          location: `${input.destination} Heritage Quarter`,
          description: 'Explore regional crafts, architecture, and local galleries.',
          estimatedCost: Math.round((input.budget / targetDays) * 0.15),
          travelTime: '20 mins',
          transportMode: 'Cab / Transit',
          category: 'Culture',
        },
        {
          id: `d${nextNum}-evening`,
          timeSlot: 'evening',
          title: `Sunset promenade & farewell dinner`,
          location: `${input.destination} Waterfront`,
          description: 'Scenic evening stroll followed by regional cuisine.',
          estimatedCost: Math.round((input.budget / targetDays) * 0.25),
          travelTime: '15 mins',
          transportMode: 'Cab',
          category: 'Dining',
        },
      ],
      suggestedRestaurants: [
        {
          name: `${input.destination} Kitchen`,
          cuisine: 'Regional',
          estimatedCost: Math.round((input.budget / targetDays) * 0.12),
          area: 'Central',
        },
      ],
    });
  }

  return days.map((d, idx) => ({
    ...d,
    day: idx + 1,
    date: computeDateForDay(input.departureDate, idx),
    activities: (d.activities || []).map((a, aIdx) => ({
      ...a,
      id: a.id || `day-${idx + 1}-act-${aIdx + 1}`,
    })),
  }));
}

export async function regenerateItineraryDay(
  input: ItineraryAgentInput & { dayNumber: number; existingTheme?: string }
): Promise<ItineraryDay> {
  const ai = getGeminiClient();

  const prompt = `Regenerate ONLY Day ${input.dayNumber} of a ${input.days}-day trip to ${input.destination} for ${input.travellers} traveller(s).
Previous theme was "${input.existingTheme || 'General'}". Create a fresh, distinct set of morning, afternoon, and evening activities matching travel style "${input.travelStyle}" and interests: ${input.preferences.join(', ')}.
Budget target for this day: ~${Math.round((input.budget / Math.max(1, input.days)) * 0.45)} ${input.currency}.
Return an array "days" containing exactly 1 day object with day = ${input.dayNumber}.`;

  const response = await withRetryAndTimeout(() =>
    ai.models.generateContent({
      model: GEMINI_MODELS.GENERAL_AND_MAPS,
      contents: prompt,
      config: {
        systemInstruction:
          'You are the Itinerary Planning Agent. Produce a fresh, geographically clustered single-day itinerary.',
        responseMimeType: 'application/json',
        responseSchema: ITINERARY_SCHEMA,
      },
    })
  );

  const parsed = JSON.parse((response.text ?? '{"days":[]}').trim()) as { days: ItineraryDay[] };
  const day = parsed.days?.[0];
  if (!day) {
    throw new Error('Failed to regenerate itinerary day.');
  }

  return {
    ...day,
    day: input.dayNumber,
    date: computeDateForDay(input.departureDate, input.dayNumber - 1),
    activities: (day.activities || []).map((a, idx) => ({
      ...a,
      id: `day-${input.dayNumber}-regen-${Date.now()}-${idx}`,
    })),
  };
}
