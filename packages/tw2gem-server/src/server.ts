import { TwilioMediaEvent, TwilioServerOptions, TwilioWebSocketServer } from '@tw2gem/twilio-server';
import { Tw2GemGeminiEvents, Tw2GemServerOptions, Tw2GemSocket } from './server.dto.js';
import { AudioConverter } from '@tw2gem/audio-converter';
import { WebhookService } from './webhook-service.js';
import { FunctionCallHandler } from './function-handler.js';

export class Tw2GemServer extends TwilioWebSocketServer {

    public onNewCall?: (socket: Tw2GemSocket) => void;
    public geminiLive = new Tw2GemGeminiEvents();
    private webhookService: WebhookService;
    private functionHandler: FunctionCallHandler;

    constructor(options: Tw2GemServerOptions) {
        super(options.serverOptions);
        const twilioServerOptions = <TwilioServerOptions>options.serverOptions;
        
        // Initialize webhook service
        this.webhookService = new WebhookService(
            options.supabaseUrl,
            options.supabaseKey
        );

        // Initialize function call handler
        this.functionHandler = new FunctionCallHandler(
            options.supabaseUrl,
            options.supabaseKey
        );

        twilioServerOptions.handlers = {
            onStart: (socket: Tw2GemSocket, event) => {
                this.onNewCall?.(socket);

                // Generate call ID and store call metadata
                const callId = `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                socket.callId = callId;
                socket.callStartTime = new Date().toISOString();

                // Send call started webhook
                this.webhookService.processCallEvent('call.started', {
                    call_id: callId,
                    phone_number_from: socket.phoneNumberFrom,
                    phone_number_to: socket.phoneNumberTo,
                    agent_id: socket.agentId,
                    direction: socket.direction,
                    status: 'in_progress',
                    timestamp: socket.callStartTime
                }, socket.userId);

                const geminiClient = {} as any; // Using any type since we're now using the official client directly in server.js
                socket.twilioStreamSid = event.streamSid;

                geminiClient.onReady = () => {
                    socket.geminiClient = geminiClient;
                    this.geminiLive.onReady?.(socket);
                };

                geminiClient.onClose = () => {
                    this.handleCallEnd(socket, 'completed');
                    socket.close();
                    this.geminiLive.onClose?.(socket);
                };

                geminiClient.onError = (error: any) => {
                    this.handleCallEnd(socket, 'failed');
                    this.onError?.(socket, error);
                };

                geminiClient.onServerContent = (serverContent: any) => {
                    this.onServerContent?.(socket, serverContent);
                    this.handleFunctionCalls(socket, serverContent);
                };

                socket.onclose = (event) => {
                    this.handleCallEnd(socket, 'completed');
                    if (socket?.geminiClient) {
                        socket.geminiClient.close();
                        delete socket.geminiClient;
                    }
                    this.onClose?.(socket, event);
                };
            },
            onMedia: this.onMedia
        };
    }

    public onMedia(socket: Tw2GemSocket, event: TwilioMediaEvent) {
        if (!socket.geminiClient || event.media?.track !== 'inbound' || !event.media.payload)
            return;

        const base64MulawAudio = event.media.payload;
        const base64PCM16k = AudioConverter.convertBase64MuLawToBase64PCM16k(base64MulawAudio);
        socket.geminiClient.sendRealTime({
            audio: {
                mimeType: 'audio/pcm;rate=16000',
                data: base64PCM16k
            }
        });
    }

    public onServerContent(socket: Tw2GemSocket, serverContent: any) {
        if (!socket.twilioStreamSid || !socket.geminiClient || !serverContent.modelTurn?.parts?.length)
            return;

        const parts = serverContent.modelTurn?.parts;

        const inlineData = parts.flatMap((part: any) => part.inlineData)?.filter((item: any) => item?.mimeType === 'audio/pcm;rate=24000' && item?.data);
        if (!inlineData?.length)
            return;

        const base64Mulaws = inlineData.map((lineData: any) => AudioConverter.convertBase64PCM24kToBase64MuLaw8k(lineData!.data));
        for (const audios of base64Mulaws) {
            socket.sendMedia({
                streamSid: socket.twilioStreamSid,
                media: {
                    payload: audios
                }
            });
        }
    }

    private handleCallEnd(socket: Tw2GemSocket, outcome: string) {
        if (!socket.callId || socket.callEnded) return;
        
        socket.callEnded = true;
        const endTime = new Date().toISOString();
        const durationSeconds = socket.callStartTime ? 
            Math.floor((new Date(endTime).getTime() - new Date(socket.callStartTime).getTime()) / 1000) : 0;

        this.webhookService.processCallEvent(
            outcome === 'failed' ? 'call.failed' : 'call.completed',
            {
                call_id: socket.callId,
                duration_seconds: durationSeconds,
                outcome: outcome,
                transcript: socket.transcript || '',
                function_calls: socket.functionCalls || [],
                customer_satisfaction: socket.customerSatisfaction,
                timestamp: endTime
            },
            socket.userId
        );
    }

    // Get function definitions for Gemini setup
    public getFunctionDefinitions(): object[] {
        return this.functionHandler.getFunctionDefinitions();
    }

    private async handleFunctionCalls(socket: Tw2GemSocket, serverContent: any) {
        if (!serverContent.modelTurn?.parts) return;

        const functionCalls = serverContent.modelTurn.parts
            .filter((part: any) => part.functionCall)
            .map((part: any) => part.functionCall);

        for (const functionCall of functionCalls) {
            if (functionCall?.name && functionCall?.args) {
                // Store function call on socket
                if (!socket.functionCalls) socket.functionCalls = [];
                socket.functionCalls.push(functionCall);

                try {
                    // Execute the function call
                    const result = await this.functionHandler.executeFunction({
                        name: functionCall.name,
                        args: functionCall.args,
                        callId: socket.callId!,
                        userId: socket.userId,
                        agentId: socket.agentId
                    });

                    // Send function call webhook with result
                    this.webhookService.processFunctionCall({
                        call_id: socket.callId!,
                        function_name: functionCall.name,
                        parameters: functionCall.args,
                        result: result.result,
                        timestamp: new Date().toISOString()
                    }, socket.userId);

                    // Send function result back to Gemini
                    if (socket.geminiClient) {
                        if (result.success) {
                            (socket.geminiClient as any).sendFunctionResponse(functionCall.name, result.result);
                        } else {
                            (socket.geminiClient as any).sendFunctionResponse(functionCall.name, {
                                error: result.error,
                                success: false
                            });
                        }
                    }

                } catch (error) {
                    console.error('Error executing function call:', error);
                    
                    // Send error webhook
                    this.webhookService.processFunctionCall({
                        call_id: socket.callId!,
                        function_name: functionCall.name,
                        parameters: functionCall.args,
                        result: { error: error instanceof Error ? error.message : 'Unknown error' },
                        timestamp: new Date().toISOString()
                    }, socket.userId);
                }
            }
        }
    }
}