export type CurrencyCode = 'INR' | 'USD' | 'EUR' | 'GBP' | 'AED' | 'JPY';

export type AgentStepStatus = 'pending' | 'running' | 'completed' | 'error';

export interface AgentTraceStep {
  agentId: string;
  agentName: string;
  role: string;
  task: string;
  status: AgentStepStatus;
  durationMs: number;
  summary: string;
}

export interface GroundingLink {
  title: string;
  uri: string;
  snippet?: string;
}

export interface ItineraryActivity {
  id: string;
  timeSlot: 'morning' | 'afternoon' | 'evening';
  title: string;
  location: string;
  description: string;
  estimatedCost: number;
  travelTime: string;
  transportMode: string;
  category: string;
  lat?: number;
  lng?: number;
}

export interface RestaurantSuggestion {
  name: string;
  cuisine: string;
  estimatedCost: number;
  area: string;
}

export interface ItineraryDay {
  day: number;
  date?: string;
  theme: string;
  activities: ItineraryActivity[];
  suggestedRestaurants: RestaurantSuggestion[];
  estimatedDayCost: number;
}

export interface FlightOption {
  id: string;
  airline: string;
  airlineCode: string;
  flightNumber: string;
  origin: string;
  destination: string;
  departureTime: string;
  arrivalTime: string;
  durationMinutes: number;
  durationLabel: string;
  stops: number;
  stopDetails?: string;
  price: number;
  currency: CurrencyCode;
  cabinClass: string;
  baggage: string;
  isDemoData: boolean;
  providerName: string;
  aiRankReason?: string;
}

export interface HotelOption {
  id: string;
  name: string;
  location: string;
  city: string;
  rating: number;
  reviewCount: number;
  pricePerNight: number;
  currency: CurrencyCode;
  amenities: string[];
  description: string;
  imageUrl: string;
  lat: number;
  lng: number;
  isDemoData: boolean;
  providerName: string;
  aiMatchReason?: string;
}

export interface BudgetCategoryItem {
  category: 'Flights' | 'Hotels' | 'Food' | 'Transportation' | 'Activities' | 'Shopping' | 'Miscellaneous';
  estimatedAmount: number;
  percentage: number;
  notes: string;
}

export interface SavingsRecommendation {
  title: string;
  category: string;
  potentialSavings: number;
  action: string;
}

export interface BudgetBreakdown {
  totalBudget: number;
  estimatedTotal: number;
  remainingBudget: number;
  currency: CurrencyCode;
  isEstimate: boolean;
  categories: BudgetCategoryItem[];
  savingsRecommendations: SavingsRecommendation[];
}

export interface ParsedTravelRequirements {
  origin: string;
  destination: string;
  days: number;
  departureDate: string;
  returnDate: string;
  travellers: number;
  budget: number;
  currency: CurrencyCode;
  travelStyle: string;
  preferences: string[];
}

export interface TravelPlanResult {
  needsClarification: boolean;
  clarificationQuestions: string[];
  parsedRequirements: ParsedTravelRequirements;
  summary: string;
  destinationMatchReason: string;
  itinerary: ItineraryDay[];
  flights: FlightOption[];
  hotels: HotelOption[];
  budget: BudgetBreakdown;
  mapsGroundingLinks: GroundingLink[];
  agentTrace: AgentTraceStep[];
}

export interface TripRecord {
  tripId: string;
  userId: string;
  origin: string;
  destination: string;
  departureDate: string;
  returnDate: string;
  travellers: number;
  budget: number;
  currency: CurrencyCode;
  travelStyle?: string;
  itinerary: ItineraryDay[];
  budgetBreakdown?: BudgetBreakdown;
  status: 'planned' | 'upcoming' | 'completed' | 'disrupted';
  createdAt: string;
  updatedAt: string;
}

export type DisruptionType =
  | 'flight_cancellation'
  | 'flight_delay'
  | 'hotel_cancellation'
  | 'missed_connection'
  | 'budget_change'
  | 'weather_disruption'
  | 'missed_activity';

export interface RecoveryPlanResult {
  recoveryId: string;
  tripId: string;
  disruptionType: DisruptionType;
  problemIdentified: string;
  originalArrangement: {
    title: string;
    details: string;
    time: string;
    cost: number;
  };
  recommendedAlternative: {
    title: string;
    details: string;
    time: string;
    cost: number;
    providerSource: string;
    isDemoData: boolean;
  };
  alternativeOptions: {
    id: string;
    title: string;
    summary: string;
    costDifference: string;
    timeDifference: string;
    tradeOffs: string;
  }[];
  costDifference: string;
  timeDifference: string;
  affectedActivities: {
    day: number;
    activityTitle: string;
    impact: string;
    replacementActivity: string;
  }[];
  updatedItinerarySummary: string;
  requiresConfirmation: boolean;
  status: 'pending_confirmation' | 'confirmed' | 'dismissed';
  agentTrace: AgentTraceStep[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  agentTrace?: AgentTraceStep[];
  structuredPlan?: TravelPlanResult;
  groundingLinks?: GroundingLink[];
}

export interface ConversationRecord {
  conversationId: string;
  userId: string;
  title: string;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
}

export interface DestinationCatalogItem {
  id: string;
  name: string;
  country: string;
  region: string;
  description: string;
  estimatedBudgetINR: number;
  estimatedBudgetUSD: number;
  recommendedDays: number;
  bestSeason: string;
  categories: string[];
  popularAttractions: string[];
  imageUrl: string;
  lat: number;
  lng: number;
}

export interface UserTravelPreferences {
  userId: string;
  preferredActivities: string[];
  budgetPreference: 'budget' | 'balanced' | 'comfort' | 'luxury';
  accommodationPreference: 'hostel' | 'boutique' | 'hotel' | 'resort' | 'villa';
  travelStyle: 'adventure' | 'relaxed' | 'cultural' | 'family' | 'honeymoon' | 'business';
  currency: CurrencyCode;
  updatedAt?: string;
}
