import { CurrencyCode, FlightOption, HotelOption } from '../../src/types/travel';
import { DESTINATIONS_CATALOG, HOTEL_IMAGE_URL } from '../../src/data/destinations';

export interface FlightSearchParams {
  origin: string;
  destination: string;
  departureDate: string;
  returnDate?: string;
  passengers: number;
  cabinClass: string;
  currency?: CurrencyCode;
}

export interface HotelSearchParams {
  destination: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  rooms: number;
  maxBudgetPerNight?: number;
  currency?: CurrencyCode;
}

export interface FlightProviderAdapter {
  providerName: string;
  isLive: boolean;
  searchFlights(params: FlightSearchParams): Promise<FlightOption[]>;
}

export interface HotelProviderAdapter {
  providerName: string;
  isLive: boolean;
  searchHotels(params: HotelSearchParams): Promise<HotelOption[]>;
}

function currencyMultiplier(currency: CurrencyCode): number {
  switch (currency) {
    case 'USD':
      return 1 / 84;
    case 'EUR':
      return 1 / 91;
    case 'GBP':
      return 1 / 106;
    case 'AED':
      return 1 / 23;
    case 'JPY':
      return 1.8;
    default:
      return 1;
  }
}

function inferCityCoordinates(destination: string): { lat: number; lng: number } {
  const lower = destination.toLowerCase();
  const match = DESTINATIONS_CATALOG.find(
    (d) => lower.includes(d.name.toLowerCase()) || lower.includes(d.country.toLowerCase())
  );
  if (match) return { lat: match.lat, lng: match.lng };
  if (lower.includes('delhi')) return { lat: 28.6139, lng: 77.209 };
  if (lower.includes('mumbai')) return { lat: 19.076, lng: 72.8777 };
  if (lower.includes('chennai')) return { lat: 13.0827, lng: 80.2707 };
  if (lower.includes('bengaluru') || lower.includes('bangalore')) return { lat: 12.9716, lng: 77.5946 };
  if (lower.includes('london')) return { lat: 51.5072, lng: -0.1276 };
  if (lower.includes('tokyo')) return { lat: 35.6762, lng: 139.6503 };
  if (lower.includes('singapore')) return { lat: 1.3521, lng: 103.8198 };
  return { lat: 20.5937, lng: 78.9629 };
}

class DemoFlightAdapter implements FlightProviderAdapter {
  providerName = 'DEMO DATA – NOT LIVE FLIGHT AVAILABILITY';
  isLive = false;

  async searchFlights(params: FlightSearchParams): Promise<FlightOption[]> {
    const currency = params.currency || 'INR';
    const mult = currencyMultiplier(currency);
    const cabinMult =
      params.cabinClass.toLowerCase().includes('business')
        ? 2.8
        : params.cabinClass.toLowerCase().includes('premium')
          ? 1.65
          : 1;

    const originCode = params.origin.slice(0, 3).toUpperCase() || 'ORG';
    const destCode = params.destination.slice(0, 3).toUpperCase() || 'DST';

    const baseTemplates = [
      {
        id: 'flt-demo-1',
        airline: 'IndiGo',
        airlineCode: '6E',
        flightNumber: '6E 412',
        departureTime: '06:15',
        arrivalTime: '08:10',
        durationMinutes: 115,
        durationLabel: '1h 55m',
        stops: 0,
        stopDetails: 'Non-stop',
        baseINR: 4650,
        baggage: '15 kg check-in · 7 kg cabin (Sample)',
      },
      {
        id: 'flt-demo-2',
        airline: 'Air India',
        airlineCode: 'AI',
        flightNumber: 'AI 642',
        departureTime: '09:40',
        arrivalTime: '11:45',
        durationMinutes: 125,
        durationLabel: '2h 05m',
        stops: 0,
        stopDetails: 'Non-stop',
        baseINR: 5400,
        baggage: '20 kg check-in · 8 kg cabin (Sample)',
      },
      {
        id: 'flt-demo-3',
        airline: 'Akasa Air',
        airlineCode: 'QP',
        flightNumber: 'QP 1108',
        departureTime: '13:20',
        arrivalTime: '16:50',
        durationMinutes: 210,
        durationLabel: '3h 30m',
        stops: 1,
        stopDetails: '1 stop via BLR (55m layover)',
        baseINR: 3980,
        baggage: '15 kg check-in · 7 kg cabin (Sample)',
      },
      {
        id: 'flt-demo-4',
        airline: 'Vistara / Air India Express',
        airlineCode: 'UK',
        flightNumber: 'UK 892',
        departureTime: '18:05',
        arrivalTime: '20:00',
        durationMinutes: 115,
        durationLabel: '1h 55m',
        stops: 0,
        stopDetails: 'Non-stop',
        baseINR: 6250,
        baggage: '20 kg check-in · 7 kg cabin (Sample)',
      },
      {
        id: 'flt-demo-5',
        airline: 'SpiceJet',
        airlineCode: 'SG',
        flightNumber: 'SG 304',
        departureTime: '21:15',
        arrivalTime: '23:25',
        durationMinutes: 130,
        durationLabel: '2h 10m',
        stops: 0,
        stopDetails: 'Non-stop',
        baseINR: 4290,
        baggage: '15 kg check-in · 7 kg cabin (Sample)',
      },
    ];

    return baseTemplates.map((t) => ({
      id: t.id,
      airline: t.airline,
      airlineCode: t.airlineCode,
      flightNumber: t.flightNumber,
      origin: `${params.origin} (${originCode})`,
      destination: `${params.destination} (${destCode})`,
      departureTime: t.departureTime,
      arrivalTime: t.arrivalTime,
      durationMinutes: t.durationMinutes,
      durationLabel: t.durationLabel,
      stops: t.stops,
      stopDetails: t.stopDetails,
      price: Math.max(25, Math.round(t.baseINR * mult * cabinMult * params.passengers)),
      currency,
      cabinClass: params.cabinClass,
      baggage: t.baggage,
      isDemoData: true,
      providerName: this.providerName,
    }));
  }
}

