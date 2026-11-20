import { Type } from '@google/genai';
import { getGeminiClient, GEMINI_MODELS, ThinkingLevel, withRetryAndTimeout } from '../services/geminiClient';
import { runDestinationDiscoveryAgent } from './destinationAgent';
import { runItineraryPlanningAgent } from './itineraryAgent';
import { runFlightIntelligenceAgent } from './flightAgent';
import { runHotelIntelligenceAgent } from './hotelAgent';
import { runBudgetOptimisationAgent } from './budgetAgent';
import {
  AgentTraceStep,
  CurrencyCode,
  ParsedTravelRequirements,
  TravelPlanResult,
} from '../../src/types/travel';

const EXTRACTION_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    origin: { type: Type.STRING },
    destination: { type: Type.STRING },
    days: { type: Type.INTEGER },
    departureDate: { type: Type.STRING },
    returnDate: { type: Type.STRING },
    travellers: { type: Type.INTEGER },
    budget: { type: Type.NUMBER },
    currency: { type: Type.STRING, enum: ['INR', 'USD', 'EUR', 'GBP', 'AED', 'JPY'] },
    travelStyle: { type: Type.STRING },
    preferences: { type: Type.ARRAY, items: { type: Type.STRING } },
    needsClarification: { type: Type.BOOLEAN },
    clarificationQuestions: { type: Type.ARRAY, items: { type: Type.STRING } },
    isDestinationDiscoveryRequest: { type: Type.BOOLEAN },
  },
  required: [
    'origin',
    'destination',
    'days',
    'travellers',
    'budget',
    'currency',
    'travelStyle',
    'preferences',
    'needsClarification',
    'clarificationQuestions',
  ],
};

