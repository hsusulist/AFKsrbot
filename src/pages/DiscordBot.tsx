import { useState } from "react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
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

export default function DiscordBot() {
  const [botToken, setBotToken] = useState("");
  const [showToken, setShowToken] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [autoStart, setAutoStart] = useState(false);
  const [logCommands, setLogCommands] = useState(true);
  const { toast } = useToast();

  const handleConnect = () => {
    if (!botToken.trim()) {
      toast({
        title: "Error",
        description: "Please enter a Discord bot token",
        variant: "destructive"
      });
      return;
    }

    setIsConnected(true);
    toast({
      title: "Success",
      description: "Discord bot token connected!",
    });
  };

  const handleDisconnect = () => {
    setIsConnected(false);
    toast({
      title: "Disconnected",
      description: "Discord bot has been disconnected",
      variant: "destructive"
    });
  };

  const copyToken = () => {
    if (botToken) {
      navigator.clipboard.writeText(botToken);
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
                      placeholder="Enter your Discord bot token"
                      value={botToken}
                      onChange={(e) => setBotToken(e.target.value)}
                      className="pr-20"
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
                <p className="text-xs text-muted-foreground mt-1">
                  Get your token from Discord Developer Portal
                </p>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="auto-start">Auto-start on launch</Label>
                  <p className="text-xs text-muted-foreground">Start bot automatically when dashboard loads</p>
                </div>
                <Switch
                  id="auto-start"
                  checked={autoStart}
                  onCheckedChange={setAutoStart}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="log-commands">Log all commands</Label>
                  <p className="text-xs text-muted-foreground">Record all Discord commands in logs</p>
                </div>
                <Switch
                  id="log-commands"
                  checked={logCommands}
                  onCheckedChange={setLogCommands}
                />
              </div>

              <div className="flex gap-2 pt-4">
                {!isConnected ? (
                  <Button onClick={handleConnect} className="gradient-gaming glow-primary">
                    <Bot className="w-4 h-4 mr-2" />
                    Connect Bot
                  </Button>
                ) : (
                  <Button onClick={handleDisconnect} variant="destructive">
                    <XCircle className="w-4 h-4 mr-2" />
                    Disconnect Bot
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
                <span className="text-sm font-mono">{isConnected ? "1" : "0"}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <span className="text-sm font-medium">Commands Executed</span>
                <span className="text-sm font-mono">{isConnected ? "47" : "0"}</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <span className="text-sm font-medium">Uptime</span>
                <span className="text-sm font-mono">{isConnected ? "2h 34m" : "0m"}</span>
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