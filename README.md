# AFKsrbot Dashboard
Discord AFK Bot Management Dashboard with Web Interface

## Features

### 🎮 Minecraft Bot
- **Player interaction**: Greets players and responds to chat messages
- **Smart movement**: Walks around naturally with intelligent wall detection
- **Auto-reconnect**: Handles disconnections and restarts automatically
- **AuthMe support**: Automatically handles login/registration with AuthMe plugin
- **Anti-AFK behavior**: Performs random movements and actions to prevent kicks
- **Natural behavior**: Looks around, greets nearby players, interacts socially  
- **Health monitoring**: Tracks health and food levels
- **Kick protection**: Stops reconnecting after repeated kicks (anti-bot detection)
- **Web status**: Real-time status monitoring dashboard

### 🤖 Discord Bot Integration
- **Real-time monitoring**: Live server status updates with bot health, position, and connection status
- **Chat logging**: See all Minecraft server chat and player activity
- **Remote control**: Start, stop, and restart the bot from Discord
- **Player tracking**: Get notifications when players join or leave
- **Inventory display**: View bot's current inventory items
- **Slash commands**: Easy-to-use Discord commands for full bot control

### 🌐 Web Dashboard
- **Dashboard**: Real-time server statistics and bot status
- **Bot Control**: Configure Discord bot token and connection settings
- **Server Config**: Set Minecraft server IP, port, and AuthMe credentials
- **Inventory**: View and manage bot inventory items
- **Discord Logs**: Monitor all bot activity and server chat
- **Settings**: Customize dashboard preferences and system settings

## Quick Setup

### 1. Clone & Install
```bash
git clone <your-repo-url>
cd afksrbot-dashboard
npm install
```

### 2. Start Development Server
```bash
npm run dev
```

### 3. Configure Bot Settings
1. Open the dashboard at `http://localhost:5173`
2. Navigate to **Bot Control** to set your Discord bot token
3. Go to **Server Config** to configure your Minecraft server details:
   - Server IP (e.g., `127.0.0.1` or your server domain)
   - Server Port (usually `25565`)
   - Bot Username
   - Bot Password (optional, for AuthMe servers)

## Discord Bot Setup

### Create Discord Bot
1. Go to [Discord Developer Portal](https://discord.com/developers/applications) 
2. Create a new application and bot
3. Copy the bot token
4. Invite bot to your server with permissions:
   - Send Messages
   - Use Slash Commands
   - Send Embeds
   - Read Message History
   - Manage Messages
   - Add Reactions

### Bot Commands
- **`/setup`** - Configure channel for live status monitoring
- **`/log`** - Set channel for Minecraft chat logging
- **`/start`** - Start the Minecraft bot
- **`/stop`** - Stop the Minecraft bot
- **`/restart`** - Restart the bot connection
- **`/inventory`** - Display bot's inventory
- **`/command <cmd>`** - Execute Minecraft command

## Configuration

### Minecraft Server Settings
- **Host**: Your server IP or domain
- **Port**: Server port (default: 25565)
- **Username**: Bot's Minecraft username
- **Password**: Required for AuthMe servers only

### Discord Settings
- **Bot Token**: Your Discord bot token
- **Auto-start**: Start bot automatically on server boot
- **Logging**: Enable comprehensive activity logging

## Server Requirements
- Node.js 16+ and npm
- Minecraft server (Java Edition)
- Discord bot token (for Discord features)
- Optional: AuthMe plugin support

## Deployment

### Build for Production
```bash
npm run build
```

### Deploy to Vercel/Netlify
1. Connect your GitHub repository
2. Set build command: `npm run build`
3. Set output directory: `dist`
4. Deploy automatically on push

## Troubleshooting

### Common Issues
- **Bot won't connect**: Check server IP, port, and firewall settings
- **Discord commands not working**: Verify bot permissions and token
- **AuthMe login fails**: Ensure password is correct and account exists
- **Connection timeout**: Check if server is online and accessible

### Debug Mode
Enable debug logging in Settings to see detailed connection info and error messages.

## Contributing
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License
MIT License - See LICENSE file for details

## Support
- Open an issue on GitHub for bugs
- Join our Discord server for help and community support
- Check troubleshooting section for common solutions

---

**⚠️ Note**: This dashboard provides a web interface for bot management. For full functionality, backend integration is required to handle real Discord API connections and Minecraft server communication.