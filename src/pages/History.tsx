import React, { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  History as HistoryIcon,
  Search,
  MessageSquare,
  Trash2,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import { useTravelData } from '../context/TravelDataContext';
import { useToast } from '../context/ToastContext';

export default function History() {
  const { conversations, loadingData, removeConversation } = useTravelData();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        c.messages.some((m) => m.content.toLowerCase().includes(q))
    );
  }, [conversations, query]);

  const selected = useMemo(
    () => conversations.find((c) => c.conversationId === selectedId) || filtered[0] || null,
    [conversations, selectedId, filtered]
  );

  const handleDelete = async (conversationId: string) => {
    try {
      await removeConversation(conversationId);
      setConfirmDeleteId(null);
      if (selectedId === conversationId) setSelectedId(null);
      showToast('Conversation Deleted', 'Removed from assistant history.', 'info');
    } catch (err) {
      showToast('Delete Failed', err instanceof Error ? err.message : 'Unable to delete thread.', 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-[#10243A]">Travel Assistant History</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Review past AI Travel Copilot transcripts or resume an active planning thread
          </p>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search conversations..."
            className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#247BA0]/30"
          />
        </div>
      </div>

      {loadingData ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-4 space-y-3">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-20 bg-white border border-slate-200 rounded-xl animate-pulse" />
            ))}
          </div>
          <div className="lg:col-span-8 h-80 bg-white border border-slate-200 rounded-xl animate-pulse" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center">
          <HistoryIcon className="w-8 h-8 text-[#247BA0] mx-auto mb-3" />
          <h3 className="text-base font-semibold text-[#10243A]">No saved conversations</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            Start a planning session in the AI Travel Copilot and your multi-agent threads will be archived here automatically.
          </p>
          <Link
            to="/copilot"
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#10243A] text-white text-xs font-semibold"
          >
            <MessageSquare className="w-3.5 h-3.5" />
            Open AI Travel Copilot
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-4 space-y-2.5">
            {filtered.map((conv) => {
              const isSelected = selected?.conversationId === conv.conversationId;
              const isConfirming = confirmDeleteId === conv.conversationId;
              return (
                <article
                  key={conv.conversationId}
                  onClick={() => setSelectedId(conv.conversationId)}
                  className={`bg-white border rounded-xl p-4 cursor-pointer transition-colors ${
                    isSelected ? 'border-[#247BA0] ring-1 ring-[#247BA0]/20' : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-semibold text-[#10243A] line-clamp-1">
                      {conv.title}
                    </h3>
                    <div onClick={(e) => e.stopPropagation()}>
                      {isConfirming ? (
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => void handleDelete(conv.conversationId)}
                            className="px-2 py-0.5 rounded bg-[#DC2626] text-white text-[10px] font-semibold"
                          >
                            Delete
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(null)}
                            className="px-2 py-0.5 rounded border border-slate-200 text-[10px]"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(conv.conversationId)}
                          aria-label="Delete conversation"
                          className="p-1 text-slate-400 hover:text-[#DC2626]"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    {conv.messages.length} messages ·{' '}
                    {new Date(conv.updatedAt).toLocaleDateString()}
                  </p>
                </article>
              );
            })}
          </div>

          {selected && (
            <section className="lg:col-span-8 bg-white border border-slate-200 rounded-xl p-6 space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
                <div>
                  <h3 className="text-base font-bold text-[#10243A]">{selected.title}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Last updated {new Date(selected.updatedAt).toLocaleString()}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    navigate('/copilot', {
                      state: { loadedConversation: selected },
                    })
                  }
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#32C6B5] text-[#10243A] text-xs font-semibold hover:bg-[#2bb4a4]"
                >
                  Continue in Copilot
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="space-y-4 max-h-[540px] overflow-y-auto pr-1">
                {selected.messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`p-4 rounded-xl text-sm leading-relaxed whitespace-pre-line ${
                      msg.role === 'user'
                        ? 'bg-[#10243A] text-white ml-8'
                        : 'bg-[#F5F7FA] border border-slate-200 text-[#182B3A] mr-8'
                    }`}
                  >
                    <p className="text-[11px] font-semibold opacity-75 mb-1">
                      {msg.role === 'user' ? 'You' : 'VoyageMind Copilot'}
                    </p>
                    {msg.content}
                    {msg.groundingLinks && msg.groundingLinks.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-slate-200/70 space-y-1">
                        {msg.groundingLinks.slice(0, 4).map((gl, idx) => (
                          <a
                            key={idx}
                            href={gl.uri}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-[#247BA0] hover:underline mr-3"
                          >
                            {gl.title}
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
