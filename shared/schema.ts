import { z } from 'zod';

// Discord Bot Configuration Schema
export const DiscordBotConfigSchema = z.object({
  id: z.string().default('discord_bot'),
  token: z.string().min(1, 'Discord bot token is required'),
  isConnected: z.boolean().default(false),
  autoStart: z.boolean().default(false),
  logCommands: z.boolean().default(true),
  guildCount: z.number().default(0),
  commandsExecuted: z.number().default(0),
  uptime: z.string().default('0m'),
  lastConnected: z.string().optional(),
});

// Minecraft Server Configuration Schema
export const MinecraftServerConfigSchema = z.object({
  id: z.string().default('minecraft_server'),
  serverIP: z.string().min(1, 'Server IP is required'),
  serverPort: z.string().min(1, 'Server port is required'),
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(4, 'Password must be at least 4 characters').optional(),
  shouldRegister: z.boolean().default(false),
  version: z.string().default('1.20.4'),
  platform: z.string().default('java'),
  autoReconnect: z.boolean().default(true),
  mode24_7: z.boolean().default(true),
  useWhitelist: z.boolean().default(false),
  isConnected: z.boolean().default(false),
  ping: z.string().default('N/A'),
  uptime: z.string().default('N/A'),
  playersOnline: z.string().default('0/0'),
  lastConnected: z.string().optional(),
});

// Bot Status Schema
export const BotStatusSchema = z.object({
  id: z.string().default('bot_status'),
  discordConnected: z.boolean().default(false),
  minecraftConnected: z.boolean().default(false),
  lastActivity: z.string().optional(),
  totalUptime: z.string().default('0m'),
});

// Console Command Schema
export const ConsoleCommandSchema = z.object({
  id: z.string(),
  command: z.string().min(1, 'Command is required'),
  timestamp: z.string(),
  response: z.string().optional(),
  success: z.boolean().default(false),
  requiresOp: z.boolean().default(true),
});

// Log Entry Schema
export const LogEntrySchema = z.object({
  id: z.string(),
  type: z.enum(['discord', 'minecraft', 'system', 'error']),
  level: z.enum(['info', 'warn', 'error', 'debug']),
  message: z.string(),
  timestamp: z.string(),
  details: z.string().optional(),
});

// Inventory Item Schema
export const InventoryItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  count: z.number(),
  slot: z.number().optional(),
  metadata: z.string().optional(),
});

// Aternos Configuration Schema
export const AternosConfigSchema = z.object({
  id: z.string().default('aternos_config'),
  username: z.string().min(1, 'Aternos username is required'),
  password: z.string().min(1, 'Aternos password is required'),
  serverName: z.string().optional(),
  isLoggedIn: z.boolean().default(false),
  lastLogin: z.string().optional(),
  serverStatus: z.enum(['offline', 'starting', 'online', 'stopping', 'unknown']).default('unknown'),
  autoStart: z.boolean().default(false),
  playerCount: z.string().default('0/20'),
  serverIP: z.string().optional(),
  version: z.string().optional(),
});

// Insert schemas using zod - make token optional for reconnection
export const insertDiscordBotConfigSchema = DiscordBotConfigSchema.omit({ id: true }).extend({
  token: z.string().optional(), // Allow optional token for reconnection
});
export const insertMinecraftServerConfigSchema = MinecraftServerConfigSchema.omit({ id: true });
export const insertBotStatusSchema = BotStatusSchema.omit({ id: true });
export const insertConsoleCommandSchema = ConsoleCommandSchema.omit({ id: true, timestamp: true });
export const insertLogEntrySchema = LogEntrySchema.omit({ id: true, timestamp: true });
export const insertInventoryItemSchema = InventoryItemSchema.omit({ id: true });
export const insertAternosConfigSchema = AternosConfigSchema.omit({ id: true });

// Types
export type DiscordBotConfig = z.infer<typeof DiscordBotConfigSchema>;
export type MinecraftServerConfig = z.infer<typeof MinecraftServerConfigSchema>;
export type BotStatus = z.infer<typeof BotStatusSchema>;
export type ConsoleCommand = z.infer<typeof ConsoleCommandSchema>;
export type LogEntry = z.infer<typeof LogEntrySchema>;
export type InventoryItem = z.infer<typeof InventoryItemSchema>;
export type AternosConfig = z.infer<typeof AternosConfigSchema>;

export type InsertDiscordBotConfig = z.infer<typeof insertDiscordBotConfigSchema>;
export type InsertMinecraftServerConfig = z.infer<typeof insertMinecraftServerConfigSchema>;
export type InsertBotStatus = z.infer<typeof insertBotStatusSchema>;
export type InsertConsoleCommand = z.infer<typeof insertConsoleCommandSchema>;
export type InsertLogEntry = z.infer<typeof insertLogEntrySchema>;
export type InsertInventoryItem = z.infer<typeof insertInventoryItemSchema>;
export type InsertAternosConfig = z.infer<typeof insertAternosConfigSchema>;