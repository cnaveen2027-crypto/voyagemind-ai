import React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Compass,
  Layers,
  ShieldAlert,
  Wallet,
  CalendarRange,
  Plane,
  Building2,
} from 'lucide-react';
import { HERO_IMAGE_URL } from '../data/destinations';
import { SafeImage } from '../components/common/SafeImage';

const SPECIALIZED_AGENTS = [
  {
    number: '01',
    name: 'Travel Manager Agent',
    description:
      'Parses natural-language requests, identifies missing constraints, routes subtasks to specialist agents, and synthesizes a unified plan.',
  },
  {
    number: '02',
    name: 'Destination Discovery Agent',
    description:
      'Evaluates seasonality, budgets, and interests with Google Maps grounding to verify real places and neighbourhood highlights.',
  },
  {
    number: '03',
    name: 'Itinerary Planning Agent',
    description:
      'Clusters attractions geographically into morning, afternoon, and evening blocks with realistic transit estimates.',
  },
  {
    number: '04',
    name: 'Flight Intelligence Agent',
    description:
      'Queries flight provider adapters, compares fares, stops, and durations, and ranks routes for your schedule.',
  },
  {
    number: '05',
    name: 'Hotel Intelligence Agent',
    description:
      'Matches stays by rating, amenities, nightly budget, and proximity to planned itinerary zones.',
  },
  {
    number: '06',
    name: 'Budget Optimisation Agent',
    description:
      'Projects 7-category trip expenses and identifies concrete savings opportunities before you book.',
  },
  {
    number: '07',
    name: 'Journey Recovery Agent',
    description:
      'Resolves cancellations, delays, and weather disruptions with side-by-side Original vs Recovered plans.',
  },
];

