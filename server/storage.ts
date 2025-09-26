import { type User, type InsertUser, type BotConfig, type InsertBotConfig } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // User management
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Bot configuration management
  getBotConfig(id: string): Promise<BotConfig | undefined>;
  getAllBotConfigs(): Promise<BotConfig[]>;
  createBotConfig(config: InsertBotConfig): Promise<BotConfig>;
  updateBotConfig(id: string, updates: Partial<InsertBotConfig>): Promise<BotConfig | undefined>;
  deleteBotConfig(id: string): Promise<boolean>;
  getActiveBotConfig(): Promise<BotConfig | undefined>;
  setActiveBotConfig(id: string): Promise<BotConfig | undefined>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private botConfigs: Map<string, BotConfig>;
  private activeBotConfigId: string | undefined;

  constructor() {
    this.users = new Map();
    this.botConfigs = new Map();
    this.activeBotConfigId = undefined;
  }

  // User methods
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // Bot configuration methods
  async getBotConfig(id: string): Promise<BotConfig | undefined> {
    return this.botConfigs.get(id);
  }

  async getAllBotConfigs(): Promise<BotConfig[]> {
    return Array.from(this.botConfigs.values());
  }

  async createBotConfig(insertConfig: InsertBotConfig): Promise<BotConfig> {
    const id = randomUUID();
    const config: BotConfig = { 
      ...insertConfig, 
      id, 
      createdAt: new Date() 
    };
    this.botConfigs.set(id, config);
    
    // If this is the first config, make it active
    if (this.botConfigs.size === 1) {
      this.activeBotConfigId = id;
    }
    
    return config;
  }

  async updateBotConfig(id: string, updates: Partial<InsertBotConfig>): Promise<BotConfig | undefined> {
    const existing = this.botConfigs.get(id);
    if (!existing) return undefined;

    const updated: BotConfig = { 
      ...existing, 
      ...updates 
    };
    this.botConfigs.set(id, updated);
    return updated;
  }

  async deleteBotConfig(id: string): Promise<boolean> {
    const deleted = this.botConfigs.delete(id);
    
    // If we deleted the active config, clear the active reference
    if (this.activeBotConfigId === id) {
      this.activeBotConfigId = undefined;
      
      // Set a new active config if any exist
      const remaining = Array.from(this.botConfigs.keys());
      if (remaining.length > 0) {
        this.activeBotConfigId = remaining[0];
      }
    }
    
    return deleted;
  }

  async getActiveBotConfig(): Promise<BotConfig | undefined> {
    if (!this.activeBotConfigId) return undefined;
    return this.botConfigs.get(this.activeBotConfigId);
  }

  async setActiveBotConfig(id: string): Promise<BotConfig | undefined> {
    const config = this.botConfigs.get(id);
    if (!config) return undefined;
    
    this.activeBotConfigId = id;
    return config;
  }
}

export const storage = new MemStorage();
