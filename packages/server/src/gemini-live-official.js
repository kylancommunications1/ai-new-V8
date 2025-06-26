import { GoogleGenAI, Modality, StartSensitivity, EndSensitivity } from '@google/genai';

export class GeminiLiveOfficial {
    constructor(options) {
        this.options = options;
        this.session = null;
        this.responseQueue = [];
        this.isConnected = false;
        
        // Callbacks
        this.onReady = null;
        this.onError = null;
        this.onClose = null;
        this.onServerContent = null;
    }

    async connect() {
        try {
            const ai = new GoogleGenAI({
                apiKey: this.options.apiKey
            });

            // Convert string sensitivity values to proper enums
            const realtimeInputConfig = this.convertRealtimeInputConfig(this.options.realtimeInputConfig);

            const config = {
                responseModalities: [Modality.AUDIO],
                speechConfig: this.options.speechConfig,
                systemInstruction: this.options.systemInstruction,
                realtimeInputConfig: realtimeInputConfig,
                inputAudioTranscription: this.options.inputAudioTranscription,
                outputAudioTranscription: this.options.outputAudioTranscription,
                generationConfig: {
                    candidateCount: 1,
                    maxOutputTokens: 8192,
                    temperature: 0.7,
                    topP: 0.95,
                    topK: 40
                }
            };

            this.session = await ai.live.connect({
                model: this.options.model,
                callbacks: {
                    onopen: () => {
                        console.log('🔗 Official Gemini Live API connected');
                        this.isConnected = true;
                        
                        // Send initial greeting according to system instructions
                        this.sendInitialGreeting();
                        
                        this.onReady?.();
                    },
                    onmessage: (message) => {
                        this.responseQueue.push(message);
                        this.processMessage(message);
                    },
                    onerror: (error) => {
                        console.error('❌ Official Gemini Live API error:', error);
                        this.isConnected = false;
                        this.onError?.(error);
                    },
                    onclose: (event) => {
                        console.log('🔌 Official Gemini Live API disconnected:', event.reason);
                        this.isConnected = false;
                        this.onClose?.(event);
                    }
                },
                config: config
            });

            return this.session;
        } catch (error) {
            console.error('❌ Failed to connect to official Gemini Live API:', error);
            throw error;
        }
    }

    processMessage(message) {
        // Handle different message types according to the official guide
        if (message.serverContent) {
            this.onServerContent?.(message.serverContent);
            
            // Process audio responses
            if (message.serverContent.modelTurn?.parts) {
                for (const part of message.serverContent.modelTurn.parts) {
                    if (part.inlineData?.mimeType?.startsWith('audio/') && part.inlineData.data) {
                        console.log('🎵 Received audio from official Gemini Live API:', {
                            mimeType: part.inlineData.mimeType,
                            dataLength: part.inlineData.data.length
                        });
                    }
                    
                    if (part.text) {
                        console.log('💬 Received text from official Gemini Live API:', part.text);
                    }
                }
            }

            // Handle interruptions (critical for VAD)
            if (message.serverContent.interrupted) {
                console.log('🛑 Generation interrupted by user speech');
                this.handleInterruption();
            }

            // Handle transcriptions
            if (message.serverContent.inputTranscription) {
                console.log('📝 Input transcription:', message.serverContent.inputTranscription.text);
            }

            if (message.serverContent.outputTranscription) {
                console.log('📝 Output transcription:', message.serverContent.outputTranscription.text);
            }

            // Handle turn completion
            if (message.serverContent.turnComplete) {
                console.log('✅ Turn completed');
            }
        }
    }

    sendRealtimeInput(input) {
        if (!this.session || !this.isConnected) {
            console.error('❌ Cannot send audio: Gemini Live session not connected');
            return false;
        }

        try {
            this.session.sendRealtimeInput(input);
            return true;
        } catch (error) {
            console.error('❌ Error sending realtime input to official Gemini Live API:', error);
            return false;
        }
    }

    sendClientContent(content) {
        if (!this.session || !this.isConnected) {
            console.error('❌ Cannot send content: Gemini Live session not connected');
            return false;
        }

        try {
            this.session.sendClientContent(content);
            return true;
        } catch (error) {
            console.error('❌ Error sending client content to official Gemini Live API:', error);
            return false;
        }
    }

    async handleTurn() {
        const turns = [];
        let done = false;
        
        while (!done) {
            const message = await this.waitMessage();
            if (message) {
                turns.push(message);
                if (message.serverContent && message.serverContent.turnComplete) {
                    done = true;
                }
            }
        }
        
        return turns;
    }

    async waitMessage() {
        let done = false;
        let message = undefined;
        
        while (!done) {
            message = this.responseQueue.shift();
            if (message) {
                done = true;
            } else {
                await new Promise((resolve) => setTimeout(resolve, 100));
            }
        }
        
        return message;
    }

    close() {
        if (this.session) {
            this.session.close();
            this.session = null;
        }
        this.isConnected = false;
    }

