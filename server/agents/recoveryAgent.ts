import { Type } from '@google/genai';
import { getGeminiClient, GEMINI_MODELS, ThinkingLevel, withRetryAndTimeout } from '../services/geminiClient';
import { getFlightProviderAdapter, getHotelProviderAdapter } from '../services/providerAdapters';
import {
  AgentTraceStep,
  CurrencyCode,
  DisruptionType,
  ItineraryDay,
  RecoveryPlanResult,
} from '../../src/types/travel';

export interface RecoveryAgentInput {
  tripId: string;
  origin: string;
  destination: string;
  disruptionType: DisruptionType;
  disruptionDetails: string;
  originalCost: number;
  originalTime: string;
  currency: CurrencyCode;
  itinerary?: ItineraryDay[];
}

const RECOVERY_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    problemIdentified: { type: Type.STRING },
    originalArrangement: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING },
        details: { type: Type.STRING },
        time: { type: Type.STRING },
        cost: { type: Type.NUMBER },
      },
      required: ['title', 'details', 'time', 'cost'],
    },
    recommendedAlternative: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING },
        details: { type: Type.STRING },
        time: { type: Type.STRING },
        cost: { type: Type.NUMBER },
        providerSource: { type: Type.STRING },
      },
      required: ['title', 'details', 'time', 'cost', 'providerSource'],
    },
    alternativeOptions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          title: { type: Type.STRING },
          summary: { type: Type.STRING },
          costDifference: { type: Type.STRING },
          timeDifference: { type: Type.STRING },
          tradeOffs: { type: Type.STRING },
        },
        required: ['id', 'title', 'summary', 'costDifference', 'timeDifference', 'tradeOffs'],
      },
    },
    costDifference: { type: Type.STRING },
    timeDifference: { type: Type.STRING },
    affectedActivities: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          day: { type: Type.INTEGER },
          activityTitle: { type: Type.STRING },
          impact: { type: Type.STRING },
          replacementActivity: { type: Type.STRING },
        },
        required: ['day', 'activityTitle', 'impact', 'replacementActivity'],
      },
    },
    updatedItinerarySummary: { type: Type.STRING },
  },
  required: [
    'problemIdentified',
    'originalArrangement',
    'recommendedAlternative',
    'alternativeOptions',
    'costDifference',
    'timeDifference',
    'affectedActivities',
    'updatedItinerarySummary',
  ],
};

export async function runJourneyRecoveryAgent(
  input: RecoveryAgentInput
): Promise<RecoveryPlanResult> {
  const ai = getGeminiClient();
  const trace: AgentTraceStep[] = [];

  const t0 = Date.now();
  const flightAdapter = getFlightProviderAdapter();
  const hotelAdapter = getHotelProviderAdapter();

  const [altFlights, altHotels] = await Promise.all([
    flightAdapter.searchFlights({
      origin: input.origin,
      destination: input.destination,
      departureDate: new Date().toISOString().slice(0, 10),
      passengers: 1,
      cabinClass: 'Economy',
      currency: input.currency,
    }),
    hotelAdapter.searchHotels({
      destination: input.destination,
      checkIn: new Date().toISOString().slice(0, 10),
      checkOut: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
      guests: 1,
      rooms: 1,
      currency: input.currency,
    }),
  ]);

  trace.push({
    agentId: 'provider-lookup',
    agentName: 'Inventory Provider Adapter',
    role: 'Alternative Option Lookup',
    task: `Queried flight & hotel adapters for ${input.origin} → ${input.destination}`,
    status: 'completed',
    durationMs: Date.now() - t0,
    summary: `Retrieved ${altFlights.length} flight alternatives (${flightAdapter.providerName}) and ${altHotels.length} hotel options.`,
  });

  const t1 = Date.now();
  const itinerarySnapshot = (input.itinerary || []).slice(0, 5).map((d) => ({
    day: d.day,
    theme: d.theme,
    activities: d.activities.map((a) => ({ timeSlot: a.timeSlot, title: a.title, location: a.location })),
  }));

  const prompt = `Analyze this travel disruption and produce a complete Original Plan vs Recovered Plan comparison.

Disruption Type: ${input.disruptionType}
User-Supplied Disruption Details: ${input.disruptionDetails}
Route: ${input.origin} -> ${input.destination}
Original Scheduled Time: ${input.originalTime}
Original Arrangement Cost: ${input.originalCost} ${input.currency}

Available Flight Alternatives (${flightAdapter.providerName}):
${JSON.stringify(altFlights.map((f) => ({ airline: f.airline, flight: f.flightNumber, dep: f.departureTime, arr: f.arrivalTime, stops: f.stops, price: f.price })))}

Available Hotel Alternatives (${hotelAdapter.providerName}):
${JSON.stringify(altHotels.map((h) => ({ name: h.name, location: h.location, pricePerNight: h.pricePerNight, rating: h.rating })))}

Current Trip Itinerary Context:
${JSON.stringify(itinerarySnapshot)}

Instructions:
1. Clearly state the problem identified from the user-supplied disruption details.
2. Select the best recommended alternative from the candidate options (or realistic rail/reroute fallback if flights are unavailable) and label providerSource accurately (include "Demo Sample Data" if using demo inventory).
3. Provide 2-3 ranked alternativeOptions with explicit costDifference, timeDifference, and tradeOffs.
4. Identify affected itinerary activities and propose practical replacement activities so the trip remains cohesive.
5. Never auto-confirm external bookings; this plan awaits explicit user confirmation.`;

  const response = await withRetryAndTimeout(() =>
    ai.models.generateContent({
      model: GEMINI_MODELS.GENERAL_AND_MAPS,
      contents: prompt,
      config: {
        systemInstruction:
          'You are the Journey Recovery Agent for VoyageMind AI. Use deep logistical reasoning to resolve disruptions cleanly, minimize lost vacation time, and quantify exact cost/time trade-offs.',
        thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH },
        responseMimeType: 'application/json',
        responseSchema: RECOVERY_SCHEMA,
      },
    })
  );

  const parsed = JSON.parse((response.text ?? '{}').trim()) as Omit<
    RecoveryPlanResult,
    'recoveryId' | 'tripId' | 'disruptionType' | 'requiresConfirmation' | 'status' | 'agentTrace'
  >;

  trace.push({
    agentId: 'journey-recovery-agent',
    agentName: 'Journey Recovery Agent',
    role: 'Disruption Analysis & Re-routing',
    task: `Resolved ${input.disruptionType.replace(/_/g, ' ')} impact and updated itinerary`,
    status: 'completed',
    durationMs: Date.now() - t1,
    summary: parsed.problemIdentified || 'Generated recovered travel arrangement.',
  });

  return {
    recoveryId: `rec_${Date.now()}`,
    tripId: input.tripId,
    disruptionType: input.disruptionType,
    problemIdentified: parsed.problemIdentified,
    originalArrangement: parsed.originalArrangement,
    recommendedAlternative: {
      ...parsed.recommendedAlternative,
      isDemoData: !flightAdapter.isLive,
    },
    alternativeOptions: parsed.alternativeOptions || [],
    costDifference: parsed.costDifference,
    timeDifference: parsed.timeDifference,
    affectedActivities: parsed.affectedActivities || [],
    updatedItinerarySummary: parsed.updatedItinerarySummary,
    requiresConfirmation: true,
    status: 'pending_confirmation',
    agentTrace: trace,
  };
}
