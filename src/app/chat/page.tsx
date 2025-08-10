'use client';

import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Send, Bot, Search, X, Clock, Brain, Database, Zap, AlertCircle, Home } from 'lucide-react';
import ApprovalModal from '@/components/ApprovalModal';

interface ChatMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  metadata?: {
    orchestrationUsed?: boolean;
    agentsInvolved?: string[];
    fallbackReason?: string;
    executionTime?: number;
  };
}

interface SessionItem {
  id: string;
  title: string;
  updated_at: string;
}

const AGENT_CONFIG: Record<string, { name: string; color: string; icon: React.ReactElement }> = {
  orchestrator: { name: 'Orchestrator', color: 'text-purple-600 bg-purple-100', icon: <Brain className="w-3.5 h-3.5" /> },
  analytics: { name: 'Analytics', color: 'text-blue-600 bg-blue-100', icon: <Zap className="w-3.5 h-3.5" /> },
  data_quality: { name: 'Data Quality', color: 'text-green-600 bg-green-100', icon: <Database className="w-3.5 h-3.5" /> },
};

export default function ChatPage() {
  const searchParams = useSearchParams();
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      type: 'assistant',
      content: '👋 Selamat datang di Hotel Analytics AI. Tanyakan apa saja tentang revenue, KPI, forecasting, LOS, repeat guest, atau data quality. Gunakan tombol Sessions untuk melanjutkan percakapan sebelumnya.',
      timestamp: new Date(),
      metadata: { orchestrationUsed: true, agentsInvolved: ['orchestrator'] },
    },
  ]);
  const [loading, setLoading] = useState(false);
  const [typing, setTyping] = useState(false);

  // Sessions
  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [sessionQuery, setSessionQuery] = useState('');
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [showSessions, setShowSessions] = useState(false);

  // Approval
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [pendingApprovals, setPendingApprovals] = useState<any[]>([]);
  const [currentRequestId, setCurrentRequestId] = useState<string | null>(null);
  const [approving, setApproving] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const loadSessions = async (q?: string) => {
    const res = await fetch(`/api/sessions${q ? `?q=${encodeURIComponent(q)}` : ''}`, { cache: 'no-store' });
    const data = await res.json();
    if (data?.items) setSessions(data.items);
  };

  const loadMessages = async (sid: string) => {
    const res = await fetch(`/api/sessions/${sid}/messages`, { cache: 'no-store' });
    const data = await res.json();
    if (data?.items) {
      setMessages(
        data.items.map((m: any) => ({
          id: m.id,
          type: m.role === 'user' ? 'user' : 'assistant',
          content: m.content,
          timestamp: new Date(m.created_at)
        }))
      );
    }
  };

  const createSession = async () => {
    const res = await fetch('/api/sessions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: message.slice(0, 80) || 'New Chat' }) });
    const data = await res.json();
    const id = data?.session?.id;
    if (id) {
      setActiveSessionId(id);
      await loadSessions();
      await loadMessages(id);
    }
  };

  useEffect(() => { loadSessions(); }, []);
  useEffect(() => {
    const sid = searchParams.get('sessionId');
    if (sid) { setActiveSessionId(sid); loadMessages(sid); }
  }, [searchParams]);

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  useEffect(() => { scrollToBottom(); }, [messages]);

  const renderAgentBadges = (agents?: string[]) => {
    if (!agents || agents.length === 0) return null;
    return (
      <div className="flex flex-wrap gap-1 mt-2">
        {agents.map((a) => {
          const cfg = AGENT_CONFIG[a];
          if (!cfg) return null;
          return (
            <span key={a} className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-2xs ${cfg.color}`}>
              {cfg.icon}{cfg.name}
            </span>
          );
        })}
      </div>
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || loading) return;
    if (!activeSessionId) await createSession();
    const sid = activeSessionId as string;

    const userMessage: ChatMessage = { id: Date.now().toString(), type: 'user', content: message.trim(), timestamp: new Date() };
    setMessages(prev => [...prev, userMessage]);
    setMessage('');
    setLoading(true);
    setTyping(true);

    try {
      const startTime = Date.now();
      const res = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: userMessage.content, sessionId: sid }) });
      const data = await res.json();
      const executionTime = Date.now() - startTime;

      if (data.requiresApproval && data.approvalRequests) {
        setCurrentRequestId(userMessage.id);
        setPendingApprovals(data.approvalRequests);
        setShowApprovalModal(true);
        setLoading(false);
        setTyping(false);
        return;
      }

      if (data.sessionId && !activeSessionId) setActiveSessionId(data.sessionId);

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: data.output || data.response || data.error || 'No response received',
        timestamp: new Date(),
        metadata: {
          orchestrationUsed: data.orchestrationUsed,
          agentsInvolved: data.agentsInvolved || [],
          fallbackReason: data.fallbackReason,
          executionTime
        }
      };
      setMessages(prev => [...prev, assistantMessage]);
      await loadSessions();
    } catch (err: any) {
      setMessages(prev => [
        ...prev,
        { id: (Date.now() + 1).toString(), type: 'assistant', content: `Terjadi kendala: ${err?.message || 'Unknown error'}`, timestamp: new Date(), metadata: { fallbackReason: 'client_error' } }
      ]);
    } finally {
      setLoading(false);
      setTyping(false);
    }
  };

  const handleApprove = async (approvedIds: string[]) => {
    try {
      setApproving(true);
      const res = await fetch('/api/chat/approve', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId: currentRequestId, approvedIds, rejectedIds: [] })
      });
      const data = await res.json();
      setShowApprovalModal(false);
      setPendingApprovals([]);
      setCurrentRequestId(null);
      setMessages(prev => [...prev, { id: Date.now().toString(), type: 'assistant', content: data.output || 'Approval processed', timestamp: new Date(), metadata: { orchestrationUsed: true, agentsInvolved: ['data_quality','orchestrator'] } }]);
    } finally {
      setApproving(false);
    }
  };

  const handleReject = async (rejectedIds: string[]) => {
    try {
      setApproving(true);
      const res = await fetch('/api/chat/approve', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId: currentRequestId, approvedIds: [], rejectedIds })
      });
      const data = await res.json();
      setShowApprovalModal(false);
      setPendingApprovals([]);
      setCurrentRequestId(null);
      setMessages(prev => [...prev, { id: Date.now().toString(), type: 'assistant', content: data.output || 'Rejection processed', timestamp: new Date(), metadata: { orchestrationUsed: true, agentsInvolved: ['data_quality','orchestrator'] } }]);
    } finally {
      setApproving(false);
    }
  };

  const quickSuggestions = [
    'Total revenue Januari 2024',
    'ADR dan occupancy rate Q1 2024',
    'Detect duplicate guests',
    'Forecast revenue 3 bulan ke depan',
    'Siapa tamu yang paling sering menginap?'
  ];

  return (
    <div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header classic */}
      <div className="bg-white/70 backdrop-blur border-b">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white">
              <Bot className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">Hotel Analytics AI</h1>
              <p className="text-xs text-gray-600">Multi-Agent Orchestrated Assistant</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link 
              href="/" 
              className="text-sm px-3 py-2 border rounded bg-white hover:bg-gray-50 flex items-center gap-2 transition-colors"
              title="Back to Home"
            >
              <Home className="w-4 h-4" />
              Home
            </Link>
            <button 
              onClick={()=>setShowSessions(true)} 
              className="text-sm px-3 py-2 border rounded bg-white hover:bg-gray-50"
            >
              Sessions
            </button>
          </div>
        </div>
      </div>

      {/* Chat body */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="h-[60vh] overflow-y-auto p-6 space-y-4">
            {messages.map((msg)=> (
              <div key={msg.id} className={`flex ${msg.type==='user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] p-4 rounded-2xl ${msg.type==='user' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-900'}`}>
                  <div className="whitespace-pre-wrap">{msg.content}</div>
                  {msg.type==='assistant' && (
                    <div className="mt-3 text-xs text-gray-500">
                      <div className="flex items-center gap-3 flex-wrap">
                        {typeof msg.metadata?.executionTime === 'number' && (
                          <span className="inline-flex items-center gap-1"><Clock className="w-3 h-3" />{msg.metadata.executionTime}ms</span>
                        )}
                        {msg.metadata?.fallbackReason && (
                          <span className="inline-flex items-center gap-1"><AlertCircle className="w-3 h-3 text-orange-500" />{msg.metadata.fallbackReason}</span>
                        )}
                      </div>
                      {renderAgentBadges(msg.metadata?.agentsInvolved)}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {typing && <div className="text-sm text-gray-500">AI sedang memproses…</div>}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSubmit} className="border-t bg-gray-50 p-4">
            <div className="flex gap-3 mb-3">
              <input className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" value={message} onChange={(e)=>setMessage(e.target.value)} placeholder="Tulis pertanyaan…" />
              <button disabled={loading || !message.trim()} className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl disabled:opacity-50">
                <Send className="w-4 h-4 inline mr-1"/> Kirim
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {quickSuggestions.map((s)=> (
                <button key={s} type="button" onClick={()=>setMessage(s)} className="px-3 py-1 text-xs bg-white border rounded-full hover:bg-gray-50">
                  {s}
                </button>
              ))}
            </div>
          </form>
        </div>
      </div>

      {/* Sessions modal */}
      {showSessions && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="p-4 border-b flex items-center justify-between">
              <div className="relative flex-1 mr-3">
                <Search className="w-4 h-4 absolute left-2 top-2.5 text-gray-400" />
                <input className="w-full pl-8 pr-2 py-2 border rounded" placeholder="Search sessions" value={sessionQuery} onChange={(e)=>setSessionQuery(e.target.value)} onKeyDown={async (e)=>{ if(e.key==='Enter'){ await loadSessions(sessionQuery); } }} />
              </div>
              <button onClick={()=>setShowSessions(false)} className="w-8 h-8 rounded border flex items-center justify-center"><X className="w-4 h-4"/></button>
            </div>
            <div className="max-h-[60vh] overflow-y-auto">
              {sessions.map((s)=> (
                <button key={s.id} onClick={()=>{ setActiveSessionId(s.id); loadMessages(s.id); setShowSessions(false); }} className="w-full text-left px-4 py-3 border-b hover:bg-gray-50">
                  <div className="text-sm font-medium truncate">{s.title}</div>
                  <div className="text-xs text-gray-500">{new Date(s.updated_at).toLocaleString('id-ID')}</div>
                </button>
              ))}
            </div>
            <div className="p-4 border-t text-right">
              <button onClick={async()=>{ await createSession(); setShowSessions(false); }} className="px-4 py-2 bg-blue-600 text-white rounded">New Session</button>
            </div>
          </div>
        </div>
      )}

      <ApprovalModal isOpen={showApprovalModal} requests={pendingApprovals} onApprove={handleApprove} onReject={handleReject} onClose={()=>setShowApprovalModal(false)} loading={approving} />
    </div>
  );
}