export async function runTravelManagerOrchestration(
  userRequest: string,
  overrides?: Partial<ParsedTravelRequirements> & {
    accommodationPreference?: string;
    transportationPreference?: string;
    userLatLng?: { latitude: number; longitude: number };
  },
  onProgress?: (steps: AgentTraceStep[]) => void
): Promise<TravelPlanResult> {
  const ai = getGeminiClient();
  const steps: AgentTraceStep[] = [
    {
      agentId: 'travel-manager',
      agentName: 'Travel Manager Agent',
      role: 'Central Orchestrator',
      task: 'Extracting travel intent, constraints, and agent routing',
      status: 'running',
      durationMs: 0,
      summary: 'Parsing natural language requirements...',
    },
    {
      agentId: 'destination-agent',
      agentName: 'Destination Discovery Agent',
      role: 'Location & Maps Grounding',
      task: 'Analysing seasonality, attractions, and Maps grounding',
      status: 'pending',
      durationMs: 0,
      summary: 'Waiting for orchestrator',
    },
    {
      agentId: 'flight-agent',
      agentName: 'Flight Intelligence Agent',
      role: 'Air Route Comparison',
      task: 'Evaluating flight options via provider adapter',
      status: 'pending',
      durationMs: 0,
      summary: 'Waiting for orchestrator',
    },
    {
      agentId: 'hotel-agent',
      agentName: 'Hotel Intelligence Agent',
      role: 'Accommodation Matching',
      task: 'Comparing stays by rating, price, and amenities',
      status: 'pending',
      durationMs: 0,
      summary: 'Waiting for orchestrator',
    },
    {
      agentId: 'itinerary-agent',
      agentName: 'Itinerary Planning Agent',
      role: 'Day-wise Logistics',
      task: 'Building geographically clustered daily schedules',
      status: 'pending',
      durationMs: 0,
      summary: 'Waiting for orchestrator',
    },
    {
      agentId: 'budget-agent',
      agentName: 'Budget Optimisation Agent',
      role: 'Expense & Savings Model',
      task: 'Calculating 7-category cost estimates and savings tips',
      status: 'pending',
      durationMs: 0,
      summary: 'Waiting for orchestrator',
    },
  ];

  const emit = () => {
    if (onProgress) onProgress(steps.map((s) => ({ ...s })));
  };
  emit();

  const updateStep = (agentId: string, patch: Partial<AgentTraceStep>) => {
    const target = steps.find((s) => s.agentId === agentId);
    if (target) Object.assign(target, patch);
    emit();
  };

  // Step 1: Travel Manager requirement extraction
  const tExtractStart = Date.now();
  const defaultStart = new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10);

  const extractionResponse = await withRetryAndTimeout(() =>
    ai.models.generateContent({
      model: GEMINI_MODELS.FAST_EXTRACTION,
      contents: `Today's date is ${new Date().toISOString().slice(0, 10)}.
Extract travel planning parameters from this request: "${userRequest}"
Explicit overrides provided by UI form (if any): ${JSON.stringify(overrides || {})}
Rules:
- If destination is missing AND user is asking for destination ideas (e.g. "suggest a honeymoon destination", "best destinations for family vacation"), set isDestinationDiscoveryRequest=true, pick the single best matching destination as destination, and set needsClarification=false so we can produce a full helpful recommendation + sample itinerary.
- If the request is completely vague with no destination, no theme, and no budget (e.g. "plan a trip"), set needsClarification=true and provide 2-3 clear clarificationQuestions.
- Default currency to INR if ₹ or Indian origin/destination is mentioned; otherwise USD unless specified.
- Default origin to "Delhi" or "Bengaluru" only if unspecified; if user gave an origin, preserve it verbatim.
- Compute returnDate from departureDate + days if missing.`,
      config: {
        systemInstruction: 'You are the Travel Manager Agent extracting structured requirements cleanly.',
        responseMimeType: 'application/json',
        responseSchema: EXTRACTION_SCHEMA,
      },
    })
  );

  const extracted = JSON.parse((extractionResponse.text ?? '{}').trim()) as ParsedTravelRequirements & {
    needsClarification: boolean;
    clarificationQuestions: string[];
  };

  const reqs: ParsedTravelRequirements = {
    origin: overrides?.origin || extracted.origin || 'New Delhi',
    destination: overrides?.destination || extracted.destination || '',
    days: Math.max(1, Math.min(14, overrides?.days || extracted.days || 4)),
    departureDate: overrides?.departureDate || extracted.departureDate || defaultStart,
    returnDate:
      overrides?.returnDate ||
      extracted.returnDate ||
      new Date(
        new Date(overrides?.departureDate || extracted.departureDate || defaultStart).getTime() +
          Math.max(1, (overrides?.days || extracted.days || 4) - 1) * 86400000
      )
        .toISOString()
        .slice(0, 10),
    travellers: Math.max(1, overrides?.travellers || extracted.travellers || 2),
    budget: overrides?.budget || extracted.budget || (extracted.currency === 'INR' ? 40000 : 1200),
    currency: (overrides?.currency || extracted.currency || 'INR') as CurrencyCode,
    travelStyle: overrides?.travelStyle || extracted.travelStyle || 'Balanced Explorer',
    preferences: overrides?.preferences?.length ? overrides.preferences : extracted.preferences || ['Sightseeing', 'Local Cuisine'],
  };

  if (extracted.needsClarification && !reqs.destination) {
    updateStep('travel-manager', {
      status: 'completed',
      durationMs: Date.now() - tExtractStart,
      summary: 'Clarification needed from traveller before invoking specialist agents.',
    });
    return {
      needsClarification: true,
      clarificationQuestions:
        extracted.clarificationQuestions?.length
          ? extracted.clarificationQuestions
          : [
              'Which destination or type of trip (beaches, mountains, culture) are you considering?',
              'How many days are you planning to travel and what is your approximate budget?',
            ],
      parsedRequirements: reqs,
      summary: 'Please share a few missing details so I can coordinate the specialist travel agents.',
      destinationMatchReason: '',
      itinerary: [],
      flights: [],
      hotels: [],
      budget: {
        totalBudget: reqs.budget,
        estimatedTotal: 0,
        remainingBudget: reqs.budget,
        currency: reqs.currency,
        isEstimate: true,
        categories: [],
        savingsRecommendations: [],
      },
      mapsGroundingLinks: [],
      agentTrace: steps,
    };
  }

  updateStep('travel-manager', {
    status: 'completed',
    durationMs: Date.now() - tExtractStart,
    summary: `Routed plan: ${reqs.origin} → ${reqs.destination} (${reqs.days} days, ${reqs.travellers} travellers, ${reqs.budget} ${reqs.currency}).`,
  });

  // Step 2: Execute Destination, Flight, Hotel, and Itinerary Agents in parallel
  updateStep('destination-agent', { status: 'running', summary: `Grounding ${reqs.destination} with Google Maps...` });
  updateStep('flight-agent', { status: 'running', summary: `Searching flights ${reqs.origin} → ${reqs.destination}...` });
  updateStep('hotel-agent', { status: 'running', summary: `Matching accommodations in ${reqs.destination}...` });
  updateStep('itinerary-agent', { status: 'running', summary: `Sequencing ${reqs.days}-day itinerary...` });

  const destPromise = (async () => {
    const t = Date.now();
    try {
      const res = await runDestinationDiscoveryAgent({
        destination: reqs.destination,
        preferences: reqs.preferences,
        budget: reqs.budget,
        currency: reqs.currency,
        days: reqs.days,
        userLatLng: overrides?.userLatLng,
      });
      updateStep('destination-agent', {
        status: 'completed',
        durationMs: Date.now() - t,
        summary: `Verified ${res.groundingLinks.length} Google Maps places for ${reqs.destination}.`,
      });
      return res;
    } catch (err) {
      updateStep('destination-agent', {
        status: 'error',
        durationMs: Date.now() - t,
        summary: err instanceof Error ? err.message : 'Destination grounding failed',
      });
      return { narrative: `Highlights for ${reqs.destination}.`, groundingLinks: [] };
    }
  })();

  const flightPromise = (async () => {
    const t = Date.now();
    const res = await runFlightIntelligenceAgent({
      origin: reqs.origin,
      destination: reqs.destination,
      departureDate: reqs.departureDate,
      returnDate: reqs.returnDate,
      passengers: reqs.travellers,
      cabinClass: 'Economy',
      currency: reqs.currency,
      budget: reqs.budget,
      preferences: reqs.preferences,
    });
    updateStep('flight-agent', {
      status: 'completed',
      durationMs: Date.now() - t,
      summary: `Ranked ${res.flights.length} flight options (${res.isLive ? 'Live' : 'Demo Inventory'}).`,
    });
    return res;
  })();

  const hotelPromise = (async () => {
    const t = Date.now();
    const res = await runHotelIntelligenceAgent({
      destination: reqs.destination,
      checkIn: reqs.departureDate,
      checkOut: reqs.returnDate,
      guests: reqs.travellers,
      rooms: Math.max(1, Math.ceil(reqs.travellers / 2)),
      currency: reqs.currency,
      travelStyle: reqs.travelStyle,
      preferences: reqs.preferences,
    });
    updateStep('hotel-agent', {
      status: 'completed',
      durationMs: Date.now() - t,
      summary: `Matched ${res.hotels.length} stays in ${reqs.destination} (${res.isLive ? 'Live' : 'Demo Inventory'}).`,
    });
    return res;
  })();

  const itineraryPromise = (async () => {
    const t = Date.now();
    const res = await runItineraryPlanningAgent({
      origin: reqs.origin,
      destination: reqs.destination,
      days: reqs.days,
      departureDate: reqs.departureDate,
      travellers: reqs.travellers,
      budget: reqs.budget,
      currency: reqs.currency,
      travelStyle: reqs.travelStyle,
      preferences: reqs.preferences,
      accommodationPreference: overrides?.accommodationPreference,
      transportationPreference: overrides?.transportationPreference,
    });
    updateStep('itinerary-agent', {
      status: 'completed',
      durationMs: Date.now() - t,
      summary: `Generated ${res.length}-day geographically clustered schedule.`,
    });
    return res;
  })();

  const [destRes, flightRes, hotelRes, itinerary] = await Promise.all([
    destPromise,
    flightPromise,
    hotelPromise,
    itineraryPromise,
  ]);

  // Step 3: Budget Optimisation Agent (uses flight & hotel baselines)
  updateStep('budget-agent', { status: 'running', summary: 'Computing 7-category expense breakdown & savings...' });
  const tBudget = Date.now();
  const lowestFlight = flightRes.flights.length ? Math.min(...flightRes.flights.map((f) => f.price)) * 2 : undefined;
  const medianHotelNight = hotelRes.hotels.length
    ? hotelRes.hotels[Math.floor(hotelRes.hotels.length / 2)].pricePerNight
    : undefined;

  const budget = await runBudgetOptimisationAgent({
    origin: reqs.origin,
    destination: reqs.destination,
    days: reqs.days,
    travellers: reqs.travellers,
    totalBudget: reqs.budget,
    currency: reqs.currency,
    travelStyle: reqs.travelStyle,
    flightEstimate: lowestFlight,
    hotelEstimateTotal: medianHotelNight ? medianHotelNight * Math.max(1, reqs.days - 1) : undefined,
  });

  updateStep('budget-agent', {
    status: 'completed',
    durationMs: Date.now() - tBudget,
    summary: `Estimated total: ${budget.estimatedTotal.toLocaleString()} ${budget.currency} (${budget.savingsRecommendations.length} savings tips).`,
  });

  // Step 4: Travel Manager Final Synthesis using ThinkingLevel.HIGH
  const tSynth = Date.now();
  const synthResponse = await withRetryAndTimeout(() =>
    ai.models.generateContent({
      model: GEMINI_MODELS.GENERAL_AND_MAPS,
      contents: `Synthesize a crisp, inspiring 2-paragraph executive travel summary for a ${reqs.days}-day trip from ${reqs.origin} to ${reqs.destination} for ${reqs.travellers} traveller(s) with budget ${reqs.budget} ${reqs.currency}.
Destination insights: ${destRes.narrative.slice(0, 600)}
Top flight baseline: ${flightRes.flights[0]?.airline} (${flightRes.flights[0]?.price} ${reqs.currency})
Top hotel match: ${hotelRes.hotels[0]?.name} (${hotelRes.hotels[0]?.pricePerNight} ${reqs.currency}/night)
Budget estimate: ${budget.estimatedTotal} ${reqs.currency} vs target ${reqs.budget} ${reqs.currency}.`,
      config: {
        systemInstruction:
          'You are the Travel Manager Agent combining specialist agent findings into a clear, actionable travel plan summary. Clearly mention that flight and hotel sample rates are estimates/demo data unless live inventory is connected.',
        thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH },
      },
    })
  );

  updateStep('travel-manager', {
    durationMs: Date.now() - tExtractStart,
    summary: `Coordinated 5 specialist agents & synthesized final plan in ${((Date.now() - tSynth) / 1000).toFixed(1)}s.`,
  });

  return {
    needsClarification: false,
    clarificationQuestions: [],
    parsedRequirements: reqs,
    summary: synthResponse.text || `Complete ${reqs.days}-day plan for ${reqs.destination}.`,
    destinationMatchReason: destRes.narrative,
    itinerary,
    flights: flightRes.flights,
    hotels: hotelRes.hotels,
    budget,
    mapsGroundingLinks: destRes.groundingLinks,
    agentTrace: steps,
  };
}
