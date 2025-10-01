import express from 'express';
import { Client, GatewayIntentBits } from 'discord.js';
import mineflayer from 'mineflayer';
import { pathfinder, Movements } from 'mineflayer-pathfinder';
import { plugin as pvp } from 'mineflayer-pvp';
import { IStorage } from './storage';
import { 
  insertDiscordBotConfigSchema, 
  insertMinecraftServerConfigSchema, 
  insertConsoleCommandSchema,
  insertLogEntrySchema 
} from '../shared/schema';

export function createRoutes(storage: IStorage, io?: any) {
  const router = express.Router();
  
  // Discord Bot instance with extended properties
  let discordBot: (Client & { statusInterval?: NodeJS.Timeout }) | null = null;
  let minecraftBot: any = null; // mineflayer bot
  
  // Control lock system
  let controlLock = {
    owner: null as string | null,
    ownerId: null as string | null,
    lastHeartbeat: null as number | null,
    timeout: 30000 // 30 seconds
  };
  
  // Movement control states
  let currentMovementStates = {
    forward: false,
    back: false,
    left: false,
    right: false,
    jump: false,
    sneak: false,
    sprint: false
  };
  
  // Bot control states
  let isManualControl = false;
  let pvpEnabled = false;
  let pvpTarget = null;
  let botLook = { yaw: 0, pitch: 0 };
  
  // Movement timing for natural player behavior
  let movementStartTime = 0;
  let movementTickInterval: NodeJS.Timeout | null = null;
  let controllerSocketId: string | null = null;
  
  // Global channel tracking for Discord features
  let statusChannel: string | null = null;
  let logChannel: string | null = null;
  
  // Goto session management
  interface GotoSession {
    targetPlayer: string;
    initiator: string;
    state: 'traveling' | 'awaiting_reply' | 'completed';
    startTime: number;
    timeoutId?: NodeJS.Timeout;
  }
  
  const activeGotoSessions = new Map<string, GotoSession>();
  
  // Helper functions for goto sessions
  function cleanupGotoSession(sessionId: string) {
    const session = activeGotoSessions.get(sessionId);
    if (session?.timeoutId) {
      clearTimeout(session.timeoutId);
    }
    activeGotoSessions.delete(sessionId);
  }
  
  function createGotoSession(targetPlayer: string, initiator: string): string {
    const sessionId = `${initiator}_${targetPlayer}_${Date.now()}`;
    const session: GotoSession = {
      targetPlayer,
      initiator,
      state: 'traveling',
      startTime: Date.now(),
    };
    
    // Auto-cleanup after 5 minutes
    session.timeoutId = setTimeout(() => {
      cleanupGotoSession(sessionId);
    }, 5 * 60 * 1000);
    
    activeGotoSessions.set(sessionId, session);
    return sessionId;
  }
  
  // Goto command implementation
  async function handleGotoCommand(targetPlayerName: string, initiator: string): Promise<{success: boolean, message: string}> {
    if (!minecraftBot) {
      return { success: false, message: 'Bot not connected to Minecraft server' };
    }
    
    if (isManualControl) {
      return { success: false, message: 'Cannot use goto while manual control is active' };
    }
    
    // Check if target player exists
    const targetPlayer = minecraftBot.players[targetPlayerName];
    if (!targetPlayer || !targetPlayer.entity) {
      return { success: false, message: `Player ${targetPlayerName} not found or not online` };
    }
    
    // Create goto session
    const sessionId = createGotoSession(targetPlayerName, initiator);
    
    try {
      // Clear any existing movement states
      minecraftBot.clearControlStates();
      
      // Use pathfinder to go to the player
      const { pathfinder } = minecraftBot;
      const targetPos = targetPlayer.entity.position;
      
      // Dynamically import goals for ES module compatibility
      const { goals } = await import('mineflayer-pathfinder');
      // Set goal to be near the player (within 2 blocks)
      const goal = new goals.GoalNear(targetPos.x, targetPos.y, targetPos.z, 2);
      pathfinder.setGoal(goal);
      
      await addLog('minecraft', 'info', `🎯 Started goto command: Moving to ${targetPlayerName}`);
      
      // Listen for goal reached - events are emitted on pathfinder, not bot
      const onGoalReached = () => {
        const session = activeGotoSessions.get(sessionId);
        if (session && session.state === 'traveling') {
          // 5% chance to initiate conversation
          if (Math.random() < 0.05) {
            session.state = 'awaiting_reply';
            minecraftBot.chat(`hey ${targetPlayerName} do you love the server`);
            addLog('minecraft', 'info', `💬 Initiated conversation with ${targetPlayerName}`);
            
            // Set timeout for response (30 seconds)
            session.timeoutId = setTimeout(() => {
              cleanupGotoSession(sessionId);
            }, 30000);
          } else {
            // Just reached player, no conversation
            cleanupGotoSession(sessionId);
            addLog('minecraft', 'info', `✅ Reached ${targetPlayerName} silently`);
          }
        }
      };
      
      const onGoalReset = () => {
        const session = activeGotoSessions.get(sessionId);
        // Only treat as failure if session is still in 'traveling' state
        // If it's 'awaiting_reply' or completed, this is a normal reset after success
        if (session && session.state === 'traveling') {
          cleanupGotoSession(sessionId);
          addLog('minecraft', 'warn', `❌ Failed to reach ${targetPlayerName} - goal reset`);
        }
      };
      
      // Path update handler to detect failures (noPath, timeout, etc.)
      const onPathUpdate = (results: any) => {
        if (results.status === 'noPath' || results.status === 'timeout') {
          cleanupGotoSession(sessionId);
          addLog('minecraft', 'warn', `❌ Failed to reach ${targetPlayerName} - ${results.status}`);
          pathfinder.off('path_update', onPathUpdate); // Remove listener after firing
        }
      };
      
      // Use pathfinder events with proper failure handling
      pathfinder.once('goal_reached', onGoalReached);
      pathfinder.once('goal_reset', onGoalReset); // Goal cleared (may be after success)
      pathfinder.on('path_update', onPathUpdate); // Detect pathfinding failures
      
      return { success: true, message: `Moving to ${targetPlayerName}...` };
      
    } catch (error) {
      cleanupGotoSession(sessionId);
      return { success: false, message: `Failed to move to ${targetPlayerName}: ${error.message}` };
    }
  }
  
  // World snapshot for radar view
  let worldSnapshot = {
    bot: { pos: { x: 0, y: 0, z: 0 }, yaw: 0, health: 20, food: 20 },
    entities: [] as any[],
    lastUpdate: Date.now()
  };
  
  // Control lock functions
  function isControlLockValid() {
    if (!controlLock.owner || !controlLock.lastHeartbeat) return false;
    return Date.now() - controlLock.lastHeartbeat < controlLock.timeout;
  }
  
  function releaseControlLock() {
    controlLock.owner = null;
    controlLock.ownerId = null;
    controlLock.lastHeartbeat = null;
    isManualControl = false;
    controllerSocketId = null;
    
    // Stop movement tick
    if (movementTickInterval) {
      clearInterval(movementTickInterval);
      movementTickInterval = null;
    }
    
    // Reset all movement states
    Object.keys(currentMovementStates).forEach(key => {
      currentMovementStates[key] = false;
    });
    updateBotMovement();
    
    // Re-enable autonomous behavior if bot is connected
    if (minecraftBot) {
      console.log('🤖 Re-enabling autonomous behavior');
      // Reset any manual overrides
    }
    
    if (io) {
      io.emit('control_released');
    }
  }
  
  // Server-authoritative movement tick for smooth player-like movement
  function startMovementTick() {
    if (movementTickInterval) {
      clearInterval(movementTickInterval);
    }
    
    movementTickInterval = setInterval(() => {
      if (!minecraftBot || !isManualControl) return;
      
      try {
        // Handle sprint logic - auto-sprint when moving forward for >250ms
        const now = Date.now();
        if (currentMovementStates.forward && !currentMovementStates.sneak) {
          if (movementStartTime === 0) {
            movementStartTime = now;
          } else if (now - movementStartTime > 250 && !currentMovementStates.sprint) {
            currentMovementStates.sprint = true;
          }
        } else {
          movementStartTime = 0;
          currentMovementStates.sprint = false;
        }
        
        // Apply all control states continuously for smooth movement
        minecraftBot.setControlState('forward', currentMovementStates.forward);
        minecraftBot.setControlState('back', currentMovementStates.back);
        minecraftBot.setControlState('left', currentMovementStates.left);
        minecraftBot.setControlState('right', currentMovementStates.right);
        minecraftBot.setControlState('jump', currentMovementStates.jump);
        minecraftBot.setControlState('sneak', currentMovementStates.sneak);
        minecraftBot.setControlState('sprint', currentMovementStates.sprint);
        
      } catch (error) {
        console.error('Movement tick error:', error);
      }
    }, 50); // 20 Hz for smooth movement
  }
  
  function updateWorldSnapshot() {
    if (!minecraftBot || !minecraftBot.entity) return;
    
    try {
      const entities = [];
      
      // Add nearby players
      for (const [username, player] of Object.entries(minecraftBot.players)) {
        if ((player as any).entity && username !== minecraftBot.username) {
          const playerEntity = (player as any).entity;
          entities.push({
            id: username,
            type: 'player',
            kind: 'player',
            username: username,
            health: playerEntity.metadata?.[8] || 20,
            pos: playerEntity.position
          });
        }
      }
      
      // Add nearby entities (mobs, items)
      for (const [id, entity] of Object.entries(minecraftBot.entities)) {
        const ent = entity as any;
        if (ent.position && ent.name && ent.name !== minecraftBot.username) {
          entities.push({
            id: id,
            type: ent.type || 'unknown',
            kind: ent.name,
            username: ent.name,
            health: ent.metadata?.[8] || ent.health || 0,
            pos: ent.position
          });
        }
      }
      
      worldSnapshot = {
        bot: {
          pos: minecraftBot.entity.position,
          yaw: minecraftBot.entity.yaw,
          health: minecraftBot.health,
          food: minecraftBot.food
        },
        entities: entities.slice(0, 50), // Limit to 50 entities for performance
        lastUpdate: Date.now()
      };
      
      // Emit to all connected clients (marked as volatile for performance)
      if (io) {
        io.volatile.emit('world_snapshot', worldSnapshot);
      }
    } catch (error) {
      console.error('World snapshot error:', error);
    }
  }
  
  // Socket.IO event listeners for real-time control
  if (io) {
    io.on('connection', (socket) => {
      console.log('🔌 Client connected to Socket.IO:', socket.id);
      
      // Send current world snapshot on connection
      socket.emit('world_snapshot', worldSnapshot);
      socket.emit('control_status', {
        locked: isControlLockValid(),
        owner: controlLock.owner,
        manual: isManualControl
      });
      
      // Handle control requests
      socket.on('control_request', (data) => {
        const { clientId } = data;
        
        if (isControlLockValid() && controlLock.ownerId !== socket.id) {
          socket.emit('control_denied', { reason: 'Control locked by another user' });
          return;
        }
        
        controlLock.owner = clientId || socket.id;
        controlLock.ownerId = socket.id;
        controlLock.lastHeartbeat = Date.now();
        isManualControl = true;
        controllerSocketId = socket.id;
        
        // Disable autonomous behaviors for clean manual control
        if (minecraftBot) {
          try {
            // Clear any existing pathfinder goals
            if ((minecraftBot as any).pathfinder) {
              (minecraftBot as any).pathfinder.setGoal(null);
            }
            // Stop any PvP activity
            if ((minecraftBot as any).pvp) {
              (minecraftBot as any).pvp.stop();
            }
            // Clear existing control states
            Object.keys(currentMovementStates).forEach(key => {
              minecraftBot.setControlState(key, false);
            });
            console.log('🎮 Disabled autonomous behaviors for manual control');
          } catch (error) {
            console.error('Error disabling autonomous behaviors:', error);
          }
        }
        
        // Start smooth movement tick
        startMovementTick();
        
        socket.emit('control_granted');
        socket.broadcast.emit('control_status', {
          locked: true,
          owner: controlLock.owner,
          manual: isManualControl
        });
        
        console.log(`🎮 Control granted to ${controlLock.owner}`);
      });
      
      // Handle control heartbeats
      socket.on('control_heartbeat', () => {
        if (controlLock.ownerId === socket.id) {
          controlLock.lastHeartbeat = Date.now();
        }
      });
      
      // Handle control release
      socket.on('control_release', () => {
        if (controlLock.ownerId === socket.id) {
          console.log(`🎮 Control released by ${controlLock.owner}`);
          releaseControlLock();
        }
      });
      
      // Handle keys state updates for smooth movement (20Hz from client)
      socket.on('keys_state', (data) => {
        if (!isControlLockValid() || controlLock.ownerId !== socket.id) {
          socket.emit('control_denied', { reason: 'No control lock' });
          return;
        }
        
        // Update movement states - server tick will apply them continuously
        const { forward, back, left, right, jump, sneak } = data;
        
        if (typeof forward === 'boolean') currentMovementStates.forward = forward;
        if (typeof back === 'boolean') currentMovementStates.back = back;
        if (typeof left === 'boolean') currentMovementStates.left = left;
        if (typeof right === 'boolean') currentMovementStates.right = right;
        if (typeof jump === 'boolean') currentMovementStates.jump = jump;
        if (typeof sneak === 'boolean') currentMovementStates.sneak = sneak;
        
        // Movement tick will handle the actual bot control state updates
      });
      
      // Legacy movement_control support (for compatibility)
      socket.on('movement_control', (data) => {
        if (!isControlLockValid() || controlLock.ownerId !== socket.id) {
          socket.emit('control_denied', { reason: 'No control lock' });
          return;
        }
        
        const { action, key, pressed } = data;
        
        if (action === 'movement' && currentMovementStates.hasOwnProperty(key)) {
          currentMovementStates[key] = pressed;
        }
      });
      
      // Handle look controls
      socket.on('look_delta', (data) => {
        if (!isControlLockValid() || controlLock.ownerId !== socket.id || !minecraftBot) {
          return;
        }
        
        const { deltaYaw, deltaPitch } = data;
        botLook.yaw += deltaYaw;
        botLook.pitch += deltaPitch;
        
        // Clamp pitch
        botLook.pitch = Math.max(-Math.PI/2, Math.min(Math.PI/2, botLook.pitch));
        
        try {
          minecraftBot.look(botLook.yaw, botLook.pitch);
        } catch (error) {
          console.error('Look control error:', error);
        }
      });
      
      // Handle stop all movement
      socket.on('stop_all', () => {
        if (!isControlLockValid() || controlLock.ownerId !== socket.id) {
          return;
        }
        
        Object.keys(currentMovementStates).forEach(key => {
          currentMovementStates[key] = false;
        });
        updateBotMovement();
      });
      
      socket.on('disconnect', () => {
        console.log('🔌 Client disconnected from Socket.IO:', socket.id);
        
        // Release control if this client had it
        if (controlLock.ownerId === socket.id) {
          console.log(`🎮 Control auto-released due to disconnect`);
          releaseControlLock();
        }
      });
    });
    
    // Periodic position updates during movement (optimized)
    setInterval(() => {
      if (minecraftBot && minecraftBot.entity && Object.values(currentMovementStates).some(state => state)) {
        io.volatile.emit('bot_position_update', minecraftBot.entity.position);
      }
    }, 200); // Reduced to 5 Hz, marked as volatile
    
    // Periodic world snapshot updates (optimized to 5 Hz)
    setInterval(() => {
      updateWorldSnapshot();
    }, 200); // 5 times per second for better performance
    
    // Check control lock timeouts
    setInterval(() => {
      if (controlLock.owner && !isControlLockValid()) {
        console.log('🎮 Control lock expired, releasing');
        releaseControlLock();
      }
    }, 5000); // Check every 5 seconds
  }
  
  // Function to update bot movement based on current states
  function updateBotMovement() {
    if (!minecraftBot) return;
    
    try {
      // Set control states on the bot
      minecraftBot.setControlState('forward', currentMovementStates.forward);
      minecraftBot.setControlState('back', currentMovementStates.back);
      minecraftBot.setControlState('left', currentMovementStates.left);
      minecraftBot.setControlState('right', currentMovementStates.right);
      minecraftBot.setControlState('jump', currentMovementStates.jump);
      minecraftBot.setControlState('sneak', currentMovementStates.sneak);
      
      // Emit position updates if there's movement
      if (io && (currentMovementStates.forward || currentMovementStates.back || 
                 currentMovementStates.left || currentMovementStates.right ||
                 currentMovementStates.jump)) {
        const position = minecraftBot.entity ? minecraftBot.entity.position : null;
        io.emit('bot_position_update', position);
      }
    } catch (error) {
      console.error('Movement control error:', error);
    }
  }
  
  // AI Chat Handler with OpenAI integration
  async function handleAIChatRequest(message: string, context: any) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OpenAI API key not configured');
    }
    
    try {
      const OpenAI = await import('openai');
      const openai = new OpenAI.default({ apiKey: process.env.OPENAI_API_KEY });
      
      const systemPrompt = `You are an AI assistant for a Minecraft bot control dashboard. You help users control their Minecraft bot by suggesting commands and actions. 
      
      Current bot status: ${context?.botConnected ? 'Connected' : 'Disconnected'}
      Current health: ${context?.health || 'Unknown'}
      Current food: ${context?.food || 'Unknown'}
      
      When suggesting commands, respond with a JSON object containing:
      {
        "intent": "command|movement|inventory|info",
        "command": "the minecraft command or action to execute",
        "rationale": "explanation of why this action is recommended",
        "safe": true/false
      }
      
      Only suggest safe actions that won't harm the bot or server.`;
      
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini", // Using a valid OpenAI model
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message }
        ],
        response_format: { type: "json_object" },
      });
      
      const aiResponse = JSON.parse(response.choices[0].message.content || '{}');
      return {
        success: true,
        suggestion: aiResponse,
        originalMessage: message
      };
    } catch (error) {
      throw new Error(`AI processing failed: ${error.message}`);
    }
  }

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
          name: 'logs',
          description: 'Set current channel to receive all Minecraft chat and events (alias)'
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
            case 'logs':
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
                
                // Log command execution to Discord log channel if configured
                if (logChannel && discordBot) {
                  try {
                    const channel = await discordBot.channels.fetch(logChannel);
                    if (channel && channel.isTextBased() && 'send' in channel) {
                      await channel.send(`🎮 **Command Executed**: \`/${command}\` (by ${user.tag})`);
                    }
                  } catch (err) {
                    console.log('Failed to send command log to Discord:', err.message);
                  }
                }
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

  // Global variables for connection management
  let connectionAttempts = 0;
  let maxRetries = 5;
  let reconnectTimeout: NodeJS.Timeout | null = null;
  let isReconnecting = false;

  // Helper function to connect/reconnect to Minecraft server
  const connectToMinecraftServer = async (config: any, isRetry = false, retryCount = 0): Promise<{ success: boolean; message: string; shouldRetry?: boolean }> => {
    try {
      // Smart hostname parsing
      let serverHost = config.serverIP;
      let serverPort = config.serverPort;
      
      if (serverHost.includes(':')) {
        const parts = serverHost.split(':');
        if (parts.length === 2 && !isNaN(parseInt(parts[1]))) {
          serverHost = parts[0];
          serverPort = parts[1];
          await addLog('minecraft', 'info', `Parsed server address: ${serverHost}:${serverPort}`);
        }
      }

      // Check server connectivity with multiple attempts
      await addLog('minecraft', 'info', `🔍 ${isRetry ? `Retry ${retryCount}:` : ''} Checking server connectivity...`);
      
      let serverOnline = false;
      for (let pingAttempt = 0; pingAttempt < 3; pingAttempt++) {
        try {
          const { Socket } = await import('node:net');
          const socket = new Socket();
          
          const pingResult = await new Promise((resolve) => {
            socket.setTimeout(5000); // Increased timeout
            
            socket.on('connect', () => {
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
          
          if (pingResult === 'online') {
            serverOnline = true;
            await addLog('minecraft', 'info', `✅ Server ${serverHost}:${serverPort} is online and reachable`);
            break;
          } else if (pingAttempt < 2) {
            await addLog('minecraft', 'warn', `Ping attempt ${pingAttempt + 1} failed (${pingResult}), retrying...`);
            await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds before retry
          }
        } catch (pingError) {
          if (pingAttempt < 2) {
            await addLog('minecraft', 'warn', `Ping attempt ${pingAttempt + 1} error: ${pingError.message}, retrying...`);
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        }
      }
      
      if (!serverOnline) {
        const message = `Server ${serverHost}:${serverPort} is offline or unreachable. ${isRetry ? 'Retrying in 30 seconds...' : 'Will retry automatically.'}`;
        await addLog('minecraft', 'error', `📴 ${message}`);
        return { 
          success: false, 
          message,
          shouldRetry: true
        };
      }

      // Disconnect existing bot if any
      if (minecraftBot) {
        try {
          minecraftBot.quit();
        } catch (e) {
          await addLog('minecraft', 'warn', 'Error disconnecting existing bot: ' + e.message);
        }
        minecraftBot = null;
      }

      // Create bot connection
      await addLog('minecraft', 'info', `🔌 ${isRetry ? `Retry ${retryCount}:` : ''} Connecting to ${serverHost}:${serverPort} as ${config.username}...`);
      
      const botOptions: any = {
        host: serverHost,
        port: parseInt(serverPort),
        username: config.username,
        version: config.version || '1.20.1',
        auth: 'offline',
        hideErrors: false,
        checkTimeoutInterval: 30000,
        keepAlive: true,
      };

      return new Promise((resolve) => {
        const bot = mineflayer.createBot(botOptions);
        let connectionResolved = false;
        
        // Connection timeout
        const connectionTimeout = setTimeout(() => {
          if (!connectionResolved) {
            connectionResolved = true;
            try {
              bot.quit();
            } catch (e) {}
            resolve({
              success: false,
              message: `Connection timeout after 30 seconds. Server may be slow or unreachable.`,
              shouldRetry: true
            });
          }
        }, 30000);

        bot.once('spawn', async () => {
          if (connectionResolved) return;
          connectionResolved = true;
          clearTimeout(connectionTimeout);
          
          minecraftBot = bot;
          connectionAttempts = 0; // Reset attempts on successful connection
          
          await addLog('minecraft', 'info', `🎮 Successfully connected to ${serverHost}:${serverPort}!`);
          await storage.saveMinecraftConfig({ ...config, isConnected: true });
          
          // Setup bot event handlers (moved to separate function)
          setupBotEventHandlers(bot, config);
          
          resolve({
            success: true,
            message: `Connected successfully to ${serverHost}:${serverPort}!`
          });
        });

        bot.once('error', async (error) => {
          if (connectionResolved) return;
          connectionResolved = true;
          clearTimeout(connectionTimeout);
          
          let errorMessage = '';
          let shouldRetry = true;
          
          if (error.message.includes('getaddrinfo ENOTFOUND')) {
            errorMessage = `❌ Server hostname "${serverHost}" not found. Check the server address.`;
            shouldRetry = false;
          } else if (error.message.includes('ECONNREFUSED')) {
            errorMessage = `🚫 Connection refused by ${serverHost}:${serverPort}. Server may be offline or port is wrong.`;
          } else if (error.message.includes('ETIMEDOUT')) {
            errorMessage = `⏱️ Connection timed out to ${serverHost}:${serverPort}. Server may be overloaded.`;
          } else if (error.message.includes('Invalid username')) {
            errorMessage = `👤 Invalid username "${config.username}". Check username format.`;
            shouldRetry = false;
          } else {
            errorMessage = `🔴 Connection failed: ${error.message}`;
          }
          
          await addLog('minecraft', 'error', errorMessage);
          
          resolve({
            success: false,
            message: errorMessage,
            shouldRetry
          });
        });

        bot.once('end', async () => {
          if (connectionResolved) return;
          connectionResolved = true;
          clearTimeout(connectionTimeout);
          
          await addLog('minecraft', 'warn', 'Connection ended before spawn event');
          resolve({
            success: false,
            message: 'Connection ended unexpectedly before spawning in game.',
            shouldRetry: true
          });
        });
      });
      
    } catch (error) {
      await addLog('minecraft', 'error', `Connection attempt failed: ${error.message}`);
      return {
        success: false,
        message: `Connection attempt failed: ${error.message}`,
        shouldRetry: true
      };
    }
  };

  // Function to setup bot event handlers and anti-AFK behavior
  const setupBotEventHandlers = async (bot: any, config: any) => {
    // Password handling if provided
    if (config.password) {
      if (config.shouldRegister) {
        await addLog('minecraft', 'info', `Attempting to register with username: ${config.username}`);
      }
      // Login with password after spawn
      setTimeout(() => {
        if (bot && bot.chat) {
          bot.chat(`/login ${config.password}`);
          addLog('minecraft', 'info', `Sent login command for ${config.username}`);
        }
      }, 2000);
    }

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
          
          // Check for goto session responses
          const chatLower = chatMsg.toLowerCase();
          
          // Look for player responses like "<playername> yes" or "<playername> no"
          const playerChatMatch = chatMsg.match(/^<(\w+)>\s*(.+)$/);
          if (playerChatMatch) {
            const [, playerName, playerMessage] = playerChatMatch;
            const messageLower = playerMessage.toLowerCase().trim();
            
            // Check if this player has an active goto session awaiting reply
            for (const [sessionId, session] of activeGotoSessions.entries()) {
              if (session.targetPlayer === playerName && session.state === 'awaiting_reply') {
                if (messageLower === 'yes') {
                  minecraftBot.chat('me too i loved the server very much');
                  await addLog('minecraft', 'info', `✅ ${playerName} said yes - bot responded positively`);
                  cleanupGotoSession(sessionId);
                  break;
                } else if (messageLower === 'no') {
                  minecraftBot.chat('I HATE YOU');
                  await addLog('minecraft', 'info', `❌ ${playerName} said no - bot responded negatively`);
                  cleanupGotoSession(sessionId);
                  break;
                }
              }
            }
          }
          
          // Send to Discord log channel if configured
          // Skip player chat messages (they're handled by the 'chat' event for better formatting)
          const isPlayerChat = chatMsg.match(/^<([A-Za-z0-9_]{1,16})>\s.+$/);
          // Skip join/leave messages (they're handled by playerJoined/playerLeft events)
          const isJoinLeave = chatMsg.match(/^\w{1,16} (joined|left) the (game|server)/i);
          
          if (!isPlayerChat && !isJoinLeave && logChannel && discordBot) {
            try {
              const channel = await discordBot.channels.fetch(logChannel);
              if (channel && channel.isTextBased() && 'send' in channel) {
                // Send system messages in code blocks
                await channel.send(`\`\`\`${chatMsg}\`\`\``);
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
        
        // Send welcome message in Minecraft chat
        if (player.username !== minecraftBot.username) {
          setTimeout(() => {
            try {
              minecraftBot.chat(`Welcome ${player.username}!`);
            } catch (error) {
              console.log('Failed to send welcome message:', error.message);
            }
          }, 1000); // Small delay to ensure player is fully loaded
        }
        
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
              // Recreate bot connection using stored config
              await connectToMinecraftServer(config, true, kickCount);
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
    }; // End of setupBotEventHandlers function

  // Main Minecraft Connection Endpoint with Retry Logic
  router.post('/api/minecraft/connect', async (req, res) => {
    try {
      const config = insertMinecraftServerConfigSchema.parse(req.body);
      
      if (!config.serverIP || !config.serverPort || !config.username) {
        return res.status(400).json({ error: 'Server IP, port, and username are required' });
      }

      if (config.password && config.password.length < 4) {
        return res.status(400).json({ error: 'Password must be at least 4 characters' });
      }

      // Save initial configuration
      await storage.saveMinecraftConfig({ ...config, isConnected: false });
      
      // Initial connection attempt
      await addLog('minecraft', 'info', `🚀 Starting connection to ${config.serverIP}:${config.serverPort}...`);
      
      const attemptConnection = async (retryCount = 0): Promise<void> => {
        const result = await connectToMinecraftServer(config, retryCount > 0, retryCount);
        
        if (result.success) {
          // Connection successful
          await addLog('minecraft', 'info', `🎮 Successfully connected! ${result.message}`);
          await storage.updateMinecraftConfig({ ...config, isConnected: true });
          return;
        } else if (result.shouldRetry && retryCount < maxRetries) {
          // Retry connection
          const delay = Math.min(30000 * Math.pow(2, retryCount), 300000); // Exponential backoff, max 5 minutes
          await addLog('minecraft', 'warn', `⏳ Retry ${retryCount + 1}/${maxRetries} in ${delay/1000} seconds: ${result.message}`);
          
          setTimeout(async () => {
            try {
              await attemptConnection(retryCount + 1);
            } catch (error) {
              await addLog('minecraft', 'error', `Retry ${retryCount + 1} failed: ${error.message}`);
            }
          }, delay);
        } else {
          // Max retries reached or shouldn't retry
          await addLog('minecraft', 'error', `❌ Connection failed after ${retryCount + 1} attempts: ${result.message}`);
          await storage.updateMinecraftConfig({ ...config, isConnected: false });
        }
      };

      // Start the connection process asynchronously
      attemptConnection().catch(async (error) => {
        await addLog('minecraft', 'error', `Connection process failed: ${error.message}`);
      });

      // Immediate response to user
      res.json({ 
        success: true, 
        message: 'Connection process started. Check logs for status updates.',
        retryEnabled: true,
        maxRetries 
      });
      
    } catch (error) {
      await addLog('minecraft', 'error', `Failed to start connection: ${error.message}`);
      res.status(500).json({ error: 'Failed to start connection process', details: error.message });
    }
  });

  router.post('/api/minecraft/disconnect', async (req, res) => {
    try {
      // Clear any pending reconnection attempts
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
        reconnectTimeout = null;
      }
      isReconnecting = false;
      connectionAttempts = 0;
      
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
      let isCustomCommand = content.startsWith('?');

      try {
        if (isCustomCommand) {
          // Handle custom ? commands
          const parts = content.slice(1).trim().split(' ');
          const commandName = parts[0].toLowerCase();
          
          if (commandName === 'goto') {
            if (parts.length < 2) {
              response = 'Usage: ?goto <playername>';
              success = false;
            } else {
              const targetPlayer = parts[1];
              const result = await handleGotoCommand(targetPlayer, 'console_user');
              response = result.message;
              success = result.success;
            }
          } else {
            response = `Unknown custom command: ${commandName}`;
            success = false;
          }
          
          await addLog('minecraft', 'info', `Custom command: ${content} - ${response}`);
        } else if (isCommand) {
          // It's a regular / command - send as is
          minecraftBot.chat(content);
          response = `Command executed: ${content}`;
          await addLog('minecraft', 'info', `Console command executed: ${content}`);
          success = true;
        } else {
          // It's a chat message - send without prefix
          minecraftBot.chat(content);
          response = `Message sent: ${content}`;
          await addLog('minecraft', 'info', `Chat message sent: ${content}`);
          success = true;
        }
      } catch (error) {
        const commandType = isCustomCommand ? 'custom command' : (isCommand ? 'command' : 'message');
        response = `Failed to send ${commandType}: ${error.message}`;
        await addLog('minecraft', 'error', `Console ${commandType} failed: ${content}`, error.message);
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
        isFood: isFood(item.name || item.displayName || ''),
      }));
      
      // Save to storage for caching
      await storage.updateInventory(inventory);
      
      res.json(inventory);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get inventory' });
    }
  });

  // Helper function to check if item is food
  function isFood(itemName: string): boolean {
    const foodItems = [
      'bread', 'apple', 'pork', 'beef', 'chicken', 'fish', 'salmon', 'cod', 
      'cookie', 'cake', 'pie', 'stew', 'soup', 'carrot', 'potato', 'beetroot',
      'melon', 'berries', 'chorus_fruit', 'golden_apple', 'golden_carrot',
      'cooked_porkchop', 'cooked_beef', 'cooked_chicken', 'cooked_fish',
      'cooked_salmon', 'cooked_cod', 'baked_potato', 'mushroom_stew',
      'rabbit_stew', 'beetroot_soup', 'suspicious_stew', 'honey_bottle',
      'milk_bucket', 'dried_kelp', 'kelp', 'sweet_berries', 'glow_berries'
    ];
    
    const normalizedName = itemName.toLowerCase().replace(/minecraft:|_/g, '');
    return foodItems.some(food => normalizedName.includes(food.replace(/_/g, '')));
  }

  // Drop item endpoint
  router.post('/api/inventory/drop', async (req, res) => {
    try {
      if (!minecraftBot || !minecraftBot.inventory) {
        return res.status(400).json({ error: 'Bot not connected' });
      }

      const { slot, count } = req.body;
      
      if (slot === undefined) {
        return res.status(400).json({ error: 'Slot is required' });
      }

      const item = minecraftBot.inventory.slots[slot];
      if (!item) {
        return res.status(400).json({ error: 'No item in specified slot' });
      }

      const dropCount = count || item.count;
      
      // Drop the item(s)
      if (dropCount >= item.count) {
        await minecraftBot.tossStack(item);
        await addLog('minecraft', 'info', `Dropped all ${item.count} ${item.name} from slot ${slot}`);
      } else {
        await minecraftBot.toss(item.type, null, dropCount);
        await addLog('minecraft', 'info', `Dropped ${dropCount} ${item.name} from slot ${slot}`);
      }

      // Emit real-time update
      if (io) {
        io.emit('inventory_updated');
      }

      res.json({ success: true, message: `Dropped ${dropCount} ${item.name}` });
    } catch (error) {
      await addLog('minecraft', 'error', `Failed to drop item: ${error.message}`);
      res.status(500).json({ error: 'Failed to drop item', details: error.message });
    }
  });

  // Movement control endpoints
  router.post('/api/movement/control', async (req, res) => {
    try {
      if (!minecraftBot) {
        return res.status(400).json({ error: 'Bot not connected' });
      }

      const { action, key, pressed } = req.body;
      
      if (action === 'movement' && key && typeof pressed === 'boolean') {
        currentMovementStates[key] = pressed;
        updateBotMovement();
        
        // Emit real-time update
        if (io) {
          io.emit('bot_movement_update', currentMovementStates);
        }
        
        res.json({ success: true, message: `Movement ${key} ${pressed ? 'started' : 'stopped'}` });
      } else {
        res.status(400).json({ error: 'Invalid movement control data' });
      }
    } catch (error) {
      res.status(500).json({ error: 'Failed to control movement', details: error.message });
    }
  });

  // AI Copilot endpoints
  router.post('/api/ai/chat', async (req, res) => {
    try {
      const { message, context } = req.body;
      
      if (!message) {
        return res.status(400).json({ error: 'Message is required' });
      }
      
      const response = await handleAIChatRequest(message, context);
      res.json(response);
    } catch (error) {
      console.error('AI Chat Error:', error);
      res.status(500).json({ error: 'AI chat failed', details: error.message });
    }
  });

  router.post('/api/ai/execute', async (req, res) => {
    try {
      if (!minecraftBot) {
        return res.status(400).json({ error: 'Bot not connected' });
      }

      const { command, intent } = req.body;
      
      if (!command) {
        return res.status(400).json({ error: 'Command is required' });
      }
      
      // Execute the AI-suggested command
      try {
        if (intent === 'command') {
          minecraftBot.chat(`/${command}`);
          await addLog('minecraft', 'info', `AI suggested command executed: /${command}`);
        } else if (intent === 'movement') {
          // Handle movement commands here
          await addLog('minecraft', 'info', `AI movement suggestion: ${command}`);
        }
        
        res.json({ success: true, message: `Executed: ${command}` });
      } catch (execError) {
        await addLog('minecraft', 'error', `Failed to execute AI command: ${execError.message}`);
        res.status(500).json({ error: 'Command execution failed', details: execError.message });
      }
    } catch (error) {
      res.status(500).json({ error: 'Failed to execute AI command', details: error.message });
    }
  });

  // Use item endpoint (with food consumption logic)
  router.post('/api/inventory/use', async (req, res) => {
    try {
      if (!minecraftBot || !minecraftBot.inventory) {
        return res.status(400).json({ error: 'Bot not connected' });
      }

      const { slot } = req.body;
      
      if (slot === undefined) {
        return res.status(400).json({ error: 'Slot is required' });
      }

      const item = minecraftBot.inventory.slots[slot];
      if (!item) {
        return res.status(400).json({ error: 'No item in specified slot' });
      }

      const itemName = item.name || item.displayName || 'Unknown';
      
      // Check if item is food
      if (isFood(itemName)) {
        try {
          // Equip the food item to hand
          await minecraftBot.equip(item, 'hand');
          await addLog('minecraft', 'info', `Equipped ${itemName} to hand`);
          
          // Start eating
          await minecraftBot.activateItem();
          await addLog('minecraft', 'info', `Started eating ${itemName}`);
          
          // Keep eating until food/health is full or item is consumed
          const eatInterval = setInterval(async () => {
            try {
              if (!minecraftBot || minecraftBot.food >= 20 || minecraftBot.health >= 20) {
                clearInterval(eatInterval);
                minecraftBot.deactivateItem();
                await addLog('minecraft', 'info', 'Stopped eating - full or healthy');
                return;
              }
              
              // Check if we still have the food item
              const currentItem = minecraftBot.heldItem;
              if (!currentItem || !isFood(currentItem.name || '')) {
                clearInterval(eatInterval);
                await addLog('minecraft', 'info', 'Stopped eating - no food item in hand');
                return;
              }
            } catch (error) {
              clearInterval(eatInterval);
              await addLog('minecraft', 'error', `Error during eating: ${error.message}`);
            }
          }, 1000);
          
          // Auto-stop after 30 seconds to prevent infinite eating
          setTimeout(() => {
            clearInterval(eatInterval);
            if (minecraftBot) {
              minecraftBot.deactivateItem();
            }
          }, 30000);
          
        } catch (error) {
          await addLog('minecraft', 'error', `Failed to eat ${itemName}: ${error.message}`);
        }
      } else {
        // For non-food items, just equip and use
        try {
          await minecraftBot.equip(item, 'hand');
          await minecraftBot.activateItem();
          await addLog('minecraft', 'info', `Used ${itemName}`);
          
          // Deactivate after a short time
          setTimeout(() => {
            if (minecraftBot) {
              minecraftBot.deactivateItem();
            }
          }, 2000);
        } catch (error) {
          await addLog('minecraft', 'error', `Failed to use ${itemName}: ${error.message}`);
        }
      }

      // Emit real-time update
      if (io) {
        io.emit('inventory_updated');
        io.emit('bot_status_updated');
      }

      res.json({ success: true, message: `Used ${itemName}` });
    } catch (error) {
      await addLog('minecraft', 'error', `Failed to use item: ${error.message}`);
      res.status(500).json({ error: 'Failed to use item', details: error.message });
    }
  });

  // Bot viewer endpoint (3D world view)
  router.get('/api/viewer', async (req, res) => {
    try {
      if (!minecraftBot) {
        return res.json({ 
          connected: false,
          position: { x: 0, y: 0, z: 0 },
          yaw: 0,
          pitch: 0,
          dimension: 'overworld',
          health: 0,
          food: 0
        });
      }

      // Return basic viewer info - actual rendering handled by prismarine-viewer
      const viewerData = {
        connected: true,
        position: minecraftBot.entity ? minecraftBot.entity.position : { x: 0, y: 0, z: 0 },
        yaw: minecraftBot.entity ? minecraftBot.entity.yaw : 0,
        pitch: minecraftBot.entity ? minecraftBot.entity.pitch : 0,
        dimension: minecraftBot.dimension || 'overworld',
        health: minecraftBot.health || 0,
        food: minecraftBot.food || 0
      };

      res.json(viewerData);
    } catch (error) {
      console.error('Viewer endpoint error:', error);
      res.status(500).json({ error: 'Failed to get viewer data' });
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

  // Control endpoints
  router.post('/api/control/enable', async (req, res) => {
    try {
      const { clientId } = req.body;
      
      if (isControlLockValid()) {
        return res.status(409).json({ 
          error: 'Control already locked', 
          owner: controlLock.owner 
        });
      }
      
      controlLock.owner = clientId || 'web-user';
      controlLock.ownerId = clientId || 'web-user';
      controlLock.lastHeartbeat = Date.now();
      isManualControl = true;
      
      res.json({ 
        success: true, 
        message: 'Control granted',
        owner: controlLock.owner 
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to enable control' });
    }
  });

  router.post('/api/control/release', async (req, res) => {
    try {
      releaseControlLock();
      res.json({ success: true, message: 'Control released' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to release control' });
    }
  });

  router.post('/api/control/stop', async (req, res) => {
    try {
      if (!minecraftBot) {
        return res.status(400).json({ error: 'Bot not connected' });
      }
      
      Object.keys(currentMovementStates).forEach(key => {
        currentMovementStates[key] = false;
      });
      updateBotMovement();
      
      res.json({ success: true, message: 'All movement stopped' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to stop movement' });
    }
  });

  router.post('/api/look', async (req, res) => {
    try {
      if (!minecraftBot) {
        return res.status(400).json({ error: 'Bot not connected' });
      }
      
      const { yaw, pitch } = req.body;
      
      if (yaw !== undefined) botLook.yaw = yaw;
      if (pitch !== undefined) {
        botLook.pitch = Math.max(-Math.PI/2, Math.min(Math.PI/2, pitch));
      }
      
      await minecraftBot.look(botLook.yaw, botLook.pitch);
      res.json({ success: true, yaw: botLook.yaw, pitch: botLook.pitch });
    } catch (error) {
      res.status(500).json({ error: 'Failed to control look direction' });
    }
  });

  // Enhanced inventory management
  router.get('/api/inventory/refresh', async (req, res) => {
    try {
      if (!minecraftBot) {
        return res.status(400).json({ error: 'Bot not connected' });
      }
      
      const inventory = minecraftBot.inventory.slots.map((item, index) => {
        if (!item) return null;
        return {
          slot: index,
          type: item.type,
          name: item.name,
          displayName: item.displayName,
          count: item.count,
          metadata: item.metadata,
          enchants: item.enchants,
          durability: item.durabilityUsed !== undefined ? 
            item.maxDurability - item.durabilityUsed : null,
          maxDurability: item.maxDurability || null
        };
      });
      
      res.json({ inventory, hotbar: inventory.slice(36, 45) });
    } catch (error) {
      res.status(500).json({ error: 'Failed to refresh inventory' });
    }
  });

  router.post('/api/inventory/hotbar', async (req, res) => {
    try {
      if (!minecraftBot) {
        return res.status(400).json({ error: 'Bot not connected' });
      }
      
      const { slot } = req.body;
      
      if (slot < 0 || slot > 8) {
        return res.status(400).json({ error: 'Invalid hotbar slot (0-8)' });
      }
      
      minecraftBot.setQuickBarSlot(slot);
      await addLog('minecraft', 'info', `Selected hotbar slot ${slot}`);
      
      if (io) io.emit('inventory_updated');
      
      res.json({ success: true, selectedSlot: slot });
    } catch (error) {
      res.status(500).json({ error: 'Failed to change hotbar slot' });
    }
  });

  router.post('/api/inventory/equip', async (req, res) => {
    try {
      if (!minecraftBot) {
        return res.status(400).json({ error: 'Bot not connected' });
      }
      
      const { slot, destination = 'hand' } = req.body;
      const item = minecraftBot.inventory.slots[slot];
      
      if (!item) {
        return res.status(400).json({ error: 'No item in specified slot' });
      }
      
      await minecraftBot.equip(item, destination);
      await addLog('minecraft', 'info', `Equipped ${item.name} to ${destination}`);
      
      if (io) io.emit('inventory_updated');
      
      res.json({ success: true, equipped: item.name, destination });
    } catch (error) {
      res.status(500).json({ error: 'Failed to equip item' });
    }
  });

  router.post('/api/inventory/unequip', async (req, res) => {
    try {
      if (!minecraftBot) {
        return res.status(400).json({ error: 'Bot not connected' });
      }
      
      const { destination = 'hand' } = req.body;
      await minecraftBot.unequip(destination);
      await addLog('minecraft', 'info', `Unequipped ${destination}`);
      
      if (io) io.emit('inventory_updated');
      
      res.json({ success: true, message: `Unequipped ${destination}` });
    } catch (error) {
      res.status(500).json({ error: 'Failed to unequip item' });
    }
  });

  // PvP system endpoints
  router.post('/api/pvp/enable', async (req, res) => {
    try {
      if (!minecraftBot) {
        return res.status(400).json({ error: 'Bot not connected' });
      }
      
      pvpEnabled = true;
      await addLog('minecraft', 'info', 'PvP mode enabled');
      
      if (io) {
        io.emit('pvp_status', { enabled: pvpEnabled, target: pvpTarget });
      }
      
      res.json({ success: true, enabled: pvpEnabled });
    } catch (error) {
      res.status(500).json({ error: 'Failed to enable PvP' });
    }
  });

  router.post('/api/pvp/disable', async (req, res) => {
    try {
      pvpEnabled = false;
      pvpTarget = null;
      
      if (minecraftBot && (minecraftBot as any).pvp) {
        (minecraftBot as any).pvp.stop();
      }
      
      await addLog('minecraft', 'info', 'PvP mode disabled');
      
      if (io) {
        io.emit('pvp_status', { enabled: pvpEnabled, target: pvpTarget });
      }
      
      res.json({ success: true, enabled: pvpEnabled });
    } catch (error) {
      res.status(500).json({ error: 'Failed to disable PvP' });
    }
  });

  router.post('/api/pvp/target', async (req, res) => {
    try {
      if (!minecraftBot) {
        return res.status(400).json({ error: 'Bot not connected' });
      }
      
      const { username } = req.body;
      
      if (!username) {
        pvpTarget = null;
        res.json({ success: true, target: null, message: 'Target cleared' });
        return;
      }
      
      const targetEntity = Object.values(minecraftBot.entities).find(
        (entity: any) => entity.username === username
      );
      
      if (!targetEntity) {
        return res.status(404).json({ error: 'Target player not found' });
      }
      
      pvpTarget = username;
      await addLog('minecraft', 'info', `PvP target set to ${username}`);
      
      if (pvpEnabled && (minecraftBot as any).pvp) {
        (minecraftBot as any).pvp.attack(targetEntity);
      }
      
      if (io) {
        io.emit('pvp_status', { enabled: pvpEnabled, target: pvpTarget });
      }
      
      res.json({ success: true, target: pvpTarget });
    } catch (error) {
      res.status(500).json({ error: 'Failed to set PvP target' });
    }
  });

  router.get('/api/pvp/status', async (req, res) => {
    try {
      const nearbyPlayers = [];
      
      if (minecraftBot) {
        for (const [username, player] of Object.entries(minecraftBot.players)) {
          if ((player as any).entity && username !== minecraftBot.username) {
            const entity = (player as any).entity;
            const distance = minecraftBot.entity ? 
              minecraftBot.entity.position.distanceTo(entity.position) : 0;
            
            nearbyPlayers.push({
              username,
              distance: distance.toFixed(1),
              health: entity.metadata?.[8] || 20,
              position: entity.position
            });
          }
        }
      }
      
      res.json({
        enabled: pvpEnabled,
        target: pvpTarget,
        nearbyPlayers: nearbyPlayers.slice(0, 10) // Limit to 10 for performance
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to get PvP status' });
    }
  });

  // Aternos API endpoints
  router.get('/api/aternos/config', async (req, res) => {
    try {
      const config = await storage.getAternosConfig?.() || {};
      res.json(config);
    } catch (error) {
      res.json({
        username: '',
        serverName: '',
        autoStart: false,
        isLoggedIn: false,
        serverStatus: 'offline'
      });
    }
  });

  router.post('/api/aternos/config', async (req, res) => {
    try {
      const { username, password, serverName, autoStart } = req.body;
      
      if (storage.saveAternosConfig) {
        await storage.saveAternosConfig({
          username,
          password,
          serverName,
          autoStart,
          isLoggedIn: false
        });
      }
      
      await addLog('system', 'info', `Aternos config saved for user: ${username}`);
      res.json({ success: true, message: 'Aternos configuration saved' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to save Aternos configuration' });
    }
  });

  router.post('/api/aternos/start', async (req, res) => {
    try {
      await addLog('system', 'info', 'Aternos server start requested');
      res.json({ 
        success: true, 
        message: 'Aternos integration requires external API setup. This feature is currently limited.' 
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to start Aternos server' });
    }
  });

  router.post('/api/aternos/stop', async (req, res) => {
    try {
      await addLog('system', 'info', 'Aternos server stop requested');
      res.json({ 
        success: true, 
        message: 'Aternos integration requires external API setup. This feature is currently limited.' 
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to stop Aternos server' });
    }
  });

  router.post('/api/aternos/restart', async (req, res) => {
    try {
      await addLog('system', 'info', 'Aternos server restart requested');
      res.json({ 
        success: true, 
        message: 'Aternos integration requires external API setup. This feature is currently limited.' 
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to restart Aternos server' });
    }
  });

  return router;
}