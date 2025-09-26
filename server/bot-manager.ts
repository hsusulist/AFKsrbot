import mineflayer, { Bot } from 'mineflayer';
import { EventEmitter } from 'events';
import { 
  type BotConfig, 
  type BotStatus, 
  type ChatMessage, 
  type Player, 
  type InventoryItem,
  type ServerInfo,
  type BotStats 
} from '@shared/schema';

export interface BotEvents {
  statusUpdate: (status: BotStatus) => void;
  chatMessage: (message: ChatMessage) => void;
  playerUpdate: (players: Player[]) => void;
  inventoryUpdate: (items: InventoryItem[]) => void;
  serverInfoUpdate: (info: ServerInfo) => void;
  error: (error: string) => void;
}

export class MinecraftBot extends EventEmitter {
  private bot: Bot | null = null;
  private config: BotConfig | null = null;
  private isConnecting: boolean = false;
  private startTime: Date | null = null;
  private statusInterval: NodeJS.Timeout | null = null;
  private lastPosition: { x: number; y: number; z: number } | null = null;
  private dailyResetTime: Date;
  private stats: BotStats = {
    messagesReceived: 0,
    greetingsSent: 0,
    distanceWalked: 0,
    playersGreeted: 0,
    uptimePercentage: 0,
    interactionsToday: 0
  };
  private rawDistanceWalked: number = 0;
  private chatHistory: ChatMessage[] = [];
  private knownPlayers = new Set<string>();

  constructor() {
    super();
    this.dailyResetTime = this.getNextMidnight();
  }

  async connect(config: BotConfig): Promise<void> {
    if (this.isConnecting || this.isConnected()) {
      throw new Error('Bot is already connecting or connected');
    }

    this.isConnecting = true;
    this.config = config;

    try {
      console.log(`Connecting bot "${config.username}" to ${config.host}:${config.port}`);
      
      this.bot = mineflayer.createBot({
        host: config.host,
        port: config.port,
        username: config.username,
        password: config.password,
        version: config.version,
        auth: config.password ? 'microsoft' : 'offline'
      });

      this.setupBotEventHandlers();
      
      // Wait for spawn or error
      await new Promise<void>((resolve, reject) => {
        const onSpawn = () => {
          this.bot?.removeListener('error', onError);
          this.startTime = new Date();
          this.isConnecting = false;
          console.log(`Bot "${config.username}" successfully connected and spawned`);
          resolve();
        };

        const onError = (error: Error) => {
          this.bot?.removeListener('spawn', onSpawn);
          this.isConnecting = false;
          reject(error);
        };

        this.bot?.once('spawn', onSpawn);
        this.bot?.once('error', onError);
      });

    } catch (error) {
      this.isConnecting = false;
      this.bot = null;
      throw error;
    }
  }

  disconnect(): void {
    if (this.bot) {
      console.log('Disconnecting bot...');
      this.bot.quit('Bot disconnected by user');
      this.bot = null;
      this.startTime = null;
      this.isConnecting = false;
      
      // Clear periodic updates to prevent memory leaks
      if (this.statusInterval) {
        clearInterval(this.statusInterval);
        this.statusInterval = null;
      }
      
      this.emitStatusUpdate();
    }
  }

  restart(): void {
    if (this.config) {
      this.disconnect();
      setTimeout(() => {
        this.connect(this.config!).catch(error => {
          console.error('Failed to restart bot:', error);
          this.emit('error', error.message);
        });
      }, 2000);
    }
  }

  isConnected(): boolean {
    return this.bot !== null && this.bot.player !== undefined;
  }

  getIsConnecting(): boolean {
    return this.isConnecting;
  }

  getCurrentStatus(): BotStatus {
    if (!this.bot || !this.isConnected()) {
      return {
        isOnline: false,
        isConnected: false,
        health: null,
        food: null,
        position: null,
        uptime: '0s',
        playersNearby: 0
      };
    }

    const health = this.bot.health ? Math.round((this.bot.health / 20) * 100) : null;
    const food = this.bot.food ? Math.round((this.bot.food / 20) * 100) : null;
    const position = this.bot.entity?.position ? {
      x: Math.round(this.bot.entity.position.x),
      y: Math.round(this.bot.entity.position.y),
      z: Math.round(this.bot.entity.position.z)
    } : null;

    const uptime = this.startTime ? this.formatUptime(Date.now() - this.startTime.getTime()) : '0s';
    const playersNearby = this.countNearbyPlayers();

    return {
      isOnline: true,
      isConnected: true,
      health,
      food,
      position,
      uptime,
      playersNearby
    };
  }

