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
  secretaryVoice: 'Zephyr' | 'Puck' | 'Charon' | 'Kore' | 'Fenrir';
  noiseSuppression: boolean;
  echoCancellation: boolean;
  autoGainControl: boolean;
  languageFocus: string;
}