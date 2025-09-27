import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAutosave } from "@/hooks/useAutosave";
import { 
  Bot, 
  Shield, 
  MessageSquare, 
  Users, 
  Settings,
  CheckCircle,
  XCircle,
  Eye,
  EyeOff,
  Copy,
  ExternalLink
} from "lucide-react";

interface DiscordBotSettings {
  botToken: string;
  autoStart: boolean;
  logCommands: boolean;
}

const defaultSettings: DiscordBotSettings = {
  botToken: "",
  autoStart: false,
  logCommands: true
};

export default function DiscordBot() {
  const [showToken, setShowToken] = useState(false);
  const { toast } = useToast();
  
  // Auto-save Discord bot settings
  const { data: settings, setData: setSettings, isLoading: isAutoSaving, lastSaved } = useAutosave<DiscordBotSettings>(
    'discord-bot-settings',
    defaultSettings,
    {
      debounceMs: 1000,
      onSave: () => {
        console.log('Discord bot settings auto-saved');
      }
    }
  );

  // Get current Discord config
  const { data: config, isLoading } = useQuery({
    queryKey: ['/api/discord/config'],
  });

  // Type the config
  const typedConfig = config as {
    isConnected?: boolean;
    autoStart?: boolean;
    logCommands?: boolean;
    guildCount?: number;
    commandsExecuted?: number;
    uptime?: string;
    lastConnected?: string;
    hasToken?: boolean;
  } | undefined;

  const isConnected = typedConfig?.isConnected || false;

  // Update settings when config loads
  useEffect(() => {
    if (typedConfig) {
      setSettings(prev => ({
        ...prev,
        autoStart: typedConfig.autoStart || false,
        logCommands: typedConfig.logCommands !== undefined ? typedConfig.logCommands : true,
        // Don't auto-fill token for security
      }));
    }
  }, [typedConfig, setSettings]);

  // Handle settings changes with auto-save and immediate server sync
  const handleAutoStartChange = (checked: boolean) => {
    setSettings(prev => ({ ...prev, autoStart: checked }));
    updateSettingsMutation.mutate({ autoStart: checked });
  };

  const handleLogCommandsChange = (checked: boolean) => {
    setSettings(prev => ({ ...prev, logCommands: checked }));
    updateSettingsMutation.mutate({ logCommands: checked });
  };
  
  const handleTokenChange = (value: string) => {
    setSettings(prev => ({ ...prev, botToken: value }));
  };

  // Connect mutation
  const connectMutation = useMutation({
    mutationFn: (data: any) => apiRequest('/api/discord/connect', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    onSuccess: () => {
      toast({
        title: "Connected!",
        description: "🤖 Discord bot connected! Check logs for details.",
      });
      setSettings(prev => ({ ...prev, botToken: "" })); // Clear token from input for security
      queryClient.invalidateQueries({ queryKey: ['/api/discord/config'] });
    },
    onError: (error: any) => {
      const errorMsg = error.message || "Failed to connect";
      let description = "❌ Connection failed";
      
      if (errorMsg.includes("TOKEN") || errorMsg.includes("INVALID") || errorMsg.includes("UNAUTHORIZED")) {
        description = "❌ Invalid Discord bot token - please check your token";
      } else if (errorMsg.includes("MISSING") || errorMsg.includes("ACCESS")) {
        description = "❌ Bot missing required permissions";
      }
      
      toast({
        title: "Connection Failed",
        description: description,
        variant: "destructive",
      });
    },
  });

  // Disconnect mutation
  const disconnectMutation = useMutation({
    mutationFn: () => apiRequest('/api/discord/disconnect', {
      method: 'POST',
    }),
    onSuccess: () => {
      toast({
        title: "Disconnected",
        description: "Discord bot has been disconnected",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/discord/config'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to disconnect",
        variant: "destructive",
      });
    },
  });

  // Update settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: (data: any) => apiRequest('/api/discord/config', {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/discord/config'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update settings",
        variant: "destructive",
      });
    },
  });

  const handleConnect = () => {
    // If we have a stored token and no new token entered, use the stored one
    if (!settings.botToken.trim() && !typedConfig?.hasToken) {
      toast({
        title: "Error",
        description: "Please enter a Discord bot token",
        variant: "destructive"
      });
      return;
    }

    const connectData: any = {
      autoStart: settings.autoStart,
      logCommands: settings.logCommands,
    };
    
    // Only include token if a new one was entered
    if (settings.botToken.trim()) {
      connectData.token = settings.botToken;
    }

    connectMutation.mutate(connectData);
  };

  const handleDisconnect = () => {
    disconnectMutation.mutate();
  };

  const copyToken = () => {
    if (settings.botToken) {
      navigator.clipboard.writeText(settings.botToken);
      toast({
        title: "Copied",
        description: "Bot token copied to clipboard",
      });
    }
  };

  return (
    <Layout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Discord Bot</h1>
            <p className="text-muted-foreground">Configure and manage your Discord bot integration</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={isConnected ? "default" : "secondary"} className="flex items-center gap-1">
              {isConnected ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
              {isConnected ? "Connected" : "Disconnected"}
            </Badge>
          </div>
        </div>

        {/* Bot Configuration */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="glass-effect p-6">
            <h3 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
              <Bot className="w-5 h-5 text-primary" />
              Bot Configuration
            </h3>
            <div className="space-y-4">
              <div>
                <Label htmlFor="token">Discord Bot Token</Label>
                <div className="flex gap-2 mt-1">
                  <div className="relative flex-1">
                    <Input
                      id="token"
                      type={showToken ? "text" : "password"}
                      placeholder={typedConfig?.hasToken ? "Token configured (enter new to change)" : "Enter your Discord bot token"}
                      value={settings.botToken}
                      onChange={(e) => handleTokenChange(e.target.value)}
                      className="pr-20 transition-all duration-150 ease-out"
                      disabled={isLoading}
                    />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowToken(!showToken)}
                        className="p-1 h-6 w-6"
                      >
                        {showToken ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={copyToken}
                        className="p-1 h-6 w-6"
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground mt-1">
                  <span>Get your token from Discord Developer Portal</span>
                  <div className="flex items-center gap-2">
                    {isAutoSaving && (
                      <div className="flex items-center gap-1 text-primary">
                        <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                        <span>Saving...</span>
                      </div>
                    )}
                    {lastSaved && (
                      <span className="text-success">
                        Saved: {lastSaved.toLocaleTimeString()}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="auto-start">Auto-start on launch</Label>
                  <p className="text-xs text-muted-foreground">Start bot automatically when dashboard loads</p>
                </div>
                <Switch
                  id="auto-start"
                  checked={settings.autoStart}
                  onCheckedChange={handleAutoStartChange}
                  disabled={isLoading || updateSettingsMutation.isPending}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="log-commands">Log all commands</Label>
                  <p className="text-xs text-muted-foreground">Record all Discord commands in logs</p>
                </div>
                <Switch
                  id="log-commands"
                  checked={settings.logCommands}
                  onCheckedChange={handleLogCommandsChange}
                  disabled={isLoading || updateSettingsMutation.isPending}
                />
              </div>

              <div className="flex gap-2 pt-4">
                {!isConnected ? (
                  <Button 
                    onClick={handleConnect} 
                    className="gradient-gaming glow-primary transition-all duration-150 ease-out hover:scale-105"
                    disabled={connectMutation.isPending || isLoading}
                  >
                    <Bot className="w-4 h-4 mr-2" />
                    {connectMutation.isPending ? "Connecting..." : typedConfig?.hasToken && !settings.botToken.trim() ? "Reconnect Bot" : "Connect Bot"}
                  </Button>
                ) : (
                  <Button 
                    onClick={handleDisconnect} 
                    variant="destructive"
                    disabled={disconnectMutation.isPending || isLoading}
                    className="transition-all duration-150 ease-out hover:scale-105"
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    {disconnectMutation.isPending ? "Disconnecting..." : "Disconnect Bot"}
                  </Button>
                )}
                <Button variant="outline" asChild>
                  <a href="https://discord.com/developers/applications" target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Developer Portal
                  </a>
                </Button>
              </div>
            </div>
          </Card>

          {/* Bot Status */}
          <Card className="glass-effect p-6">
            <h3 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              Bot Status
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <span className="text-sm font-medium">Connection Status</span>
                <Badge variant={isConnected ? "default" : "secondary"}>
                  {isConnected ? "Online" : "Offline"}
                </Badge>
              </div>
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <span className="text-sm font-medium">Guilds Connected</span>
                <span className="text-sm font-mono">{typedConfig?.guildCount || 0}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <span className="text-sm font-medium">Commands Executed</span>
                <span className="text-sm font-mono">{typedConfig?.commandsExecuted || 0}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <span className="text-sm font-medium">Uptime</span>
                <span className="text-sm font-mono">{typedConfig?.uptime || "0m"}</span>
              </div>
            </div>
          </Card>
        </div>

        {/* Required Permissions */}
        <Card className="glass-effect p-6">
          <h3 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
            <Settings className="w-5 h-5 text-primary" />
            Required Bot Permissions
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {[
              "Send Messages",
              "Use Slash Commands", 
              "Send Embeds",
              "Read Message History",
              "Manage Messages",
              "Add Reactions",
              "View Channels",
              "Connect",
              "Speak"
            ].map((permission) => (
              <div key={permission} className="flex items-center gap-2 p-2 bg-muted/30 rounded">
                <CheckCircle className="w-4 h-4 text-success" />
                <span className="text-sm">{permission}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Available Commands */}
        <Card className="glass-effect p-6">
          <h3 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-primary" />
            Available Discord Commands
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { command: "/setup", description: "Configure live status monitoring channel" },
              { command: "/log", description: "Set channel for Minecraft chat logging" },
              { command: "/start", description: "Start the Minecraft bot" },
              { command: "/stop", description: "Stop the Minecraft bot" },
              { command: "/restart", description: "Restart the bot connection" },
              { command: "/inventory", description: "Display bot's inventory" },
              { command: "/command <cmd>", description: "Execute Minecraft command" },
              { command: "/status", description: "Show bot connection status" }
            ].map((cmd) => (
              <div key={cmd.command} className="p-3 bg-muted/30 rounded-lg">
                <code className="text-sm font-mono text-primary">{cmd.command}</code>
                <p className="text-xs text-muted-foreground mt-1">{cmd.description}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </Layout>
  );
}