import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import aiRoutes from './server/routes/aiRoutes';
import inventoryRoutes from './server/routes/inventoryRoutes';
import tripsRoutes from './server/routes/tripsRoutes';
import { errorHandler } from './server/middleware/errorHandler';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '2mb' }));

  // System & integration health status (no secret leakage)
  app.get('/api/health', (_req, res) => {
    const hasGemini =
      Boolean(process.env.GEMINI_API_KEY) && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY';
    const hasMaps =
      Boolean(process.env.VITE_GOOGLE_MAPS_API_KEY) &&
      process.env.VITE_GOOGLE_MAPS_API_KEY !== 'MY_GOOGLE_MAPS_API_KEY';
    const flightLive = Boolean(process.env.FLIGHT_API_KEY && process.env.FLIGHT_API_PROVIDER);
    const hotelLive = Boolean(process.env.HOTEL_API_KEY && process.env.HOTEL_API_PROVIDER);

    res.json({
      status: 'ok',
      geminiConfigured: hasGemini,
      mapsConfigured: hasMaps,
      flightMode: flightLive ? 'live' : 'demo',
      hotelMode: hotelLive ? 'live' : 'demo',
    });
  });

  // API routes
  app.use('/api/ai', aiRoutes);
  app.use('/api', inventoryRoutes);
  app.use('/api', tripsRoutes);

  // Error middleware
  app.use(errorHandler);

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`VoyageMind AI server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start VoyageMind AI server:', err);
  process.exit(1);
});