const ILLUSTRATIVE_TESTIMONIALS = [
  {
    quote:
      'After our evening connection into Delhi was cancelled, the Journey Recovery workflow mapped three morning alternatives and shifted our Day 1 fort visit in under two minutes.',
    author: 'Ananya Deshmukh',
    role: 'Product Operations Lead · Illustrative Sample Review',
  },
  {
    quote:
      'Entering a ₹40,000 four-person Goa brief gave us a full four-day coastal schedule, realistic scooter transit times, and clear savings recommendations.',
    author: 'Rohan Kulkarni',
    role: 'Group Trip Organiser · Illustrative Sample Review',
  },
  {
    quote:
      'Having destination discovery grounded directly in Google Maps links alongside a day-by-day budget breakdown eliminated six separate browser tabs.',
    author: 'Meera Nair',
    role: 'Independent Traveller · Illustrative Sample Review',
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#F5F7FA] text-[#182B3A]">
      {/* Strict 3-Zone Top Bar Contract */}
      <header className="bg-white/95 backdrop-blur border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-[1200px] mx-auto px-6 h-16 flex items-center justify-between gap-8">
          <Link
            to="/"
            className="text-lg font-bold tracking-tight text-[#10243A] whitespace-nowrap shrink-0"
          >
            VoyageMind AI
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
            <a href="#features" className="hover:text-[#10243A] transition-colors whitespace-nowrap shrink-0">
              Features
            </a>
            <a href="#agents" className="hover:text-[#10243A] transition-colors whitespace-nowrap shrink-0">
              Multi-Agent AI
            </a>
            <a href="#recovery" className="hover:text-[#10243A] transition-colors whitespace-nowrap shrink-0">
              Recovery
            </a>
            <Link to="/dashboard" className="hover:text-[#10243A] transition-colors whitespace-nowrap shrink-0">
              Dashboard
            </Link>
          </nav>

          <div className="flex items-center shrink-0">
            <Link
              to="/planner"
              className="px-4 py-2 rounded-lg bg-[#10243A] text-white text-xs font-semibold hover:bg-[#1b3a5c] transition-colors whitespace-nowrap shrink-0"
            >
              Start Planning
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-[#10243A] text-white">
        <div className="absolute inset-0">
          <SafeImage
            src={HERO_IMAGE_URL}
            alt="Coastal cliffside terrace overlooking turquoise sea at golden hour"
            className="w-full h-full object-cover opacity-55"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#10243A]/95 via-[#10243A]/75 to-[#10243A]/35" />
        </div>

        <div className="relative max-w-[1200px] mx-auto px-6 py-20 lg:py-28">
          <div className="max-w-2xl">
            <p className="text-xs font-medium text-[#32C6B5] tracking-wide mb-3">
              Your World. Your Journey. Your AI Travel Copilot.
            </p>
            <h1
              className="font-bold tracking-tight text-white leading-[1.1] mb-5"
              style={{ fontSize: 'clamp(2.25rem, 4.2vw, 3.75rem)', textWrap: 'balance' }}
            >
              Travel Smarter. Explore Further.
            </h1>
            <p className="text-base sm:text-lg text-slate-200 leading-relaxed mb-8 max-w-xl">
              Meet VoyageMind AI – Your intelligent travel copilot that plans, optimises and manages every part of your journey.
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <Link
                to="/planner"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-[#32C6B5] text-[#10243A] text-sm font-semibold hover:bg-[#2bb4a4] transition-colors whitespace-nowrap shrink-0"
              >
                Start Planning
                <ArrowRight className="w-4 h-4" />
              </Link>
              <a
                href="#features"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-lg border border-white/30 text-white text-sm font-medium hover:bg-white/10 transition-colors whitespace-nowrap shrink-0"
              >
                Explore Features
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Value Proposition Strip */}
      <section className="bg-white border-b border-slate-200">
        <div className="max-w-[1200px] mx-auto px-6 py-8 grid grid-cols-2 lg:grid-cols-4 gap-6">
          <div>
            <p className="text-2xl font-bold font-mono tabular-nums text-[#10243A]">7</p>
            <p className="text-xs text-slate-600 mt-1">Coordinated specialised AI travel agents</p>
          </div>
          <div>
            <p className="text-2xl font-bold font-mono tabular-nums text-[#10243A]">14</p>
            <p className="text-xs text-slate-600 mt-1">Integrated travel planning & recovery views</p>
          </div>
          <div>
            <p className="text-2xl font-bold font-mono tabular-nums text-[#10243A]">7 Categories</p>
            <p className="text-xs text-slate-600 mt-1">Transparent budget breakdown & savings model</p>
          </div>
          <div>
            <p className="text-2xl font-bold font-mono tabular-nums text-[#10243A]">PDF & Cloud</p>
            <p className="text-xs text-slate-600 mt-1">Instant itinerary export & Firestore trip sync</p>
          </div>
        </div>
      </section>

      {/* Core Capabilities Bento Grid */}
      <section id="features" className="max-w-[1200px] mx-auto px-6 py-16 lg:py-20">
        <div className="max-w-2xl mb-10">
          <h2 className="text-2xl sm:text-3xl font-bold text-[#10243A] tracking-tight">
            Built for the complete travel lifecycle
          </h2>
          <p className="text-sm sm:text-base text-slate-600 mt-2 leading-relaxed">
            From natural-language trip discovery to mid-journey disruption recovery, every module shares structured context.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <Link
            to="/copilot"
            className="md:col-span-2 bg-white border border-slate-200 rounded-xl p-6 hover:border-[#247BA0] transition-colors flex flex-col justify-between"
          >
            <div>
              <div className="w-10 h-10 rounded-lg bg-[#10243A] text-[#32C6B5] flex items-center justify-center mb-4">
                <Layers className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-semibold text-[#10243A]">
                01. Natural-Language AI Travel Copilot
              </h3>
              <p className="text-sm text-slate-600 mt-2 leading-relaxed max-w-xl">
                Describe your origin, budget, group size, and interests in plain English. The Travel Manager Agent extracts requirements, coordinates specialist agents in real time, and supports multi-turn refinements.
              </p>
            </div>
            <span className="mt-5 inline-flex items-center gap-1.5 text-xs font-semibold text-[#247BA0]">
              Open AI Travel Copilot <ArrowRight className="w-3.5 h-3.5" />
            </span>
          </Link>

          <Link
            to="/destinations"
            className="bg-white border border-slate-200 rounded-xl p-6 hover:border-[#247BA0] transition-colors flex flex-col justify-between"
          >
            <div>
              <div className="w-10 h-10 rounded-lg bg-[#247BA0]/10 text-[#247BA0] flex items-center justify-center mb-4">
                <Compass className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-semibold text-[#10243A]">
                02. Maps-Grounded Discovery
              </h3>
              <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                Explore destinations with interactive Google Maps markers, seasonal filters, and verified place links.
              </p>
            </div>
            <span className="mt-5 inline-flex items-center gap-1.5 text-xs font-semibold text-[#247BA0]">
              Explore Destinations <ArrowRight className="w-3.5 h-3.5" />
            </span>
          </Link>

          <Link
            to="/planner"
            className="bg-white border border-slate-200 rounded-xl p-6 hover:border-[#247BA0] transition-colors flex flex-col justify-between"
          >
            <div>
              <div className="w-10 h-10 rounded-lg bg-[#247BA0]/10 text-[#247BA0] flex items-center justify-center mb-4">
                <CalendarRange className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-semibold text-[#10243A]">
                03. Clustered Day-by-Day Planner
              </h3>
              <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                Edit activities, regenerate individual days, reorder schedules, and export clean PDF itineraries.
              </p>
            </div>
            <span className="mt-5 inline-flex items-center gap-1.5 text-xs font-semibold text-[#247BA0]">
              Launch Itinerary Planner <ArrowRight className="w-3.5 h-3.5" />
            </span>
          </Link>

          <Link
            to="/budget"
            className="bg-white border border-slate-200 rounded-xl p-6 hover:border-[#247BA0] transition-colors flex flex-col justify-between"
          >
            <div>
              <div className="w-10 h-10 rounded-lg bg-[#247BA0]/10 text-[#247BA0] flex items-center justify-center mb-4">
                <Wallet className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-semibold text-[#10243A]">
                04. Smart Budget Optimizer
              </h3>
              <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                Visualise spending across 7 travel categories with interactive charts and actionable cost-saving strategies.
              </p>
            </div>
            <span className="mt-5 inline-flex items-center gap-1.5 text-xs font-semibold text-[#247BA0]">
              Optimise Budget <ArrowRight className="w-3.5 h-3.5" />
            </span>
          </Link>

          <div className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-10 h-10 rounded-lg bg-[#247BA0]/10 text-[#247BA0] flex items-center justify-center">
                  <Plane className="w-5 h-5" />
                </div>
                <div className="w-10 h-10 rounded-lg bg-[#247BA0]/10 text-[#247BA0] flex items-center justify-center">
                  <Building2 className="w-5 h-5" />
                </div>
              </div>
              <h3 className="text-lg font-semibold text-[#10243A]">
                05. Flight & Hotel Intelligence
              </h3>
              <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                Adapter-ready search comparing fares, stops, amenities, and ratings—transparently labelled in Demo Mode when live provider keys are unset.
              </p>
            </div>
            <div className="mt-5 flex items-center gap-4 text-xs font-semibold text-[#247BA0]">
              <Link to="/flights" className="hover:underline">Compare Flights</Link>
              <Link to="/hotels" className="hover:underline">Find Hotels</Link>
            </div>
          </div>
        </div>
      </section>

      {/* Multi-Agent AI Architecture */}
      <section id="agents" className="bg-white border-y border-slate-200 py-16 lg:py-20">
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="max-w-2xl mb-10">
            <h2 className="text-2xl sm:text-3xl font-bold text-[#10243A] tracking-tight">
              Seven coordinated agents, one cohesive plan
            </h2>
            <p className="text-sm sm:text-base text-slate-600 mt-2 leading-relaxed">
              Instead of a single monolithic prompt, VoyageMind AI delegates structured subtasks across specialised server-side agents.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-8">
            {SPECIALIZED_AGENTS.map((agent) => (
              <div key={agent.number} className="pt-4 border-t border-slate-200">
                <p className="text-xs font-mono tabular-nums text-[#247BA0] font-semibold">
                  {agent.number}
                </p>
                <h3 className="text-base font-semibold text-[#10243A] mt-1">{agent.name}</h3>
                <p className="text-sm text-slate-600 mt-1.5 leading-relaxed">{agent.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Adaptive Journey Recovery */}
      <section id="recovery" className="max-w-[1200px] mx-auto px-6 py-16 lg:py-20">
        <div className="bg-[#10243A] text-white rounded-2xl p-8 lg:p-12 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-7">
            <div className="w-10 h-10 rounded-lg bg-[#32C6B5]/15 text-[#32C6B5] flex items-center justify-center mb-4">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Adaptive Journey Recovery Centre
            </h2>
            <p className="text-sm sm:text-base text-slate-300 mt-3 leading-relaxed">
              When a flight is cancelled, a connection is missed, or weather closes an attraction, the Journey Recovery Agent evaluates alternatives, recalculates costs and arrival times, and presents an Original vs Recovered Plan comparison awaiting your explicit confirmation.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                to="/recovery"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#32C6B5] text-[#10243A] text-sm font-semibold hover:bg-[#2bb4a4] transition-colors whitespace-nowrap"
              >
                Simulate Disruption Recovery
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/dashboard"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border border-white/25 text-white text-sm font-medium hover:bg-white/10 transition-colors whitespace-nowrap"
              >
                Open Workspace
              </Link>
            </div>
          </div>

          <div className="lg:col-span-5 bg-white/5 border border-white/15 rounded-xl p-5 space-y-4">
            <div className="pb-3 border-b border-white/10">
              <p className="text-xs text-slate-400">Example Recovery Comparison</p>
              <p className="text-sm font-semibold text-white mt-0.5">
                Chennai → Delhi Flight Cancellation
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <p className="text-slate-400">Original Arrangement</p>
                <p className="text-white font-medium mt-1">09:30 Departure · Cancelled</p>
                <p className="text-slate-300 font-mono tabular-nums mt-0.5">₹5,400 est.</p>
              </div>
              <div>
                <p className="text-slate-400">Recovered Alternative</p>
                <p className="text-[#32C6B5] font-medium mt-1">11:15 Non-Stop Re-route</p>
                <p className="text-white font-mono tabular-nums mt-0.5">+₹850 · +1h 45m</p>
              </div>
            </div>
            <p className="text-xs text-slate-300 pt-2 border-t border-white/10">
              Day 1 afternoon Heritage Walk shifted to Day 2 morning; user confirmation required before applying.
            </p>
          </div>
        </div>
      </section>

      {/* Illustrative Testimonials */}
      <section className="bg-white border-t border-slate-200 py-16">
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-[#10243A] tracking-tight">
              Traveller Workflow Scenarios
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Illustrative sample feedback demonstrating typical trip planning and disruption recovery outcomes
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {ILLUSTRATIVE_TESTIMONIALS.map((item) => (
              <blockquote
                key={item.author}
                className="border border-slate-200 rounded-xl p-6 bg-[#F5F7FA]/50 flex flex-col justify-between"
              >
                <p className="text-sm text-[#182B3A] leading-relaxed">“{item.quote}”</p>
                <footer className="mt-5 pt-4 border-t border-slate-200">
                  <p className="text-sm font-semibold text-[#10243A]">{item.author}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{item.role}</p>
                </footer>
              </blockquote>
            ))}
          </div>
        </div>
      </section>

      {/* Quiet Footer */}
      <footer className="bg-[#10243A] text-slate-300 py-12">
        <div className="max-w-[1200px] mx-auto px-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <p className="text-base font-bold text-white">VoyageMind AI</p>
            <p className="text-xs text-slate-400 mt-1">
              Your World. Your Journey. Your AI Travel Copilot. · Built for VOYAGEHACK 4.0
            </p>
          </div>
          <nav className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs">
            <Link to="/dashboard" className="hover:text-white transition-colors">Dashboard</Link>
            <Link to="/copilot" className="hover:text-white transition-colors">AI Copilot</Link>
            <Link to="/destinations" className="hover:text-white transition-colors">Destinations</Link>
            <Link to="/planner" className="hover:text-white transition-colors">Itinerary Planner</Link>
            <Link to="/recovery" className="hover:text-white transition-colors">Journey Recovery</Link>
            <Link to="/auth" className="hover:text-white transition-colors">Sign In</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
