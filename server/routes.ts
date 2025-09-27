import express from 'express';
import { Client, GatewayIntentBits } from 'discord.js';
import mineflayer from 'mineflayer';
import { IStorage } from './storage';
import { 
  insertDiscordBotConfigSchema, 
  insertMinecraftServerConfigSchema, 
  insertConsoleCommandSchema,
  insertLogEntrySchema 
} from '../shared/schema';

export function createRoutes(storage: IStorage) {
  const router = express.Router();
  
  // Discord Bot instance
  let discordBot: Client | null = null;
  let minecraftBot: any = null; // mineflayer bot

  // Helper function to add logs
  const addLog = async (type: 'discord' | 'minecraft' | 'system' | 'error', level: 'info' | 'warn' | 'error' | 'debug', message: string, details?: string) => {
    await storage.addLog({
      type,
      level,
      message,
      details,
    });
  };

  // Discord Routes - NEVER return sensitive data like tokens
  router.get('/api/discord/config', async (req, res) => {
    try {
      const config = await storage.getDiscordConfig();
      if (!config) {
        return res.json({ isConnected: false });
      }
      
      // Return only non-sensitive data
      const safeConfig = {
        isConnected: config.isConnected,
        autoStart: config.autoStart,
        logCommands: config.logCommands,
        guildCount: config.guildCount,
        commandsExecuted: config.commandsExecuted,
        uptime: config.uptime,
        lastConnected: config.lastConnected,
      };
      
      res.json(safeConfig);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get Discord config' });
    }
  });

  router.post('/api/discord/connect', async (req, res) => {
    try {
      const { token, autoStart, logCommands } = insertDiscordBotConfigSchema.parse(req.body);
      
      if (!token) {
        return res.status(400).json({ error: 'Discord bot token is required' });
      }

      // Disconnect existing bot if any
      if (discordBot) {
        discordBot.destroy();
        discordBot = null;
      }

      // Create new Discord client
      discordBot = new Client({
        intents: [
          GatewayIntentBits.Guilds,
          GatewayIntentBits.GuildMessages,
          GatewayIntentBits.MessageContent,
          GatewayIntentBits.GuildMembers,
        ]
      });

      // Setup event handlers
      discordBot.on('ready', async () => {
        if (!discordBot?.user) return;
        
        await addLog('discord', 'info', `Discord bot logged in as ${discordBot.user.tag}`);
        
        // Update config with connection status
        const config = await storage.saveDiscordConfig({
          token,
          isConnected: true,
          autoStart,
          logCommands,
          guildCount: discordBot.guilds.cache.size,
          commandsExecuted: 0,
          uptime: '0m',
          lastConnected: new Date().toISOString(),
        });

        // Update bot status
        await storage.updateBotStatus({
          discordConnected: true,
          minecraftConnected: (await storage.getBotStatus())?.minecraftConnected || false,
          lastActivity: new Date().toISOString(),
          totalUptime: '0m',
        });
      });

      discordBot.on('messageCreate', async (message) => {
        if (message.author.bot) return;
        
        // Handle bot commands
        if (message.content.startsWith('/')) {
          const command = message.content.slice(1).split(' ')[0];
          const args = message.content.slice(1).split(' ').slice(1);
          
          await addLog('discord', 'info', `Command received: /${command}`, `From: ${message.author.tag}`);
          
          switch (command) {
            case 'status':
              const config = await storage.getDiscordConfig();
              const mcConfig = await storage.getMinecraftConfig();
              message.reply(`🤖 Bot Status:\n📱 Discord: ${config?.isConnected ? 'Connected' : 'Disconnected'}\n🎮 Minecraft: ${mcConfig?.isConnected ? 'Connected' : 'Disconnected'}`);
              break;
              
            case 'inventory':
              const inventory = await storage.getInventory();
              const inventoryText = inventory.length > 0 
                ? inventory.map(item => `${item.name}: ${item.count}`).join('\n')
                : 'Inventory is empty';
              message.reply(`🎒 Bot Inventory:\n\`\`\`${inventoryText}\`\`\``);
              break;
              
            case 'command':
              if (!minecraftBot) {
                message.reply('❌ Minecraft bot is not connected');
                return;
              }
              if (args.length === 0) {
                message.reply('❌ Please provide a command to execute');
                return;
              }
              const mcCommand = args.join(' ');
              try {
                minecraftBot.chat(`/${mcCommand}`);
                message.reply(`✅ Executed command: \`/${mcCommand}\``);
                await addLog('minecraft', 'info', `Command executed: /${mcCommand}`, `Via Discord by ${message.author.tag}`);
              } catch (error) {
                message.reply('❌ Failed to execute command');
                await addLog('error', 'error', `Failed to execute command: ${mcCommand}`, error.message);
              }
              break;
              
            default:
              message.reply('❓ Unknown command. Available: /status, /inventory, /command <cmd>');
          }
          
          // Update command count
          const currentConfig = await storage.getDiscordConfig();
          if (currentConfig) {
            await storage.updateDiscordConfig({
              commandsExecuted: (currentConfig.commandsExecuted || 0) + 1,
            });
          }
        }
      });

      discordBot.on('error', async (error) => {
        await addLog('discord', 'error', `Discord bot error: ${error.message}`);
        console.error('Discord bot error:', error);
        
        // If it's a critical error, clear logs and disconnect
        if (error.message.includes('TOKEN') || error.message.includes('INVALID') || error.message.includes('UNAUTHORIZED')) {
          await storage.updateDiscordConfig({ isConnected: false });
          await storage.clearLogs('discord');
        }
      });

      // Login to Discord
      await discordBot.login(token);
      
      res.json({ success: true, message: 'Discord bot connection started' });
      
    } catch (error) {
      await addLog('discord', 'error', `Failed to connect Discord bot: ${error.message}`);
      res.status(500).json({ error: 'Failed to connect Discord bot', details: error.message });
    }
  });

  router.post('/api/discord/disconnect', async (req, res) => {
    try {
      if (discordBot) {
        discordBot.destroy();
        discordBot = null;
        
        await storage.updateDiscordConfig({ isConnected: false });
        await storage.updateBotStatus({
          discordConnected: false,
          minecraftConnected: (await storage.getBotStatus())?.minecraftConnected || false,
          lastActivity: new Date().toISOString(),
          totalUptime: (await storage.getBotStatus())?.totalUptime || '0m',
        });
        
        await addLog('discord', 'info', 'Discord bot disconnected');
        // Clear Discord logs when disconnected
        await storage.clearLogs('discord');
      }
      
      res.json({ success: true, message: 'Discord bot disconnected' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to disconnect Discord bot' });
    }
  });

  // Minecraft Routes - NEVER return sensitive data like passwords
  router.get('/api/minecraft/config', async (req, res) => {
    try {
      const config = await storage.getMinecraftConfig();
      if (!config) {
        return res.json({ isConnected: false });
      }
      
      // Return only non-sensitive data
      const safeConfig = {
        serverIP: config.serverIP,
        serverPort: config.serverPort,
        username: config.username,
        // NEVER return password
        shouldRegister: config.shouldRegister,
        version: config.version,
        platform: config.platform,
        autoReconnect: config.autoReconnect,
        mode24_7: config.mode24_7,
        useWhitelist: config.useWhitelist,
        isConnected: config.isConnected,
        ping: config.ping,
        uptime: config.uptime,
        playersOnline: config.playersOnline,
        lastConnected: config.lastConnected,
      };
      
      res.json(safeConfig);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get Minecraft config' });
    }
  });

  router.post('/api/minecraft/connect', async (req, res) => {
    try {
      const config = insertMinecraftServerConfigSchema.parse(req.body);
      
      if (!config.serverIP || !config.serverPort || !config.username) {
        return res.status(400).json({ error: 'Server IP, port, and username are required' });
      }

      if (config.password && config.password.length < 4) {
        return res.status(400).json({ error: 'Password must be at least 4 characters' });
      }

      // Disconnect existing bot if any
      if (minecraftBot) {
        minecraftBot.quit();
        minecraftBot = null;
      }

      // Create Minecraft bot
      const botOptions: any = {
        host: config.serverIP,
        port: parseInt(config.serverPort),
        username: config.username,
        version: config.version,
      };

      // Add auth if password provided
      if (config.password) {
        if (config.shouldRegister) {
          // Registration logic would depend on server plugin
          await addLog('minecraft', 'info', `Attempting to register with username: ${config.username}`);
        }
        // Password will be used for login after connecting
      }

      minecraftBot = mineflayer.createBot(botOptions);

      // Setup event handlers
      minecraftBot.on('spawn', async () => {
        await addLog('minecraft', 'info', `Minecraft bot spawned as ${config.username}`);
        
        // Handle password login/register
        if (config.password) {
          if (config.shouldRegister) {
            minecraftBot.chat(`/register ${config.password} ${config.password}`);
            await addLog('minecraft', 'info', 'Attempting to register with password');
          } else {
            minecraftBot.chat(`/login ${config.password}`);
            await addLog('minecraft', 'info', 'Attempting to login with password');
          }
        }
        
        // Save config
        await storage.saveMinecraftConfig({
          ...config,
          isConnected: true,
          ping: '0ms',
          uptime: '0m',
          playersOnline: minecraftBot.players ? Object.keys(minecraftBot.players).length + '/100' : '1/100',
          lastConnected: new Date().toISOString(),
        });

        // Update bot status
        await storage.updateBotStatus({
          discordConnected: (await storage.getBotStatus())?.discordConnected || false,
          minecraftConnected: true,
          lastActivity: new Date().toISOString(),
          totalUptime: '0m',
        });
      });

      minecraftBot.on('chat', async (username, message) => {
        if (username === minecraftBot.username) return;
        await addLog('minecraft', 'info', `<${username}> ${message}`);
        
        // Forward to Discord if bot is connected
        if (discordBot && discordBot.user) {
          const guilds = discordBot.guilds.cache;
          guilds.forEach(guild => {
            const channel = guild.channels.cache.find(ch => ch.name === 'minecraft-chat' || ch.name === 'general');
            if (channel && channel.type === 0) { // Text channel
              (channel as any).send(`[MC] <${username}> ${message}`);
            }
          });
        }
      });

      minecraftBot.on('health', async () => {
        if (minecraftBot.health <= 5) {
          await addLog('minecraft', 'warn', `Low health: ${minecraftBot.health}/20`);
        }
      });

      minecraftBot.on('death', async () => {
        await addLog('minecraft', 'warn', 'Bot died! Respawning...');
        minecraftBot.respawn();
      });

      minecraftBot.on('kicked', async (reason) => {
        await addLog('minecraft', 'error', `Bot was kicked: ${reason}`);
        await storage.updateMinecraftConfig({ isConnected: false });
        // Clear Minecraft logs when kicked
        await storage.clearLogs('minecraft');
      });

      minecraftBot.on('error', async (err) => {
        await addLog('minecraft', 'error', `Minecraft bot error: ${err.message}`);
        console.error('Minecraft bot error:', err);
      });

      minecraftBot.on('end', async () => {
        await addLog('minecraft', 'info', 'Minecraft bot disconnected');
        await storage.updateMinecraftConfig({ isConnected: false });
        // Clear Minecraft logs when connection ends
        await storage.clearLogs('minecraft');
        
        // Auto-reconnect if enabled
        if (config.autoReconnect) {
          setTimeout(() => {
            // Reconnect logic would go here
            addLog('minecraft', 'info', 'Attempting to reconnect...');
          }, 5000);
        }
      });

      res.json({ success: true, message: 'Minecraft bot connection started' });
      
    } catch (error) {
      await addLog('minecraft', 'error', `Failed to connect to Minecraft server: ${error.message}`);
      res.status(500).json({ error: 'Failed to connect to Minecraft server', details: error.message });
    }
  });

  router.post('/api/minecraft/disconnect', async (req, res) => {
    try {
      if (minecraftBot) {
        minecraftBot.quit();
        minecraftBot = null;
        
        await storage.updateMinecraftConfig({ isConnected: false });
        await storage.updateBotStatus({
          discordConnected: (await storage.getBotStatus())?.discordConnected || false,
          minecraftConnected: false,
          lastActivity: new Date().toISOString(),
          totalUptime: (await storage.getBotStatus())?.totalUptime || '0m',
        });
        
        await addLog('minecraft', 'info', 'Minecraft bot disconnected');
        // Clear Minecraft logs when disconnected
        await storage.clearLogs('minecraft');
      }
      
      res.json({ success: true, message: 'Minecraft bot disconnected' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to disconnect Minecraft bot' });
    }
  });

  // Console Commands
  router.post('/api/console/command', async (req, res) => {
    try {
      const { command } = insertConsoleCommandSchema.parse(req.body);
      
      if (!minecraftBot) {
        return res.status(400).json({ error: 'Minecraft bot is not connected' });
      }

      let response = '';
      let success = false;

      try {
        // Execute command
        minecraftBot.chat(`/${command}`);
        response = `Command executed: /${command}`;
        success = true;
        
        await addLog('minecraft', 'info', `Console command executed: /${command}`);
      } catch (error) {
        response = `Failed to execute command: ${error.message}`;
        await addLog('error', 'error', `Console command failed: /${command}`, error.message);
      }

      const commandRecord = await storage.addConsoleCommand({
        command,
        response,
        success,
        requiresOp: true,
      });

      res.json(commandRecord);
    } catch (error) {
      res.status(500).json({ error: 'Failed to execute command' });
    }
  });

  router.get('/api/console/commands', async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
      const commands = await storage.getConsoleCommands(limit);
      res.json(commands);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get console commands' });
    }
  });

  // Logs
  router.get('/api/logs', async (req, res) => {
    try {
      const type = req.query.type as 'discord' | 'minecraft' | 'system' | 'error' | undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
      const logs = await storage.getLogs(type, limit);
      res.json(logs);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get logs' });
    }
  });

  router.delete('/api/logs', async (req, res) => {
    try {
      const type = req.query.type as 'discord' | 'minecraft' | 'system' | 'error' | undefined;
      await storage.clearLogs(type);
      res.json({ success: true, message: 'Logs cleared' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to clear logs' });
    }
  });

  // Inventory
  router.get('/api/inventory', async (req, res) => {
    try {
      let inventory = await storage.getInventory();
      
      // If Minecraft bot is connected, get real inventory
      if (minecraftBot && minecraftBot.inventory) {
        const items = minecraftBot.inventory.items();
        inventory = items.map((item, index) => ({
          id: `${item.type}_${index}`,
          name: item.name || item.displayName || 'Unknown',
          count: item.count,
          slot: item.slot,
          metadata: item.metadata ? JSON.stringify(item.metadata) : undefined,
        }));
        
        // Save to storage
        await storage.updateInventory(inventory);
      }
      
      res.json(inventory);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get inventory' });
    }
  });

  // Bot Status
  router.get('/api/status', async (req, res) => {
    try {
      const status = await storage.getBotStatus();
      const discordConfig = await storage.getDiscordConfig();
      const minecraftConfig = await storage.getMinecraftConfig();
      
      res.json({
        ...status,
        discord: discordConfig,
        minecraft: minecraftConfig,
        bots: {
          discord: !!discordBot,
          minecraft: !!minecraftBot,
        }
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to get bot status' });
    }
  });

  return router;
}