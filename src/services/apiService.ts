import {
  AgentTraceStep,
  BudgetBreakdown,
  CurrencyCode,
  DestinationCatalogItem,
  DisruptionType,
  FlightOption,
  GroundingLink,
  HotelOption,
  ItineraryDay,
  RecoveryPlanResult,
  TravelPlanResult,
} from '../types/travel';

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...(options?.headers || {}) },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as { error?: string }).error || `Request failed (${res.status})`);
  }
  return data as T;
}

export interface HealthStatus {
  status: string;
  geminiConfigured: boolean;
  mapsConfigured: boolean;
  flightMode: 'live' | 'demo';
  hotelMode: 'live' | 'demo';
}

export async function fetchHealthStatus(): Promise<HealthStatus> {
  return apiFetch<HealthStatus>('/api/health');
}

export async function sendCopilotChat(payload: {
  messages: { role: 'user' | 'assistant'; content: string }[];
  message: string;
  activePlanContext?: string;
  triggerOrchestration?: boolean;
}): Promise<{
  reply: string;
  structuredPlan?: TravelPlanResult;
  agentTrace?: AgentTraceStep[];
  groundingLinks?: GroundingLink[];
}> {
  return apiFetch('/api/ai/chat', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function streamPlanTrip(
  prompt: string,
  overrides: Record<string, unknown> | undefined,
  onTrace: (steps: AgentTraceStep[]) => void
): Promise<TravelPlanResult> {
  const response = await fetch('/api/ai/plan-trip-stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, overrides }),
  });

  if (!response.ok || !response.body) {
    const errBody = await response.json().catch(() => ({}));
    throw new Error((errBody as { error?: string }).error || `Orchestration request failed (${response.status})`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let finalResult: TravelPlanResult | null = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const events = buffer.split('\n\n');
    buffer = events.pop() || '';

    for (const rawEvent of events) {
      const lines = rawEvent.split('\n');
      let eventType = 'message';
      let dataStr = '';
      for (const line of lines) {
        if (line.startsWith('event: ')) eventType = line.slice(7).trim();
        if (line.startsWith('data: ')) dataStr += line.slice(6);
      }
      if (!dataStr) continue;
      const parsed = JSON.parse(dataStr);
      if (eventType === 'trace' && Array.isArray(parsed.steps)) {
        onTrace(parsed.steps);
      } else if (eventType === 'result') {
        finalResult = parsed as TravelPlanResult;
      } else if (eventType === 'error') {
        throw new Error(parsed.error || 'Agent orchestration failed.');
      }
    }
  }

  if (!finalResult) {
    throw new Error('Travel Manager Agent ended without returning a plan.');
  }
  return finalResult;
}

export async function analyzeDestination(payload: {
  destination: string;
  preferences?: string[];
  budget?: number;
  currency?: CurrencyCode;
  days?: number;
  userLatLng?: { latitude: number; longitude: number };
}): Promise<{ narrative: string; groundingLinks: GroundingLink[] }> {
  return apiFetch('/api/ai/destination', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function generateItineraryApi(payload: {
  origin: string;
  destination: string;
  departureDate: string;
  returnDate: string;
  days?: number;
  travellers: number;
  budget: number;
  currency: CurrencyCode;
  travelStyle: string;
  preferences: string[];
  accommodationPreference?: string;
  transportationPreference?: string;
}): Promise<{ itinerary: ItineraryDay[]; daysCount: number }> {
  return apiFetch('/api/ai/itinerary', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function regenerateItineraryDayApi(payload: {
  origin: string;
  destination: string;
  departureDate: string;
  days: number;
  travellers: number;
  budget: number;
  currency: CurrencyCode;
  travelStyle: string;
  preferences: string[];
  regenerateDayNumber: number;
  existingTheme?: string;
}): Promise<{ day: ItineraryDay }> {
  return apiFetch('/api/ai/itinerary', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function searchFlightsApi(params: {
  origin: string;
  destination: string;
  departureDate: string;
  returnDate?: string;
  passengers: number;
  cabinClass: string;
  currency?: CurrencyCode;
}): Promise<{ flights: FlightOption[]; providerBanner: string; isLive: boolean }> {
  const qs = new URLSearchParams({
    origin: params.origin,
    destination: params.destination,
    departureDate: params.departureDate,
    ...(params.returnDate ? { returnDate: params.returnDate } : {}),
    passengers: String(params.passengers),
    cabinClass: params.cabinClass,
    currency: params.currency || 'INR',
  });
  return apiFetch(`/api/flights/search?${qs.toString()}`);
}

export async function searchHotelsApi(params: {
  destination: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  rooms: number;
  maxBudgetPerNight?: number;
  currency?: CurrencyCode;
}): Promise<{ hotels: HotelOption[]; providerBanner: string; isLive: boolean }> {
  const qs = new URLSearchParams({
    destination: params.destination,
    checkIn: params.checkIn,
    checkOut: params.checkOut,
    guests: String(params.guests),
    rooms: String(params.rooms),
    ...(params.maxBudgetPerNight ? { maxBudgetPerNight: String(params.maxBudgetPerNight) } : {}),
    currency: params.currency || 'INR',
  });
  return apiFetch(`/api/hotels/search?${qs.toString()}`);
}

export async function optimiseBudgetApi(payload: {
  origin?: string;
  destination: string;
  days: number;
  travellers: number;
  totalBudget: number;
  currency: CurrencyCode;
  travelStyle?: string;
}): Promise<BudgetBreakdown> {
  return apiFetch('/api/ai/optimise-budget', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function recoverJourneyApi(payload: {
  tripId: string;
  origin: string;
  destination: string;
  disruptionType: DisruptionType;
  disruptionDetails: string;
  originalCost: number;
  originalTime: string;
  currency: CurrencyCode;
  itinerary?: ItineraryDay[];
}): Promise<RecoveryPlanResult> {
  return apiFetch('/api/ai/recover-journey', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function generateDestinationImageApi(payload: {
  prompt: string;
  imageSize: '1K' | '2K' | '4K';
  aspectRatio?: string;
}): Promise<{ imageDataUrl: string; imageSize: string; model: string }> {
  return apiFetch('/api/ai/generate-image', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function fetchDestinationsCatalog(params?: {
  q?: string;
  category?: string;
  country?: string;
}): Promise<{ destinations: DestinationCatalogItem[] }> {
  const qs = new URLSearchParams();
  if (params?.q) qs.set('q', params.q);
  if (params?.category) qs.set('category', params.category);
  if (params?.country) qs.set('country', params.country);
  return apiFetch(`/api/destinations?${qs.toString()}`);
}
