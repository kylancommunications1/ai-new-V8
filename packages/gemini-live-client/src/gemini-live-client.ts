import { BidiGenerateContentRealtimeInput, BidiGenerateContentServerContent, BidiGenerateContentServerMessage, BidiRequest, GeminiLiveClientOptions } from './gemini-live.dto.js';
import { CloseEvent, ErrorEvent, MessageEvent, WebSocket } from 'ws';

export class GeminiLiveClient {

    private static readonly DEFAULT_GEMINI_BIDI_SERVER = 'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent';

    private socket!: WebSocket;
    public isReady: boolean = false;
    private usingFallback: boolean = false;
    private connectionAttempts: number = 0;
    private maxRetries: number = 2;

    public onReady?: () => void;
    public onError?: (event: ErrorEvent) => void;
    public onClose?: (event: CloseEvent) => void;
    public onServerContent?: (serverContent: BidiGenerateContentServerContent) => void;

    constructor(
        private options: GeminiLiveClientOptions
    ) {
        this.connectWithModel();
    }

    private connectWithModel() {
        const server = this.options.server;
        const baseUrl = server?.url || GeminiLiveClient.DEFAULT_GEMINI_BIDI_SERVER;
        const queryParams = server?.apiKey ? `key=${server.apiKey}` : '';

        // Use the correct WebSocket URL format
        const url = `${baseUrl}?${queryParams}`;
        this.socket = new WebSocket(url);

        this.socket.onopen = this.sendSetup.bind(this);
        this.socket.onmessage = this.handlerMessage.bind(this);

        this.socket.onerror = (event: ErrorEvent) => {
            this.isReady = false;
            this.handleConnectionError(event);
        };

        this.socket.onclose = (event: CloseEvent) => {
            this.isReady = false;
            this.onClose?.(event);
        };
    }

    private handleConnectionError(event: ErrorEvent) {
        this.connectionAttempts++;
        
        // Try fallback model if primary fails and we have a fallback
        if (!this.usingFallback && this.options.fallbackModel && this.connectionAttempts <= this.maxRetries) {
            console.log(`Primary model failed, switching to fallback: ${this.options.fallbackModel}`);
            this.usingFallback = true;
            this.options.setup.model = this.options.fallbackModel;
            
            // Close current connection and retry with fallback
            if (this.socket) {
                this.socket.close();
            }
            
            setTimeout(() => {
                this.connectWithModel();
            }, 1000);
        } else {
            // All attempts failed, call error handler
            this.onError?.(event);
        }
    }

    protected sendSetup() {
        const jsonPayload = JSON.stringify({ setup: this.options.setup });
        this.socket.send(jsonPayload);
    }

    protected async handlerMessage(event: MessageEvent) {
        const isBuffer = event.data instanceof Buffer;
        if (!isBuffer)
            return; 
        
        const blob = event.data;
        const text = blob.toString();
        const obj: BidiGenerateContentServerMessage = JSON.parse(text);
        if (obj.setupComplete) {
            this.isReady = true;
            return this.onReady?.();
        }

        if (obj.serverContent) {
            return this.onServerContent?.(obj.serverContent);
        }
    };

    public sendText(text: string) {
        const realtimeInput: BidiGenerateContentRealtimeInput = { text };
        this.send({ realtimeInput });
    }

    public sendRealTime(realTimeData: BidiGenerateContentRealtimeInput) {
        this.send({ realtimeInput: realTimeData });
    }

    public sendRealtimeInput(realTimeData: BidiGenerateContentRealtimeInput) {
        this.send({ realtimeInput: realTimeData });
    }

    public sendAudioStreamEnd() {
        this.send({ realtimeInput: { audioStreamEnd: true } });
    }

    public sendClientContent(content: { turns: any, turnComplete?: boolean }) {
        this.send({ clientContent: content });
    }

    public sendFunctionResponse(functionName: string, response: any) {
        const functionResponse = {
            name: functionName,
            response: response
        };
        
        this.sendClientContent({
            turns: [{
                role: 'function',
                parts: [{ functionResponse }]
            }],
            turnComplete: true
        });
    }

    protected send(request: BidiRequest) {
        if (!this.isReady)
            return;
        const jsonPayload = JSON.stringify(request);
        this.socket.send(jsonPayload);
    }

    public close() {
        this.socket.close();
    }
}