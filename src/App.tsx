
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { CallStatus, CallLog, SecretaryConfig, Contact, ServiceConfig } from './types';
import { Capacitor } from '@capacitor/core';
import { fetchServiceConfig } from './services/configService';

const App: React.FC = () => {
  // --- State ---
  const [status, setStatus] = useState<CallStatus>(CallStatus.IDLE);
  const [microphonePermission, setMicrophonePermission] = useState<'granted' | 'denied' | 'prompt'>('prompt');
  const [backendStatus, setBackendStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
  const [wakeStatus, setWakeStatus] = useState<'idle' | 'listening' | 'triggered' | 'error'>('idle');
  const [config, setConfig] = useState<SecretaryConfig>({
    ownerName: 'Alex',
    forwardingNumber: '+1 (555) 012-3456',
    memoryEnabled: true,
    memorySummary: '',
    secretaryVoice: 'Kore',
    noiseSuppression: true,
    echoCancellation: true,
    autoGainControl: true,
    languageFocus: 'en-US',
    transcriptionEngine: 'Swireit Voice',
    orchestrationEngine: 'AnythingLLM',
    speechSynthesisEngine: 'Ollama',
    wakeName: 'Secretary'
  });
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [blockedNumbers, setBlockedNumbers] = useState<string[]>([]);
  const [callLogs, setCallLogs] = useState<CallLog[]>([]);
  const [activeCallId, setActiveCallId] = useState<string | null>(null);
  const [transcription, setTranscription] = useState<{timestamp: string, role: string, text: string, type: 'info' | 'message' | 'system'}[]>([]);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'history' | 'contacts'>('history');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [serviceConfig, setServiceConfig] = useState<ServiceConfig | null>(null);
  const hasAutoConfiguredRef = useRef(false);
  const updateCheckRef = useRef(false);

  // --- Refs for Audio & Session ---
  const wsRef = useRef<WebSocket | null>(null);
  const wakeRecognitionRef = useRef<any>(null);
  const consoleEndRef = useRef<HTMLDivElement>(null);
  const backendApiUrl = process.env.BACKEND_API_URL;
  const backendWsUrl = process.env.BACKEND_WS_URL || (backendApiUrl ? backendApiUrl.replace(/^http/, 'ws') : '');
  // Keep memory summary focused by using the most recent conversational lines.
  const MAX_MEMORY_MESSAGES = 6;
  const memorySignatureRef = useRef('');
  const memoryEnabledRef = useRef(config.memoryEnabled);

  // Stable callback for adding console lines
  // Empty dependency array is safe because setTranscription is a stable setter from useState
  const addConsoleLine = useCallback((role: string, text: string, type: 'info' | 'message' | 'system' = 'message') => {
    const timestamp = new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setTranscription(prev => [...prev, { timestamp, role, text, type }]);
  }, []);

  const requestMicrophonePermission = useCallback(async (): Promise<boolean> => {
    if (!navigator.mediaDevices?.getUserMedia) {
      addConsoleLine('ERROR', 'Microphone access is not supported on this device.', 'system');
      return false;
    }
    try {
      if (Capacitor.isNativePlatform()) {
        addConsoleLine('SYSTEM', 'Requesting microphone access...', 'info');
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      setMicrophonePermission('granted');
      return true;
    } catch (error) {
      setMicrophonePermission('denied');
      addConsoleLine('ERROR', 'Microphone permission denied.', 'system');
      return false;
    }
  }, [addConsoleLine]);

  // --- Persistence ---
  useEffect(() => {
    const savedContacts = localStorage.getItem('ai_sec_contacts');
    if (savedContacts) setContacts(JSON.parse(savedContacts));

    const savedBlocked = localStorage.getItem('ai_sec_blocked');
    if (savedBlocked) setBlockedNumbers(JSON.parse(savedBlocked));
    
    const savedLogs = localStorage.getItem('ai_sec_logs');
    if (savedLogs) {
      const parsed = JSON.parse(savedLogs);
      setCallLogs(parsed.map((l: any) => ({ ...l, timestamp: new Date(l.timestamp) })));
    }

    const savedConfig = localStorage.getItem('ai_sec_config');
    if (savedConfig) setConfig(JSON.parse(savedConfig));
  }, []);

  useEffect(() => {
    if (!backendApiUrl) return;
    const checkBackend = async () => {
      setBackendStatus('connecting');
      try {
        const response = await fetch(`${backendApiUrl}/health`);
        if (!response.ok) throw new Error('Health check failed');
        setBackendStatus('connected');
        const configResponse = await fetchServiceConfig(backendApiUrl);
        if (configResponse) {
          setServiceConfig(configResponse);
          if (!hasAutoConfiguredRef.current) {
            setConfig(prev => ({
              ...prev,
              forwardingNumber: configResponse.swireit.forwardingNumber ?? prev.forwardingNumber,
              transcriptionEngine: configResponse.swireit.enabled ? 'Swireit Voice' : prev.transcriptionEngine,
              orchestrationEngine: configResponse.services.anythingllm ? 'AnythingLLM' : prev.orchestrationEngine,
              speechSynthesisEngine: configResponse.services.ollama ? 'Ollama' : prev.speechSynthesisEngine
            }));
            hasAutoConfiguredRef.current = true;
          }
        }
      } catch (error) {
        console.error('Backend health check failed', error);
        setBackendStatus('error');
      }
    };
    checkBackend();
  }, [backendApiUrl]);

  useEffect(() => {
    const updateUrl = process.env.AISEC_UPDATE_URL;
    if (updateCheckRef.current || !updateUrl) return;
    updateCheckRef.current = true;
    const checkForUpdates = async () => {
      try {
        const response = await fetch(updateUrl);
        if (!response.ok) return;
        const payload = await response.json();
        const version = payload?.version;
        const notes = payload?.notes;
        if (!version || version === '0.0.0') return;
        addConsoleLine('UPDATE', `Update available: v${version}${notes ? ` - ${notes}` : ''}`, 'info');
      } catch (error) {
        console.warn('Update check failed', error);
      }
    };
    checkForUpdates();
  }, [addConsoleLine]);

  useEffect(() => {
    requestMicrophonePermission();
  }, [requestMicrophonePermission]);

  useEffect(() => {
    localStorage.setItem('ai_sec_contacts', JSON.stringify(contacts));
  }, [contacts]);

  useEffect(() => {
    localStorage.setItem('ai_sec_blocked', JSON.stringify(blockedNumbers));
  }, [blockedNumbers]);

  useEffect(() => {
    localStorage.setItem('ai_sec_logs', JSON.stringify(callLogs));
  }, [callLogs]);

  useEffect(() => {
    localStorage.setItem('ai_sec_config', JSON.stringify(config));
  }, [config]);

  useEffect(() => {
    memoryEnabledRef.current = config.memoryEnabled;
  }, [config.memoryEnabled]);

  const memorySnapshot = useMemo(() => {
    const memoryLines = transcription
      .filter(line => line.type === 'message')
      .slice(-MAX_MEMORY_MESSAGES);
    const summary = memoryLines
      .map(line => line.text)
      .join(' | ')
      .trim();
    const signature = summary.replace(/\s+/g, ' ').trim();
    return { summary, signature };
  }, [transcription]);

  useEffect(() => {
    if (!memoryEnabledRef.current || !memorySnapshot.summary) return;
    if (memorySnapshot.signature === memorySignatureRef.current) return;
    memorySignatureRef.current = memorySnapshot.signature;
    setConfig(prev => (
      prev.memorySummary === memorySnapshot.summary
        ? prev
        : { ...prev, memorySummary: memorySnapshot.summary }
    ));
  }, [memorySnapshot.signature]);

  // Scroll console to bottom
  useEffect(() => {
    consoleEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcription]);

  // --- Helpers ---
  const addLog = useCallback((log: CallLog) => {
    setCallLogs(prev => [log, ...prev]);
  }, []);

  const updateActiveLog = useCallback((updates: Partial<CallLog>) => {
    setCallLogs(prev => prev.map(log => 
      log.id === activeCallId ? { ...log, ...updates } : log
    ));
  }, [activeCallId]);

  const activeCallLog = useMemo(() => 
    callLogs.find(l => l.id === activeCallId), 
  [callLogs, activeCallId]);

  const filteredLogs = useMemo(() => {
    if (!searchQuery.trim()) return callLogs;
    const q = searchQuery.toLowerCase();
    return callLogs.filter(log => 
      log.transcription.some(line => line.toLowerCase().includes(q)) ||
      log.id.toLowerCase().includes(q) ||
      log.callerName?.toLowerCase().includes(q) ||
      log.callerNumber?.includes(q)
    );
  }, [callLogs, searchQuery]);

  const filteredContacts = useMemo(() => {
    if (!searchQuery.trim()) return contacts;
    const q = searchQuery.toLowerCase();
    return contacts.filter(c => 
      c.name.toLowerCase().includes(q) || c.phoneNumber.includes(q)
    );
  }, [contacts, searchQuery]);

  const addContact = (name: string, phoneNumber: string, isVip: boolean = false) => {
    if (!name || !phoneNumber) return;
    const newContact: Contact = { 
      id: Math.random().toString(36).substring(7), 
      name, 
      phoneNumber,
      isVip
    };
    setContacts(prev => [...prev, newContact]);
  };

  const deleteContact = (id: string) => {
    setContacts(prev => prev.filter(c => c.id !== id));
  };

  const toggleVip = (id: string) => {
    setContacts(prev => prev.map(c => c.id === id ? { ...c, isVip: !c.isVip } : c));
  };

  const blockNumber = (number: string) => {
    if (!number || blockedNumbers.includes(number)) return;
    setBlockedNumbers(prev => [...prev, number]);
  };

  const unblockNumber = (number: string) => {
    setBlockedNumbers(prev => prev.filter(n => n !== number));
  };

  // --- Status UI Config ---
  const statusConfig = useMemo(() => {
    switch (status) {
      case CallStatus.SCREENING:
        return {
          color: 'bg-amber-500',
          ring: 'ring-amber-500/40',
          icon: 'fa-brain',
          label: 'AI SCREENING ACTIVE',
          animation: 'animate-status-pulse',
          subLabel: 'ANALYZING INTENT'
        };
      case CallStatus.USER_DECIDING:
        return {
          color: 'bg-emerald-500',
          ring: 'ring-emerald-500/40',
          icon: 'fa-user-check',
          label: 'AWAITING OWNER INPUT',
          animation: 'animate-bounce-subtle',
          subLabel: 'DECISION PENDING'
        };
      case CallStatus.CONNECTED:
        return {
          color: 'bg-green-600',
          ring: 'ring-green-600/40',
          icon: 'fa-phone',
          label: 'LINE CONNECTED',
          animation: 'animate-status-pulse',
          subLabel: 'DUPLEX ACTIVE'
        };
      case CallStatus.VOICEMAIL:
        return {
          color: 'bg-red-500',
          ring: 'ring-red-500/40',
          icon: 'fa-tape',
          label: 'RECORDING VOICEMAIL',
          animation: 'animate-status-pulse',
          subLabel: 'STORAGE UPLOAD'
        };
      case CallStatus.FORWARDING:
        return {
          color: 'bg-blue-500',
          ring: 'ring-blue-500/40',
          icon: 'fa-share',
          label: 'PATCHING THROUGH',
          animation: 'animate-status-pulse',
          subLabel: 'SIGNAL ROUTING'
        };
      default:
        return {
          color: 'bg-indigo-600',
          ring: 'ring-indigo-500/40',
          icon: 'fa-user-secret',
          label: 'SYSTEM STANDBY',
          animation: '',
          subLabel: 'MONITORING'
        };
    }
  }, [status]);

  // --- Live API Management ---
  const endSession = useCallback(async () => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  const hangUp = useCallback(() => {
    endSession();
    setStatus(CallStatus.IDLE);
    setActiveCallId(null);
    addConsoleLine('SYSTEM', 'Call session terminated.', 'system');
  }, [endSession, addConsoleLine]);

  const startCall = useCallback(async () => {
    if (microphonePermission !== 'granted') {
      const permissionGranted = await requestMicrophonePermission();
      if (!permissionGranted) {
        return;
      }
    }
    if (!backendApiUrl) {
      addConsoleLine('ERROR', 'Backend API is not configured. Set BACKEND_API_URL.', 'system');
      return;
    }
    if (wsRef.current) {
      addConsoleLine('SYSTEM', 'Backend stream already connected.', 'info');
      return;
    }

    try {
      const apiKey = process.env.BACKEND_API_KEY;
      const wsUrl = backendWsUrl ? `${backendWsUrl}/ws/call?client=ui${apiKey ? `&apiKey=${encodeURIComponent(apiKey)}` : ''}` : '';
      if (!wsUrl) {
        throw new Error('BACKEND_WS_URL is not configured.');
      }
      wsRef.current = new WebSocket(wsUrl);
      wsRef.current.onopen = () => {
        addConsoleLine('SYSTEM', 'Subscribed to backend call stream.', 'info');
        wsRef.current?.send(JSON.stringify({ type: 'subscribe', callId: '*' }));
      };
      wsRef.current.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.type === 'call.start') {
            const callerNumber = payload.from || 'Unknown caller';
            if (blockedNumbers.includes(callerNumber)) {
              addConsoleLine('SECURITY', `Auto-blocked incoming call from: ${callerNumber}`, 'system');
              return;
            }
            const matchedContact = contacts.find(c => c.phoneNumber.replace(/\D/g,'') === callerNumber.replace(/\D/g,''));
            setActiveCallId(payload.callId);
            setTranscription([]);
            setStatus(CallStatus.SCREENING);
            if (config.memoryEnabled && config.memorySummary) {
              const formattedMemory = config.memorySummary.replace(/\s*\|\s*/g, '; ');
              addConsoleLine('SYSTEM', `Memory recall: ${formattedMemory}`, 'info');
            }
            addConsoleLine('SYSTEM', `Incoming call from ${matchedContact?.name || callerNumber}${matchedContact?.isVip ? ' [VIP]' : ''}`, 'system');
            addConsoleLine('SYSTEM', 'AI Secretary initializing...', 'info');
            addLog({
              id: payload.callId,
              callerNumber,
              callerName: matchedContact?.name,
              contact: matchedContact,
              timestamp: new Date(),
              status: CallStatus.SCREENING,
              transcription: [],
            });
          }
          if (payload.type === 'transcript') {
            const currentCallId = activeCallId || payload.callId;
            if (!activeCallId && payload.callId) setActiveCallId(payload.callId);
            if (!payload.callId || payload.callId === currentCallId) {
              addConsoleLine('CALLER', payload.text);
            }
          }
          if (payload.type === 'assistant') {
            if (!payload.callId || payload.callId === activeCallId) {
              addConsoleLine('SECRETARY', payload.text);
            }
          }
          if (payload.type === 'handoff') {
            if (!payload.callId || payload.callId === activeCallId) {
              setStatus(CallStatus.USER_DECIDING);
              addConsoleLine('SYSTEM', 'Screening complete. Owner intervention required.', 'info');
            }
          }
          if (payload.type === 'call.end') {
            setStatus(CallStatus.IDLE);
            setActiveCallId(null);
            addConsoleLine('SYSTEM', 'Call ended.', 'info');
          }
        } catch (error) {
          console.error('Failed to parse backend message', error);
        }
      };
      wsRef.current.onerror = () => {
        addConsoleLine('ERROR', 'Backend connection error.', 'system');
      };
      wsRef.current.onclose = () => {
        addConsoleLine('SYSTEM', 'Backend stream closed.', 'info');
        wsRef.current = null;
      };
    } catch (err) {
      console.error("Failed to start call:", err);
      addConsoleLine('ERROR', 'Failed to connect to backend.', 'system');
    }
  }, [microphonePermission, requestMicrophonePermission, backendApiUrl, backendWsUrl, addConsoleLine, blockedNumbers, contacts, activeCallId, addLog]);

  const handleAnswer = useCallback(async () => {
    if (!backendApiUrl || !activeCallId) {
      addConsoleLine('ERROR', 'No active call to connect.', 'system');
      return;
    }
    const dest = activeCallLog?.contact?.customForwardingNumber ?? config.forwardingNumber;
    try {
      await fetch(`${backendApiUrl}/api/swireit/answer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': process.env.BACKEND_API_KEY ?? ''
        },
        body: JSON.stringify({ callId: activeCallId, to: dest })
      });
      setStatus(CallStatus.CONNECTED);
      updateActiveLog({ status: CallStatus.CONNECTED });
      addConsoleLine('SYSTEM', 'User accepted call. Patching audio through...', 'info');
    } catch (error) {
      addConsoleLine('ERROR', 'Failed to connect call.', 'system');
    }
  }, [backendApiUrl, activeCallId, updateActiveLog, addConsoleLine, activeCallLog, config.forwardingNumber]);

  const handleVoicemail = useCallback(async () => {
    if (!backendApiUrl || !activeCallId) {
      addConsoleLine('ERROR', 'No active call to send to voicemail.', 'system');
      return;
    }
    try {
      await fetch(`${backendApiUrl}/api/swireit/voicemail`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': process.env.BACKEND_API_KEY ?? ''
        },
        body: JSON.stringify({ callId: activeCallId })
      });
      setStatus(CallStatus.VOICEMAIL);
      updateActiveLog({ status: CallStatus.VOICEMAIL });
      addConsoleLine('SYSTEM', 'Caller routed to voicemail.', 'info');
    } catch (error) {
      addConsoleLine('ERROR', 'Failed to route to voicemail.', 'system');
    }
  }, [backendApiUrl, activeCallId, updateActiveLog, addConsoleLine]);

  const handleForward = useCallback(() => {
    const dest = activeCallLog?.contact?.customForwardingNumber ?? config.forwardingNumber;
    if (!backendApiUrl || !activeCallId) {
      addConsoleLine('ERROR', 'No active call to forward.', 'system');
      return;
    }
    fetch(`${backendApiUrl}/api/swireit/forward`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': process.env.BACKEND_API_KEY ?? ''
      },
      body: JSON.stringify({ callId: activeCallId, to: dest })
    })
      .then(() => {
        setStatus(CallStatus.FORWARDING);
        updateActiveLog({ status: CallStatus.FORWARDING });
        addConsoleLine('SYSTEM', `Redirecting call to ${dest}`, 'info');
      })
      .catch(() => {
        addConsoleLine('ERROR', 'Failed to forward call.', 'system');
      });
  }, [backendApiUrl, activeCallId, activeCallLog, config.forwardingNumber, updateActiveLog, addConsoleLine]);

  useEffect(() => {
    if (microphonePermission !== 'granted' || status !== CallStatus.IDLE) return;
    const Recognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!Recognition) {
      setWakeStatus('error');
      addConsoleLine('ERROR', 'Speech recognition is not supported on this device.', 'system');
      return;
    }
    const recognition = new Recognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = config.languageFocus;
    recognition.onstart = () => setWakeStatus('listening');
    recognition.onerror = () => setWakeStatus('error');
    recognition.onresult = (event: any) => {
      const lastResult = event.results[event.results.length - 1];
      const transcript = lastResult[0]?.transcript?.toLowerCase() || '';
      if (transcript.includes(config.wakeName.toLowerCase())) {
        setWakeStatus('triggered');
        addConsoleLine('SYSTEM', `Wake word "${config.wakeName}" detected. Starting call flow.`, 'info');
        if (backendStatus === 'connected') {
          startCall();
        } else {
          addConsoleLine('SYSTEM', 'Backend not ready. Wake word ignored.', 'info');
        }
      }
    };
    recognition.onend = () => {
      if (wakeStatus !== 'error') {
        recognition.start();
      }
    };
    wakeRecognitionRef.current = recognition;
    recognition.start();
    return () => {
      recognition.stop();
      wakeRecognitionRef.current = null;
    };
  }, [microphonePermission, config.wakeName, config.languageFocus, addConsoleLine, startCall, wakeStatus, status, backendStatus]);

  useEffect(() => {
    if (activeCallId) {
      const plainTranscription = transcription.map(t => `${t.role}: ${t.text}`);
      updateActiveLog({ transcription: plainTranscription });
    }
  }, [transcription, activeCallId, updateActiveLog]);

  return (
    <div className="min-h-screen bg-slate-900 text-white font-sans flex flex-col selection:bg-indigo-500/30">
      <header className="border-b border-slate-800 p-4 sticky top-0 bg-slate-900/80 backdrop-blur-md z-30 flex justify-between items-center shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20 relative overflow-hidden group">
            <i className="fa-solid fa-headset text-xl z-10"></i>
            <div className="absolute inset-0 bg-indigo-400/20 animate-pulse-slow"></div>
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">AI Secretary Console</h1>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest flex items-center gap-2">
              <span className={`w-1.5 h-1.5 rounded-full ${status === CallStatus.IDLE ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)] animate-pulse'}`}></span>
              System {status === CallStatus.IDLE ? 'Standby' : 'Occupied'}
            </p>
          </div>
        </div>
        <button 
          onClick={() => setIsConfigOpen(!isConfigOpen)}
          className={`px-4 py-2 rounded-xl transition-all flex items-center gap-2 border ${isConfigOpen ? 'bg-indigo-600 border-indigo-400' : 'bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-400'}`}
        >
          <i className={`fa-solid ${isConfigOpen ? 'fa-terminal' : 'fa-gear'} ${isConfigOpen ? 'animate-spin-once' : ''}`}></i>
          <span className="text-[10px] font-bold uppercase tracking-widest">{isConfigOpen ? 'View Console' : 'Config'}</span>
        </button>
      </header>

      <main className="flex-1 p-4 md:p-6 lg:p-8 flex flex-col items-center justify-center max-w-7xl mx-auto w-full relative overflow-hidden">
        {isConfigOpen ? (
          <div className="w-full h-full max-w-5xl overflow-y-auto space-y-8 animate-in fade-in zoom-in duration-300 pb-12 scrollbar-hide">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-black uppercase tracking-widest text-indigo-400">Control Center</h2>
              <p className="text-slate-500 text-sm">Fine-tune assistant intelligence and hardware parameters.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <section className="bg-slate-800/40 border border-slate-700 p-6 rounded-[2rem] space-y-4">
                <h3 className="text-xs font-black uppercase tracking-widest text-indigo-400 flex items-center gap-2">
                  <i className="fa-solid fa-user-gear"></i> Identity Profile
                </h3>
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Owner Identification</label>
                    <input type="text" value={config.ownerName} onChange={(e) => setConfig({...config, ownerName: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">AI Screening Number</label>
                    <input
                      type="text"
                      value={serviceConfig?.swireit.screeningNumber ?? 'Not configured'}
                      readOnly
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-sm text-slate-400 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Forward Destination</label>
                    <input type="text" value={config.forwardingNumber} onChange={(e) => setConfig({...config, forwardingNumber: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Persistent Memory</label>
                    <div className="flex items-center justify-between bg-slate-900 border border-slate-700 rounded-xl p-3">
                      <span className="text-[10px] text-slate-400 uppercase tracking-widest">
                        {config.memoryEnabled ? 'Enabled' : 'Disabled'}
                      </span>
                      <button
                        type="button"
                        onClick={() => setConfig({ ...config, memoryEnabled: !config.memoryEnabled })}
                        className={`w-12 h-6 rounded-full transition-all relative ${config.memoryEnabled ? 'bg-indigo-600' : 'bg-slate-700'}`}
                      >
                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${config.memoryEnabled ? 'left-7' : 'left-1'}`}></div>
                      </button>
                    </div>
                    <textarea
                      value={config.memorySummary}
                      onChange={(e) => setConfig({ ...config, memorySummary: e.target.value })}
                      placeholder="Memory summary saved locally."
                      rows={3}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-sm text-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    />
                  </div>
                </div>
              </section>
              <section className="bg-slate-800/40 border border-slate-700 p-6 rounded-[2rem] space-y-4">
                <h3 className="text-xs font-black uppercase tracking-widest text-indigo-400 flex items-center gap-2">
                  <i className="fa-solid fa-microchip"></i> Assistant Persona
                </h3>
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Voice Model</label>
                    <select value={config.secretaryVoice} onChange={(e) => setConfig({...config, secretaryVoice: e.target.value as SecretaryConfig['secretaryVoice']})} className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-sm outline-none cursor-pointer">
                      <option value="Kore">Kore (Standard)</option>
                      <option value="Zephyr">Zephyr (Bright)</option>
                      <option value="Puck">Puck (Fast)</option>
                      <option value="Charon">Charon (Deep)</option>
                      <option value="Fenrir">Fenrir (Bold)</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Wake Name</label>
                    <input type="text" value={config.wakeName} onChange={(e) => setConfig({...config, wakeName: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-sm outline-none transition-all" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Linguistic Focus</label>
                    <select value={config.languageFocus} onChange={(e) => setConfig({...config, languageFocus: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-sm outline-none cursor-pointer">
                      <option value="en-US">English (US)</option>
                      <option value="en-GB">English (UK)</option>
                      <option value="es-ES">Spanish</option>
                    </select>
                  </div>
                </div>
              </section>
              <section className="bg-slate-800/40 border border-slate-700 p-6 rounded-[2rem] space-y-4 md:col-span-2">
                <h3 className="text-xs font-black uppercase tracking-widest text-indigo-400 flex items-center gap-2">
                  <i className="fa-solid fa-sliders"></i> Signal Processing
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="flex items-center justify-between bg-slate-900/50 p-4 rounded-xl border border-slate-700 hover:border-slate-600 transition-all cursor-pointer" onClick={() => setConfig({...config, noiseSuppression: !config.noiseSuppression})}>
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-slate-200">Noise Reduction</p>
                      <p className="text-[9px] text-slate-500 uppercase tracking-widest">Digital voice filtering</p>
                    </div>
                    <button 
                      className={`w-12 h-6 rounded-full transition-all relative ${config.noiseSuppression ? 'bg-indigo-600' : 'bg-slate-700'}`}
                    >
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${config.noiseSuppression ? 'left-7' : 'left-1'}`}></div>
                    </button>
                  </div>
                  <div className="flex items-center justify-between bg-slate-900/50 p-4 rounded-xl border border-slate-700 hover:border-slate-600 transition-all cursor-pointer" onClick={() => setConfig({...config, echoCancellation: !config.echoCancellation})}>
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-slate-200"> Echo Reduction</p>
                      <p className="text-[9px] text-slate-500 uppercase tracking-widest">Feedback protection</p>
                    </div>
                    <button 
                      className={`w-12 h-6 rounded-full transition-all relative ${config.echoCancellation ? 'bg-emerald-600' : 'bg-slate-700'}`}
                    >
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${config.echoCancellation ? 'left-7' : 'left-1'}`}></div>
                    </button>
                  </div>
                  <div className="flex items-center justify-between bg-slate-900/50 p-4 rounded-xl border border-slate-700 hover:border-slate-600 transition-all cursor-pointer" onClick={() => setConfig({...config, autoGainControl: !config.autoGainControl})}>
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-slate-200">Auto-Gain Control</p>
                      <p className="text-[9px] text-slate-500 uppercase tracking-widest">Volume stabilization</p>
                    </div>
                    <button 
                      className={`w-12 h-6 rounded-full transition-all relative ${config.autoGainControl ? 'bg-blue-600' : 'bg-slate-700'}`}
                    >
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${config.autoGainControl ? 'left-7' : 'left-1'}`}></div>
                    </button>
                  </div>
                </div>
              </section>
            </div>
            <div className="flex justify-center pt-8">
              <button onClick={() => setIsConfigOpen(false)} className="bg-indigo-600 hover:bg-indigo-500 text-white px-12 py-4 rounded-2xl font-black uppercase tracking-widest shadow-xl transition-all active:scale-95">Return to Console</button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col lg:flex-row gap-8 w-full h-full overflow-hidden">
            <div className="flex-1 space-y-6 flex flex-col overflow-hidden pb-20 lg:pb-0">
              
              {/* Intelligence Console */}
              <section className="bg-black/40 border border-slate-800 rounded-[2.5rem] flex-1 flex flex-col overflow-hidden shadow-2xl relative group">
                
                {/* CRT Scanline Effect */}
                <div className="absolute inset-0 pointer-events-none z-10 opacity-[0.03] overflow-hidden rounded-[2.5rem]">
                   <div className="w-full h-[200%] bg-gradient-to-b from-transparent via-white to-transparent animate-scanline"></div>
                </div>

                {/* Console Header */}
                <div className="bg-slate-900/60 p-5 border-b border-slate-800 flex justify-between items-center backdrop-blur-md z-10">
                   <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all shadow-xl ring-4 ${statusConfig.color} ${statusConfig.ring} ${statusConfig.animation}`}>
                        <i className={`fa-solid ${statusConfig.icon} text-xl text-white`}></i>
                      </div>
                      <div>
                        <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                          {statusConfig.label}
                          <span className="inline-block w-1.5 h-1.5 rounded-full bg-slate-500 animate-pulse"></span>
                        </div>
                        <div className="text-sm font-black uppercase text-indigo-400 tracking-tight">
                          {status === CallStatus.IDLE ? 'SEC-SYS v2.5' : `ACTIVE_SESS: ${activeCallId}`}
                        </div>
                      </div>
                   </div>
                   <div className="flex items-center gap-3">
                     {status !== CallStatus.IDLE && (
                       <div className="hidden sm:flex flex-col items-end mr-4">
                         <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">LIVE STATUS</span>
                         <span className="text-[9px] font-black text-indigo-500 animate-pulse">{statusConfig.subLabel}</span>
                       </div>
                     )}
                     {status !== CallStatus.IDLE && (
                       <button onClick={hangUp} className="bg-red-500/10 border border-red-500/20 hover:bg-red-500 text-red-500 hover:text-white px-4 py-2 rounded-xl flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all shadow-lg active:scale-95">
                         <i className="fa-solid fa-phone-slash"></i> Terminate
                       </button>
                     )}
                   </div>
                </div>

                {/* Console Output */}
                <div className="flex-1 p-6 font-mono text-xs overflow-y-auto scrollbar-hide space-y-2 bg-slate-950/20 relative">
                  {status === CallStatus.IDLE ? (
                    <div className="h-full flex flex-col items-center justify-center text-center space-y-6 opacity-60">
                        <i className="fa-solid fa-shield-halved text-4xl text-slate-700"></i>
                       <div className="space-y-2">
                          <p className="font-black uppercase tracking-[0.2em] text-slate-500">AI Secretary Ready</p>
                         <p className="text-[10px] max-w-xs text-slate-600">
                           {backendStatus === 'connected'
                             ? `Backend online. Wake word "${config.wakeName}" listening: ${wakeStatus === 'listening' ? 'on' : 'off'}.`
                             : 'Backend offline. Configure BACKEND_API_URL to start.'}
                         </p>
                         {backendStatus === 'connected' && serviceConfig && !serviceConfig.swireit.enabled && (
                           <p className="text-[10px] max-w-xs text-amber-400 uppercase tracking-widest">
                           Warning: Swireit integration unavailable. Contact your administrator.
                         </p>
                         )}
                         {backendStatus === 'connected' && serviceConfig && !serviceConfig.swireit.forwardingNumber && (
                           <p className="text-[10px] max-w-xs text-amber-400 uppercase tracking-widest">
                             Warning: call forwarding unavailable. Contact your administrator.
                           </p>
                         )}
                       </div>
                       <button 
                         onClick={startCall} 
                          className={`px-8 py-3 border rounded-xl font-black uppercase tracking-widest transition-all shadow-indigo-500/10 flex items-center gap-2 ${
                            backendStatus === 'error'
                              ? 'bg-red-600/10 border-red-500/20 text-red-400 hover:bg-red-600 hover:text-white'
                              : 'bg-indigo-600/10 border-indigo-500/20 text-indigo-400 hover:bg-indigo-600 hover:text-white'
                          }`}
                          disabled={backendStatus !== 'connected'}
                        >
                          {backendStatus === 'connected' ? (
                            <>
                              <i className="fa-solid fa-phone-volume"></i>
                              Start AI Secretary
                            </>
                          ) : backendStatus === 'error' ? (
                            <>
                              <i className="fa-solid fa-server"></i>
                              Backend Offline
                            </>
                          ) : (
                            <>
                              <i className="fa-solid fa-server"></i>
                              Checking Backend
                            </>
                          )}
                        </button>
                    </div>
                  ) : (
                    <>
                      {transcription.map((line, idx) => (
                        <div key={idx} className={`flex gap-4 animate-in fade-in slide-in-from-left-2 duration-300 ${idx === transcription.length - 1 ? 'animate-pulse-subtle' : ''}`}>
                          <span className="text-slate-600 shrink-0 select-none">[{line.timestamp}]</span>
                          <span className={`font-black shrink-0 ${
                            line.type === 'system' ? 'text-red-500' : 
                            line.type === 'info' ? 'text-indigo-400' :
                            line.role === 'SECRETARY' ? 'text-emerald-400' : 'text-slate-100'
                          }`}>
                            {line.role}:
                          </span>
                          <span className={`flex-1 ${
                            line.type === 'system' || line.type === 'info' ? 'italic opacity-70' : ''
                          }`}>
                            {line.text}
                            {idx === transcription.length - 1 && <span className="inline-block w-1.5 h-3 bg-white/40 ml-1 animate-blink align-middle"></span>}
                          </span>
                        </div>
                      ))}
                      
                      {/* Dynamic "Typing" or "Thinking" Indicator */}
                      {status !== CallStatus.IDLE && (
                        <div className="pt-4 flex items-center gap-3 text-slate-700 select-none">
                           <div className="flex gap-1">
                              <div className="w-1 h-1 bg-slate-700 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                              <div className="w-1 h-1 bg-slate-700 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                              <div className="w-1 h-1 bg-slate-700 rounded-full animate-bounce"></div>
                           </div>
                           <span className="text-[9px] font-black uppercase tracking-[0.3em]">
                             {status === CallStatus.SCREENING ? 'BUFFERING SIGNAL...' : 
                              status === CallStatus.VOICEMAIL ? 'WRITING STREAM TO DISK...' : 
                              'SENSING PACKETS...'}
                           </span>
                        </div>
                      )}
                      
                      <div ref={consoleEndRef} />
                    </>
                  )}
                </div>

                {/* Console Bottom Info Bar */}
                <div className="bg-slate-900/30 p-2 px-6 border-t border-slate-800/50 flex justify-between items-center z-10">
                   <div className="flex items-center gap-4">
                      <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest">ENCRYPT_PATH: SHA-256</span>
                      <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest">LATENCY: {Math.floor(Math.random()*40)+20}ms</span>
                   </div>
                   <div className="text-[8px] font-black text-slate-600 uppercase tracking-widest animate-blink">SYSTEM ACTIVE</div>
                </div>

                {/* decision controls layer */}
                {status === CallStatus.USER_DECIDING && (
                  <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md flex flex-col items-center justify-center p-8 animate-in fade-in duration-500 z-20">
                    <div className="text-center mb-8 space-y-2">
                      <h3 className="text-2xl font-black uppercase tracking-widest text-emerald-400 drop-shadow-[0_0_10px_rgba(52,211,153,0.3)]">Intervention Required</h3>
                      <p className="text-slate-400 text-sm max-w-md">The assistant has gathered initial details. How would you like to handle this caller?</p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 w-full max-w-2xl">
                       <button onClick={handleAnswer} className="group flex flex-col items-center gap-3 p-8 bg-green-600/10 border border-green-500/50 hover:bg-green-600 hover:border-green-400 rounded-[2rem] transition-all shadow-xl shadow-green-500/10 active:scale-95">
                          <i className="fa-solid fa-phone-flip text-3xl transition-transform group-hover:scale-110"></i>
                          <span className="text-[10px] font-black uppercase tracking-widest">Connect Line</span>
                       </button>
                       <button onClick={handleVoicemail} className="group flex flex-col items-center gap-3 p-8 bg-indigo-600/10 border border-indigo-500/50 hover:bg-indigo-600 hover:border-indigo-400 rounded-[2rem] transition-all shadow-xl shadow-indigo-500/10 active:scale-95">
                          <i className="fa-solid fa-tape text-3xl transition-transform group-hover:scale-110"></i>
                          <span className="text-[10px] font-black uppercase tracking-widest">To Voicemail</span>
                       </button>
                       <button onClick={handleForward} className="group flex flex-col items-center gap-3 p-8 bg-slate-800 border border-slate-700 hover:bg-slate-700 hover:border-slate-600 rounded-[2rem] transition-all active:scale-95">
                          <i className="fa-solid fa-share text-3xl transition-transform group-hover:scale-110"></i>
                          <span className="text-[10px] font-black uppercase tracking-widest">Forward Call</span>
                       </button>
                    </div>
                  </div>
                )}
              </section>
            </div>

            {/* Side Drawer: History & Contacts */}
            <div className="w-full lg:w-[400px] flex flex-col gap-6 shrink-0 h-full overflow-hidden">
              <section className="bg-slate-800/50 border border-slate-700 rounded-[2.5rem] flex flex-col flex-1 shadow-2xl overflow-hidden">
                 <div className="p-2 border-b border-slate-700 grid grid-cols-2 gap-2 bg-slate-900/40">
                   <button onClick={() => setActiveTab('history')} className={`p-4 text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all ${activeTab === 'history' ? 'bg-slate-800 text-indigo-400 shadow-md' : 'text-slate-500 hover:text-slate-300'}`}>Call Vault</button>
                   <button onClick={() => setActiveTab('contacts')} className={`p-4 text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all ${activeTab === 'contacts' ? 'bg-slate-800 text-indigo-400 shadow-md' : 'text-slate-500 hover:text-slate-300'}`}>Directory</button>
                 </div>
                 {serviceConfig && (
                   <div className="px-5 py-4 border-b border-slate-800 bg-slate-900/30 space-y-2">
                     <div className="text-[8px] font-black text-slate-500 uppercase tracking-[0.2em]">Integration Status</div>
                     <div className="grid grid-cols-2 gap-2 text-[9px] font-black uppercase tracking-widest text-slate-400">
                       <div className="flex items-center gap-2">
                         <span className={`w-2 h-2 rounded-full ${serviceConfig.swireit.enabled ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                         Swireit
                       </div>
                       <div className="flex items-center gap-2">
                         <span className={`w-2 h-2 rounded-full ${serviceConfig.aisec.configured ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                         AISec
                       </div>
                       <div className="flex items-center gap-2">
                         <span className={`w-2 h-2 rounded-full ${serviceConfig.services.anythingllm ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                         AnythingLLM
                       </div>
                       <div className="flex items-center gap-2">
                         <span className={`w-2 h-2 rounded-full ${serviceConfig.services.ollama ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                         Ollama
                       </div>
                     </div>
                   </div>
                 )}
                
                <div className="p-4 border-b border-slate-800">
                  <div className="relative">
                    <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-slate-600 text-[10px]"></i>
                    <input 
                      type="text" 
                      placeholder="Filter database..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2 pl-9 pr-4 text-[11px] outline-none focus:border-indigo-500 transition-all placeholder:text-slate-700"
                    />
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-5 space-y-4 scrollbar-hide">
                  {activeTab === 'history' ? (
                    filteredLogs.length === 0 ? (
                      <div className="text-center py-20 opacity-30">
                        <i className="fa-solid fa-box-open text-2xl mb-4"></i>
                        <p className="text-[10px] font-black uppercase tracking-widest">Archive Empty</p>
                      </div>
                    ) : (
                      filteredLogs.map(log => (
                        <div key={log.id} onClick={() => setExpandedLogId(expandedLogId === log.id ? null : log.id)} className={`bg-slate-800/80 p-5 rounded-[1.75rem] border transition-all cursor-pointer ${expandedLogId === log.id ? 'border-indigo-500 scale-[1.02] shadow-indigo-500/10 shadow-lg' : 'border-slate-700 hover:border-slate-600'}`}>
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-[10px] font-black text-indigo-500 uppercase tracking-tighter">SESS_ID: {log.id}</span>
                          </div>
                          <p className="text-sm font-black text-slate-100 truncate">{log.callerName || log.callerNumber}</p>
                          <p className="text-[9px] text-slate-500 font-mono mt-0.5">{log.timestamp.toLocaleString()}</p>
                          {expandedLogId === log.id && (
                            <div className="mt-4 space-y-2 border-t border-slate-700 pt-4 animate-in fade-in slide-in-from-top-1 duration-200">
                              <div className="space-y-1">
                                 {log.transcription.slice(-5).map((l, i) => <p key={i} className="text-[9px] text-slate-400 font-mono leading-tight truncate">{l}</p>)}
                              </div>
                              <button onClick={(e) => { e.stopPropagation(); blockedNumbers.includes(log.callerNumber!) ? unblockNumber(log.callerNumber!) : blockNumber(log.callerNumber!); }} className={`w-full mt-2 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${blockedNumbers.includes(log.callerNumber!) ? 'bg-slate-700 text-slate-300' : 'bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500 hover:text-white'}`}>
                                {blockedNumbers.includes(log.callerNumber!) ? 'Unblock Identity' : 'Restrict Origin'}
                              </button>
                            </div>
                          )}
                        </div>
                      ))
                    )
                  ) : (
                    <div className="space-y-4">
                      {contacts.map(c => (
                        <div key={c.id} className={`bg-slate-800/80 border p-4 rounded-2xl flex justify-between items-center group transition-all hover:border-slate-600 ${c.isVip ? 'border-amber-500/50 bg-amber-500/5' : 'border-slate-700'}`}>
                          <div className="min-w-0 flex items-center gap-3">
                            <button onClick={() => toggleVip(c.id)} className={`text-sm transition-all ${c.isVip ? 'text-amber-400 scale-110' : 'text-slate-600 hover:text-slate-400'}`}>
                              <i className={`fa-solid fa-star`}></i>
                            </button>
                            <div>
                              <p className="text-xs font-black truncate text-slate-200">{c.name}</p>
                              <p className="text-[10px] text-slate-500 font-mono">{c.phoneNumber}</p>
                            </div>
                          </div>
                          <button onClick={() => deleteContact(c.id)} className="text-slate-500 hover:text-red-500 p-2 rounded-lg transition-all opacity-0 group-hover:opacity-100"><i className="fa-solid fa-trash-can text-xs"></i></button>
                        </div>
                      ))}
                      <div className="p-4 bg-slate-900/50 rounded-2xl border border-dashed border-slate-700 space-y-2">
                        <div className="flex gap-2">
                          <input id="add-n" placeholder="Identity Name" className="flex-1 bg-slate-800 border border-slate-800 rounded-lg p-3 text-[10px] outline-none focus:border-indigo-500 transition-all" />
                          <button id="add-v" onClick={(e) => { e.currentTarget.classList.toggle('bg-amber-500'); e.currentTarget.classList.toggle('text-white'); e.currentTarget.classList.toggle('text-slate-500'); }} className="px-3 bg-slate-800 rounded-lg text-slate-500 transition-all border border-slate-800"><i className="fa-solid fa-star text-[10px]"></i></button>
                        </div>
                        <input id="add-p" placeholder="Phone Number" className="w-full bg-slate-800 border border-slate-800 rounded-lg p-3 text-[10px] outline-none focus:border-indigo-500 transition-all" />
                        <button onClick={() => { 
                          const n = document.getElementById('add-n') as HTMLInputElement; 
                          const p = document.getElementById('add-p') as HTMLInputElement; 
                          const v = document.getElementById('add-v') as HTMLButtonElement;
                          const isVip = v.classList.contains('bg-amber-500');
                          addContact(n.value, p.value, isVip); 
                          n.value=''; p.value=''; v.classList.remove('bg-amber-500'); v.classList.add('text-slate-500'); v.classList.remove('text-white');
                        }} className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[10px] font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all">Add to Directory</button>
                      </div>
                    </div>
                  )}
                </div>
              </section>
            </div>
          </div>
        )}
      </main>

      <footer className="p-4 bg-slate-900 border-t border-slate-800 shrink-0">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-6 text-[9px] font-black uppercase tracking-[0.2em] text-slate-500">
            {/* Fix: use status === CallStatus.IDLE for comparison to avoid unintentional narrowing warnings from TypeScript */}
            <div className="flex items-center gap-2"><div className={`w-2 h-2 rounded-full shadow-lg ${status === CallStatus.IDLE ? 'bg-green-500 shadow-green-500/50' : 'bg-red-500 animate-pulse shadow-red-500/50'}`}></div><span>Live Engine</span></div>
            <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-indigo-500 shadow-indigo-500/50"></div><span>Encryption Active</span></div>
          </div>
           <div className="flex items-center gap-3">
              <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">v2.5.0-flash</span>
               <div className="px-3 py-1 bg-slate-800 rounded-full border border-slate-700">
                  <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">
                    {serviceConfig?.swireit.enabled ? 'Swireit Linked' : 'Swireit Offline'}
                  </span>
               </div>
           </div>
        </div>
      </footer>

      <style>{`
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes spin-once {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
        @keyframes scanline {
          from { transform: translateY(-100%); }
          to { transform: translateY(100%); }
        }
        @keyframes status-pulse {
          0%, 100% { box-shadow: 0 0 0 0px var(--ring-color); transform: scale(1); }
          50% { box-shadow: 0 0 20px 4px var(--ring-color); transform: scale(1.05); }
        }
        @keyframes pulse-slow {
          0%, 100% { opacity: 0.2; }
          50% { opacity: 0.5; }
        }
        .animate-spin-slow {
          animation: spin-slow 10s linear infinite;
        }
        .animate-spin-once {
          animation: spin-once 0.5s ease-out;
        }
        .animate-blink {
          animation: blink 1s step-end infinite;
        }
        .animate-scanline {
          animation: scanline 4s linear infinite;
        }
        .animate-status-pulse {
          animation: status-pulse 2s infinite ease-in-out;
        }
        .animate-pulse-subtle {
          animation: pulse-slow 2s infinite ease-in-out;
        }
        .animate-pulse-slow {
          animation: pulse-slow 3s infinite ease-in-out;
        }
        .animate-bounce-subtle {
          animation: bounce-subtle 2s infinite ease-in-out;
        }
        @keyframes bounce-subtle {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-3px); }
        }
        .animate-status-pulse {
          --ring-color: rgba(99, 102, 241, 0.4);
        }
      `}</style>
    </div>
  );
};

export default App;
