import fs from 'fs/promises';
import path from 'path';
import type {
  DiscordBotConfig,
  MinecraftServerConfig,
  BotStatus,
  ConsoleCommand,
  LogEntry,
  InventoryItem,
  AternosConfig,
  InsertDiscordBotConfig,
  InsertMinecraftServerConfig,
  InsertBotStatus,
  InsertConsoleCommand,
  InsertLogEntry,
  InsertInventoryItem,
  InsertAternosConfig,
} from "../shared/schema";
import { IStorage } from './storage';

interface StorageData {
  discordConfig: DiscordBotConfig | null;
  minecraftConfig: MinecraftServerConfig | null;
  botStatus: BotStatus | null;
  consoleCommands: ConsoleCommand[];
  logs: LogEntry[];
  inventory: InventoryItem[];
  aternosConfig: AternosConfig | null;
}

export class FileStorage implements IStorage {
  private readonly dataDir = './data';
  private readonly filePath = path.join(this.dataDir, 'state.json');
  private data: StorageData = {
    discordConfig: null,
    minecraftConfig: null,
    botStatus: null,
    consoleCommands: [],
    logs: [],
    inventory: [],
    aternosConfig: null,
  };
  private writeTimeout: NodeJS.Timeout | null = null;

  async init(): Promise<void> {
    try {
      // Create data directory if it doesn't exist
      await fs.mkdir(this.dataDir, { recursive: true });
      
      // Try to load existing data
      try {
        const fileContent = await fs.readFile(this.filePath, 'utf-8');
        this.data = JSON.parse(fileContent);
        console.log('📁 Loaded existing configuration from disk');
      } catch (error) {
        // File doesn't exist or is invalid, use defaults
        console.log('📁 Creating new configuration file');
        this.data.botStatus = {
          id: 'bot_status',
          discordConnected: false,
          minecraftConnected: false,
          totalUptime: '0m',
        };
        await this.persistData();
      }
    } catch (error) {
      console.error('Failed to initialize file storage:', error);
      throw error;
    }
  }

  private async persistData(): Promise<void> {
    // Debounce writes to avoid excessive disk I/O
    if (this.writeTimeout) {
      clearTimeout(this.writeTimeout);
    }

    this.writeTimeout = setTimeout(async () => {
      try {
        // Enforce data caps to keep file size manageable
        if (this.data.consoleCommands.length > 1000) {
          this.data.consoleCommands = this.data.consoleCommands.slice(-1000);
        }
        if (this.data.logs.length > 5000) {
          this.data.logs = this.data.logs.slice(-5000);
        }

        // Atomic write: write to temp file then rename
        const tempPath = this.filePath + '.tmp';
        await fs.writeFile(tempPath, JSON.stringify(this.data, null, 2), 'utf-8');
        await fs.rename(tempPath, this.filePath);
      } catch (error) {
        console.error('Failed to persist data:', error);
      }
    }, 200); // 200ms debounce
  }

  async getDiscordConfig(): Promise<DiscordBotConfig | null> {
    return this.data.discordConfig;
  }

  async saveDiscordConfig(config: InsertDiscordBotConfig): Promise<DiscordBotConfig> {
    this.data.discordConfig = { id: 'discord_bot', ...config };
    await this.persistData();
    return this.data.discordConfig;
  }

  async updateDiscordConfig(updates: Partial<DiscordBotConfig>): Promise<DiscordBotConfig> {
    if (!this.data.discordConfig) {
      throw new Error('Discord config not found');
    }
    
    // Preserve existing token if updates.token is undefined (security feature)
    if (updates.token === undefined && this.data.discordConfig.token) {
      updates = { ...updates, token: this.data.discordConfig.token };
    }
    
    this.data.discordConfig = { ...this.data.discordConfig, ...updates };
    await this.persistData();
    return this.data.discordConfig;
  }

  async getMinecraftConfig(): Promise<MinecraftServerConfig | null> {
    return this.data.minecraftConfig;
  }

  async saveMinecraftConfig(config: InsertMinecraftServerConfig): Promise<MinecraftServerConfig> {
    this.data.minecraftConfig = { id: 'minecraft_server', ...config };
    await this.persistData();
    return this.data.minecraftConfig;
  }

  async updateMinecraftConfig(updates: Partial<MinecraftServerConfig>): Promise<MinecraftServerConfig> {
    if (!this.data.minecraftConfig) {
      // If no config exists yet, create a default one and apply updates
      this.data.minecraftConfig = {
        id: 'minecraft_server',
        serverIP: '',
        serverPort: '25565',
        username: '',
        version: '1.20.4',
        platform: 'java',
        autoReconnect: true,
        mode24_7: true,
        useWhitelist: false,
        isConnected: false,
        ping: 'N/A',
        uptime: 'N/A',
        playersOnline: '0/0',
        shouldRegister: false,
        ...updates
      };
      await this.persistData();
      return this.data.minecraftConfig;
    }
    
    // Preserve existing password if updates.password is undefined (security feature)
    if (updates.password === undefined && this.data.minecraftConfig.password) {
      updates = { ...updates, password: this.data.minecraftConfig.password };
    }
    
    this.data.minecraftConfig = { ...this.data.minecraftConfig, ...updates };
    await this.persistData();
    return this.data.minecraftConfig;
  }

  async getBotStatus(): Promise<BotStatus | null> {
    return this.data.botStatus;
  }

  async updateBotStatus(status: InsertBotStatus): Promise<BotStatus> {
    this.data.botStatus = { id: 'bot_status', ...status };
    await this.persistData();
    return this.data.botStatus;
  }

  async getConsoleCommands(limit: number = 100): Promise<ConsoleCommand[]> {
    return this.data.consoleCommands.slice(-limit);
  }

  async addConsoleCommand(command: InsertConsoleCommand): Promise<ConsoleCommand> {
    const newCommand: ConsoleCommand = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      ...command,
    };
    this.data.consoleCommands.push(newCommand);
    await this.persistData();
    return newCommand;
  }

  async getLogs(type?: LogEntry['type'], limit: number = 100): Promise<LogEntry[]> {
    let filteredLogs = this.data.logs;
    if (type) {
      filteredLogs = this.data.logs.filter(log => log.type === type);
    }
    return filteredLogs.slice(-limit);
  }

  async addLog(log: InsertLogEntry): Promise<LogEntry> {
    const newLog: LogEntry = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toISOString(),
      ...log,
    };
    this.data.logs.push(newLog);
    await this.persistData();
    return newLog;
  }

  async clearLogs(type?: LogEntry['type']): Promise<void> {
    if (type) {
      this.data.logs = this.data.logs.filter(log => log.type !== type);
    } else {
      this.data.logs = [];
    }
    await this.persistData();
  }

  async getInventory(): Promise<InventoryItem[]> {
    return this.data.inventory;
  }

  async updateInventory(items: InventoryItem[]): Promise<void> {
    this.data.inventory = items;
    await this.persistData();
  }

  async getAternosConfig(): Promise<AternosConfig | null> {
    return this.data.aternosConfig;
  }

  async saveAternosConfig(config: InsertAternosConfig): Promise<AternosConfig> {
    this.data.aternosConfig = { id: 'aternos_config', ...config };
    await this.persistData();
    return this.data.aternosConfig;
  }

  async updateAternosConfig(updates: Partial<AternosConfig>): Promise<AternosConfig> {
    if (!this.data.aternosConfig) {
      throw new Error('Aternos config not found');
    }
    this.data.aternosConfig = { ...this.data.aternosConfig, ...updates };
    await this.persistData();
    return this.data.aternosConfig;
  }
}