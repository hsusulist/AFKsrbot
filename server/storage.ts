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

export interface IStorage {
  // Discord Bot Config
  getDiscordConfig(): Promise<DiscordBotConfig | null>;
  saveDiscordConfig(config: InsertDiscordBotConfig): Promise<DiscordBotConfig>;
  updateDiscordConfig(updates: Partial<DiscordBotConfig>): Promise<DiscordBotConfig>;
  
  // Minecraft Server Config
  getMinecraftConfig(): Promise<MinecraftServerConfig | null>;
  saveMinecraftConfig(config: InsertMinecraftServerConfig): Promise<MinecraftServerConfig>;
  updateMinecraftConfig(updates: Partial<MinecraftServerConfig>): Promise<MinecraftServerConfig>;
  
  // Bot Status
  getBotStatus(): Promise<BotStatus | null>;
  updateBotStatus(status: InsertBotStatus): Promise<BotStatus>;
  
  // Console Commands
  getConsoleCommands(limit?: number): Promise<ConsoleCommand[]>;
  addConsoleCommand(command: InsertConsoleCommand): Promise<ConsoleCommand>;
  
  // Logs
  getLogs(type?: LogEntry['type'], limit?: number): Promise<LogEntry[]>;
  addLog(log: InsertLogEntry): Promise<LogEntry>;
  clearLogs(type?: LogEntry['type']): Promise<void>;
  
  // Inventory
  getInventory(): Promise<InventoryItem[]>;
  updateInventory(items: InventoryItem[]): Promise<void>;
  
  // Aternos Config
  getAternosConfig(): Promise<AternosConfig | null>;
  saveAternosConfig(config: InsertAternosConfig): Promise<AternosConfig>;
  updateAternosConfig(updates: Partial<AternosConfig>): Promise<AternosConfig>;
  
  // Initialize storage
  init(): Promise<void>;
}

export class MemStorage implements IStorage {
  private discordConfig: DiscordBotConfig | null = null;
  private minecraftConfig: MinecraftServerConfig | null = null;
  private botStatus: BotStatus | null = null;
  private consoleCommands: ConsoleCommand[] = [];
  private logs: LogEntry[] = [];
  private inventory: InventoryItem[] = [];
  private aternosConfig: AternosConfig | null = null;

  async init(): Promise<void> {
    // Initialize with default values
    this.botStatus = {
      id: 'bot_status',
      discordConnected: false,
      minecraftConnected: false,
      totalUptime: '0m',
    };
  }

  async getDiscordConfig(): Promise<DiscordBotConfig | null> {
    return this.discordConfig;
  }

  async saveDiscordConfig(config: InsertDiscordBotConfig): Promise<DiscordBotConfig> {
    this.discordConfig = { id: 'discord_bot', ...config };
    return this.discordConfig;
  }

  async updateDiscordConfig(updates: Partial<DiscordBotConfig>): Promise<DiscordBotConfig> {
    if (!this.discordConfig) {
      throw new Error('Discord config not found');
    }
    this.discordConfig = { ...this.discordConfig, ...updates };
    return this.discordConfig;
  }

  async getMinecraftConfig(): Promise<MinecraftServerConfig | null> {
    return this.minecraftConfig;
  }

  async saveMinecraftConfig(config: InsertMinecraftServerConfig): Promise<MinecraftServerConfig> {
    this.minecraftConfig = { id: 'minecraft_server', ...config };
    return this.minecraftConfig;
  }

  async updateMinecraftConfig(updates: Partial<MinecraftServerConfig>): Promise<MinecraftServerConfig> {
    if (!this.minecraftConfig) {
      throw new Error('Minecraft config not found');
    }
    this.minecraftConfig = { ...this.minecraftConfig, ...updates };
    return this.minecraftConfig;
  }

  async getBotStatus(): Promise<BotStatus | null> {
    return this.botStatus;
  }

  async updateBotStatus(status: InsertBotStatus): Promise<BotStatus> {
    this.botStatus = { id: 'bot_status', ...status };
    return this.botStatus;
  }

  async getConsoleCommands(limit: number = 100): Promise<ConsoleCommand[]> {
    return this.consoleCommands.slice(-limit);
  }

  async addConsoleCommand(command: InsertConsoleCommand): Promise<ConsoleCommand> {
    const newCommand: ConsoleCommand = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      ...command,
    };
    this.consoleCommands.push(newCommand);
    
    // Keep only last 1000 commands
    if (this.consoleCommands.length > 1000) {
      this.consoleCommands = this.consoleCommands.slice(-1000);
    }
    
    return newCommand;
  }

  async getLogs(type?: LogEntry['type'], limit: number = 100): Promise<LogEntry[]> {
    let filteredLogs = this.logs;
    if (type) {
      filteredLogs = this.logs.filter(log => log.type === type);
    }
    return filteredLogs.slice(-limit);
  }

  async addLog(log: InsertLogEntry): Promise<LogEntry> {
    const newLog: LogEntry = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toISOString(),
      ...log,
    };
    this.logs.push(newLog);
    
    // Keep only last 5000 logs
    if (this.logs.length > 5000) {
      this.logs = this.logs.slice(-5000);
    }
    
    return newLog;
  }

  async clearLogs(type?: LogEntry['type']): Promise<void> {
    if (type) {
      this.logs = this.logs.filter(log => log.type !== type);
    } else {
      this.logs = [];
    }
  }

  async getInventory(): Promise<InventoryItem[]> {
    return this.inventory;
  }

  async updateInventory(items: InventoryItem[]): Promise<void> {
    this.inventory = items;
  }

  async getAternosConfig(): Promise<AternosConfig | null> {
    return this.aternosConfig;
  }

  async saveAternosConfig(config: InsertAternosConfig): Promise<AternosConfig> {
    this.aternosConfig = { id: 'aternos_config', ...config };
    return this.aternosConfig;
  }

  async updateAternosConfig(updates: Partial<AternosConfig>): Promise<AternosConfig> {
    if (!this.aternosConfig) {
      throw new Error('Aternos config not found');
    }
    this.aternosConfig = { ...this.aternosConfig, ...updates };
    return this.aternosConfig;
  }
}