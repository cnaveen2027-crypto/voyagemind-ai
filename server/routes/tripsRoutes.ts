import { Router, Request, Response, NextFunction } from 'express';
import {
  createServerTrip,
  deleteServerTrip,
  listServerTrips,
  updateServerTrip,
} from '../services/tripStore';
import { ApiError } from '../services/geminiClient';
import { TripRecord } from '../../src/types/travel';

const router = Router();

router.get('/trips', (req: Request, res: Response) => {
  const userId = req.query.userId ? String(req.query.userId) : undefined;
  return res.json({ trips: listServerTrips(userId) });
});

router.post('/trips', (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = req.body as Partial<TripRecord>;
    if (!body.origin || !body.destination) {
      throw new ApiError(400, 'Origin and destination are required.', 'INVALID_INPUT');
    }
    const now = new Date().toISOString();
    const trip: TripRecord = {
      tripId: body.tripId || `trip_${Date.now()}`,
      userId: body.userId || 'demo-local',
      origin: body.origin,
      destination: body.destination,
      departureDate: body.departureDate || now.slice(0, 10),
      returnDate: body.returnDate || now.slice(0, 10),
      travellers: Number(body.travellers) || 2,
      budget: Number(body.budget) || 40000,
      currency: body.currency || 'INR',
      travelStyle: body.travelStyle || 'Balanced',
      itinerary: Array.isArray(body.itinerary) ? body.itinerary : [],
      budgetBreakdown: body.budgetBreakdown,
      status: body.status || 'planned',
      createdAt: body.createdAt || now,
      updatedAt: now,
    };
    const saved = createServerTrip(trip);
    return res.status(201).json({ trip: saved });
  } catch (err) {
    return next(err);
  }
});

router.put('/trips/:id', (req: Request, res: Response, next: NextFunction) => {
  try {
    const updated = updateServerTrip(String(req.params.id), req.body);
    if (!updated) {
      throw new ApiError(404, 'Trip not found on server store.', 'NOT_FOUND');
    }
    return res.json({ trip: updated });
  } catch (err) {
    return next(err);
  }
});

router.delete('/trips/:id', (req: Request, res: Response, next: NextFunction) => {
  try {
    const deleted = deleteServerTrip(String(req.params.id));
    if (!deleted) {
      throw new ApiError(404, 'Trip not found on server store.', 'NOT_FOUND');
    }
    return res.json({ deleted: true });
  } catch (err) {
    return next(err);
  }
});

export default router;
