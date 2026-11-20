import { Router, Request, Response, NextFunction } from 'express';
import { runFlightIntelligenceAgent } from '../agents/flightAgent';
import { runHotelIntelligenceAgent } from '../agents/hotelAgent';
import { DESTINATIONS_CATALOG } from '../../src/data/destinations';
import { CurrencyCode } from '../../src/types/travel';
import { ApiError } from '../services/geminiClient';

const router = Router();

// GET /api/flights/search
router.get('/flights/search', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const origin = String(req.query.origin || '').trim();
    const destination = String(req.query.destination || '').trim();
    if (!origin || !destination) {
      throw new ApiError(400, 'Origin and destination are required.', 'INVALID_INPUT');
    }

    const departureDate = String(
      req.query.departureDate || new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10)
    );
    const returnDate = req.query.returnDate ? String(req.query.returnDate) : undefined;
    const passengers = Math.max(1, Number(req.query.passengers) || 1);
    const cabinClass = String(req.query.cabinClass || 'Economy');
    const currency = (String(req.query.currency || 'INR') as CurrencyCode) || 'INR';

    const result = await runFlightIntelligenceAgent({
      origin,
      destination,
      departureDate,
      returnDate,
      passengers,
      cabinClass,
      currency,
    });

    return res.json(result);
  } catch (err) {
    return next(err);
  }
});

// GET /api/hotels/search
router.get('/hotels/search', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const destination = String(req.query.destination || '').trim();
    if (!destination) {
      throw new ApiError(400, 'Destination is required.', 'INVALID_INPUT');
    }

    const checkIn = String(
      req.query.checkIn || new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10)
    );
    const checkOut = String(
      req.query.checkOut || new Date(Date.now() + 17 * 86400000).toISOString().slice(0, 10)
    );
    const guests = Math.max(1, Number(req.query.guests) || 2);
    const rooms = Math.max(1, Number(req.query.rooms) || 1);
    const maxBudgetPerNight = req.query.maxBudgetPerNight ? Number(req.query.maxBudgetPerNight) : undefined;
    const currency = (String(req.query.currency || 'INR') as CurrencyCode) || 'INR';

    const result = await runHotelIntelligenceAgent({
      destination,
      checkIn,
      checkOut,
      guests,
      rooms,
      maxBudgetPerNight,
      currency,
    });

    return res.json(result);
  } catch (err) {
    return next(err);
  }
});

// GET /api/destinations
router.get('/destinations', (req: Request, res: Response) => {
  const q = String(req.query.q || '').toLowerCase().trim();
  const category = String(req.query.category || '').toLowerCase().trim();
  const country = String(req.query.country || '').toLowerCase().trim();

  const filtered = DESTINATIONS_CATALOG.filter((d) => {
    const matchQ =
      !q ||
      d.name.toLowerCase().includes(q) ||
      d.country.toLowerCase().includes(q) ||
      d.description.toLowerCase().includes(q);
    const matchCat = !category || category === 'all' || d.categories.some((c) => c.toLowerCase() === category);
    const matchCountry = !country || country === 'all' || d.country.toLowerCase() === country;
    return matchQ && matchCat && matchCountry;
  });

  return res.json({ destinations: filtered });
});

export default router;
