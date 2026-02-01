export enum CallStatus {
  IDLE = 'IDLE',
  SCREENING = 'SCREENING',
  USER_DECIDING = 'USER_DECIDING',
  CONNECTED = 'CONNECTED',
  VOICEMAIL = 'VOICEMAIL',
  FORWARDING = 'FORWARDING',
  ENDED = 'ENDED'
}

export interface Contact {
  id: string;
  name: string;
  phoneNumber: string;
  customForwardingNumber?: string;
  isVip?: boolean;
}

export interface CallLog {
  id: string;
  callerNumber?: string;
  callerName?: string;
  contact?: Contact;
  reason?: string;
  timestamp: Date;
  status: CallStatus;
  transcription: string[];
  voicemailAudioUrl?: string;
}

export interface SecretaryConfig {
  ownerName: string;
  forwardingNumber: string;
  memoryEnabled: boolean;
  memorySummary: string;
  secretaryVoice: 'Zephyr' | 'Puck' | 'Charon' | 'Kore' | 'Fenrir';
  noiseSuppression: boolean;
  echoCancellation: boolean;
  autoGainControl: boolean;
  languageFocus: string;
  transcriptionEngine: string;
  orchestrationEngine: string;
  speechSynthesisEngine: string;
  wakeName: string;
}

export interface ServiceConfig {
  swireit: {
    enabled: boolean;
    projectIdConfigured: boolean;
    apiTokenConfigured: boolean;
    spaceUrlConfigured: boolean;
    callerIdConfigured: boolean;
    twimlUrlConfigured: boolean;
    screeningNumber: string | null;
    forwardingNumber: string | null;
  };
  aisec: {
    url: string;
    configured: boolean;
  };
  services: {
    ollama: boolean;
    anythingllm: boolean;
  };
}
