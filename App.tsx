
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { GoogleGenAI, Modality, LiveServerMessage } from '@google/genai';
import { CallStatus, CallLog, SecretaryConfig, Contact } from './types';
import { createBlob, decode, decodeAudioData } from './utils/audio-utils';

const App: React.FC = () => {
  // --- State ---
  const [status, setStatus] = useState<CallStatus>(CallStatus.IDLE);
  const [config, setConfig] = useState<SecretaryConfig>({
    ownerName: 'Alex',
    forwardingNumber: '+1 (555) 012-3456',
    secretaryVoice: 'Kore',
    noiseSuppression: true,
    echoCancellation: true,
    autoGainControl: true,
    languageFocus: 'en-US'
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
  const [currentlyPlayingId, setCurrentlyPlayingId] = useState<string | null>(null);

  // --- Refs for Audio & Session ---
  const sessionRef = useRef<any>(null);
  const inputAudioCtxRef = useRef<AudioContext | null>(null);
  const outputAudioCtxRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const audioSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const micStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioPlaybackRef = useRef<HTMLAudioElement | null>(null);
  const consoleEndRef = useRef<HTMLDivElement>(null);

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

  const addConsoleLine = useCallback((role: string, text: string, type: 'info' | 'message' | 'system' = 'message') => {
    const timestamp = new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setTranscription(prev => [...prev, { timestamp, role, text, type }]);
  }, []);

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
  const stopAudio = useCallback(() => {
    audioSourcesRef.current.forEach(source => {
      try { source.stop(); } catch(e) {}
    });
    audioSourcesRef.current.clear();
    nextStartTimeRef.current = 0;
  }, []);

  const endSession = useCallback(async () => {
    if (sessionRef.current) {
      sessionRef.current.close();
      sessionRef.current = null;
    }
    if (inputAudioCtxRef.current) {
      await inputAudioCtxRef.current.close();
      inputAudioCtxRef.current = null;
    }
    if (outputAudioCtxRef.current) {
      await outputAudioCtxRef.current.close();
      outputAudioCtxRef.current = null;
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach(t => t.stop());
      micStreamRef.current = null;
    }
    stopAudio();
  }, [stopAudio]);

  const hangUp = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    endSession();
    setStatus(CallStatus.IDLE);
    setActiveCallId(null);
    addConsoleLine('SYSTEM', 'Call session terminated.', 'system');
  }, [endSession, addConsoleLine]);

  const startCall = async () => {
    const callId = Math.random().toString(36).substring(7).toUpperCase();
    const callerNumber = `+1 (${Math.floor(Math.random()*900)+100}) ${Math.floor(Math.random()*900)+100}-${Math.floor(Math.random()*9000)+1000}`;
    
    if (blockedNumbers.includes(callerNumber)) {
      addLog({
        id: callId,
        callerNumber,
        timestamp: new Date(),
        status: CallStatus.ENDED,
        transcription: ["[System: Call blocked automatically]"],
      });
      addConsoleLine('SECURITY', `Auto-blocked incoming call from: ${callerNumber}`, 'system');
      return;
    }

    const matchedContact = contacts.find(c => c.phoneNumber.replace(/\D/g,'') === callerNumber.replace(/\D/g,''));
    
    setActiveCallId(callId);
    setTranscription([]);
    setStatus(CallStatus.SCREENING);
    addConsoleLine('SYSTEM', `Incoming call detected from ${matchedContact?.name || callerNumber}${matchedContact?.isVip ? ' [VIP]' : ''}`, 'system');
    addConsoleLine('SYSTEM', 'Initializing Gemini Live screening protocol...', 'info');

    // Determine Time of Day Greeting
    const hour = new Date().getHours();
    let timeGreeting = "Hello";
    if (hour < 12) timeGreeting = "Good morning";
    else if (hour < 17) timeGreeting = "Good afternoon";
    else if (hour < 21) timeGreeting = "Good evening";
    else timeGreeting = "Hello, apologies for the late hour";

    // Build Personalized Greeting Instruction
    let greetingSnippet = `${timeGreeting}, this is ${config.ownerName}'s assistant. Who is calling and why are you calling?`;
    if (matchedContact) {
      if (matchedContact.isVip) {
        greetingSnippet = `${timeGreeting} ${matchedContact.name}! It's such a pleasure to hear from you. This is ${config.ownerName}'s assistant. How can I help you today?`;
      } else {
        greetingSnippet = `${timeGreeting} ${matchedContact.name}, this is ${config.ownerName}'s assistant. How can I help you today?`;
      }
    }

    addLog({
      id: callId,
      callerNumber,
      callerName: matchedContact?.name,
      contact: matchedContact,
      timestamp: new Date(),
      status: CallStatus.SCREENING,
      transcription: [],
    });

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      inputAudioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      outputAudioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      
      try {
        micStreamRef.current = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            echoCancellation: config.echoCancellation,
            noiseSuppression: config.noiseSuppression,
            autoGainControl: config.autoGainControl,
            sampleRate: 16000,
            channelCount: 1
          } 
        });
      } catch (micError) {
        addConsoleLine('ERROR', 'Microphone access denied or unavailable.', 'system');
        throw micError;
      }

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: config.secretaryVoice } },
          },
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          systemInstruction: `You are ${config.ownerName}'s AI Secretary.
          GOAL: Precisely identify callers and their purpose. Accuracy is paramount.
          AUDIO CONDITION: 
          - Noise reduction: ${config.noiseSuppression ? 'ENABLED' : 'DISABLED'}
          - Echo reduction: ${config.echoCancellation ? 'ENABLED' : 'DISABLED'}
          - Auto-gain control: ${config.autoGainControl ? 'ENABLED' : 'DISABLED'}
          Adjust your listening behavior accordingly.
          FLOW:
          - Greet using exactly this tone: "${greetingSnippet}"
          - Transition: Once info is gathered, say: "Thank you. Please hold for one moment while I check if they are available."
          - Stop talking immediately after the transition phrase.`
        },
        callbacks: {
          onopen: () => {
            const source = inputAudioCtxRef.current!.createMediaStreamSource(micStreamRef.current!);
            const processor = inputAudioCtxRef.current!.createScriptProcessor(4096, 1, 1);
            processor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const pcmBlob = createBlob(inputData);
              sessionPromise.then(s => s.sendRealtimeInput({ media: pcmBlob }));
            };
            source.connect(processor);
            processor.connect(inputAudioCtxRef.current!.destination);
          },
          onmessage: async (msg: LiveServerMessage) => {
            if (msg.serverContent?.inputTranscription) {
               addConsoleLine('CALLER', msg.serverContent!.inputTranscription!.text);
            }
            if (msg.serverContent?.outputTranscription) {
               const text = msg.serverContent!.outputTranscription!.text;
               addConsoleLine('SECRETARY', text);
               if (text.toLowerCase().includes("please hold") || text.toLowerCase().includes("one moment")) {
                 setStatus(CallStatus.USER_DECIDING);
                 addConsoleLine('SYSTEM', 'Screening complete. Owner intervention required.', 'info');
               }
            }

            const audioData = msg.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (audioData && outputAudioCtxRef.current) {
              const ctx = outputAudioCtxRef.current;
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
              const buffer = await decodeAudioData(decode(audioData), ctx, 24000, 1);
              const source = ctx.createBufferSource();
              source.buffer = buffer;
              source.connect(ctx.destination);
              source.onended = () => audioSourcesRef.current.delete(source);
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += buffer.duration;
              audioSourcesRef.current.add(source);
            }

            if (msg.serverContent?.interrupted) stopAudio();
          },
          onerror: (e) => {
            console.error("Session Error:", e);
            addConsoleLine('ERROR', 'AI Session error encountered.', 'system');
          },
          onclose: () => addConsoleLine('SYSTEM', 'AI Connection Closed.', 'system')
        }
      });

      sessionRef.current = await sessionPromise;
    } catch (err) {
      console.error("Failed to start call:", err);
      setStatus(CallStatus.IDLE);
    }
  };

  const handleAnswer = useCallback(async () => {
    setStatus(CallStatus.CONNECTED);
    updateActiveLog({ status: CallStatus.CONNECTED });
    stopAudio();
    addConsoleLine('SYSTEM', 'User accepted call. Patching audio through...', 'info');
  }, [stopAudio, updateActiveLog, addConsoleLine]);

  const handleVoicemail = useCallback(async () => {
    setStatus(CallStatus.VOICEMAIL);
    updateActiveLog({ status: CallStatus.VOICEMAIL });
    if (micStreamRef.current) {
      audioChunksRef.current = [];
      const recorder = new MediaRecorder(micStreamRef.current);
      recorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const audioUrl = URL.createObjectURL(audioBlob);
        setCallLogs(prev => prev.map(log => log.id === activeCallId ? { ...log, voicemailAudioUrl: audioUrl } : log));
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
    }
    addConsoleLine('SECRETARY', `${config.ownerName} is not available. Please leave a message.`);
    addConsoleLine('SYSTEM', 'Recording voicemail stream...', 'info');
    setTimeout(() => {
      addConsoleLine('SYSTEM', 'Voicemail captured and saved.', 'info');
      setTimeout(hangUp, 2000);
    }, 15000);
  }, [config.ownerName, hangUp, activeCallId, updateActiveLog, addConsoleLine]);

  const handleForward = useCallback(() => {
    const dest = activeCallLog?.contact?.customForwardingNumber ?? config.forwardingNumber;
    setStatus(CallStatus.FORWARDING);
    updateActiveLog({ status: CallStatus.FORWARDING });
    addConsoleLine('SECRETARY', `Patching you through to ${dest}...`);
    addConsoleLine('SYSTEM', `Redirecting call to ${dest}`, 'info');
    setTimeout(hangUp, 3000);
  }, [config.forwardingNumber, hangUp, updateActiveLog, activeCallLog, addConsoleLine]);

  const playVoicemail = (id: string, url: string) => {
    if (currentlyPlayingId === id) { audioPlaybackRef.current?.pause(); setCurrentlyPlayingId(null); return; }
    if (audioPlaybackRef.current) audioPlaybackRef.current.pause();
    const audio = new Audio(url);
    audio.onended = () => setCurrentlyPlayingId(null);
    audio.onplay = () => setCurrentlyPlayingId(id);
    audioPlaybackRef.current = audio;
    audio.play();
  };

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
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Redirect Destination</label>
                    <input type="text" value={config.forwardingNumber} onChange={(e) => setConfig({...config, forwardingNumber: e.target.value})} className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all" />
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
                       <i className="fa-solid fa-radar text-4xl text-slate-700 animate-spin-slow"></i>
                       <div className="space-y-2">
                          <p className="font-black uppercase tracking-[0.2em] text-slate-500">System Monitoring Active</p>
                          <p className="text-[10px] max-w-xs text-slate-600">Standing by for voice packet triggers or external line stimulation.</p>
                       </div>
                       <button onClick={startCall} className="px-8 py-3 bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 hover:bg-indigo-600 hover:text-white rounded-xl font-black uppercase tracking-widest transition-all shadow-indigo-500/10">
                         Force Receive Call
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
                            {log.voicemailAudioUrl && <button onClick={(e) => { e.stopPropagation(); playVoicemail(log.id, log.voicemailAudioUrl!); }} className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500 hover:text-white flex items-center justify-center transition-all"><i className={`fa-solid ${currentlyPlayingId === log.id ? 'fa-pause' : 'fa-play'} text-[8px]`}></i></button>}
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
                <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">GEMINI PRO</span>
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