  getServerInfo(): ServerInfo | null {
    if (!this.config) return null;

    return {
      host: this.config.host,
      port: this.config.port,
      isConnected: this.isConnected(),
      playerCount: this.bot ? Object.keys(this.bot.players).length : 0,
      maxPlayers: 100, // Default, could be retrieved from server ping
      ping: this.bot?.player?.ping || 0,
      version: this.config.version
    };
  }

  getStats(): BotStats {
    if (this.startTime) {
      const totalTime = Date.now() - this.startTime.getTime();
      const connectedTime = this.isConnected() ? totalTime : 0;
      this.stats.uptimePercentage = Math.round((connectedTime / totalTime) * 100);
    }
    
    // Round raw distance for display
    this.stats.distanceWalked = Math.round(this.rawDistanceWalked);
    
    return { ...this.stats };
  }

  getChatHistory(): ChatMessage[] {
    return [...this.chatHistory];
  }

  getPlayers(): Player[] {
    if (!this.bot || !this.isConnected()) return [];

    return Object.values(this.bot.players)
      .filter(player => player.entity && player.username !== this.bot!.username)
      .map(player => ({
        id: player.uuid,
        username: player.username,
        ping: player.ping,
        isOperator: false, // Would need to track this separately
        distance: this.calculateDistance(player.entity!.position),
        lastSeen: 'online'
      }));
  }

  getInventory(): InventoryItem[] {
    if (!this.bot || !this.isConnected()) return [];

    const items: InventoryItem[] = [];
    
    // Get items from main inventory slots (9-44)
    for (let slot = 9; slot < 45; slot++) {
      const item = this.bot.inventory.slots[slot];
      if (item) {
        items.push({
          id: `${slot}-${item.type}`,
          name: item.displayName || item.name,
          count: item.count,
          slot: slot - 9,
          type: this.categorizeItem(item.name)
        });
      }
    }

    return items;
  }

  sendChat(message: string): void {
    if (this.bot && this.isConnected()) {
      this.bot.chat(message);
      
      // Add to chat history
      this.addChatMessage({
        id: Date.now().toString(),
        timestamp: new Date().toLocaleTimeString(),
        player: this.config?.username || 'Bot',
        message,
        type: 'bot'
      });
    }
  }

  private setupBotEventHandlers(): void {
    if (!this.bot) return;

    this.bot.on('spawn', () => {
      console.log('Bot spawned in the world');
      this.lastPosition = this.bot!.entity?.position ? {
        x: this.bot!.entity.position.x,
        y: this.bot!.entity.position.y,
        z: this.bot!.entity.position.z
      } : null;
      this.emitStatusUpdate();
      this.emit('inventoryUpdate', this.getInventory());
    });

    this.bot.on('health', () => {
      this.emitStatusUpdate();
    });

    // Track movement for distance calculation
    this.bot.on('move', () => {
      this.updateDistanceWalked();
    });

    // Track inventory changes
    (this.bot as any).on('windowUpdate', () => {
      this.emit('inventoryUpdate', this.getInventory());
    });

    (this.bot as any).on('heldItemChanged', () => {
      this.emit('inventoryUpdate', this.getInventory());
    });

    this.bot.on('chat', (username, message) => {
      this.checkDailyReset();
      this.stats.messagesReceived++;
      this.stats.interactionsToday++;
      
      const chatMessage: ChatMessage = {
        id: Date.now().toString(),
        timestamp: new Date().toLocaleTimeString(),
        player: username,
        message,
        type: 'chat'
      };
      
      this.addChatMessage(chatMessage);
      this.emit('chatMessage', chatMessage);

      // Auto-greet new players
      if (!this.knownPlayers.has(username) && username !== this.bot!.username) {
        this.knownPlayers.add(username);
        this.stats.playersGreeted++;
        
        setTimeout(() => {
          this.sendChat(`Hello ${username}! Welcome to the server!`);
          this.checkDailyReset();
          this.stats.greetingsSent++;
          this.stats.interactionsToday++;
        }, 1000 + Math.random() * 2000); // Random delay 1-3 seconds
      }
    });

    this.bot.on('playerJoined', (player) => {
      const joinMessage: ChatMessage = {
        id: Date.now().toString(),
        timestamp: new Date().toLocaleTimeString(),
        player: 'Server',
        message: `${player.username} joined the game`,
        type: 'join'
      };
      
      this.addChatMessage(joinMessage);
      this.emit('chatMessage', joinMessage);
      this.emit('playerUpdate', this.getPlayers());
    });

    this.bot.on('playerLeft', (player) => {
      const leaveMessage: ChatMessage = {
        id: Date.now().toString(),
        timestamp: new Date().toLocaleTimeString(),
        player: 'Server',
        message: `${player.username} left the game`,
        type: 'leave'
      };
      
      this.addChatMessage(leaveMessage);
      this.emit('chatMessage', leaveMessage);
      this.emit('playerUpdate', this.getPlayers());
    });

    this.bot.on('error', (error) => {
      console.error('Bot error:', error);
      this.emit('error', error.message);
      this.emitStatusUpdate();
    });

    this.bot.on('end', () => {
      console.log('Bot disconnected');
      if (this.statusInterval) {
        clearInterval(this.statusInterval);
        this.statusInterval = null;
      }
      this.emitStatusUpdate();
    });

    // Setup periodic status updates (clear any existing first)
    if (this.statusInterval) {
      clearInterval(this.statusInterval);
    }
    
    this.statusInterval = setInterval(() => {
      if (this.isConnected()) {
        this.emitStatusUpdate();
        this.emit('serverInfoUpdate', this.getServerInfo()!);
        this.emit('playerUpdate', this.getPlayers());
        this.emit('inventoryUpdate', this.getInventory());
      }
    }, 5000); // Every 5 seconds
  }

