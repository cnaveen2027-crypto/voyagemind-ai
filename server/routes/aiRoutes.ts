import { Router, Request, Response, NextFunction } from 'express';
import {
  ApiError,
  GEMINI_MODELS,
  getGeminiClient,
  withRetryAndTimeout,
} from '../services/geminiClient';
import { runTravelManagerOrchestration } from '../agents/travelManagerAgent';
import { runDestinationDiscoveryAgent } from '../agents/destinationAgent';
import { regenerateItineraryDay, runItineraryPlanningAgent } from '../agents/itineraryAgent';
import { runBudgetOptimisationAgent } from '../agents/budgetAgent';
import { runJourneyRecoveryAgent } from '../agents/recoveryAgent';
import { CurrencyCode, DisruptionType, ItineraryDay } from '../../src/types/travel';

const router = Router();

// POST /api/ai/chat - Multi-turn Gemini chat with system instruction & optional agent orchestration
router.post('/chat', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { messages, message, activePlanContext, triggerOrchestration } = req.body as {
      messages?: { role: 'user' | 'assistant'; content: string }[];
      message?: string;
      activePlanContext?: string;
      triggerOrchestration?: boolean;
    };

    if (!message || typeof message !== 'string' || !message.trim()) {
      throw new ApiError(400, 'Please enter a travel message or question.', 'INVALID_INPUT');
    }

    // Detect if the prompt is a full trip planning / modification request or explicit orchestration
    const lower = message.toLowerCase();
    const shouldOrchestrate =
      triggerOrchestration === true ||
      /(plan|itinerary|trip to|travel from|budget.*trip|vacation|honeymoon|days in|modify.*budget|change destination|regenerate)/i.test(
        lower
      );

    if (shouldOrchestrate) {
      const contextualPrompt = activePlanContext
        ? `Previous trip context: ${activePlanContext}\nUser follow-up request: ${message}`
        : message;

      const plan = await runTravelManagerOrchestration(contextualPrompt);
      return res.json({
        reply: plan.needsClarification
          ? `${plan.summary}\n\n${plan.clarificationQuestions.map((q, i) => `${i + 1}. ${q}`).join('\n')}`
          : plan.summary,
        structuredPlan: plan.needsClarification ? undefined : plan,
        agentTrace: plan.agentTrace,
        groundingLinks: plan.mapsGroundingLinks,
      });
    }

    // Standard multi-turn conversational Gemini chat with Google Maps grounding
    const ai = getGeminiClient();
    const history = (messages || []).slice(-16).map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    const chat = ai.chats.create({
      model: GEMINI_MODELS.GENERAL_AND_MAPS,
      history,
      config: {
        systemInstruction: `You are VoyageMind AI Copilot, an intelligent agentic travel assistant built for travellers.
${activePlanContext ? `Active trip context: ${activePlanContext}` : ''}
Provide accurate, practical, concise travel guidance. Never fabricate live flight prices or live hotel availability—state clearly when rates are illustrative estimates.`,
        tools: [{ googleMaps: {} }],
      },
    });

    const response = await withRetryAndTimeout(() => chat.sendMessage({ message }));
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
    const groundingLinks: { title: string; uri: string; snippet?: string }[] = [];
    const seen = new Set<string>();
    for (const chunk of chunks) {
      const mapsObj = (chunk as { maps?: { uri?: string; title?: string; placeAnswerSources?: { reviewSnippets?: { content?: string }[] } } }).maps;
      if (mapsObj?.uri && !seen.has(mapsObj.uri)) {
        seen.add(mapsObj.uri);
        groundingLinks.push({
          title: mapsObj.title || 'Google Maps Place',
          uri: mapsObj.uri,
          snippet: mapsObj.placeAnswerSources?.reviewSnippets?.[0]?.content,
        });
      }
    }

    return res.json({
      reply: response.text || 'I could not generate a response. Please rephrase your question.',
      groundingLinks,
    });
  } catch (err) {
    return next(err);
  }
});

// POST /api/ai/plan-trip - Full Multi-Agent Orchestration
router.post('/plan-trip', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { prompt, overrides } = req.body;
    if (!prompt || typeof prompt !== 'string') {
      throw new ApiError(400, 'Travel request prompt is required.', 'INVALID_INPUT');
    }
    const result = await runTravelManagerOrchestration(prompt, overrides);
    return res.json(result);
  } catch (err) {
    return next(err);
  }
});

// POST /api/ai/plan-trip-stream - Real-time SSE Agent Execution Trace + Result
router.post('/plan-trip-stream', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { prompt, overrides } = req.body;
    if (!prompt || typeof prompt !== 'string') {
      throw new ApiError(400, 'Travel request prompt is required.', 'INVALID_INPUT');
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    const sendEvent = (event: string, data: unknown) => {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    try {
      const result = await runTravelManagerOrchestration(prompt, overrides, (steps) => {
        sendEvent('trace', { steps });
      });
      sendEvent('result', result);
      res.end();
    } catch (err) {
      const normalized = err instanceof ApiError ? err : new ApiError(500, err instanceof Error ? err.message : 'Orchestration failed');
      sendEvent('error', { error: normalized.message, code: normalized.code });
      res.end();
    }
  } catch (err) {
    return next(err);
  }
});

// POST /api/ai/destination - Destination Discovery Agent with Google Maps Grounding
router.post('/destination', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { destination, preferences, budget, currency, days, userLatLng } = req.body;
    if (!destination || typeof destination !== 'string') {
      throw new ApiError(400, 'Destination name is required.', 'INVALID_INPUT');
    }
    const output = await runDestinationDiscoveryAgent({
      destination,
      preferences: Array.isArray(preferences) ? preferences : ['Culture', 'Food', 'Sightseeing'],
      budget: Number(budget) || 50000,
      currency: currency || 'INR',
      days: Number(days) || 4,
      userLatLng,
    });
    return res.json(output);
  } catch (err) {
    return next(err);
  }
});

