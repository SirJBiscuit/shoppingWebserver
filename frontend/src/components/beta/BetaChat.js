import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Send, ArrowLeft, Circle } from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const POLL_MS = 3000;
const fmtTime = (ts) => new Date(ts).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
const fmtDay = (ts) => new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

/**
 * BetaChat — instant two-way messaging between admins and beta testers.
 *
 * <BetaChat />                       — peer list + thread (admins: testers, testers: admins)
 * <BetaChat peerId={id} peerName=…/> — direct thread view (e.g. tester card "Chat")
 *
 * Live via 3s incremental polling: GET /thread/:id?after=<lastId> only
 * returns new rows, so the stream is cheap and effectively real-time.
 */
const BetaChat = ({ peerId = null, peerName = null }) => {
  const { user } = useAuth();
  const [peers, setPeers] = useState(null);
  const [active, setActive] = useState(peerId ? { id: peerId, name: peerName } : null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const lastId = useRef(0);
  const bottomRef = useRef(null);
  const draftRef = useRef(null);

  /* ---------- peer list ---------- */
  const loadPeers = useCallback(async () => {
    try {
      const { data } = await api.get('/beta/messages/peers');
      setPeers(data.peers || []);
    } catch (e) {
      console.error('Beta chat peers:', e);
      setPeers([]);
    }
  }, []);

  useEffect(() => {
    if (active) return; // direct-thread mode doesn't need the list
    loadPeers();
    const t = setInterval(loadPeers, POLL_MS * 3); // list refreshes slower
    return () => clearInterval(t);
  }, [active, loadPeers]);

  /* ---------- thread ---------- */
  const loadThread = useCallback(async (peer, incremental) => {
    try {
      const url = `/beta/messages/thread/${peer.id}` +
        (incremental && lastId.current ? `?after=${lastId.current}` : '');
      const { data } = await api.get(url);
      const incoming = data.messages || [];
      if (incoming.length) {
        lastId.current = Math.max(lastId.current, ...incoming.map((m) => m.id));
        setMessages((prev) => {
          const seen = new Set(prev.map((m) => m.id));
          return [...prev, ...incoming.filter((m) => !seen.has(m.id))];
        });
        // Anything from the peer is now read
        if (incoming.some((m) => m.sender_id === peer.id)) {
          api.post(`/beta/messages/read/${peer.id}`).catch(() => {});
        }
      }
    } catch (e) {
      console.error('Beta chat thread:', e);
    }
  }, []);

  useEffect(() => {
    if (!active) return undefined;
    lastId.current = 0;
    setMessages([]);
    loadThread(active, false);
    api.post(`/beta/messages/read/${active.id}`).catch(() => {});
    const t = setInterval(() => loadThread(active, true), POLL_MS);
    return () => clearInterval(t);
  }, [active, loadThread]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length]);

  const send = async () => {
    const body = draft.trim();
    if (!body || !active || sending) return;
    setSending(true);
    try {
      const { data } = await api.post('/beta/messages', { to: active.id, body });
      lastId.current = Math.max(lastId.current, data.id);
      setMessages((prev) => [...prev, data]);
      setDraft('');
      draftRef.current?.focus();
    } catch (e) {
      console.error('Beta chat send:', e);
    } finally {
      setSending(false);
    }
  };

  /* ---------- thread view ---------- */
  if (active) {
    const peerLabel = active.name || peers?.find((p) => p.id === active.id)?.display_name
      || peers?.find((p) => p.id === active.id)?.username || 'Chat';
    return (
      <div className="flex flex-col bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden h-[480px]">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-purple-50 dark:bg-purple-900/20">
          {!peerId && (
            <button onClick={() => setActive(null)} className="p-1.5 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-800/40" title="Back to conversations">
              <ArrowLeft className="w-4 h-4 text-purple-600 dark:text-purple-300" />
            </button>
          )}
          <MessageSquare className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          <p className="font-semibold text-gray-900 dark:text-white truncate">{peerLabel}</p>
          <span className="ml-auto text-[10px] text-gray-400">live</span>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
          {messages.length === 0 && (
            <p className="text-center text-xs text-gray-400 dark:text-gray-500 py-8">
              No messages yet — say hi!
            </p>
          )}
          <AnimatePresence initial={false}>
            {messages.map((m) => {
              const mine = m.sender_id === user?.id;
              return (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${mine ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm whitespace-pre-wrap break-words ${
                      mine
                        ? 'bg-purple-600 text-white rounded-br-sm'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-bl-sm'
                    }`}
                    title={new Date(m.created_at).toLocaleString()}
                  >
                    {m.body}
                    <span className={`block mt-0.5 text-[9px] ${mine ? 'text-purple-200' : 'text-gray-400'}`}>
                      {fmtTime(m.created_at)}
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
          <div ref={bottomRef} />
        </div>

        <div className="px-3 py-2.5 border-t border-gray-200 dark:border-gray-700 flex items-center gap-2">
          <input
            ref={draftRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder="Type a message…"
            maxLength={2000}
            className="flex-1 px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
          <button
            onClick={send}
            disabled={sending || !draft.trim()}
            className="p-2.5 rounded-lg bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white transition-colors"
            title="Send"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  /* ---------- peer list ---------- */
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <MessageSquare className="w-5 h-5 text-purple-600 dark:text-purple-400" />
        <h3 className="font-semibold text-gray-900 dark:text-white">
          {user?.isAdmin || user?.is_admin ? 'Tester Messages' : 'Messages'}
        </h3>
      </div>
      <div className="divide-y divide-gray-100 dark:divide-gray-700 max-h-[420px] overflow-y-auto">
        {peers === null && (
          <div className="p-6 space-y-3 animate-pulse">
            {[0, 1, 2].map((i) => <div key={i} className="h-10 bg-gray-100 dark:bg-gray-700 rounded-lg" />)}
          </div>
        )}
        {peers !== null && peers.length === 0 && (
          <p className="p-6 text-center text-sm text-gray-500 dark:text-gray-400">
            No one to chat with yet.
          </p>
        )}
        {(peers || []).map((p) => {
          const name = p.display_name || p.username || `User ${p.id}`;
          return (
            <button
              key={p.id}
              onClick={() => setActive({ id: p.id, name })}
              className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors"
            >
              <div className="w-9 h-9 rounded-full bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center text-purple-600 dark:text-purple-300 font-bold">
                {name.slice(0, 1).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{name}</p>
                {p.last_at && (
                  <p className="text-xs text-gray-400">{fmtDay(p.last_at)} · {fmtTime(p.last_at)}</p>
                )}
              </div>
              {p.unread > 0 ? (
                <span className="px-2 py-0.5 text-[11px] font-bold bg-red-500 text-white rounded-full">{p.unread}</span>
              ) : (
                <Circle className="w-2 h-2 text-gray-300 dark:text-gray-600" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default BetaChat;
