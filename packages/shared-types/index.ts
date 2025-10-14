// Shared TypeScript types for the entire system

// ============================================
// CONVERSATION TYPES (AI Engine)
// ============================================

export interface ConversationContext {
  businessId: string;
  callSid: string;
  callerPhone: string;
  conversationHistory: ConversationTurn[];
  collectedInfo: CollectedInfo;
  currentIntent: Intent | null;
  currentState: ConversationState;
}

export interface ConversationTurn {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  confidence?: number;
}

export interface CollectedInfo {
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  customerAddress?: string;
  desiredDate?: string;
  desiredTime?: string;
  serviceType?: string;
  notes?: string;
  urgency?: 'normal' | 'high' | 'emergency';
}

export type Intent =
  | 'greeting'
  | 'schedule_appointment'
  | 'reschedule_appointment'
  | 'cancel_appointment'
  | 'ask_question'
  | 'ask_pricing'
  | 'ask_hours'
  | 'ask_location'
  | 'emergency'
  | 'speak_to_human'
  | 'leave_message'
  | 'other';

export type ConversationState =
  | 'greeting'
  | 'understanding_intent'
  | 'collecting_info'
  | 'checking_availability'
  | 'confirming_booking'
  | 'answering_question'
  | 'taking_message'
  | 'transferring'
  | 'handling_emergency'
  | 'closing';

// ============================================
// AI SERVICE TYPES
// ============================================

export interface StreamingTranscript {
  text: string;
  isFinal: boolean;
  confidence: number;
}

export interface AIResponse {
  text: string;
  action?: AIAction;
  intent?: Intent;
  confidence: number;
}

export interface AIAction {
  type: 'book_appointment' | 'check_availability' | 'transfer_call' | 'take_message' | 'send_sms' | 'flag_emergency';
  params: Record<string, any>;
}

// ============================================
// CALENDAR TYPES
// ============================================

export interface TimeSlot {
  start: Date;
  end: Date;
  available: boolean;
}

export interface AvailabilityRequest {
  businessId: string;
  date: string; // YYYY-MM-DD
  serviceType: string;
  durationMinutes: number;
}

export interface BookingRequest {
  businessId: string;
  customerId?: string;
  scheduledTime: Date;
  durationMinutes: number;
  serviceType: string;
  customerName: string;
  customerPhone: string;
  customerAddress?: string;
  notes?: string;
}

// ============================================
// API REQUEST/RESPONSE TYPES
// ============================================

// Admin API
export interface CreateBusinessRequest {
  name: string;
  industry: string;
  ownerEmail: string;
  ownerPhone: string;
  ownerName: string;
  plan: 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE';
}

export interface UpdateBusinessConfigRequest {
  aiAgentName?: string;
  aiVoiceId?: string;
  aiTone?: string;
  greetingMessage?: string;
  businessHours?: Record<string, { open: string; close: string }>;
  services?: Array<{ name: string; price: string; duration: number }>;
  faqs?: Array<{ question: string; answer: string }>;
  emergencyKeywords?: string[];
  transferNumber?: string;
  transferKeywords?: string[];
}

// Business Owner API
export interface DashboardStats {
  todayAppointments: number;
  todayCalls: number;
  pendingMessages: number;
  weekRevenue: number;
  missedCalls: number;
}

export interface CallLogItem {
  id: string;
  fromNumber: string;
  startedAt: Date;
  durationSeconds: number;
  outcome: string;
  transcript?: string;
  recordingUrl?: string;
}

// ============================================
// WEBHOOK TYPES
// ============================================

export interface TwilioIncomingCall {
  CallSid: string;
  From: string;
  To: string;
  CallStatus: string;
  Direction: string;
}

export interface TwilioMediaStream {
  event: 'start' | 'media' | 'stop';
  streamSid?: string;
  media?: {
    payload: string; // base64 encoded audio
    timestamp: string;
  };
}

export interface StripeWebhook {
  type: string;
  data: {
    object: any;
  };
}

// ============================================
// SYSTEM TYPES
// ============================================

export interface SystemHealth {
  status: 'healthy' | 'degraded' | 'down';
  services: {
    database: boolean;
    twilio: boolean;
    openai: boolean;
    deepgram: boolean;
    elevenlabs: boolean;
  };
  timestamp: Date;
}

export interface ErrorLog {
  level: 'info' | 'warn' | 'error' | 'critical';
  message: string;
  context?: Record<string, any>;
  timestamp: Date;
}
