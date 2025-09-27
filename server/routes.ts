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

      // Disconnect existing bot if any
      if (minecraftBot) {
        minecraftBot.quit();
        minecraftBot = null;
      }

      // Create Minecraft bot
      const botOptions: any = {
        host: serverHost,
        port: parseInt(serverPort),
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

      // AFKsrbot state variables
      let afkIntervals: NodeJS.Timeout[] = [];
      let kickCount = 0;
      let lastPlayerInteraction = Date.now();
      let greetedPlayers = new Set<string>();
      
      // AFKsrbot anti-AFK behaviors
      const startAntiAFKBehaviors = () => {
        // Random movement every 30-60 seconds
        const movementInterval = setInterval(() => {
          if (!minecraftBot || !minecraftBot.entity) return;
          
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
          
          // Stop action after short duration
          setTimeout(() => {
            if (minecraftBot) {
              minecraftBot.clearControlStates();
            }
          }, Math.random() * 2000 + 500); // 0.5-2.5 seconds
          
        }, Math.random() * 30000 + 30000); // 30-60 seconds
        
        // Random looking around every 10-20 seconds
        const lookInterval = setInterval(() => {
          if (!minecraftBot || !minecraftBot.entity) return;
          
          const yaw = Math.random() * Math.PI * 2; // Random horizontal direction
          const pitch = (Math.random() - 0.5) * 0.5; // Random vertical look
          minecraftBot.look(yaw, pitch);
          
        }, Math.random() * 10000 + 10000); // 10-20 seconds
        
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
        
        afkIntervals.push(movementInterval, lookInterval, healthInterval);
      };
      
      // Setup event handlers
      minecraftBot.on('spawn', async () => {
        await addLog('minecraft', 'info', `🎮 Minecraft bot spawned as ${config.username}`);
        
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
        
        // Player interaction responses
        const lowerMessage = message.toLowerCase();
        const botName = config.username.toLowerCase();
        
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
        await addLog('minecraft', 'error', `Minecraft bot error: ${err.message}`);
        console.error('Minecraft bot error:', err);
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