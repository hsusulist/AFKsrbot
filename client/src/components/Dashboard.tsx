import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import BotStatus from "./BotStatus";
import ChatLog from "./ChatLog";
import ControlPanel from "./ControlPanel";
import ServerInfo from "./ServerInfo";
import PlayerList from "./PlayerList";
import InventoryDisplay from "./InventoryDisplay";
import StatsPanel from "./StatsPanel";
import { Button } from "@/components/ui/button";
import { Moon, Sun, Settings, Monitor } from "lucide-react";
import { useTheme } from "./ThemeProvider";
import { socketManager } from "@/lib/socket";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { BotStatus as BotStatusType, ChatMessage, Player, InventoryItem, ServerInfo as ServerInfoType, BotStats } from "@shared/schema";

export default function Dashboard() {
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  
  // Real-time data state
  const [botStatus, setBotStatus] = useState<BotStatusType>({
    isOnline: false,
    isConnected: false,
    health: null,
    food: null,
    position: null,
    uptime: '0s',
    playersNearby: 0
  });
  const [serverInfo, setServerInfo] = useState<ServerInfoType | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [stats, setStats] = useState<BotStats>({
    messagesReceived: 0,
    greetingsSent: 0,
    distanceWalked: 0,
    playersGreeted: 0,
    uptimePercentage: 0,
    interactionsToday: 0
  });

  // Fetch initial data using default authenticated fetcher
  const { data: initialStatus } = useQuery({
    queryKey: ['/api/bot/status'],
    refetchInterval: 10000, // Fallback polling every 10 seconds
  });

  const { data: initialStats } = useQuery({
    queryKey: ['/api/bot/stats'],
    refetchInterval: 30000, // Update stats every 30 seconds
  });

  const { data: initialChatHistory } = useQuery({
    queryKey: ['/api/bot/chat'],
  });

  // Bot control mutations
  const startBotMutation = useMutation({
    mutationFn: () => apiRequest('POST', '/api/bot/start'),
    onSuccess: () => {
      toast({ title: "Bot started successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/bot/status'] });
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to start bot", 
        description: error.message || "Unknown error",
        variant: "destructive" 
      });
    }
  });

  const stopBotMutation = useMutation({
    mutationFn: () => apiRequest('POST', '/api/bot/stop'),
    onSuccess: () => {
      toast({ title: "Bot stopped successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/bot/status'] });
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to stop bot", 
        description: error.message || "Unknown error",
        variant: "destructive" 
      });
    }
  });

  const restartBotMutation = useMutation({
    mutationFn: () => apiRequest('POST', '/api/bot/restart'),
    onSuccess: () => {
      toast({ title: "Bot restart initiated" });
      queryClient.invalidateQueries({ queryKey: ['/api/bot/status'] });
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to restart bot", 
        description: error.message || "Unknown error",
        variant: "destructive" 
      });
    }
  });

  // Set up WebSocket connection and listeners
  useEffect(() => {
    const socket = socketManager.connect();

    // Set up event listeners
    const handleBotStatus = (status: BotStatusType) => setBotStatus(status);
    const handleServerInfo = (info: ServerInfoType) => setServerInfo(info);
    const handleChatMessage = (message: ChatMessage) => {
      setChatMessages(prev => [...prev.slice(-99), message]); // Keep last 100 messages
    };
    const handleChatHistory = (history: ChatMessage[]) => setChatMessages(history);
    const handlePlayers = (playerList: Player[]) => setPlayers(playerList);
    const handleInventory = (items: InventoryItem[]) => setInventory(items);
    const handleBotError = (error: string) => {
      toast({ 
        title: "Bot Error", 
        description: error,
        variant: "destructive" 
      });
    };

    socketManager.on('botStatus', handleBotStatus);
    socketManager.on('serverInfo', handleServerInfo);
    socketManager.on('chatMessage', handleChatMessage);
    socketManager.on('chatHistory', handleChatHistory);
    socketManager.on('players', handlePlayers);
    socketManager.on('inventory', handleInventory);
    socketManager.on('botError', handleBotError);

    // Request initial data
    socketManager.requestBotStatus();
    socketManager.requestChatHistory();

    // Cleanup on unmount
    return () => {
      socketManager.off('botStatus', handleBotStatus);
      socketManager.off('serverInfo', handleServerInfo);
      socketManager.off('chatMessage', handleChatMessage);
      socketManager.off('chatHistory', handleChatHistory);
      socketManager.off('players', handlePlayers);
      socketManager.off('inventory', handleInventory);
      socketManager.off('botError', handleBotError);
    };
  }, [toast]);

  // Update state from initial API calls with proper type checking
  useEffect(() => {
    if (initialStatus && typeof initialStatus === 'object') {
      const status = initialStatus as any;
      setBotStatus({
        isOnline: status.isOnline ?? false,
        isConnected: status.isConnected ?? false,
        health: status.health ?? null,
        food: status.food ?? null,
        position: status.position ?? null,
        uptime: status.uptime ?? '0s',
        playersNearby: status.playersNearby ?? 0
      });
      if (status.serverInfo && typeof status.serverInfo === 'object') {
        setServerInfo(status.serverInfo as ServerInfoType);
      }
    }
  }, [initialStatus]);

  useEffect(() => {
    if (initialStats && typeof initialStats === 'object') {
      const stats = initialStats as any;
      setStats({
        messagesReceived: stats.messagesReceived ?? 0,
        greetingsSent: stats.greetingsSent ?? 0,
        distanceWalked: stats.distanceWalked ?? 0,
        playersGreeted: stats.playersGreeted ?? 0,
        uptimePercentage: stats.uptimePercentage ?? 0,
        interactionsToday: stats.interactionsToday ?? 0
      });
    }
  }, [initialStats]);

  useEffect(() => {
    if (initialChatHistory && Array.isArray(initialChatHistory)) {
      setChatMessages(initialChatHistory as ChatMessage[]);
    }
  }, [initialChatHistory]);

  const handleThemeToggle = () => {
    if (theme === "dark") {
      setTheme("light");
    } else {
      setTheme("dark");
    }
  };

  const handleStartBot = () => {
    startBotMutation.mutate();
  };

  const handleStopBot = () => {
    stopBotMutation.mutate();
  };

  const handleRestartBot = () => {
    restartBotMutation.mutate();
  };

  const handleSettings = () => {
    toast({ title: "Settings panel coming soon!" });
  };

  return (
    <div className="min-h-screen bg-background" data-testid="dashboard-main">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-card/50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                <Monitor className="h-4 w-4 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold" data-testid="text-app-title">
                  AFKsrbot Dashboard
                </h1>
                <p className="text-sm text-muted-foreground">
                  24/7 Minecraft Bot Control Center
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={handleThemeToggle}
                data-testid="button-theme-toggle"
              >
                {theme === "dark" ? (
                  <Sun className="h-4 w-4" />
                ) : (
                  <Moon className="h-4 w-4" />
                )}
              </Button>
              <Button
                variant="outline" 
                size="icon"
                onClick={handleSettings}
                data-testid="button-settings-main"
              >
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Dashboard */}
      <main className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Left Column */}
          <div className="space-y-6">
            <BotStatus
              isOnline={botStatus.isConnected}
              health={botStatus.health || 0}
              food={botStatus.food || 0}
              position={botStatus.position || { x: 0, y: 0, z: 0 }}
              uptime={botStatus.uptime}
              playersNearby={botStatus.playersNearby}
            />
            
            <ControlPanel
              isConnected={botStatus.isConnected}
              isRunning={botStatus.isConnected}
              onStart={handleStartBot}
              onStop={handleStopBot}
              onRestart={handleRestartBot}
              onSettings={handleSettings}
            />

            {serverInfo && (
              <ServerInfo
                host={serverInfo.host}
                port={serverInfo.port}
                isConnected={serverInfo.isConnected}
                playerCount={serverInfo.playerCount}
                maxPlayers={serverInfo.maxPlayers}
                ping={serverInfo.ping}
                version={serverInfo.version}
              />
            )}
          </div>

          {/* Center Column */}
          <div className="space-y-6">
            <ChatLog messages={chatMessages} />
            
            <PlayerList 
              players={players} 
              totalOnline={serverInfo?.playerCount || 0} 
            />
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            <StatsPanel stats={stats} />
            
            <InventoryDisplay 
              items={inventory} 
              totalSlots={36} 
            />
          </div>
        </div>
      </main>
    </div>
  );
}