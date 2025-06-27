import { TwilioWebSocket } from '@tw2gem/twilio-server';
import { ServerOptions } from 'ws';

export class Tw2GemSocket extends TwilioWebSocket {
    twilioStreamSid?: string;
    geminiClient?: any; // Using any type since we're now using the official client
    
    // Call tracking properties
    callId?: string;
    callStartTime?: string;
    callEnded?: boolean;
    userId?: string;
    agentId?: string;
    phoneNumberFrom?: string;
    phoneNumberTo?: string;
    direction?: 'inbound' | 'outbound';
    transcript?: string;
    functionCalls?: any[];
    customerSatisfaction?: number;
}

export class Tw2GemServerOptions {
    serverOptions!: ServerOptions;
    geminiOptions!: any; // Using any type since we're now using the official client
    supabaseUrl?: string;
    supabaseKey?: string;
}

export class Tw2GemGeminiEvents {
    onReady?: (socket: Tw2GemSocket) => void;
    onClose?: (socket: Tw2GemSocket) => void;
}