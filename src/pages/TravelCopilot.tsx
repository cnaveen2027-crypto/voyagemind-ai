import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Send,
  BookmarkPlus,
  ExternalLink,
  RefreshCw,
  MapPin,
  Plane,
  Building2,
  Wallet,
  Plus,
} from 'lucide-react';
import {
  AgentTraceStep,
  ChatMessage,
  ConversationRecord,
  TravelPlanResult,
  TripRecord,
} from '../types/travel';
import { sendCopilotChat, streamPlanTrip } from '../services/apiService';
import { useTravelData } from '../context/TravelDataContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { AgentExecutionPanel } from '../components/agents/AgentExecutionPanel';
import { formatCurrency } from '../utils/currency';

const SUGGESTED_PROMPTS = [
  'I want to travel from Chennai to Goa for 4 days with my friends. Our total budget is ₹40,000. We enjoy beaches, adventure activities and nightlife.',
  'Plan a budget trip to Goa.',
  'Find the best destinations for a family vacation.',
  'Plan a 7-day trip to Europe.',
  'Suggest a honeymoon destination.',
  'Find affordable hotels in Bali.',
];

export default function TravelCopilot() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { saveTrip, saveConversation } = useTravelData();
  const { showToast } = useToast();

  const [conversationId, setConversationId] = useState(`conv_${Date.now()}`);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-msg',
      role: 'assistant',
      timestamp: new Date().toISOString(),
      content:
        'Describe where you want to go, your travel dates or duration, group size, budget, and interests. I will coordinate our specialist agents to build a complete, editable travel plan.',
    },
  ]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [liveTrace, setLiveTrace] = useState<AgentTraceStep[]>([]);
  const [activePlan, setActivePlan] = useState<TravelPlanResult | null>(null);
  const [savingTrip, setSavingTrip] = useState(false);

  const threadEndRef = useRef<HTMLDivElement | null>(null);
  const initializedFromStateRef = useRef(false);

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, liveTrace]);

  useEffect(() => {
    const state = location.state as {
      initialPrompt?: string;
      loadedConversation?: ConversationRecord;
    } | null;

    if (state?.loadedConversation && !initializedFromStateRef.current) {
      initializedFromStateRef.current = true;
      setConversationId(state.loadedConversation.conversationId);
      setMessages(state.loadedConversation.messages);
    } else if (state?.initialPrompt && !initializedFromStateRef.current) {
      initializedFromStateRef.current = true;
      void handleSend(state.initialPrompt);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state]);

  const persistThread = async (nextMessages: ChatMessage[], titleHint: string) => {
    try {
      await saveConversation(
        {
          conversationId,
          userId: user?.uid || 'demo-local',
          title: titleHint.slice(0, 80) || 'AI Travel Copilot Session',
          messages: nextMessages,
          createdAt: nextMessages[0]?.timestamp || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        nextMessages.length > 2
      );
    } catch {
      // Non-blocking history persistence
    }
  };

  const handleSend = async (overrideText?: string) => {
    const text = (overrideText ?? input).trim();
    if (!text || isProcessing) return;

    if (!overrideText) setInput('');
    const userMsg: ChatMessage = {
      id: `u_${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toISOString(),
    };

    const updatedMsgs = [...messages, userMsg];
    setMessages(updatedMsgs);
    setIsProcessing(true);

    const isOrchestrationQuery =
      !activePlan ||
      /(plan|itinerary|trip|budget|destination|change|modify|regenerate|days in|travel from|hotels in)/i.test(
        text
      );

    try {
      if (isOrchestrationQuery) {
        const contextualPrompt = activePlan
          ? `Current active plan context: Origin=${activePlan.parsedRequirements.origin}, Destination=${activePlan.parsedRequirements.destination}, Days=${activePlan.parsedRequirements.days}, Travellers=${activePlan.parsedRequirements.travellers}, Budget=${activePlan.parsedRequirements.budget} ${activePlan.parsedRequirements.currency}, Preferences=${activePlan.parsedRequirements.preferences.join(', ')}. Follow-up modification or request: ${text}`
          : text;

        const plan = await streamPlanTrip(contextualPrompt, undefined, (steps) => {
          setLiveTrace(steps);
        });

        setLiveTrace(plan.agentTrace);
        if (!plan.needsClarification) {
          setActivePlan(plan);
        }

        const assistantContent = plan.needsClarification
          ? `${plan.summary}\n\n${plan.clarificationQuestions.map((q, i) => `${i + 1}. ${q}`).join('\n')}`
          : plan.summary;

        const assistantMsg: ChatMessage = {
          id: `a_${Date.now()}`,
          role: 'assistant',
          content: assistantContent,
          timestamp: new Date().toISOString(),
          agentTrace: plan.agentTrace,
          structuredPlan: plan.needsClarification ? undefined : plan,
          groundingLinks: plan.mapsGroundingLinks,
        };

        const finalMsgs = [...updatedMsgs, assistantMsg];
        setMessages(finalMsgs);
        void persistThread(
          finalMsgs,
          plan.parsedRequirements.destination
            ? `${plan.parsedRequirements.origin} to ${plan.parsedRequirements.destination}`
            : text
        );
      } else {
        setLiveTrace([]);
        const planSummaryCtx = activePlan
          ? `${activePlan.parsedRequirements.origin} to ${activePlan.parsedRequirements.destination}, ${activePlan.parsedRequirements.days} days, ${activePlan.parsedRequirements.budget} ${activePlan.parsedRequirements.currency}`
          : undefined;

        const chatRes = await sendCopilotChat({
          messages: updatedMsgs.map((m) => ({ role: m.role, content: m.content })),
          message: text,
          activePlanContext: planSummaryCtx,
        });

        if (chatRes.structuredPlan) setActivePlan(chatRes.structuredPlan);

        const assistantMsg: ChatMessage = {
          id: `a_${Date.now()}`,
          role: 'assistant',
          content: chatRes.reply,
          timestamp: new Date().toISOString(),
          agentTrace: chatRes.agentTrace,
          structuredPlan: chatRes.structuredPlan,
          groundingLinks: chatRes.groundingLinks,
        };
        const finalMsgs = [...updatedMsgs, assistantMsg];
        setMessages(finalMsgs);
        void persistThread(finalMsgs, text);
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Unable to reach AI Copilot.';
      showToast('Copilot Error', errMsg, 'error');
      setMessages((prev) => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          role: 'assistant',
          content: `I encountered an issue processing that request: ${errMsg}`,
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSaveActivePlan = async () => {
    if (!activePlan) return;
    setSavingTrip(true);
    try {
      const reqs = activePlan.parsedRequirements;
      const newTrip: TripRecord = {
        tripId: `trip_${Date.now()}`,
        userId: user?.uid || 'demo-local',
        origin: reqs.origin,
        destination: reqs.destination,
        departureDate: reqs.departureDate,
        returnDate: reqs.returnDate,
        travellers: reqs.travellers,
        budget: reqs.budget,
        currency: reqs.currency,
        travelStyle: reqs.travelStyle,
        itinerary: activePlan.itinerary,
        budgetBreakdown: activePlan.budget,
        status: 'planned',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await saveTrip(newTrip);
      showToast('Trip Saved', `${reqs.origin} → ${reqs.destination} saved to My Trips.`, 'success');
    } catch (err) {
      showToast('Save Failed', err instanceof Error ? err.message : 'Could not save trip.', 'error');
    } finally {
      setSavingTrip(false);
    }
  };

  const handleNewChat = () => {
    setConversationId(`conv_${Date.now()}`);
    setActivePlan(null);
    setLiveTrace([]);
    setMessages([
      {
        id: 'welcome-new',
        role: 'assistant',
        timestamp: new Date().toISOString(),
        content: 'Started a fresh travel planning session. Where would you like to explore next?',
      },
    ]);
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
      {/* Left/Center Conversational Copilot */}
      <div className="xl:col-span-7 flex flex-col bg-white border border-slate-200 rounded-xl overflow-hidden min-h-[680px] max-h-[82vh]">
        <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between gap-4 bg-white">
          <div>
            <h2 className="text-sm font-semibold text-[#10243A]">VoyageMind AI Travel Copilot</h2>
            <p className="text-xs text-slate-500">
              Multi-turn assistant backed by Travel Manager & 6 specialist agents
            </p>
          </div>
          <button
            type="button"
            onClick={handleNewChat}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-[#10243A] hover:bg-slate-50 transition-colors whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" />
            New Session
          </button>
        </div>

        {/* Scrollable Thread */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 bg-[#F5F7FA]/40">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[88%] rounded-xl px-4 py-3 text-sm leading-relaxed whitespace-pre-line ${
                  m.role === 'user'
                    ? 'bg-[#10243A] text-white'
                    : 'bg-white border border-slate-200 text-[#182B3A]'
                }`}
              >
                {m.content}

                {m.groundingLinks && m.groundingLinks.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-100">
                    <p className="text-xs font-semibold text-[#10243A] mb-1.5">
                      Verified Google Maps Places
                    </p>
                    <ul className="space-y-1">
                      {m.groundingLinks.slice(0, 6).map((link, idx) => (
                        <li key={idx}>
                          <a
                            href={link.uri}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs text-[#247BA0] hover:underline"
                          >
                            <MapPin className="w-3 h-3 shrink-0" />
                            <span>{link.title}</span>
                            <ExternalLink className="w-3 h-3 shrink-0" />
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              <span className="text-[11px] text-slate-400 mt-1 px-1">
                {m.role === 'user' ? 'You' : 'VoyageMind Copilot'} ·{' '}
                {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          ))}

          {isProcessing && (
            <div className="bg-white border border-slate-200 rounded-xl p-4 text-xs text-slate-600 flex items-center gap-2.5">
              <RefreshCw className="w-4 h-4 text-[#247BA0] animate-spin" />
              Coordinating specialised travel agents...
            </div>
          )}
          <div ref={threadEndRef} />
        </div>

        {/* Suggested Prompts */}
        <div className="px-4 py-2.5 border-t border-slate-100 bg-white flex gap-2 overflow-x-auto">
          {SUGGESTED_PROMPTS.map((promptText, idx) => (
            <button
              key={idx}
              type="button"
              disabled={isProcessing}
              onClick={() => void handleSend(promptText)}
              className="px-3 py-1.5 rounded-lg bg-[#F5F7FA] hover:bg-slate-200/70 text-xs text-[#182B3A] font-medium transition-colors whitespace-nowrap shrink-0"
            >
              {promptText.length > 46 ? `${promptText.slice(0, 46)}…` : promptText}
            </button>
          ))}
        </div>

        {/* Input Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void handleSend();
          }}
          className="p-4 border-t border-slate-200 bg-white flex gap-2.5"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isProcessing}
            placeholder="Ask to plan a trip, adjust budget, swap destinations, or regenerate days..."
            className="flex-1 px-3.5 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#247BA0]/30"
          />
          <button
            type="submit"
            disabled={isProcessing || !input.trim()}
            className="px-4 py-2.5 rounded-lg bg-[#10243A] text-white text-sm font-semibold hover:bg-[#1a3756] transition-colors inline-flex items-center gap-2 disabled:opacity-50 whitespace-nowrap shrink-0"
          >
            <Send className="w-4 h-4" />
            Send
          </button>
        </form>
      </div>

      {/* Right Column: Live Agent Execution Panel & Structured Plan Cards */}
      <div className="xl:col-span-5 space-y-5">
        {liveTrace.length > 0 && <AgentExecutionPanel steps={liveTrace} />}

        {activePlan ? (
          <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-5">
            <div className="flex flex-wrap items-start justify-between gap-3 pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-[#10243A]">
                  {activePlan.parsedRequirements.origin} → {activePlan.parsedRequirements.destination}
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  {activePlan.parsedRequirements.days} days · {activePlan.parsedRequirements.travellers}{' '}
                  traveller(s) · Target{' '}
                  <span className="font-mono tabular-nums">
                    {formatCurrency(
                      activePlan.parsedRequirements.budget,
                      activePlan.parsedRequirements.currency
                    )}
                  </span>
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={savingTrip}
                  onClick={handleSaveActivePlan}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#32C6B5] text-[#10243A] text-xs font-semibold hover:bg-[#2bb4a4] transition-colors whitespace-nowrap"
                >
                  <BookmarkPlus className="w-3.5 h-3.5" />
                  {savingTrip ? 'Saving...' : 'Save Trip'}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    navigate('/planner', {
                      state: {
                        loadedItinerary: activePlan.itinerary,
                        prefill: {
                          origin: activePlan.parsedRequirements.origin,
                          destination: activePlan.parsedRequirements.destination,
                          departureDate: activePlan.parsedRequirements.departureDate,
                          returnDate: activePlan.parsedRequirements.returnDate,
                          travellers: activePlan.parsedRequirements.travellers,
                          budget: activePlan.parsedRequirements.budget,
                          currency: activePlan.parsedRequirements.currency,
                          travelStyle: activePlan.parsedRequirements.travelStyle,
                        },
                      },
                    })
                  }
                  className="px-3 py-2 rounded-lg border border-slate-200 text-xs font-medium text-[#10243A] hover:bg-slate-50 whitespace-nowrap"
                >
                  Edit in Planner
                </button>
              </div>
            </div>

            {/* Day-by-Day Preview */}
            <div>
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2.5">
                Day-Wise Itinerary Preview
              </h4>
              <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                {activePlan.itinerary.map((day) => (
                  <div key={day.day} className="p-3 rounded-lg bg-[#F5F7FA] border border-slate-200/70">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold text-[#10243A]">
                        Day {day.day}: {day.theme}
                      </p>
                      <span className="text-[11px] font-mono tabular-nums text-slate-600">
                        ~{formatCurrency(day.estimatedDayCost, activePlan.parsedRequirements.currency)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1">
                      {day.activities.map((a) => a.title).join(' · ')}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Flights & Hotels Sample Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
              <div className="p-3 rounded-lg border border-slate-200">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-[#10243A]">
                  <Plane className="w-3.5 h-3.5 text-[#247BA0]" />
                  Top Flight Option
                </div>
                {activePlan.flights[0] ? (
                  <>
                    <p className="text-xs font-medium text-[#182B3A] mt-1">
                      {activePlan.flights[0].airline} ({activePlan.flights[0].flightNumber})
                    </p>
                    <p className="text-xs font-mono tabular-nums text-[#247BA0] mt-0.5">
                      {formatCurrency(activePlan.flights[0].price, activePlan.flights[0].currency)} ·{' '}
                      {activePlan.flights[0].durationLabel}
                    </p>
                    <p className="text-[10px] text-amber-700 mt-1">
                      {activePlan.flights[0].isDemoData ? 'DEMO DATA – NOT LIVE' : 'Live Feed'}
                    </p>
                  </>
                ) : (
                  <p className="text-xs text-slate-500 mt-1">No flight sample needed</p>
                )}
              </div>

              <div className="p-3 rounded-lg border border-slate-200">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-[#10243A]">
                  <Building2 className="w-3.5 h-3.5 text-[#247BA0]" />
                  Top Hotel Match
                </div>
                {activePlan.hotels[0] ? (
                  <>
                    <p className="text-xs font-medium text-[#182B3A] mt-1 truncate">
                      {activePlan.hotels[0].name}
                    </p>
                    <p className="text-xs font-mono tabular-nums text-[#247BA0] mt-0.5">
                      {formatCurrency(
                        activePlan.hotels[0].pricePerNight,
                        activePlan.hotels[0].currency
                      )}
                      /night · ★ {activePlan.hotels[0].rating}
                    </p>
                    <p className="text-[10px] text-amber-700 mt-1">
                      {activePlan.hotels[0].isDemoData ? 'DEMO DATA – NOT LIVE' : 'Live Inventory'}
                    </p>
                  </>
                ) : (
                  <p className="text-xs text-slate-500 mt-1">No hotel sample</p>
                )}
              </div>
            </div>

            {/* Budget Estimate Strip */}
            <div className="p-3.5 rounded-lg bg-[#10243A] text-white flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Wallet className="w-4 h-4 text-[#32C6B5]" />
                <div>
                  <p className="text-xs font-medium text-slate-300">Estimated Total Cost</p>
                  <p className="text-sm font-bold font-mono tabular-nums">
                    {formatCurrency(activePlan.budget.estimatedTotal, activePlan.budget.currency)}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-300">Remaining Budget</p>
                <p
                  className={`text-sm font-bold font-mono tabular-nums ${
                    activePlan.budget.remainingBudget >= 0 ? 'text-[#32C6B5]' : 'text-amber-300'
                  }`}
                >
                  {formatCurrency(activePlan.budget.remainingBudget, activePlan.budget.currency)}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-xl p-6 text-center">
            <p className="text-sm font-semibold text-[#10243A]">Structured Travel Output</p>
            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
              Ask the Copilot to plan a trip (for example, click the Chennai → Goa prompt) to watch the 6 specialist agents coordinate live and assemble your itinerary, flights, hotels, and budget breakdown here.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
