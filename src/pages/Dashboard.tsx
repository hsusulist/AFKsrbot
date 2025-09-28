import Layout from "@/components/Layout";
import StatCard from "@/components/StatCard";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { 
  Users, 
  MessageSquare, 
  Bot, 
  Server, 
  Play, 
  Pause, 
  RotateCcw,
  Activity,
  XCircle
} from "lucide-react";

export default function Dashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get Discord bot config and status
  const { data: discordConfig, isLoading: discordLoading } = useQuery({
    queryKey: ['/api/discord/config'],
  });

  // Get Minecraft bot config and status
  const { data: minecraftConfig, isLoading: minecraftLoading } = useQuery({
    queryKey: ['/api/minecraft/config'],
  });

  // Type the Discord config
  const typedDiscordConfig = discordConfig as {
    isConnected?: boolean;
    guildCount?: number;
    commandsExecuted?: number;
    uptime?: string;
    hasToken?: boolean;
  } | undefined;

  // Type the Minecraft config
  const typedMinecraftConfig = minecraftConfig as {
    isConnected?: boolean;
    ping?: string;
    uptime?: string;
    playersOnline?: string;
  } | undefined;

  const isDiscordConnected = typedDiscordConfig?.isConnected || false;
  const isMinecraftConnected = typedMinecraftConfig?.isConnected || false;

  // Connect Discord bot mutation
  const connectDiscordMutation = useMutation({
    mutationFn: () => apiRequest('/api/discord/connect', {
      method: 'POST',
      body: JSON.stringify({}),
    }),
    onSuccess: () => {
      toast({
        title: "🎉 Bot Connected!",
        description: "🤖 Discord bot is now online and ready for commands!",
        duration: 5000,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/discord/config'] });
    },
    onError: (error: any) => {
      const errorMsg = error.message || "Failed to connect";
      let description = "❌ Connection failed";
      
      if (errorMsg.includes("TOKEN") || errorMsg.includes("INVALID") || errorMsg.includes("UNAUTHORIZED")) {
        description = "❌ No valid Discord bot token found. Please go to Discord Bot page to add your token.";
      }
      
      toast({
        title: "Connection Failed",
        description: description,
        variant: "destructive",
        duration: 5000,
      });
    },
  });

  // Disconnect Discord bot mutation
  const disconnectDiscordMutation = useMutation({
    mutationFn: () => apiRequest('/api/discord/disconnect', {
      method: 'POST',
    }),
    onSuccess: () => {
      toast({
        title: "Bot Disconnected",
        description: "Discord bot has been safely disconnected",
        duration: 3000,
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

  const handleConnect = () => {
    if (!typedDiscordConfig?.hasToken) {
      toast({
        title: "Token Required",
        description: "Please go to Discord Bot page to add your bot token first",
        variant: "destructive"
      });
      return;
    }
    connectDiscordMutation.mutate();
  };

  const handleDisconnect = () => {
    disconnectDiscordMutation.mutate();
  };

  return (
    <Layout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
            <p className="text-muted-foreground">Monitor and control your Discord bot</p>
          </div>
          <div className="flex gap-2">
            {!isDiscordConnected ? (
              <Button 
                onClick={handleConnect} 
                size="sm" 
                className="gradient-gaming glow-primary"
                disabled={connectDiscordMutation.isPending || discordLoading}
              >
                <Bot className="w-4 h-4 mr-2" />
                {connectDiscordMutation.isPending ? "Connecting..." : "Connect Bot"}
              </Button>
            ) : (
              <Button 
                onClick={handleDisconnect} 
                variant="destructive"
                size="sm"
                disabled={disconnectDiscordMutation.isPending || discordLoading}
              >
                <XCircle className="w-4 h-4 mr-2" />
                {disconnectDiscordMutation.isPending ? "Disconnecting..." : "Disconnect Bot"}
              </Button>
            )}
            <Button variant="outline" size="sm" disabled>
              <RotateCcw className="w-4 h-4 mr-2" />
              Restart Bot
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Discord Guilds"
            value={typedDiscordConfig?.guildCount?.toString() || "0"}
            description="Connected servers"
            icon={<Users className="w-6 h-6 text-primary" />}
            trend={isDiscordConnected ? "up" : "neutral"}
          />
          <StatCard
            title="Bot Commands"
            value={typedDiscordConfig?.commandsExecuted?.toString() || "0"}
            description="Commands executed today"
            icon={<MessageSquare className="w-6 h-6 text-accent" />}
            trend="neutral"
          />
          <StatCard
            title="Discord Uptime"
            value={isDiscordConnected ? (typedDiscordConfig?.uptime || "Online") : "Offline"}
            description={isDiscordConnected ? "Discord bot connected" : "Not connected to Discord"}
            icon={<Server className={`w-6 h-6 ${isDiscordConnected ? 'text-success' : 'text-muted-foreground'}`} />}
            trend={isDiscordConnected ? "up" : "neutral"}
          />
          <StatCard
            title="Bot Status"
            value={isDiscordConnected ? "Connected" : "Disconnected"}
            description={isDiscordConnected ? "Ready for commands" : "Ready to connect"}
            icon={<Bot className={`w-6 h-6 ${isDiscordConnected ? 'text-success' : 'text-muted-foreground'}`} />}
            trend={isDiscordConnected ? "up" : "neutral"}
          />
        </div>

        {/* Quick Actions & Logs */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Quick Actions */}
          <Card className="glass-effect p-6">
            <h3 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" />
              Quick Actions
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" className="h-16 flex-col">
                <Bot className="w-6 h-6 mb-2" />
                Configure Bot
              </Button>
              <Button variant="outline" className="h-16 flex-col">
                <Server className="w-6 h-6 mb-2" />
                Server Settings
              </Button>
              <Button variant="outline" className="h-16 flex-col">
                <MessageSquare className="w-6 h-6 mb-2" />
                View Logs
              </Button>
              <Button variant="outline" className="h-16 flex-col">
                <Users className="w-6 h-6 mb-2" />
                Manage Users
              </Button>
            </div>
          </Card>

          {/* Recent Activity */}
          <Card className="glass-effect p-6">
            <h3 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-primary" />
              Recent Activity
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-center p-8 text-center">
                <div className="text-muted-foreground">
                  <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No recent activity</p>
                  <p className="text-xs mt-1">Activity will appear here when your bot is active</p>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </Layout>
  );
}