    sendInitialGreeting() {
        // According to the official guide, use simple string format
        const inputTurns = 'Hello, thank you for calling. How can I help you today?';

        try {
            this.session.sendClientContent({ turns: inputTurns });
            console.log('👋 Sent initial greeting trigger to Gemini');
            
            // Start conversation loop as per official guide
            this.startConversationLoop();
        } catch (error) {
            console.error('❌ Failed to send initial greeting:', error);
        }
    }

    async startConversationLoop() {
        try {
            const turns = await this.handleTurn();
            this.processConversationTurns(turns);
        } catch (error) {
            console.error('❌ Error in conversation loop:', error);
        }
    }

    processConversationTurns(turns) {
        // Process turns according to official guide pattern
        for (const turn of turns) {
            if (turn.text) {
                console.debug('📝 Received text: %s\n', turn.text);
            }
            else if (turn.data) {
                console.debug('🎵 Received inline data: %s\n', turn.data);
                // Handle audio data as per official guide
                this.handleAudioData(turn.data);
            }
            
            // Also check serverContent pattern for comprehensive coverage
            if (turn.serverContent && turn.serverContent.modelTurn?.parts) {
                for (const part of turn.serverContent.modelTurn.parts) {
                    if (part.inlineData?.mimeType?.startsWith('audio/') && part.inlineData.data) {
                        console.log('🎵 Received audio from serverContent:', {
                            mimeType: part.inlineData.mimeType,
                            dataLength: part.inlineData.data.length
                        });
                        this.handleAudioData(part.inlineData.data);
                    }
                    
                    if (part.text) {
                        console.log('💬 Received text from serverContent:', part.text);
                    }
                }
            }
        }
    }

    handleAudioData(audioData) {
        // Handle audio data as per official guide
        try {
            const buffer = Buffer.from(audioData, 'base64');
            const intArray = new Int16Array(buffer.buffer, buffer.byteOffset, buffer.byteLength / Int16Array.BYTES_PER_ELEMENT);
            
            // Trigger callback for audio processing
            this.onServerContent?.({
                audioData: intArray,
                mimeType: 'audio/pcm;rate=24000'
            });
        } catch (error) {
            console.error('❌ Error processing audio data:', error);
        }
    }

    handleInterruption() {
        // Handle interruption when user speaks over AI
        console.log('🛑 Handling interruption - stopping audio playback');
        // In a real implementation, this would stop audio playback and clear queues
        // For now, we just log the event
    }

    sendAudioStreamEnd() {
        // Send audio stream end when audio stream is paused
        if (this.session && this.isConnected) {
            try {
                this.session.sendRealtimeInput({ audioStreamEnd: true });
                console.log('🔚 Sent audio stream end signal');
            } catch (error) {
                console.error('❌ Error sending audio stream end:', error);
            }
        }
    }

    sendActivityStart() {
        // Manual VAD control - mark start of user speech
        if (this.session && this.isConnected) {
            try {
                this.session.sendRealtimeInput({ activityStart: {} });
                console.log('🎤 Sent activity start signal');
            } catch (error) {
                console.error('❌ Error sending activity start:', error);
            }
        }
    }

    sendActivityEnd() {
        // Manual VAD control - mark end of user speech
        if (this.session && this.isConnected) {
            try {
                this.session.sendRealtimeInput({ activityEnd: {} });
                console.log('🔇 Sent activity end signal');
            } catch (error) {
                console.error('❌ Error sending activity end:', error);
            }
        }
    }

    convertRealtimeInputConfig(config) {
        // Convert string sensitivity values to proper enums as per official guide
        if (!config || !config.automaticActivityDetection) {
            return config;
        }

        const converted = { ...config };
        const aad = { ...config.automaticActivityDetection };

        // Convert start sensitivity
        if (aad.startOfSpeechSensitivity === 'START_SENSITIVITY_LOW') {
            aad.startOfSpeechSensitivity = StartSensitivity.START_SENSITIVITY_LOW;
        } else if (aad.startOfSpeechSensitivity === 'START_SENSITIVITY_MEDIUM') {
            aad.startOfSpeechSensitivity = StartSensitivity.START_SENSITIVITY_MEDIUM;
        } else if (aad.startOfSpeechSensitivity === 'START_SENSITIVITY_HIGH') {
            aad.startOfSpeechSensitivity = StartSensitivity.START_SENSITIVITY_HIGH;
        }

        // Convert end sensitivity
        if (aad.endOfSpeechSensitivity === 'END_SENSITIVITY_LOW') {
            aad.endOfSpeechSensitivity = EndSensitivity.END_SENSITIVITY_LOW;
        } else if (aad.endOfSpeechSensitivity === 'END_SENSITIVITY_MEDIUM') {
            aad.endOfSpeechSensitivity = EndSensitivity.END_SENSITIVITY_MEDIUM;
        } else if (aad.endOfSpeechSensitivity === 'END_SENSITIVITY_HIGH') {
            aad.endOfSpeechSensitivity = EndSensitivity.END_SENSITIVITY_HIGH;
        }

        converted.automaticActivityDetection = aad;
        return converted;
    }

    get isReady() {
        return this.isConnected;
    }
}