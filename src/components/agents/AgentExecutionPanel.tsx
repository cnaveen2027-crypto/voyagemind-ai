import React from 'react';
import { CheckCircle2, Clock, Loader2, AlertCircle, Cpu } from 'lucide-react';
import { AgentTraceStep } from '../../types/travel';

interface AgentExecutionPanelProps {
  steps: AgentTraceStep[];
  title?: string;
}

export function AgentExecutionPanel({
  steps,
  title = 'Multi-Agent Execution Pipeline',
}: AgentExecutionPanelProps) {
  if (!steps || steps.length === 0) return null;

  const activeStep = steps.find((s) => s.status === 'running');
  const completedCount = steps.filter((s) => s.status === 'completed').length;

  return (
    <section
      aria-label="Agent Execution Panel"
      className="bg-white border border-slate-200 rounded-xl p-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#10243A] text-white flex items-center justify-center">
            <Cpu className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[#10243A]">{title}</h3>
            <p className="text-xs text-slate-500">
              {activeStep
                ? `Active: ${activeStep.agentName} — ${activeStep.task}`
                : `${completedCount} of ${steps.length} specialised agents completed`}
            </p>
          </div>
        </div>
        <span className="text-xs font-mono tabular-nums text-slate-600">
          {completedCount}/{steps.length} Completed
        </span>
      </div>

      <div className="mt-4 divide-y divide-slate-100">
        {steps.map((step) => {
          return (
            <div key={step.agentId} className="py-3 first:pt-0 last:pb-0 flex items-start justify-between gap-4">
              <div className="flex items-start gap-3 min-w-0">
                <div className="mt-0.5 shrink-0">
                  {step.status === 'completed' && (
                    <CheckCircle2 className="w-4 h-4 text-[#16A34A]" aria-label="Completed" />
                  )}
                  {step.status === 'running' && (
                    <Loader2 className="w-4 h-4 text-[#247BA0] animate-spin" aria-label="Running" />
                  )}
                  {step.status === 'pending' && (
                    <Clock className="w-4 h-4 text-slate-400" aria-label="Pending" />
                  )}
                  {step.status === 'error' && (
                    <AlertCircle className="w-4 h-4 text-[#DC2626]" aria-label="Error" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-x-2 text-sm">
                    <span className="font-semibold text-[#10243A]">{step.agentName}</span>
                    <span className="text-slate-300" aria-hidden="true">·</span>
                    <span className="text-xs text-slate-500">{step.role}</span>
                  </div>
                  <p className="text-xs text-slate-600 mt-0.5">{step.summary || step.task}</p>
                </div>
              </div>
              <div className="text-right shrink-0">
                <span
                  className={`text-xs font-medium ${
                    step.status === 'completed'
                      ? 'text-[#16A34A]'
                      : step.status === 'running'
                        ? 'text-[#247BA0]'
                        : step.status === 'error'
                          ? 'text-[#DC2626]'
                          : 'text-slate-400'
                  }`}
                >
                  {step.status === 'completed'
                    ? 'Done'
                    : step.status === 'running'
                      ? 'Running'
                      : step.status === 'error'
                        ? 'Attention'
                        : 'Queued'}
                </span>
                {step.durationMs > 0 && (
                  <p className="text-[11px] font-mono tabular-nums text-slate-400 mt-0.5">
                    {(step.durationMs / 1000).toFixed(2)}s
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