// POST /api/ai/itinerary - Generate full itinerary or regenerate single day
router.post('/itinerary', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      origin,
      destination,
      departureDate,
      returnDate,
      days: explicitDays,
      travellers,
      budget,
      currency,
      travelStyle,
      preferences,
      accommodationPreference,
      transportationPreference,
      regenerateDayNumber,
      existingTheme,
    } = req.body;

    if (!destination || typeof destination !== 'string') {
      throw new ApiError(400, 'Destination is required.', 'INVALID_INPUT');
    }

    let computedDays = Number(explicitDays) || 0;
    if (!computedDays && departureDate && returnDate) {
      const d1 = new Date(departureDate);
      const d2 = new Date(returnDate);
      if (!Number.isNaN(d1.getTime()) && !Number.isNaN(d2.getTime())) {
        computedDays = Math.max(1, Math.round((d2.getTime() - d1.getTime()) / 86400000) + 1);
      }
    }
    computedDays = Math.max(1, Math.min(14, computedDays || 4));

    if (regenerateDayNumber) {
      const dayPlan: ItineraryDay = await regenerateItineraryDay({
        origin: origin || 'Origin City',
        destination,
        days: computedDays,
        departureDate: departureDate || new Date().toISOString().slice(0, 10),
        travellers: Number(travellers) || 2,
        budget: Number(budget) || 40000,
        currency: (currency || 'INR') as CurrencyCode,
        travelStyle: travelStyle || 'Balanced',
        preferences: Array.isArray(preferences) ? preferences : ['Sightseeing'],
        accommodationPreference,
        transportationPreference,
        dayNumber: Number(regenerateDayNumber),
        existingTheme,
      });
      return res.json({ day: dayPlan });
    }

    const daysList = await runItineraryPlanningAgent({
      origin: origin || 'Origin City',
      destination,
      days: computedDays,
      departureDate: departureDate || new Date().toISOString().slice(0, 10),
      travellers: Number(travellers) || 2,
      budget: Number(budget) || 40000,
      currency: (currency || 'INR') as CurrencyCode,
      travelStyle: travelStyle || 'Balanced',
      preferences: Array.isArray(preferences) ? preferences : ['Sightseeing', 'Food'],
      accommodationPreference,
      transportationPreference,
    });

    return res.json({ itinerary: daysList, daysCount: daysList.length });
  } catch (err) {
    return next(err);
  }
});

// POST /api/ai/optimise-budget
router.post('/optimise-budget', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { origin, destination, days, travellers, totalBudget, currency, travelStyle } = req.body;
    if (!destination || !totalBudget) {
      throw new ApiError(400, 'Destination and totalBudget are required.', 'INVALID_INPUT');
    }
    const result = await runBudgetOptimisationAgent({
      origin: origin || 'Home City',
      destination,
      days: Number(days) || 4,
      travellers: Number(travellers) || 2,
      totalBudget: Number(totalBudget),
      currency: (currency || 'INR') as CurrencyCode,
      travelStyle,
    });
    return res.json(result);
  } catch (err) {
    return next(err);
  }
});

// POST /api/ai/recover-journey
router.post('/recover-journey', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      tripId,
      origin,
      destination,
      disruptionType,
      disruptionDetails,
      originalCost,
      originalTime,
      currency,
      itinerary,
    } = req.body;

    if (!destination || !disruptionType || !disruptionDetails) {
      throw new ApiError(
        400,
        'Destination, disruptionType, and disruptionDetails are required.',
        'INVALID_INPUT'
      );
    }

    const result = await runJourneyRecoveryAgent({
      tripId: tripId || `trip_${Date.now()}`,
      origin: origin || 'Origin',
      destination,
      disruptionType: disruptionType as DisruptionType,
      disruptionDetails,
      originalCost: Number(originalCost) || 5500,
      originalTime: originalTime || '09:30 AM',
      currency: (currency || 'INR') as CurrencyCode,
      itinerary,
    });
    return res.json(result);
  } catch (err) {
    return next(err);
  }
});

// POST /api/ai/generate-image - High-resolution destination imagery (1K, 2K, 4K) via gemini-3-pro-image-preview
router.post('/generate-image', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { prompt, imageSize = '1K', aspectRatio = '16:9' } = req.body as {
      prompt?: string;
      imageSize?: '1K' | '2K' | '4K';
      aspectRatio?: string;
    };

    if (!prompt || typeof prompt !== 'string') {
      throw new ApiError(400, 'Image prompt is required.', 'INVALID_INPUT');
    }

    const validSize = ['1K', '2K', '4K'].includes(imageSize) ? imageSize : '1K';
    const ai = getGeminiClient();

    const response = await withRetryAndTimeout(() =>
      ai.models.generateContent({
        model: GEMINI_MODELS.IMAGE_PRO,
        contents: {
          parts: [{ text: prompt }],
        },
        config: {
          imageConfig: {
            aspectRatio,
            imageSize: validSize,
          },
        },
      })
    );

    for (const part of response.candidates?.[0]?.content?.parts ?? []) {
      if (part.inlineData?.data) {
        const mime = part.inlineData.mimeType ?? 'image/png';
        return res.json({
          imageDataUrl: `data:${mime};base64,${part.inlineData.data}`,
          imageSize: validSize,
          model: GEMINI_MODELS.IMAGE_PRO,
        });
      }
    }

    throw new ApiError(500, 'No image data was returned by the model.', 'NO_IMAGE_RETURNED');
  } catch (err) {
    return next(err);
  }
});

export default router;
