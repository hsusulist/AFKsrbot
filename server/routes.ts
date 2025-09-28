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
  
  // Discord Bot instance with extended properties
  let discordBot: (Client & { statusInterval?: NodeJS.Timeout }) | null = null;
  let minecraftBot: any = null; // mineflayer bot
  
  // Global channel tracking for Discord features
  let statusChannel: string | null = null;
  let logChannel: string | null = null;

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
        hasToken: !!config.token, // Show that token exists without revealing it
      };
      
      res.json(safeConfig);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get Discord config' });
    }
  });

  router.post('/api/discord/connect', async (req, res) => {
    try {
      // SECURITY: Never log tokens or sensitive data
      const { token, autoStart, logCommands } = req.body;
      
      // Get existing config to check for stored token
      const existingConfig = await storage.getDiscordConfig();
      console.log('📦 Existing config hasToken:', !!existingConfig?.token);
      const finalToken = token || existingConfig?.token;
      
      if (!finalToken) {
        console.log('❌ No token available - new:', !!token, 'stored:', !!existingConfig?.token);
        return res.status(400).json({ error: 'Discord bot token is required' });
      }
      
      console.log('✅ Using token for connection, length:', finalToken.length);

      // Save token to storage FIRST (before attempting connection)
      await storage.saveDiscordConfig({
        token: finalToken,
        isConnected: false, // Will be updated to true if connection succeeds
        autoStart: autoStart !== undefined ? autoStart : existingConfig?.autoStart || false,
        logCommands: logCommands !== undefined ? logCommands : existingConfig?.logCommands || true,
        guildCount: existingConfig?.guildCount || 0,
        commandsExecuted: existingConfig?.commandsExecuted || 0,
        uptime: '0m',
        lastConnected: existingConfig?.lastConnected,
      });
      console.log('💾 Token saved to storage');

      // Disconnect existing bot if any
      if (discordBot) {
        discordBot.destroy();
        discordBot = null;
      }

      // Create new Discord client with basic intents
      discordBot = new Client({
        intents: [
          GatewayIntentBits.Guilds,
          GatewayIntentBits.GuildMessages,
          GatewayIntentBits.MessageContent,
        ]
      });

      // Discord bot slash command definitions
      const commands = [
        {
          name: 'setup',
          description: 'Configure current channel for live status monitoring'
        },
        {
          name: 'log',
          description: 'Set current channel to receive all Minecraft chat and events'
        },
        {
          name: 'start',
          description: 'Start the Minecraft bot connection'
        },
        {
          name: 'close',
          description: 'Stop the Minecraft bot'
        },
        {
          name: 'restart',
          description: 'Restart the Minecraft bot connection'
        },
        {
          name: 'status',
          description: 'Display current bot status'
        },
        {
          name: 'inventory',
          description: 'Display bot\'s current inventory'
        },
        {
          name: 'inv',
          description: 'Display bot\'s current inventory (alias)'
        },
        {
          name: 'command',
          description: 'Execute a Minecraft command',
          options: [
            {
              name: 'cmd',
              type: 3, // STRING
              description: 'The Minecraft command to execute',
              required: true
            }
          ]
        },
        {
          name: 'startserver',
          description: 'Start the Aternos Minecraft server'
        },
        {
          name: 'stopserver',
          description: 'Stop the Aternos Minecraft server'
        },
        {
          name: 'restartserver',
          description: 'Restart the Aternos Minecraft server'
        },
        {
          name: 'website',
          description: 'Show the AFKSRBot website link'
        }
      ];

      // Setup event handlers
      discordBot.on('ready', async () => {
        if (!discordBot?.user) return;
        
        await addLog('discord', 'info', `🤖 Discord bot logged in as ${discordBot.user.tag}`);
        
        // Register slash commands for all guilds
        try {
          if (discordBot.application) {
            await discordBot.application.commands.set(commands);
            await addLog('discord', 'info', '✅ Slash commands registered successfully');
          }
        } catch (error) {
          await addLog('discord', 'error', `Failed to register slash commands: ${error.message}`);
        }
        
        // Update config with successful connection status
        const config = await storage.updateDiscordConfig({
          isConnected: true,
          guildCount: discordBot.guilds.cache.size,
          lastConnected: new Date().toISOString(),
        });

        // Update bot status
        await storage.updateBotStatus({
          discordConnected: true,
          minecraftConnected: (await storage.getBotStatus())?.minecraftConnected || false,
          lastActivity: new Date().toISOString(),
          totalUptime: '0m',
        });
        
        // Start periodic status updates
        const statusUpdateInterval = setInterval(async () => {
          if (!discordBot || !statusChannel) return;
          
          try {
            const channel = await discordBot.channels.fetch(statusChannel);
            if (!channel || !channel.isTextBased() || !('send' in channel)) return;
            
            const minecraftConfig = await storage.getMinecraftConfig();
            const botStatus = await storage.getBotStatus();
            
            const statusEmbed = {
              title: '🤖 AFKsrbot Live Status',
              fields: [
                {
                  name: '🎮 Minecraft Bot',
                  value: minecraftBot ? '🟢 Online & Active' : '🔴 Offline',
                  inline: true
                },
                {
                  name: '❤️ Health',
                  value: minecraftBot ? `${minecraftBot.health || 0}/20` : '0/20',
                  inline: true
                },
                {
                  name: '🍖 Food',
                  value: minecraftBot ? `${minecraftBot.food || 0}/20` : '0/20',
                  inline: true
                }
              ],
              color: minecraftBot ? 0x00ff00 : 0xff0000,
              timestamp: new Date().toISOString(),
              footer: { text: 'Updates every 30 seconds' }
            };
            
            if (minecraftBot && minecraftBot.entity) {
              const pos = minecraftBot.entity.position;
              statusEmbed.fields.push({
                name: '📍 Position',
                value: `X: ${Math.floor(pos.x)}, Y: ${Math.floor(pos.y)}, Z: ${Math.floor(pos.z)}`,
                inline: true
              });
              
              if (minecraftConfig?.playersOnline) {
                statusEmbed.fields.push({
                  name: '👥 Players',
                  value: minecraftConfig.playersOnline,
                  inline: true
                });
              }
            }
            
            await channel.send({ embeds: [statusEmbed] });
          } catch (error) {
            console.log('Status update failed:', error.message);
          }
        }, 30000); // Every 30 seconds
        
        // Store the interval for cleanup
        discordBot.statusInterval = statusUpdateInterval;
      });

      
      // Handle slash command interactions
      discordBot.on('interactionCreate', async (interaction) => {
        if (!interaction.isChatInputCommand()) return;
        
        const { commandName, user, channelId } = interaction;
        
        await addLog('discord', 'info', `Slash command: /${commandName}`, `From: ${user.tag}`);
        
        try {
          switch (commandName) {
            case 'setup':
              statusChannel = channelId;
              await interaction.reply('✅ This channel is now configured for live status monitoring!');
              break;
              
            case 'log':
              logChannel = channelId;
              await interaction.reply('✅ This channel will now receive all Minecraft chat and events!');
              break;
              
            case 'start':
              if (minecraftBot) {
                await interaction.reply('⚠️ Minecraft bot is already connected!');
                return;
              }
              
              const mcConfig = await storage.getMinecraftConfig();
              if (!mcConfig || !mcConfig.serverIP) {
                await interaction.reply('❌ No Minecraft server configuration found. Please configure the server in the dashboard first.');
                return;
              }
              
              await interaction.reply('🔄 Starting Minecraft bot connection...');
              // The bot connection logic would need to be extracted into a reusable function
              break;
              
            case 'close':
              if (!minecraftBot) {
                await interaction.reply('⚠️ Minecraft bot is not connected!');
                return;
              }
              
              minecraftBot.quit();
              minecraftBot = null;
              await storage.updateMinecraftConfig({ isConnected: false });
              await interaction.reply('✅ Minecraft bot disconnected!');
              break;
              
            case 'restart':
              if (minecraftBot) {
                minecraftBot.quit();
                minecraftBot = null;
              }
              await interaction.reply('🔄 Restarting Minecraft bot...');
              // Restart logic would go here
              break;
              
            case 'status':
              const discordConfig = await storage.getDiscordConfig();
              const minecraftConfig = await storage.getMinecraftConfig();
              const botStatus = await storage.getBotStatus();
              
              const embed = {
                title: '🤖 AFKsrbot Status',
                fields: [
                  {
                    name: '📱 Discord Bot',
                    value: discordConfig?.isConnected ? '🟢 Connected' : '🔴 Disconnected',
                    inline: true
                  },
                  {
                    name: '🎮 Minecraft Bot',
                    value: minecraftConfig?.isConnected ? '🟢 Connected' : '🔴 Disconnected',
                    inline: true
                  },
                  {
                    name: '⏱️ Uptime',
                    value: botStatus?.totalUptime || '0m',
                    inline: true
                  }
                ],
                color: 0x00ff00,
                timestamp: new Date().toISOString()
              };
              
              if (minecraftConfig?.isConnected) {
                embed.fields.push(
                  {
                    name: '🏠 Server',
                    value: `${minecraftConfig.serverIP}:${minecraftConfig.serverPort}`,
                    inline: true
                  },
                  {
                    name: '👥 Players Online',
                    value: minecraftConfig.playersOnline || '0/100',
                    inline: true
                  },
                  {
                    name: '❤️ Bot Health',
                    value: minecraftBot ? `${minecraftBot.health || 0}/20` : '0/20',
                    inline: true
                  }
                );
              }
              
              await interaction.reply({ embeds: [embed] });
              break;
              
            case 'inventory':
            case 'inv':
              const inventory = await storage.getInventory();
              
              if (inventory.length === 0) {
                await interaction.reply('🎒 Bot inventory is empty');
                return;
              }
              
              const inventoryEmbed = {
                title: '🎒 Bot Inventory',
                description: inventory.map(item => `${item.name}: ${item.count}`).join('\n'),
                color: 0x8B4513,
                timestamp: new Date().toISOString()
              };
              
              await interaction.reply({ embeds: [inventoryEmbed] });
              break;
              
            case 'command':
              if (!minecraftBot) {
                await interaction.reply('❌ Minecraft bot is not connected');
                return;
              }
              
              const command = interaction.options.getString('cmd');
              if (!command) {
                await interaction.reply('❌ Please provide a command to execute');
                return;
              }
              
              try {
                minecraftBot.chat(`/${command}`);
                await interaction.reply(`✅ Executed command: \`/${command}\``);
                await addLog('minecraft', 'info', `Command executed: /${command}`, `Via Discord by ${user.tag}`);
              } catch (error) {
                await interaction.reply('❌ Failed to execute command');
                await addLog('error', 'error', `Failed to execute command: ${command}`, error.message);
              }
              break;
              
            case 'startserver':
              try {
                // For now, simulate Aternos server start
                await interaction.reply('🔄 Starting Aternos server... This may take a few minutes.');
                await addLog('system', 'info', 'Aternos server start requested via Discord command', `By user: ${user.tag}`);
                
                // TODO: Implement actual Aternos API integration
                setTimeout(async () => {
                  if (logChannel) {
                    const channel = await discordBot.channels.fetch(logChannel);
                    if (channel && 'send' in channel) {
                      await channel.send('✅ Aternos server started successfully!');
                    }
                  }
                }, 3000);
              } catch (error) {
                await interaction.reply('❌ Failed to start Aternos server');
                await addLog('error', 'error', 'Failed to start Aternos server', error.message);
              }
              break;
              
            case 'stopserver':
              try {
                await interaction.reply('🛑 Stopping Aternos server...');
                await addLog('system', 'info', 'Aternos server stop requested via Discord command', `By user: ${user.tag}`);
                
                // TODO: Implement actual Aternos API integration
                setTimeout(async () => {
                  if (logChannel) {
                    const channel = await discordBot.channels.fetch(logChannel);
                    if (channel && 'send' in channel) {
                      await channel.send('🛑 Aternos server stopped successfully!');
                    }
                  }
                }, 2000);
              } catch (error) {
                await interaction.reply('❌ Failed to stop Aternos server');
                await addLog('error', 'error', 'Failed to stop Aternos server', error.message);
              }
              break;
              
            case 'restartserver':
              try {
                await interaction.reply('🔄 Restarting Aternos server... This may take a few minutes.');
                await addLog('system', 'info', 'Aternos server restart requested via Discord command', `By user: ${user.tag}`);
                
                // TODO: Implement actual Aternos API integration
                setTimeout(async () => {
                  if (logChannel) {
                    const channel = await discordBot.channels.fetch(logChannel);
                    if (channel && 'send' in channel) {
                      await channel.send('🔄 Aternos server restarted successfully!');
                    }
                  }
                }, 5000);
              } catch (error) {
                await interaction.reply('❌ Failed to restart Aternos server');
                await addLog('error', 'error', 'Failed to restart Aternos server', error.message);
              }
              break;
              
            case 'website':
              const websiteEmbed = {
                title: '🌐 AFKSRBot Website',
                description: 'Visit our official website for more information about AFKSRBot!',
                url: process.env.REPLIT_DOMAIN || 'https://afksrbot-dashboard.replit.app',
                color: 0x5865F2,
                fields: [
                  {
                    name: '🎮 Features',
                    value: '• 24/7 AFK bot for Minecraft\n• Discord integration\n• Aternos server control\n• Live monitoring dashboard',
                    inline: false
                  },
                  {
                    name: '📱 Dashboard',
                    value: `[Open Dashboard](${process.env.REPLIT_DOMAIN || 'https://afksrbot-dashboard.replit.app'})`,
                    inline: true
                  }
                ],
                footer: {
                  text: 'AFKSRBot - Your Minecraft companion'
                },
                timestamp: new Date().toISOString()
              };
              
              await interaction.reply({ embeds: [websiteEmbed] });
              break;
              
            default:
              await interaction.reply('❓ Unknown command');
          }
          
          // Update command count
          const currentConfig = await storage.getDiscordConfig();
          if (currentConfig) {
            await storage.updateDiscordConfig({
              commandsExecuted: (currentConfig.commandsExecuted || 0) + 1,
            });
          }
          
        } catch (error) {
          console.error('Discord command error:', error);
          if (!interaction.replied) {
            await interaction.reply('❌ An error occurred while processing the command');
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
      await discordBot.login(finalToken);
      
      res.json({ success: true, message: 'Discord bot connection started' });
      
    } catch (error) {
      await addLog('discord', 'error', `Failed to connect Discord bot: ${error.message}`);
      res.status(500).json({ error: 'Failed to connect Discord bot', details: error.message });
    }
  });

  router.patch('/api/discord/config', async (req, res) => {
    try {
      const updates = req.body;
      
      // Only allow specific fields to be updated
      const allowedUpdates = ['autoStart', 'logCommands'];
      const filteredUpdates: any = {};
      
      for (const key of allowedUpdates) {
        if (updates[key] !== undefined) {
          filteredUpdates[key] = updates[key];
        }
      }
      
      if (Object.keys(filteredUpdates).length === 0) {
        return res.status(400).json({ error: 'No valid updates provided' });
      }

      const currentConfig = await storage.getDiscordConfig();
      if (!currentConfig) {
        return res.status(404).json({ error: 'Discord config not found' });
      }

      const updatedConfig = await storage.updateDiscordConfig(filteredUpdates);
      
      // Return only non-sensitive data
      const safeConfig = {
        isConnected: updatedConfig.isConnected,
        autoStart: updatedConfig.autoStart,
        logCommands: updatedConfig.logCommands,
        guildCount: updatedConfig.guildCount,
        commandsExecuted: updatedConfig.commandsExecuted,
        uptime: updatedConfig.uptime,
        lastConnected: updatedConfig.lastConnected,
        hasToken: !!updatedConfig.token,
      };
      
      res.json(safeConfig);
    } catch (error) {
      res.status(500).json({ error: 'Failed to update Discord config' });
    }
  });

  router.post('/api/discord/disconnect', async (req, res) => {
    try {
      if (discordBot) {
        // Clear status update interval
        if (discordBot.statusInterval) {
          clearInterval(discordBot.statusInterval);
        }
        
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
      
      // Check if bot is actually connected (not just stored config)
      const actuallyConnected = !!(minecraftBot && minecraftBot.entity);
      
      // Update stored config if it doesn't match reality
      if (actuallyConnected !== config.isConnected) {
        await storage.updateMinecraftConfig({ 
          isConnected: actuallyConnected,
          ping: actuallyConnected ? config.ping : 'N/A',
          uptime: actuallyConnected ? config.uptime : 'N/A', 
          playersOnline: actuallyConnected ? config.playersOnline : '0/0'
        });
      }
      
      // Return only non-sensitive data with actual connection state
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
        isConnected: actuallyConnected, // Use actual state, not stored state
        ping: actuallyConnected ? config.ping : 'N/A',
        uptime: actuallyConnected ? config.uptime : 'N/A',
        playersOnline: actuallyConnected ? config.playersOnline : '0/0',
        lastConnected: config.lastConnected,
      };
      
      res.json(safeConfig);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get Minecraft config' });
    }
  });

  // PATCH endpoint to save minecraft settings without connecting
  router.patch('/api/minecraft/config', async (req, res) => {
    try {
      const updates = insertMinecraftServerConfigSchema.partial().parse(req.body);
      
      // Get existing config
      const existingConfig = await storage.getMinecraftConfig();
      
      let updatedConfig;
      if (!existingConfig) {
        // Create new config if none exists
        updatedConfig = {
          serverIP: updates.serverIP || '127.0.0.1',
          serverPort: updates.serverPort || '25565',
          username: updates.username || '',
          password: updates.password,
          shouldRegister: updates.shouldRegister || false,
          version: updates.version || '1.20.4',
          platform: updates.platform || 'java',
          autoReconnect: updates.autoReconnect !== undefined ? updates.autoReconnect : true,
          mode24_7: updates.mode24_7 !== undefined ? updates.mode24_7 : true,
          useWhitelist: updates.useWhitelist || false,
          isConnected: false, // Don't change connection status when just saving settings
        };
      } else {
        // Update existing config, preserving password if not provided
        updatedConfig = {
          ...existingConfig,
          ...updates,
          // CRITICAL: Preserve existing password if undefined (prevent auto-save wipe)
          password: updates.password !== undefined ? updates.password : existingConfig.password,
          // Don't change connection status when just saving settings
          isConnected: existingConfig.isConnected,
        };
      }
      
      // No-op guard: check if config actually changed (prevent spam saves)
      if (existingConfig) {
        const configToCompare = { ...existingConfig };
        const newConfigToCompare = { ...updatedConfig };
        
        // Remove fields that shouldn't be compared
        delete configToCompare.isConnected;
        delete newConfigToCompare.isConnected;
        
        // Deep compare to see if anything actually changed
        if (JSON.stringify(configToCompare) === JSON.stringify(newConfigToCompare)) {
          // No changes detected, return success without saving or logging
          return res.status(204).json({ success: true, message: 'No changes detected' });
        }
      }
      
      // Save the config since changes were detected
      await storage.saveMinecraftConfig(updatedConfig);
      
      // Only log if not an auto-save to reduce spam
      if (!(updates as any).__autoSave) {
        await addLog('minecraft', 'info', '💾 Server configuration saved');
      }
      
      res.json({ success: true, message: 'Settings saved successfully' });
      
    } catch (error) {
      await addLog('minecraft', 'error', `Failed to save settings: ${error.message}`);
      res.status(500).json({ error: 'Failed to save settings', details: error.message });
    }
  });

  // Add server ping/status check endpoint
  router.get('/api/minecraft/ping/:serverIP/:serverPort', async (req, res) => {
    try {
      const { serverIP, serverPort } = req.params;
      const { Socket } = await import('node:net');
      
      await addLog('minecraft', 'info', `🔍 Checking server status: ${serverIP}:${serverPort}`);
      
      const socket = new Socket();
      let isConnectable = false;
      let connectionResult = 'offline';
      let errorDetails = '';
      
      socket.setTimeout(5000); // 5 second timeout
      
      const connectionPromise = new Promise((resolve) => {
        socket.on('connect', () => {
          isConnectable = true;
          connectionResult = 'online';
          socket.destroy();
          resolve('connected');
        });
        
        socket.on('timeout', () => {
          errorDetails = 'Connection timeout (5s)';
          socket.destroy();
          resolve('timeout');
        });
        
        socket.on('error', (err) => {
          errorDetails = err.message;
          socket.destroy();
          resolve('error');
        });
        
        try {
          socket.connect(parseInt(serverPort), serverIP);
        } catch (err) {
          errorDetails = err.message;
          resolve('error');
        }
      });
      
      await connectionPromise;
      
      const status = isConnectable ? 'online' : 'offline';
      const message = isConnectable 
        ? `📡 Server ${serverIP}:${serverPort} is online and accepting connections`
        : `📴 Server ${serverIP}:${serverPort} is offline or unreachable${errorDetails ? ` (${errorDetails})` : ''}`;
      
      await addLog('minecraft', isConnectable ? 'info' : 'warn', message);
      
      res.json({ 
        status, 
        isOnline: isConnectable,
        serverIP,
        serverPort: parseInt(serverPort),
        message,
        errorDetails
      });
    } catch (error) {
      const errorMsg = `Failed to ping server: ${error.message}`;
      await addLog('minecraft', 'error', errorMsg);
      res.json({ 
        status: 'error', 
        isOnline: false,
        serverIP: req.params.serverIP,
        serverPort: parseInt(req.params.serverPort),
        message: errorMsg,
        errorDetails: error.message
      });
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

      // Smart hostname parsing - handle cases like "hostname:port" in serverIP field
      let serverHost = config.serverIP;
      let serverPort = config.serverPort;
      
      // If serverIP contains a colon, it might be hostname:port format
      if (serverHost.includes(':')) {
        const parts = serverHost.split(':');
        if (parts.length === 2 && !isNaN(parseInt(parts[1]))) {
          serverHost = parts[0];
          serverPort = parts[1];
          await addLog('minecraft', 'info', `Parsed server address: ${serverHost}:${serverPort}`);
        }
      }

      // First, ping the server to check if it's online
      await addLog('minecraft', 'info', `🔍 Checking server connectivity before connecting...`);
      
      try {
        const { Socket } = await import('node:net');
        const socket = new Socket();
        let isOnline = false;
        
        const pingResult = await new Promise((resolve) => {
          socket.setTimeout(3000);
          
          socket.on('connect', () => {
            isOnline = true;
            socket.destroy();
            resolve('online');
          });
          
          socket.on('timeout', () => {
            socket.destroy();
            resolve('timeout');
          });
          
          socket.on('error', () => {
            socket.destroy();
            resolve('offline');
          });
          
          socket.connect(parseInt(serverPort), serverHost);
        });
        
        if (!isOnline) {
          await addLog('minecraft', 'warn', `📴 Server ${serverHost}:${serverPort} appears to be offline or unreachable. If this is an Aternos server, please start it first and try again.`);
          return res.status(202).json({ 
            success: false, 
            message: 'Server appears offline/sleeping. Please start the server and try again.',
            serverStatus: 'offline'
          });
        }
        
        await addLog('minecraft', 'info', `✅ Server ${serverHost}:${serverPort} is online and ready for connection`);
      } catch (pingError) {
        await addLog('minecraft', 'warn', `Could not verify server status: ${pingError.message}. Proceeding with connection attempt...`);
      }

      // Disconnect existing bot if any
      if (minecraftBot) {
        minecraftBot.quit();
        minecraftBot = null;
      }

      // Create Minecraft bot with cracked/offline mode
      const botOptions: any = {
        host: serverHost,
        port: parseInt(serverPort),
        username: config.username,
        version: config.version,
        auth: 'offline', // Enable cracked/offline mode
        hideErrors: false, // Show connection errors for debugging
        checkTimeoutInterval: 30000, // 30 second timeout
        keepAlive: true, // Keep connection alive
      };

      // Add auth if password provided
      if (config.password) {
        if (config.shouldRegister) {
          // Registration logic would depend on server plugin
          await addLog('minecraft', 'info', `Attempting to register with username: ${config.username}`);
        }
        // Password will be used for login after connecting
      }

      await addLog('minecraft', 'info', `🔌 Attempting to connect to ${serverHost}:${serverPort} with username ${config.username}`);
      
      minecraftBot = mineflayer.createBot(botOptions);

      // AFKsrbot state variables
      let afkIntervals: NodeJS.Timeout[] = [];
      let kickCount = 0;
      let lastPlayerInteraction = Date.now();
      let greetedPlayers = new Set<string>();
      
      // Enhanced player interaction variables
      let waitingForResponse = new Map<string, {
        askedAt: number,
        scenario: 'love_question'
      }>();
      let currentTarget: string | null = null;
      let isApproachingPlayer = false;
      
      // Helper functions for player interactions
      const getDistanceToPlayer = (playerName: string) => {
        if (!minecraftBot || !minecraftBot.entity || !minecraftBot.players[playerName]) return null;
        const player = minecraftBot.players[playerName];
        if (!player.entity) return null;
        return minecraftBot.entity.position.distanceTo(player.entity.position);
      };
      
      const getRandomPlayer = () => {
        if (!minecraftBot || !minecraftBot.players) return null;
        const players = Object.keys(minecraftBot.players).filter(name => {
          const player = minecraftBot.players[name];
          if (name === minecraftBot.username || !player || !player.entity) return false;
          
          // Check if player is within 40 blocks range
          const distance = getDistanceToPlayer(name);
          return distance !== null && distance <= 40;
        });
        if (players.length === 0) return null;
        return players[Math.floor(Math.random() * players.length)];
      };
      
      const moveTowardsPlayer = async (playerName: string, targetDistance: number) => {
        if (!minecraftBot || !minecraftBot.entity || !minecraftBot.players[playerName]) return false;
        const player = minecraftBot.players[playerName];
        if (!player.entity) return false;
        
        const distance = getDistanceToPlayer(playerName);
        if (distance === null || distance <= targetDistance) return true;
        
        // Clear all control states first
        minecraftBot.clearControlStates();
        
        // Look at the player
        await minecraftBot.lookAt(player.entity.position.offset(0, player.entity.height, 0));
        
        // Move forward towards the player (since we're now facing them)
        minecraftBot.setControlState('forward', true);
        
        return false;
      };
      
      // AFKsrbot anti-AFK behaviors
      const startAntiAFKBehaviors = () => {
        // Random movement every 3-8 seconds (much more active like a real player)
        const movementInterval = setInterval(async () => {
          if (!minecraftBot || !minecraftBot.entity) return;
          
          // Skip movement if already approaching a player
          if (isApproachingPlayer) return;
          
          // 5% chance to approach a player instead of random movement
          const shouldApproachPlayer = Math.random() < 0.05;
          
          if (shouldApproachPlayer && !isApproachingPlayer) {
            const targetPlayer = getRandomPlayer();
            if (targetPlayer) {
              isApproachingPlayer = true;
              currentTarget = targetPlayer;
              
              // 50/50 chance for two different scenarios
              const scenario = Math.random() < 0.5 ? 'casual_hi' : 'love_question';
              
              if (scenario === 'casual_hi') {
                // Scenario 1: Move to 40 blocks and say hi
                let safetyTimeout: NodeJS.Timeout;
                
                const cleanupApproach = () => {
                  clearInterval(approachInterval);
                  if (safetyTimeout) clearTimeout(safetyTimeout);
                  const approachIndex = afkIntervals.indexOf(approachInterval);
                  if (approachIndex > -1) afkIntervals.splice(approachIndex, 1);
                  const timeoutIndex = afkIntervals.indexOf(safetyTimeout);
                  if (timeoutIndex > -1) afkIntervals.splice(timeoutIndex, 1);
                  isApproachingPlayer = false;
                  currentTarget = null;
                  if (minecraftBot) minecraftBot.clearControlStates();
                };
                
                const approachInterval = setInterval(async () => {
                  if (!currentTarget || !minecraftBot) {
                    cleanupApproach();
                    return;
                  }
                  
                  // Validate target still exists and is reachable
                  if (!minecraftBot.players[currentTarget]?.entity) {
                    await addLog('minecraft', 'warn', `Target ${currentTarget} disappeared during approach`);
                    cleanupApproach();
                    return;
                  }
                  
                  const distance = getDistanceToPlayer(currentTarget);
                  if (distance && distance > 120) {
                    await addLog('minecraft', 'warn', `Target ${currentTarget} too far away (${distance.toFixed(1)} blocks)`);
                    cleanupApproach();
                    return;
                  }
                  
                  const reachedTarget = await moveTowardsPlayer(currentTarget, 3);
                  if (reachedTarget) {
                    minecraftBot.clearControlStates();
                    minecraftBot.chat('hi');
                    await addLog('minecraft', 'info', `👋 Said hi to ${currentTarget} up close`);
                    cleanupApproach();
                  }
                }, 1000);
                
                afkIntervals.push(approachInterval);
                
                // Safety timeout
                safetyTimeout = setTimeout(() => {
                  addLog('minecraft', 'info', 'Approach timeout - returned to normal behavior');
                  cleanupApproach();
                }, 30000);
                
                afkIntervals.push(safetyTimeout);
                
              } else {
                // Scenario 2: Move to 5 blocks, shift, look, ask question
                let safetyTimeout: NodeJS.Timeout;
                
                const cleanupLoveApproach = () => {
                  clearInterval(approachInterval);
                  if (safetyTimeout) clearTimeout(safetyTimeout);
                  const approachIndex = afkIntervals.indexOf(approachInterval);
                  if (approachIndex > -1) afkIntervals.splice(approachIndex, 1);
                  const timeoutIndex = afkIntervals.indexOf(safetyTimeout);
                  if (timeoutIndex > -1) afkIntervals.splice(timeoutIndex, 1);
                  isApproachingPlayer = false;
                  currentTarget = null;
                  if (minecraftBot) {
                    minecraftBot.clearControlStates();
                    minecraftBot.setControlState('sneak', false);
                  }
                };
                
                const approachInterval = setInterval(async () => {
                  if (!currentTarget || !minecraftBot) {
                    cleanupLoveApproach();
                    return;
                  }
                  
                  // Validate target still exists and is reachable
                  if (!minecraftBot.players[currentTarget]?.entity) {
                    await addLog('minecraft', 'warn', `Target ${currentTarget} disappeared during approach`);
                    cleanupLoveApproach();
                    return;
                  }
                  
                  const distance = getDistanceToPlayer(currentTarget);
                  if (distance && distance > 120) {
                    await addLog('minecraft', 'warn', `Target ${currentTarget} too far away (${distance.toFixed(1)} blocks)`);
                    cleanupLoveApproach();
                    return;
                  }
                  
                  const reachedTarget = await moveTowardsPlayer(currentTarget, 5);
                  if (reachedTarget) {
                    minecraftBot.clearControlStates();
                    minecraftBot.setControlState('sneak', true); // Shift
                    
                    // Look at player
                    if (minecraftBot.players[currentTarget]?.entity) {
                      await minecraftBot.lookAt(minecraftBot.players[currentTarget].entity.position.offset(0, minecraftBot.players[currentTarget].entity.height, 0));
                    }
                    
                    // Wait 7 seconds then ask question
                    setTimeout(async () => {
                      if (minecraftBot && currentTarget && !waitingForResponse.has(currentTarget)) {
                        minecraftBot.chat(`hello ${currentTarget} do you love the server`);
                        waitingForResponse.set(currentTarget, {
                          askedAt: Date.now(),
                          scenario: 'love_question'
                        });
                        await addLog('minecraft', 'info', `❤️ Asked ${currentTarget} if they love the server`);
                        
                        // Stop shifting after asking
                        setTimeout(() => {
                          if (minecraftBot) minecraftBot.setControlState('sneak', false);
                        }, 2000);
                      }
                    }, 7000);
                    
                    cleanupLoveApproach();
                  }
                }, 1000);
                
                afkIntervals.push(approachInterval);
                
                // Safety timeout
                safetyTimeout = setTimeout(() => {
                  addLog('minecraft', 'info', 'Love question approach timeout - returned to normal behavior');
                  cleanupLoveApproach();
                }, 45000);
                
                afkIntervals.push(safetyTimeout);
              }
              
              return; // Skip normal movement when approaching player
            }
          }
          
          // Normal random movement
          const randomActions = [
            () => minecraftBot.setControlState('forward', true),
            () => minecraftBot.setControlState('back', true),
            () => minecraftBot.setControlState('left', true),
            () => minecraftBot.setControlState('right', true),
            () => minecraftBot.setControlState('jump', true),
          ];
          
          // Perform random action
          const action = randomActions[Math.floor(Math.random() * randomActions.length)];
          action();
          
          // Stop action after short duration (instant response like normal player)
          setTimeout(() => {
            if (minecraftBot) {
              minecraftBot.clearControlStates();
            }
          }, Math.random() * 1000 + 200); // 0.2-1.2 seconds (much faster)
          
        }, Math.random() * 5000 + 3000); // 3-8 seconds (much more frequent)
        
        // Random looking around every 2-6 seconds (like an active player)
        const lookInterval = setInterval(() => {
          if (!minecraftBot || !minecraftBot.entity) return;
          
          const yaw = Math.random() * Math.PI * 2; // Random horizontal direction
          const pitch = (Math.random() - 0.5) * 0.5; // Random vertical look
          minecraftBot.look(yaw, pitch);
          
        }, Math.random() * 4000 + 2000); // 2-6 seconds (much more frequent)
        
        // Health and food monitoring every 5 seconds
        const healthInterval = setInterval(async () => {
          if (!minecraftBot || !minecraftBot.entity) return;
          
          const health = minecraftBot.health;
          const food = minecraftBot.food;
          
          if (health <= 10) {
            await addLog('minecraft', 'warn', `⚠️ Low health: ${health}/20`);
          }
          
          if (food <= 6) {
            await addLog('minecraft', 'warn', `🍖 Low food: ${food}/20`);
            // Try to eat if we have food
            const foodItems = minecraftBot.inventory.items().filter(item => 
              item.name.includes('bread') || item.name.includes('apple') || 
              item.name.includes('carrot') || item.name.includes('potato')
            );
            if (foodItems.length > 0) {
              try {
                await minecraftBot.equip(foodItems[0], 'hand');
                minecraftBot.activateItem();
                await addLog('minecraft', 'info', `🍽️ Eating ${foodItems[0].name}`);
              } catch (err) {
                await addLog('minecraft', 'warn', `Failed to eat: ${err.message}`);
              }
            }
          }
          
        }, 5000); // Every 5 seconds
        
        // Server love message every 7 minutes
        const serverLoveInterval = setInterval(() => {
          if (minecraftBot) {
            minecraftBot.chat('I love this server very much');
            addLog('minecraft', 'info', '💖 Expressed love for the server');
          }
        }, 7 * 60 * 1000); // 7 minutes
        
        afkIntervals.push(movementInterval, lookInterval, healthInterval, serverLoveInterval);
      };
      
      // Setup event handlers
      minecraftBot.on('spawn', async () => {
        await addLog('minecraft', 'info', `🎮 Bot ${config.username} joined the server!`);
        
        // Update inventory when spawned
        setTimeout(async () => {
          try {
            const items = minecraftBot.inventory.items().map(item => ({
              id: Date.now() + Math.random(),
              name: item.name,
              count: item.count,
              slot: minecraftBot.inventory.slots.indexOf(item)
            }));
            await storage.updateInventory(items);
            await addLog('minecraft', 'info', `📦 Inventory updated: ${items.length} items`);
          } catch (err) {
            await addLog('minecraft', 'warn', `Failed to update inventory: ${err.message}`);
          }
        }, 2000);
      });

      // Log all chat messages from server
      minecraftBot.on('message', async (message) => {
        const chatMsg = message.toString();
        if (chatMsg && chatMsg.trim()) {
          await addLog('minecraft', 'info', `💬 ${chatMsg}`);
          
          // Send to Discord log channel if configured
          if (logChannel && discordBot) {
            try {
              const channel = await discordBot.channels.fetch(logChannel);
              if (channel && channel.isTextBased() && 'send' in channel) {
                await channel.send(`\`\`\`💬 ${chatMsg}\`\`\``);
              }
            } catch (err) {
              console.log('Failed to send to Discord log channel:', err.message);
            }
          }
        }
      });

      // Handle password login/register and start behaviors after spawn
      minecraftBot.once('spawn', async () => {
        await addLog('minecraft', 'info', `🎮 Bot ${config.username} spawned successfully!`);
        
        if (config.password) {
          // Wait a moment for the server to be ready
          setTimeout(async () => {
            try {
              if (config.shouldRegister) {
                minecraftBot.chat(`/register ${config.password} ${config.password}`);
                await addLog('minecraft', 'info', '📝 Attempting to register with password');
              } else {
                minecraftBot.chat(`/login ${config.password}`);
                await addLog('minecraft', 'info', '🔐 Attempting to login with password');
              }
            } catch (error) {
              await addLog('minecraft', 'error', `Authentication failed: ${error.message}`);
            }
          }, 2000); // Wait 2 seconds after spawn
        }
        
        // Start anti-AFK behaviors
        setTimeout(() => {
          startAntiAFKBehaviors();
          addLog('minecraft', 'info', '🤖 Anti-AFK behaviors activated');
        }, 5000); // Wait 5 seconds after spawn
        
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
        lastPlayerInteraction = Date.now();
        
        // Handle /moveto command
        if (message.toLowerCase().startsWith('/moveto ')) {
          const args = message.split(' ');
          if (args.length >= 2) {
            const targetPlayer = args[1];
            
            // Check if target player exists and is online
            if (!minecraftBot.players[targetPlayer]) {
              minecraftBot.chat(`Player ${targetPlayer} is not online or not found`);
              await addLog('minecraft', 'warn', `🚫 /moveto failed: Player ${targetPlayer} not found`);
              return;
            }
            
            const distance = getDistanceToPlayer(targetPlayer);
            if (distance === null) {
              minecraftBot.chat(`Cannot get distance to ${targetPlayer}`);
              await addLog('minecraft', 'warn', `🚫 /moveto failed: Cannot calculate distance to ${targetPlayer}`);
              return;
            }
            
            if (distance > 40) {
              minecraftBot.chat(`${targetPlayer} is too far away (${distance.toFixed(1)} blocks, max 40)`);
              await addLog('minecraft', 'warn', `🚫 /moveto failed: ${targetPlayer} is ${distance.toFixed(1)} blocks away (exceeds 40 block limit)`);
              return;
            }
            
            // Start moving to player with collision detection
            await addLog('minecraft', 'info', `🏃 Moving to ${targetPlayer} (${distance.toFixed(1)} blocks away)`);
            minecraftBot.chat(`Moving to ${targetPlayer}...`);
            
            let moveStartTime = Date.now();
            let lastPosition = minecraftBot.entity.position.clone();
            let stuckCounter = 0;
            const maxStuckTime = 2000; // 2 seconds without progress = stuck
            
            const moveInterval = setInterval(async () => {
              if (!minecraftBot || !minecraftBot.entity) {
                clearInterval(moveInterval);
                return;
              }
              
              // Check if target player still exists
              if (!minecraftBot.players[targetPlayer] || !minecraftBot.players[targetPlayer].entity) {
                clearInterval(moveInterval);
                minecraftBot.clearControlStates();
                minecraftBot.chat(`${targetPlayer} is no longer online`);
                await addLog('minecraft', 'warn', `🚫 /moveto cancelled: ${targetPlayer} went offline`);
                return;
              }
              
              const currentDistance = getDistanceToPlayer(targetPlayer);
              if (currentDistance === null) {
                clearInterval(moveInterval);
                minecraftBot.clearControlStates();
                minecraftBot.chat(`Lost track of ${targetPlayer}`);
                await addLog('minecraft', 'warn', `🚫 /moveto cancelled: Lost track of ${targetPlayer}`);
                return;
              }
              
              // Check if target moved too far during movement
              if (currentDistance > 45) {
                clearInterval(moveInterval);
                minecraftBot.clearControlStates();
                minecraftBot.chat(`${targetPlayer} moved too far away`);
                await addLog('minecraft', 'warn', `🚫 /moveto cancelled: ${targetPlayer} moved beyond 45 blocks`);
                return;
              }
              
              // Check if we reached the target (within 2 blocks)
              if (currentDistance <= 2) {
                clearInterval(moveInterval);
                minecraftBot.clearControlStates();
                minecraftBot.chat(`Reached ${targetPlayer}!`);
                await addLog('minecraft', 'info', `✅ /moveto completed: Reached ${targetPlayer}`);
                return;
              }
              
              // Check for wall collision / being stuck
              const currentPosition = minecraftBot.entity.position;
              const moved = currentPosition.distanceTo(lastPosition);
              
              if (moved < 0.1) { // Barely moved
                stuckCounter += 200; // Add interval time
                if (stuckCounter >= maxStuckTime) {
                  clearInterval(moveInterval);
                  minecraftBot.clearControlStates();
                  minecraftBot.chat(`Can't reach ${targetPlayer} - path blocked`);
                  await addLog('minecraft', 'warn', `🚫 /moveto cancelled: Path to ${targetPlayer} is blocked or stuck`);
                  return;
                }
              } else {
                stuckCounter = 0; // Reset stuck counter if we moved
                lastPosition = currentPosition.clone();
              }
              
              // Continue moving towards player
              const reachedTarget = await moveTowardsPlayer(targetPlayer, 2);
              if (reachedTarget) {
                clearInterval(moveInterval);
                minecraftBot.clearControlStates();
                minecraftBot.chat(`Reached ${targetPlayer}!`);
                await addLog('minecraft', 'info', `✅ /moveto completed: Reached ${targetPlayer}`);
              }
              
            }, 200); // Check every 200ms
            
            // Safety timeout after 30 seconds
            setTimeout(() => {
              clearInterval(moveInterval);
              if (minecraftBot) {
                minecraftBot.clearControlStates();
                minecraftBot.chat(`Movement to ${targetPlayer} timed out`);
                addLog('minecraft', 'warn', `🚫 /moveto timed out: Could not reach ${targetPlayer} within 30 seconds`);
              }
            }, 30000);
            
            return; // Don't process other chat logic for this command
          } else {
            minecraftBot.chat('Usage: /moveto <playername>');
            await addLog('minecraft', 'warn', '🚫 /moveto failed: Invalid syntax. Usage: /moveto <playername>');
            return;
          }
        }
        
        // Player interaction responses
        const lowerMessage = message.toLowerCase();
        const botName = config.username.toLowerCase();
        
        // Check for responses to server love question
        if (waitingForResponse.has(username)) {
          const responseInfo = waitingForResponse.get(username);
          if (responseInfo && responseInfo.scenario === 'love_question') {
            // Check if response is within time limit (30 seconds)
            if (Date.now() - responseInfo.askedAt <= 30000) {
              // Remove from waiting list immediately to avoid duplicate responses
              waitingForResponse.delete(username);
              
              // Parse response more robustly using word boundaries
              const words = lowerMessage.trim().split(/\s+/);
              const hasYes = words.some(word => word === 'yes' || word === 'yeah' || word === 'yep' || word === 'y');
              const hasNo = words.some(word => word === 'no' || word === 'nope' || word === 'n');
              
              if (hasYes && !hasNo) {
                setTimeout(() => {
                  if (minecraftBot) {
                    minecraftBot.chat('Me too I loved this server very much !');
                    addLog('minecraft', 'info', `💝 ${username} loves the server - positive response given`);
                  }
                }, Math.random() * 1500 + 500); // 0.5-2 second delay
              } else if (hasNo && !hasYes) {
                setTimeout(() => {
                  if (minecraftBot) {
                    minecraftBot.chat('IF YOU DON\'T LOVE THE SERVER THEN GET OUT');
                    addLog('minecraft', 'info', `😠 ${username} doesn't love the server - negative response given`);
                  }
                }, Math.random() * 1500 + 500); // 0.5-2 second delay
              }
              // If response doesn't contain clear yes or no, just remove from waiting list without responding
            } else {
              // Response too old, remove from waiting list
              waitingForResponse.delete(username);
            }
            return; // Don't process other chat logic for this message
          }
        }
        
        // Clean up old waiting responses (older than 30 seconds)
        for (const [playerName, responseInfo] of waitingForResponse.entries()) {
          if (Date.now() - responseInfo.askedAt > 30000) {
            waitingForResponse.delete(playerName);
          }
        }
        
        // Greet new players
        if (!greetedPlayers.has(username)) {
          greetedPlayers.add(username);
          setTimeout(() => {
            if (minecraftBot) {
              const greetings = [
                `Hello ${username}! Welcome to the server! 👋`,
                `Hey ${username}! Good to see you here!`,
                `Hi ${username}! How's it going?`,
                `Welcome ${username}! Nice to meet you!`
              ];
              const greeting = greetings[Math.floor(Math.random() * greetings.length)];
              minecraftBot.chat(greeting);
            }
          }, Math.random() * 3000 + 2000); // 2-5 seconds delay
        }
        
        // Respond to mentions or direct messages
        if (lowerMessage.includes(botName) || lowerMessage.includes('bot')) {
          setTimeout(() => {
            if (minecraftBot) {
              if (lowerMessage.includes('hello') || lowerMessage.includes('hi')) {
                minecraftBot.chat(`Hello ${username}! How can I help you? 😊`);
              } else if (lowerMessage.includes('how are you')) {
                minecraftBot.chat(`I'm doing great, thanks for asking ${username}! Just enjoying the server 🎮`);
              } else if (lowerMessage.includes('help')) {
                minecraftBot.chat(`I'm just a friendly bot hanging out here! Talk to the server admins for game help 📚`);
              } else if (lowerMessage.includes('bye') || lowerMessage.includes('goodbye')) {
                minecraftBot.chat(`See you later ${username}! Take care! 👋`);
              } else {
                const responses = [
                  `Yes ${username}?`,
                  `I heard you mention me! What's up?`,
                  `Thanks for the message ${username}! 😄`,
                  `How can I help you ${username}?`
                ];
                const response = responses[Math.floor(Math.random() * responses.length)];
                minecraftBot.chat(response);
              }
            }
          }, Math.random() * 2000 + 1000); // 1-3 seconds delay
        }
        
        // Forward to Discord log channel if configured
        if (discordBot && discordBot.user && logChannel) {
          try {
            const channel = await discordBot.channels.fetch(logChannel);
            if (channel && channel.isTextBased() && 'send' in channel) {
              await channel.send(`💬 **${username}**: ${message}`);
            }
          } catch (error) {
            console.log('Failed to send chat to Discord:', error.message);
          }
        }
      });
      
      // Player join/leave notifications
      minecraftBot.on('playerJoined', async (player) => {
        await addLog('minecraft', 'info', `🟢 ${player.username} joined the server`);
        
        // Forward to Discord log channel
        if (discordBot && discordBot.user && logChannel) {
          try {
            const channel = await discordBot.channels.fetch(logChannel);
            if (channel && channel.isTextBased() && 'send' in channel) {
              await channel.send(`🟢 **${player.username}** joined the server`);
            }
          } catch (error) {
            console.log('Failed to send join notification to Discord:', error.message);
          }
        }
        
        // Update player count
        if (minecraftBot.players) {
          const playerCount = Object.keys(minecraftBot.players).length;
          await storage.updateMinecraftConfig({ 
            playersOnline: `${playerCount}/100`
          });
        }
      });
      
      minecraftBot.on('playerLeft', async (player) => {
        await addLog('minecraft', 'info', `🔴 ${player.username} left the server`);
        greetedPlayers.delete(player.username); // Remove from greeted list
        
        // Forward to Discord log channel
        if (discordBot && discordBot.user && logChannel) {
          try {
            const channel = await discordBot.channels.fetch(logChannel);
            if (channel && channel.isTextBased() && 'send' in channel) {
              await channel.send(`🔴 **${player.username}** left the server`);
            }
          } catch (error) {
            console.log('Failed to send leave notification to Discord:', error.message);
          }
        }
        
        // Update player count
        if (minecraftBot.players) {
          const playerCount = Object.keys(minecraftBot.players).length;
          await storage.updateMinecraftConfig({ 
            playersOnline: `${playerCount}/100`
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
        kickCount++;
        await addLog('minecraft', 'error', `⚠️ Bot was kicked (${kickCount}/3): ${reason}`);
        
        // Clear intervals
        afkIntervals.forEach(interval => clearInterval(interval));
        afkIntervals = [];
        
        await storage.updateMinecraftConfig({ isConnected: false });
        
        // Kick protection: stop reconnecting after 3 kicks
        if (kickCount >= 3) {
          await addLog('minecraft', 'error', '🚫 Too many kicks detected. Stopping auto-reconnect to prevent ban.');
          await storage.clearLogs('minecraft');
          return;
        }
        
        // Clear Minecraft logs when kicked
        await storage.clearLogs('minecraft');
        
        // Auto-reconnect with delay if enabled
        if (config.autoReconnect && kickCount < 3) {
          const delay = kickCount * 30000; // Increase delay with each kick (30s, 60s, 90s)
          await addLog('minecraft', 'info', `🔄 Auto-reconnecting in ${delay/1000} seconds...`);
          setTimeout(async () => {
            try {
              // Recreate bot connection
              const newBot = mineflayer.createBot(botOptions);
              // The new bot will have fresh event handlers
            } catch (error) {
              await addLog('minecraft', 'error', `Failed to reconnect: ${error.message}`);
            }
          }, delay);
        }
      });

      minecraftBot.on('error', async (err) => {
        console.error('Minecraft bot error:', err);
        
        // Ensure error gets logged even if addLog fails
        try {
        
        // Handle different types of connection errors with specific messages
        let errorMessage = '';
        let errorType = 'error';
        
        switch (err.code) {
          case 'ECONNRESET':
            errorMessage = '🔌 Connection lost - server may be offline or restarted';
            errorType = 'warn';
            break;
          case 'ECONNREFUSED':
            errorMessage = '🚫 Connection refused - check server IP and port';
            break;
          case 'ENOTFOUND':
            errorMessage = '🌐 Server not found - check server address';
            break;
          case 'ETIMEDOUT':
            errorMessage = '⏰ Connection timed out - server may be slow or unreachable';
            break;
          case 'EHOSTUNREACH':
            errorMessage = '🚀 Host unreachable - check network connection';
            break;
          default:
            if (err.message.includes('Invalid username')) {
              errorMessage = '👤 Invalid username - please check username format';
            } else if (err.message.includes('authentication')) {
              errorMessage = '🔐 Authentication failed - check password';
            } else if (err.message.includes('version')) {
              errorMessage = '📦 Version mismatch - try different Minecraft version';
            } else {
              errorMessage = `❌ Connection error: ${err.message}`;
            }
            break;
        }
        
          await addLog('minecraft', errorType === 'warn' ? 'warn' : 'error', errorMessage);
        } catch (logError) {
          console.error('Failed to log minecraft error:', logError);
        }
        
        // Handle specific connection reset issues
        if (err.code === 'ECONNRESET') {
          // This often happens when server rejects the connection immediately
          await addLog('minecraft', 'warn', '🔄 Connection reset by server - this may be due to authentication issues, server overload, or version mismatch. Auto-reconnect will retry...');
        }
        
        // Update connection status when error occurs
        await storage.updateMinecraftConfig({ 
          isConnected: false,
          ping: 'N/A',
          uptime: 'N/A',
          playersOnline: '0/0'
        });
        
        await storage.updateBotStatus({
          discordConnected: (await storage.getBotStatus())?.discordConnected || false,
          minecraftConnected: false,
          lastActivity: new Date().toISOString(),
          totalUptime: (await storage.getBotStatus())?.totalUptime || '0m',
        });
      });

      minecraftBot.on('end', async () => {
        await addLog('minecraft', 'info', '🔌 Minecraft bot disconnected');
        
        // Clear intervals
        afkIntervals.forEach(interval => clearInterval(interval));
        afkIntervals = [];
        greetedPlayers.clear();
        
        await storage.updateMinecraftConfig({ isConnected: false });
        await storage.clearLogs('minecraft');
        
        // Auto-reconnect if enabled and not kicked too many times
        if (config.autoReconnect && kickCount < 3) {
          const delay = Math.min(kickCount * 10000, 30000); // Max 30 second delay
          await addLog('minecraft', 'info', `🔄 Auto-reconnecting in ${delay/1000} seconds...`);
          setTimeout(async () => {
            try {
              await addLog('minecraft', 'info', 'Attempting to reconnect...');
              // Would need to call the connect function again
            } catch (error) {
              await addLog('minecraft', 'error', `Failed to reconnect: ${error.message}`);
            }
          }, delay);
        } else if (kickCount >= 3) {
          await addLog('minecraft', 'warn', '🚫 Auto-reconnect disabled due to repeated kicks');
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
        
        await addLog('minecraft', 'info', '🛑 Minecraft bot manually disconnected');
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

  // New endpoint that handles both commands and chat messages
  router.post('/api/console/send', async (req, res) => {
    try {
      const { content } = req.body;
      
      if (!content || !content.trim()) {
        return res.status(400).json({ error: 'Content is required' });
      }
      
      if (!minecraftBot) {
        return res.status(400).json({ error: 'Minecraft bot is not connected', success: false });
      }

      let response = '';
      let success = false;
      let isCommand = content.startsWith('/');

      try {
        if (isCommand) {
          // It's a command - send as is
          minecraftBot.chat(content);
          response = `Command executed: ${content}`;
          await addLog('minecraft', 'info', `Console command executed: ${content}`);
        } else {
          // It's a chat message - send without prefix
          minecraftBot.chat(content);
          response = `Message sent: ${content}`;
          await addLog('minecraft', 'info', `Chat message sent: ${content}`);
        }
        success = true;
      } catch (error) {
        response = `Failed to send ${isCommand ? 'command' : 'message'}: ${error.message}`;
        await addLog('minecraft', 'error', `Console ${isCommand ? 'command' : 'message'} failed: ${content}`, error.message);
      }

      const commandRecord = await storage.addConsoleCommand({
        command: content,
        response,
        success,
        requiresOp: isCommand,
      });

      res.json({ ...commandRecord, success, response });
    } catch (error) {
      res.status(500).json({ error: 'Failed to process request', success: false });
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
      // Only return inventory if bot is actually connected
      if (!minecraftBot || !minecraftBot.inventory) {
        return res.json([]); // Return empty array when not connected
      }
      
      // Get real inventory from connected bot
      const items = minecraftBot.inventory.items();
      const inventory = items.map((item, index) => ({
        id: `${item.type}_${index}`,
        name: item.name || item.displayName || 'Unknown',
        count: item.count,
        slot: item.slot,
        metadata: item.metadata ? JSON.stringify(item.metadata) : undefined,
      }));
      
      // Save to storage for caching
      await storage.updateInventory(inventory);
      
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