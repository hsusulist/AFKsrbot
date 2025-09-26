import { z } from "zod";

// Simple interfaces for in-memory storage
export interface User {
  id: string;
  username: string;
  password: string;
}

export interface BotConfig {
  id: string;
  name: string;
  host: string;
  port: number;
  username: string;
  password?: string;
  version: string;
  createdAt: Date;
}

// Input schemas for creating new records
export const insertUserSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export const insertBotConfigSchema = z.object({
  name: z.string().min(1),
  host: z.string().min(1),
  port: z.number().min(1).max(65535).default(25565),
  username: z.string().min(1),
  password: z.string().optional(),
  version: z.string().default("1.21.1"),
});

// Runtime data schemas (for WebSocket and API responses)
export const botStatusSchema = z.object({
  isOnline: z.boolean(),
  isConnected: z.boolean(),
  health: z.number().min(0).max(100).nullable(),
  food: z.number().min(0).max(100).nullable(),
  position: z.object({
    x: z.number(),
    y: z.number(),
    z: z.number(),
  }).nullable(),
  uptime: z.string(),
  playersNearby: z.number(),
});

export const chatMessageSchema = z.object({
  id: z.string(),
  timestamp: z.string(),
  player: z.string(),
  message: z.string(),
  type: z.enum(['chat', 'bot', 'join', 'leave', 'system']),
});

export const playerSchema = z.object({
  id: z.string(),
  username: z.string(),
  ping: z.number(),
  isOperator: z.boolean(),
  distance: z.number(),
  lastSeen: z.string(),
});

export const inventoryItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  count: z.number(),
  slot: z.number(),
  type: z.enum(['weapon', 'armor', 'food', 'tool', 'block', 'misc']),
});

export const serverInfoSchema = z.object({
  host: z.string(),
  port: z.number(),
  isConnected: z.boolean(),
  playerCount: z.number(),
  maxPlayers: z.number(),
  ping: z.number(),
  version: z.string(),
});

export const botStatsSchema = z.object({
  messagesReceived: z.number(),
  greetingsSent: z.number(),
  distanceWalked: z.number(),
  playersGreeted: z.number(),
  uptimePercentage: z.number(),
  interactionsToday: z.number(),
});

// Type exports
export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertBotConfig = z.infer<typeof insertBotConfigSchema>;
export type BotStatus = z.infer<typeof botStatusSchema>;
export type ChatMessage = z.infer<typeof chatMessageSchema>;
export type Player = z.infer<typeof playerSchema>;
export type InventoryItem = z.infer<typeof inventoryItemSchema>;
export type ServerInfo = z.infer<typeof serverInfoSchema>;
export type BotStats = z.infer<typeof botStatsSchema>;