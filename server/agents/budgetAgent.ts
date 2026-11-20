import { Type } from '@google/genai';
import { getGeminiClient, GEMINI_MODELS, withRetryAndTimeout } from '../services/geminiClient';
import { BudgetBreakdown, CurrencyCode } from '../../src/types/travel';

export interface BudgetAgentInput {
  origin: string;
  destination: string;
  days: number;
  travellers: number;
  totalBudget: number;
  currency: CurrencyCode;
  travelStyle?: string;
  flightEstimate?: number;
  hotelEstimateTotal?: number;
}

const BUDGET_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    categories: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          category: {
            type: Type.STRING,
            enum: ['Flights', 'Hotels', 'Food', 'Transportation', 'Activities', 'Shopping', 'Miscellaneous'],
          },
          estimatedAmount: { type: Type.NUMBER },
          notes: { type: Type.STRING },
        },
        required: ['category', 'estimatedAmount', 'notes'],
      },
    },
    savingsRecommendations: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          category: { type: Type.STRING },
          potentialSavings: { type: Type.NUMBER },
          action: { type: Type.STRING },
        },
        required: ['title', 'category', 'potentialSavings', 'action'],
      },
    },
  },
  required: ['categories', 'savingsRecommendations'],
};

const REQUIRED_CATEGORIES: BudgetBreakdown['categories'][number]['category'][] = [
  'Flights',
  'Hotels',
  'Food',
  'Transportation',
  'Activities',
  'Shopping',
  'Miscellaneous',
];

export async function runBudgetOptimisationAgent(
  input: BudgetAgentInput
): Promise<BudgetBreakdown> {
  const ai = getGeminiClient();

  const prompt = `Create a realistic estimated trip expense breakdown and savings plan in ${input.currency} for:
- Route: ${input.origin || 'Home City'} to ${input.destination}
- Duration: ${input.days} days
- Travellers: ${input.travellers}
- Target Total Budget: ${input.totalBudget} ${input.currency}
- Travel Style: ${input.travelStyle || 'balanced'}
${input.flightEstimate ? `- Sample Roundtrip Flight Baseline: ${input.flightEstimate} ${input.currency}` : ''}
${input.hotelEstimateTotal ? `- Sample Accommodation Baseline: ${input.hotelEstimateTotal} ${input.currency}` : ''}

Include ALL 7 categories: Flights, Hotels, Food, Transportation, Activities, Shopping, Miscellaneous.
Provide 4 concrete, destination-specific cost-saving recommendations with realistic savings amounts in ${input.currency}.`;

  const response = await withRetryAndTimeout(() =>
    ai.models.generateContent({
      model: GEMINI_MODELS.GENERAL_AND_MAPS,
      contents: prompt,
      config: {
        systemInstruction:
          'You are the Budget Optimisation Agent for VoyageMind AI. Compute accurate, realistic cost estimates across all 7 travel categories and identify practical ways to stay within or under budget.',
        responseMimeType: 'application/json',
        responseSchema: BUDGET_SCHEMA,
      },
    })
  );

  const raw = JSON.parse((response.text ?? '{"categories":[],"savingsRecommendations":[]}').trim()) as {
    categories: { category: BudgetBreakdown['categories'][number]['category']; estimatedAmount: number; notes: string }[];
    savingsRecommendations: BudgetBreakdown['savingsRecommendations'];
  };

  const catMap: Record<string, { estimatedAmount: number; notes: string }> = {};
  for (const c of raw.categories || []) {
    catMap[c.category] = {
      estimatedAmount: Math.max(0, Math.round(Number(c.estimatedAmount) || 0)),
      notes: c.notes || 'Estimated expense',
    };
  }

  const normalized = REQUIRED_CATEGORIES.map((category) => ({
    category,
    estimatedAmount: catMap[category]?.estimatedAmount ?? 0,
    notes: catMap[category]?.notes ?? 'Estimated allowance',
  }));

  const estimatedTotal = normalized.reduce((sum, item) => sum + item.estimatedAmount, 0);
  const safeDenom = estimatedTotal > 0 ? estimatedTotal : 1;

  return {
    totalBudget: input.totalBudget,
    estimatedTotal,
    remainingBudget: Math.round(input.totalBudget - estimatedTotal),
    currency: input.currency,
    isEstimate: true,
    categories: normalized.map((c) => ({
      ...c,
      percentage: Math.round((c.estimatedAmount / safeDenom) * 100),
    })),
    savingsRecommendations: raw.savingsRecommendations || [],
  };
}