  private emitStatusUpdate(): void {
    this.emit('statusUpdate', this.getCurrentStatus());
  }

  private addChatMessage(message: ChatMessage): void {
    this.chatHistory.push(message);
    
    // Keep only last 100 messages
    if (this.chatHistory.length > 100) {
      this.chatHistory = this.chatHistory.slice(-100);
    }
  }

  private countNearbyPlayers(): number {
    if (!this.bot || !this.bot.entity?.position) return 0;
    
    return Object.values(this.bot.players)
      .filter(player => 
        player.entity && 
        player.username !== this.bot!.username &&
        this.calculateDistance(player.entity.position) <= 50
      ).length;
  }

  private calculateDistance(pos: any): number {
    if (!this.bot?.entity?.position) return 0;
    
    const dx = pos.x - this.bot.entity.position.x;
    const dy = pos.y - this.bot.entity.position.y;
    const dz = pos.z - this.bot.entity.position.z;
    
    return Math.round(Math.sqrt(dx * dx + dy * dy + dz * dz));
  }

  private formatUptime(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }

  private categorizeItem(itemName: string): 'weapon' | 'armor' | 'food' | 'tool' | 'block' | 'misc' {
    const name = itemName.toLowerCase();
    
    if (name.includes('sword') || name.includes('bow') || name.includes('arrow')) {
      return 'weapon';
    }
    if (name.includes('helmet') || name.includes('chestplate') || name.includes('leggings') || name.includes('boots')) {
      return 'armor';
    }
    if (name.includes('bread') || name.includes('beef') || name.includes('pork') || name.includes('chicken') || name.includes('apple')) {
      return 'food';
    }
    if (name.includes('pickaxe') || name.includes('axe') || name.includes('shovel') || name.includes('hoe')) {
      return 'tool';
    }
    if (name.includes('stone') || name.includes('dirt') || name.includes('wood') || name.includes('plank')) {
      return 'block';
    }
    
    return 'misc';
  }

  private updateDistanceWalked(): void {
    if (!this.bot?.entity?.position || !this.lastPosition) return;

    const current = this.bot.entity.position;
    const dx = current.x - this.lastPosition.x;
    const dy = current.y - this.lastPosition.y;
    const dz = current.z - this.lastPosition.z;
    
    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
    this.rawDistanceWalked += distance; // Accumulate raw float distance
    
    this.lastPosition = {
      x: current.x,
      y: current.y,
      z: current.z
    };
  }

  private checkDailyReset(): void {
    const now = new Date();
    if (now >= this.dailyResetTime) {
      // Reset daily stats
      this.stats.interactionsToday = 0;
      this.dailyResetTime = this.getNextMidnight();
    }
  }

  private getNextMidnight(): Date {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    return tomorrow;
  }
}

// Singleton bot manager
export const botManager = new MinecraftBot();