class DemoHotelAdapter implements HotelProviderAdapter {
  providerName = 'DEMO DATA – NOT LIVE HOTEL INVENTORY';
  isLive = false;

  async searchHotels(params: HotelSearchParams): Promise<HotelOption[]> {
    const currency = params.currency || 'INR';
    const mult = currencyMultiplier(currency);
    const coords = inferCityCoordinates(params.destination);
    const cityLabel = params.destination.split(',')[0].trim() || 'Destination';

    const matchedCatalog = DESTINATIONS_CATALOG.find((d) =>
      cityLabel.toLowerCase().includes(d.name.toLowerCase())
    );
    const fallbackImg = matchedCatalog?.imageUrl || HOTEL_IMAGE_URL;

    const templates = [
      {
        id: 'htl-demo-1',
        name: `${cityLabel} Harbourfront Boutique Stay`,
        location: `Central Waterfront District, ${cityLabel}`,
        rating: 4.7,
        reviewCount: 412,
        baseINR: 5200,
        amenities: ['Wi-Fi', 'Breakfast Included', 'Airport Shuttle', 'Rooftop Lounge'],
        description: `Walkable boutique property in ${cityLabel} with quiet courtyard rooms and rapid transit access.`,
        imageUrl: HOTEL_IMAGE_URL,
        latOffset: 0.012,
        lngOffset: -0.014,
      },
      {
        id: 'htl-demo-2',
        name: `The Meridian Heritage Suites ${cityLabel}`,
        location: `Old Quarter, ${cityLabel}`,
        rating: 4.5,
        reviewCount: 289,
        baseINR: 3800,
        amenities: ['Wi-Fi', 'Air Conditioning', '24h Front Desk', 'Cafe'],
        description: `Restored architectural townhouse offering balanced value near cultural landmarks in ${cityLabel}.`,
        imageUrl: fallbackImg,
        latOffset: -0.015,
        lngOffset: 0.011,
      },
      {
        id: 'htl-demo-3',
        name: `Azure Cliffside Resort & Spa`,
        location: `Scenic Promenade, ${cityLabel}`,
        rating: 4.9,
        reviewCount: 640,
        baseINR: 11200,
        amenities: ['Pool', 'Spa', 'Beach Access', 'Breakfast Included', 'Wi-Fi', 'Fitness Centre'],
        description: `Full-service resort retreat featuring panoramic terraces, infinity pool, and curated dining.`,
        imageUrl: HOTEL_IMAGE_URL,
        latOffset: 0.024,
        lngOffset: 0.019,
      },
      {
        id: 'htl-demo-4',
        name: `Nomad Commons Hostel & Co-Living`,
        location: `Arts & Transit Hub, ${cityLabel}`,
        rating: 4.3,
        reviewCount: 518,
        baseINR: 1850,
        amenities: ['Wi-Fi', 'Co-Working Lounge', 'Lockers', 'Bike Rental'],
        description: `Clean budget-conscious social stay ideal for groups and backpackers exploring ${cityLabel}.`,
        imageUrl: fallbackImg,
        latOffset: -0.008,
        lngOffset: -0.021,
      },
    ];

    return templates
      .map((t) => ({
        id: t.id,
        name: t.name,
        location: t.location,
        city: cityLabel,
        rating: t.rating,
        reviewCount: t.reviewCount,
        pricePerNight: Math.max(18, Math.round(t.baseINR * mult * Math.max(1, params.rooms))),
        currency,
        amenities: t.amenities,
        description: t.description,
        imageUrl: t.imageUrl,
        lat: Number((coords.lat + t.latOffset).toFixed(5)),
        lng: Number((coords.lng + t.lngOffset).toFixed(5)),
        isDemoData: true,
        providerName: this.providerName,
      }))
      .filter((h) => !params.maxBudgetPerNight || h.pricePerNight <= params.maxBudgetPerNight);
  }
}

export function getFlightProviderAdapter(): FlightProviderAdapter {
  // Future live provider adapters (e.g., TBO Air API / Amadeus) plug in here when FLIGHT_API_KEY is configured.
  if (process.env.FLIGHT_API_KEY && process.env.FLIGHT_API_PROVIDER) {
    // Placeholder hook for live credentialed adapter; falls back transparently if unimplemented
  }
  return new DemoFlightAdapter();
}

export function getHotelProviderAdapter(): HotelProviderAdapter {
  // Future live provider adapters (e.g., TBO Hotels API) plug in here when HOTEL_API_KEY is configured.
  if (process.env.HOTEL_API_KEY && process.env.HOTEL_API_PROVIDER) {
    // Placeholder hook for live credentialed adapter
  }
  return new DemoHotelAdapter();
}
