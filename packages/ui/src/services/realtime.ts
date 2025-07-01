/**
 * Enhanced Real-time Service for TW2GEM AI Call Center
 * Provides WebSocket and Server-Sent Events for live updates
 */

import { supabase } from '../lib/supabase';
import type { CallLog, AIAgent, Campaign, ActiveCall } from '../lib/supabase';

export interface RealtimeSubscription {
  unsubscribe: () => void;
}

export interface CallUpdateEvent {
  type: 'update' | 'insert' | 'delete';
  data: CallLog;
  userId: string;
}

export interface AgentUpdateEvent {
  type: 'update' | 'insert' | 'delete';
  data: AIAgent;
  userId: string;
}

export interface SystemEvent {
  type: 'system_alert' | 'emergency_stop' | 'agent_status_change';
  data: any;
  userId: string;
  timestamp: string;
}

export class RealtimeService {
  private static wsConnection: WebSocket | null = null;
  private static eventSource: EventSource | null = null;
  private static subscriptions: Map<string, Set<Function>> = new Map();
  private static reconnectAttempts = 0;
  private static maxReconnectAttempts = 5;
  private static reconnectDelay = 1000;
  private static isConnecting = false;

  // ============================================================================
  // WebSocket Connection Management
  // ============================================================================

  /**
   * Initialize WebSocket connection for real-time updates
   */
  static async initializeWebSocket(userId: string): Promise<void> {
    if (this.wsConnection || this.isConnecting) {
      return;
    }

    this.isConnecting = true;
    const wsUrl = `${import.meta.env.VITE_WS_URL || 'ws://localhost:12001'}/ws?userId=${userId}`;

    try {
      this.wsConnection = new WebSocket(wsUrl);

      this.wsConnection.onopen = () => {
        console.log('✅ WebSocket connected for real-time updates');
        this.reconnectAttempts = 0;
        this.isConnecting = false;
        
        // Send authentication
        this.wsConnection?.send(JSON.stringify({
          type: 'auth',
          userId: userId
        }));
      };

      this.wsConnection.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          this.handleWebSocketMessage(message);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      this.wsConnection.onclose = () => {
        console.log('🔌 WebSocket connection closed');
        this.wsConnection = null;
        this.isConnecting = false;
        this.attemptReconnect(userId);
      };

      this.wsConnection.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
        this.isConnecting = false;
      };

    } catch (error) {
      console.error('Error initializing WebSocket:', error);
      this.isConnecting = false;
      this.fallbackToPolling(userId);
    }
  }

  /**
   * Handle incoming WebSocket messages
   */
  private static handleWebSocketMessage(message: any): void {
    const { type, data, userId } = message;

    switch (type) {
      case 'call_update':
        this.notifySubscribers('call_updates', data);
        break;
      case 'call_insert':
        this.notifySubscribers('call_inserts', data);
        break;
      case 'call_delete':
        this.notifySubscribers('call_deletes', data.id);
        break;
      case 'agent_update':
        this.notifySubscribers('agent_updates', data);
        break;
      case 'agent_insert':
        this.notifySubscribers('agent_inserts', data);
        break;
      case 'agent_delete':
        this.notifySubscribers('agent_deletes', data.id);
        break;
      case 'system_event':
        this.notifySubscribers('system_events', data);
        break;
      default:
        console.log('Unknown WebSocket message type:', type);
    }
  }

  /**
   * Attempt to reconnect WebSocket
   */
  private static attemptReconnect(userId: string): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('Max reconnection attempts reached, falling back to polling');
      this.fallbackToPolling(userId);
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    console.log(`Attempting to reconnect WebSocket in ${delay}ms (attempt ${this.reconnectAttempts})`);
    
    setTimeout(() => {
      this.initializeWebSocket(userId);
    }, delay);
  }

  /**
   * Fallback to polling when WebSocket fails
   */
  private static fallbackToPolling(userId: string): void {
    console.log('🔄 Falling back to polling for real-time updates');
    
    // Start polling for updates every 5 seconds
    setInterval(() => {
      this.pollForUpdates(userId);
    }, 5000);
  }

  /**
   * Poll for updates when WebSocket is not available
   */
  private static async pollForUpdates(userId: string): Promise<void> {
    try {
      // Get recent updates from the last 10 seconds
      const since = new Date(Date.now() - 10000).toISOString();
      
      const { data: recentCalls } = await supabase
        .from('call_logs')
        .select('*')
        .eq('profile_id', userId)
        .gte('updated_at', since);

      if (recentCalls && recentCalls.length > 0) {
        recentCalls.forEach(call => {
          this.notifySubscribers('call_updates', call);
        });
      }
    } catch (error) {
      console.error('Error polling for updates:', error);
    }
  }

  // ============================================================================
  // Subscription Management
  // ============================================================================

  /**
   * Subscribe to call updates
   */
  static subscribeToCallUpdates(
    userId: string,
    onUpdate?: (call: CallLog) => void,
    onInsert?: (call: CallLog) => void,
    onDelete?: (callId: string) => void
  ): RealtimeSubscription {
    // Initialize WebSocket if not already connected
    this.initializeWebSocket(userId);

    // Add callbacks to subscription map
    if (onUpdate) {
      this.addSubscription('call_updates', onUpdate);
    }
    if (onInsert) {
      this.addSubscription('call_inserts', onInsert);
    }
    if (onDelete) {
      this.addSubscription('call_deletes', onDelete);
    }

    // Also set up Supabase real-time subscription as backup
    const supabaseSubscription = supabase
      .channel(`calls_${userId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'call_logs',
        filter: `profile_id=eq.${userId}`
      }, (payload) => {
        if (onUpdate) onUpdate(payload.new as CallLog);
      })
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'call_logs',
        filter: `profile_id=eq.${userId}`
      }, (payload) => {
        if (onInsert) onInsert(payload.new as CallLog);
      })
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: 'call_logs',
        filter: `profile_id=eq.${userId}`
      }, (payload) => {
        if (onDelete) onDelete(payload.old.id);
      })
      .subscribe();

    return {
      unsubscribe: () => {
        if (onUpdate) this.removeSubscription('call_updates', onUpdate);
        if (onInsert) this.removeSubscription('call_inserts', onInsert);
        if (onDelete) this.removeSubscription('call_deletes', onDelete);
        supabaseSubscription.unsubscribe();
      }
    };
  }

  /**
   * Subscribe to agent updates
   */
  static subscribeToAgentUpdates(
    userId: string,
    onUpdate?: (agent: AIAgent) => void,
    onInsert?: (agent: AIAgent) => void,
    onDelete?: (agentId: string) => void
  ): RealtimeSubscription {
    this.initializeWebSocket(userId);

    if (onUpdate) {
      this.addSubscription('agent_updates', onUpdate);
    }
    if (onInsert) {
      this.addSubscription('agent_inserts', onInsert);
    }
    if (onDelete) {
      this.addSubscription('agent_deletes', onDelete);
    }

    const supabaseSubscription = supabase
      .channel(`agents_${userId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'ai_agents',
        filter: `profile_id=eq.${userId}`
      }, (payload) => {
        if (onUpdate) onUpdate(payload.new as AIAgent);
      })
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'ai_agents',
        filter: `profile_id=eq.${userId}`
      }, (payload) => {
        if (onInsert) onInsert(payload.new as AIAgent);
      })
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: 'ai_agents',
        filter: `profile_id=eq.${userId}`
      }, (payload) => {
        if (onDelete) onDelete(payload.old.id);
      })
      .subscribe();

    return {
      unsubscribe: () => {
        if (onUpdate) this.removeSubscription('agent_updates', onUpdate);
        if (onInsert) this.removeSubscription('agent_inserts', onInsert);
        if (onDelete) this.removeSubscription('agent_deletes', onDelete);
        supabaseSubscription.unsubscribe();
      }
    };
  }

  /**
   * Subscribe to campaign updates
   */
  static subscribeToCampaignUpdates(
    userId: string,
    onUpdate?: (campaign: Campaign) => void,
    onInsert?: (campaign: Campaign) => void,
    onDelete?: (campaignId: string) => void
  ): RealtimeSubscription {
    this.initializeWebSocket(userId);

    const supabaseSubscription = supabase
      .channel(`campaigns_${userId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'outbound_campaigns',
        filter: `profile_id=eq.${userId}`
      }, (payload) => {
        if (onUpdate) onUpdate(payload.new as Campaign);
      })
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'outbound_campaigns',
        filter: `profile_id=eq.${userId}`
      }, (payload) => {
        if (onInsert) onInsert(payload.new as Campaign);
      })
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: 'outbound_campaigns',
        filter: `profile_id=eq.${userId}`
      }, (payload) => {
        if (onDelete) onDelete(payload.old.id);
      })
      .subscribe();

    return {
      unsubscribe: () => {
        supabaseSubscription.unsubscribe();
      }
    };
  }

  /**
   * Subscribe to system events
   */
  static subscribeToSystemEvents(
    userId: string,
    onEvent: (event: SystemEvent) => void
  ): RealtimeSubscription {
    this.initializeWebSocket(userId);
    this.addSubscription('system_events', onEvent);

    return {
      unsubscribe: () => {
        this.removeSubscription('system_events', onEvent);
      }
    };
  }

  /**
   * Subscribe to DNC updates (legacy compatibility)
   */
  static subscribeToDNCUpdates(
    userId: string,
    onUpdate?: () => void,
    onInsert?: () => void,
    onDelete?: () => void
  ): RealtimeSubscription {
    return { unsubscribe: () => {} };
  }

  /**
   * Subscribe to appointment updates (legacy compatibility)
   */
  static subscribeToAppointmentUpdates(
    userId: string,
    onUpdate?: () => void,
    onInsert?: () => void,
    onDelete?: () => void
  ): RealtimeSubscription {
    return { unsubscribe: () => {} };
  }

  /**
   * Subscribe to webhook updates (legacy compatibility)
   */
  static subscribeToWebhookUpdates(
    userId: string,
    onUpdate?: () => void,
    onInsert?: () => void,
    onDelete?: () => void
  ): RealtimeSubscription {
    return { unsubscribe: () => {} };
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  /**
   * Add a subscription callback
   */
  private static addSubscription(type: string, callback: Function): void {
    if (!this.subscriptions.has(type)) {
      this.subscriptions.set(type, new Set());
    }
    this.subscriptions.get(type)!.add(callback);
  }

  /**
   * Remove a subscription callback
   */
  private static removeSubscription(type: string, callback: Function): void {
    const callbacks = this.subscriptions.get(type);
    if (callbacks) {
      callbacks.delete(callback);
      if (callbacks.size === 0) {
        this.subscriptions.delete(type);
      }
    }
  }

  /**
   * Notify all subscribers of a specific type
   */
  private static notifySubscribers(type: string, data: any): void {
    const callbacks = this.subscriptions.get(type);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in subscription callback for ${type}:`, error);
        }
      });
    }
  }

  /**
   * Send a message through WebSocket
   */
  static sendMessage(message: any): void {
    if (this.wsConnection && this.wsConnection.readyState === WebSocket.OPEN) {
      this.wsConnection.send(JSON.stringify(message));
    }
  }

  /**
   * Close all connections
   */
  static disconnect(): void {
    if (this.wsConnection) {
      this.wsConnection.close();
      this.wsConnection = null;
    }
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    this.subscriptions.clear();
  }

  /**
   * Generic unsubscribe method (legacy compatibility)
   */
  static unsubscribe(subscription: any): void {
    if (subscription && typeof subscription.unsubscribe === 'function') {
      subscription.unsubscribe();
    }
  }
}