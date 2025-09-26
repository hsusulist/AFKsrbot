import { io, Socket } from 'socket.io-client';
import type { BotStatus, ChatMessage, Player, InventoryItem, ServerInfo, BotStats } from '@shared/schema';

class SocketManager {
  private socket: Socket | null = null;
  private listeners: Map<string, ((data: any) => void)[]> = new Map();
  private serverHandlersSetup: boolean = false;

  connect() {
    if (this.socket && this.socket.connected) return this.socket;

    // Clean up previous connection if exists
    if (this.socket) {
      this.socket.disconnect();
      this.serverHandlersSetup = false; // Reset flag when disconnecting old socket
    }

    // Let Socket.IO automatically connect to the same origin (more robust for different deployment scenarios)
    this.socket = io({
      transports: ['websocket', 'polling'],
      withCredentials: true // Include credentials for authenticated requests
    });

    this.socket.on('connect', () => {
      console.log('Connected to WebSocket server');
    });

    this.socket.on('disconnect', () => {
      console.log('Disconnected from WebSocket server');
    });

    // Set up server event handlers for the new socket
    this.setupServerEventHandlers();
    this.serverHandlersSetup = true;

    return this.socket;
  }

  private setupServerEventHandlers() {
    if (!this.socket) return;

    // Set up event forwarding
    this.socket.on('botStatus', (data: BotStatus) => {
      this.emit('botStatus', data);
    });

    this.socket.on('chatMessage', (data: ChatMessage) => {
      this.emit('chatMessage', data);
    });

    this.socket.on('players', (data: Player[]) => {
      this.emit('players', data);
    });

    this.socket.on('inventory', (data: InventoryItem[]) => {
      this.emit('inventory', data);
    });

    this.socket.on('serverInfo', (data: ServerInfo) => {
      this.emit('serverInfo', data);
    });

    this.socket.on('chatHistory', (data: ChatMessage[]) => {
      this.emit('chatHistory', data);
    });

    this.socket.on('botError', (error: string) => {
      this.emit('botError', error);
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.listeners.clear();
    this.serverHandlersSetup = false; // Reset to allow fresh setup on reconnect
  }

  on(event: string, callback: (data: any) => void) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  off(event: string, callback: (data: any) => void) {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      const index = eventListeners.indexOf(callback);
      if (index > -1) {
        eventListeners.splice(index, 1);
      }
    }
  }

  private emit(event: string, data: any) {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach(callback => callback(data));
    }
  }

  requestBotStatus() {
    if (this.socket) {
      this.socket.emit('requestBotStatus');
    }
  }

  requestStats() {
    if (this.socket) {
      this.socket.emit('requestStats');
    }
  }

  requestChatHistory() {
    if (this.socket) {
      this.socket.emit('requestChatHistory');
    }
  }
}

export const socketManager = new SocketManager();