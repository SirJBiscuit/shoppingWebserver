import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Send, Trash2, Crown, ShieldOff } from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import FormattedNote from '../FormattedNote';

// Beta chatroom — one shared room for admins + testers.
// Admins always render gold with a crown; testers get a stable color from
// their user id. Admin sees beta_username/display_name; testers only see
// plain usernames (server strips nicknames for non-admins anyway).
// Polls ?after=<lastId> every 3s — refreshes are tiny and feel instant.

const TESTER_COLORS = [
  'text-sky-400', 'text-emerald-400', 'text-violet-400', 'text-rose-400',
  'text-amber-300', 'text-cyan-300', 'text-fuchsia-400', 'text-lime-300',
  'text-orange-400', 'text-teal-300', 'text-pink-400', 'text-indigo-300',
];

const testerColor = (id) => TESTER_COLORS[(id || 0) % TESTER_COLORS.length];

const BetaChatroom = ({ tiers = {}, className = '' }) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [canChat, setCanChat] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const listRef = useRef(null);
  const lastId = useRef(0);
  const isAdmin = user?.is_admin === true;

  const scrollToEnd = useCallback(() => {
    requestAnimationFrame(() => {
      if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
    });
  }, []);

  const poll = useCallback(async () => {
    try {
      const res = await api.get('/beta/messages/room', { params: { after: lastId.current || undefined } });
      const { messages: incoming, canChat: cc } = res.data;
      setCanChat(cc !== false || isAdmin);
      setError(null);
      if (incoming?.length) {
        lastId.current = incoming[incoming.length - 1].id;
        setMessages((prev) => {
          const seen = new Set(prev.map((m) => m.id));
          return [...prev, ...incoming.filter((m) => !seen.has(m.id))];
        });
        scrollToEnd();
      }
    } catch {
      setError('Chatroom unavailable');
    }
  }, [isAdmin, scrollToEnd]);

  useEffect(() => {
    lastId.current = 0;
    setMessages([]);
    poll();
    const id = setInterval(poll, 3000);
    return () => clearInterval(id);
  }, [poll]);

  const send = async () => {
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    try {
      await api.post('/beta/messages/room', { body });
      setDraft('');
      await poll();
    } catch (e) {
      setError(e.response?.data?.error || 'Send failed');
    } finally {
      setSending(false);
    }
  };

  const remove = async (id) => {
    try {
      await api.delete(`/beta/messages/room/${id}`);
      setMessages((prev) => prev.filter((m) => m.id !== id));
    } catch {
      setError('Could not remove message');
    }
  };

  const nameOf = (m) => {
    if (!isAdmin) return m.sender_username || 'someone';
    return m.display_name || m.beta_username || m.sender_username || 'someone';
  };

  return (
    <div className={`flex flex-col bg-slate-900 border border-slate-700 rounded-xl overflow-hidden ${className}`}>
      <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-800">
        <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400">Listzy Beta Chatroom</span>
        {error && <span className="text-[10px] text-red-400 ml-auto">{error}</span>}
      </div>

      <div ref={listRef} className="flex-1 min-h-0 overflow-y-auto scrollbar-3d px-3 py-2 space-y-2">
        {messages.map((m) => {
          const mine = m.sender_id === user?.id;
          const adminMsg = m.sender_is_admin === true;
          return (
            <div key={m.id} className="group flex items-start gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {adminMsg && <Crown className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                  <span className={`text-xs font-semibold ${adminMsg ? 'text-amber-400' : testerColor(m.sender_id)}`}>
                    {nameOf(m)}
                  </span>
                  {adminMsg && (
                    <span className="text-[9px] px-1 py-px rounded bg-amber-500/20 text-amber-300 font-bold uppercase">Admin</span>
                  )}
                  {isAdmin && !adminMsg && tiers[m.sender_id] && (
                    <span className="text-[9px] px-1 py-px rounded bg-slate-700 text-slate-300 font-medium">{tiers[m.sender_id]}</span>
                  )}
                  <span className="text-[9px] text-slate-600">
                    {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div className="text-sm text-slate-200 break-words"><FormattedNote text={m.body} /></div>
              </div>
              {(isAdmin || mine) && (
                <button
                  type="button"
                  onClick={() => remove(m.id)}
                  className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400 transition shrink-0 mt-1"
                  title={isAdmin && !mine ? 'Moderate — remove message' : 'Remove your message'}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          );
        })}
        {!messages.length && (
          <p className="text-sm text-slate-500 text-center py-8">
            {error ? 'Could not load the chatroom' : 'No messages yet — start the conversation'}
          </p>
        )}
      </div>

      <div className="border-t border-slate-800 p-2">
        {canChat ? (
          <div className="flex gap-1.5">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder={isAdmin ? 'Message the beta testers…' : 'Message the room…'}
              maxLength={2000}
              className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
            />
            <button
              type="button"
              onClick={send}
              disabled={sending || !draft.trim()}
              className="px-3 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 transition"
              title="Send"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 px-2 py-2 text-xs text-slate-500">
            <ShieldOff className="w-4 h-4" /> Chat access disabled — you can read but not post
          </div>
        )}
      </div>
    </div>
  );
};

export default BetaChatroom;
