import { useState } from "react";
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

export default function Dashboard() {
  const { theme, setTheme } = useTheme();
  const [botRunning, setBotRunning] = useState(true);
  const [connected, setConnected] = useState(true);

  // todo: remove mock functionality - all data below would come from real bot API
  const mockChatMessages = [
    {
      id: '1',
      timestamp: '14:32:15',
      player: 'Steve123',
      message: 'Hey everyone!',
      type: 'chat' as const
    },
    {
      id: '2', 
      timestamp: '14:32:18',
      player: 'AFKsrbot',
      message: 'Hi Steve123! Do you love the server?',
      type: 'bot' as const
    },
    {
      id: '3',
      timestamp: '14:32:22',
      player: 'Steve123', 
      message: 'Yes I do!',
      type: 'chat' as const
    },
    {
      id: '4',
      timestamp: '14:32:25',
      player: 'AFKsrbot',
      message: 'Me too I loved the server very much',
      type: 'bot' as const
    },
    {
      id: '5',
      timestamp: '14:33:10',
      player: 'Server',
      message: 'Player Miner456 joined the game',
      type: 'join' as const
    }
  ];

  const mockPlayers = [
    {
      id: '1',
      username: 'Steve123',
      ping: 45,
      isOperator: false,
      distance: 234,
      lastSeen: '2 min ago'
    },
    {
      id: '2', 
      username: 'AdminUser',
      ping: 23,
      isOperator: true,
      distance: 1250,
      lastSeen: '5 min ago'
    },
    {
      id: '3',
      username: 'Miner456',
      ping: 78,
      isOperator: false,
      distance: 89,
      lastSeen: '1 min ago'
    }
  ];

  const mockInventory = [
    {
      id: '1',
      name: 'Diamond Sword',
      count: 1,
      slot: 0,
      type: 'weapon' as const
    },
    {
      id: '2',
      name: 'Iron Chestplate',
      count: 1,
      slot: 1,
      type: 'armor' as const
    },
    {
      id: '3',
      name: 'Cooked Beef',
      count: 32,
      slot: 2,
      type: 'food' as const
    }
  ];

  const mockStats = {
    messagesReceived: 2847,
    greetingsSent: 189,
    distanceWalked: 15234,
    playersGreeted: 47,
    uptimePercentage: 97,
    interactionsToday: 23
  };

  const handleThemeToggle = () => {
    if (theme === "dark") {
      setTheme("light");
    } else {
      setTheme("dark");
    }
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
                onClick={() => console.log('Settings opened')}
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
              isOnline={connected}
              health={95}
              food={78}
              position={{ x: 1234, y: 64, z: -567 }}
              uptime="2h 14m"
              playersNearby={3}
            />
            
            <ControlPanel
              isConnected={connected}
              isRunning={botRunning}
              onStart={() => {
                setBotRunning(true);
                console.log('Bot started');
              }}
              onStop={() => {
                setBotRunning(false);
                console.log('Bot stopped');
              }}
              onRestart={() => console.log('Bot restarted')}
              onSettings={() => console.log('Settings opened')}
            />

            <ServerInfo
              host="play.example.com"
              port={25565}
              isConnected={connected}
              playerCount={24}
              maxPlayers={50}
              ping={37}
              version="1.21.1"
            />
          </div>

          {/* Center Column */}
          <div className="space-y-6">
            <ChatLog messages={mockChatMessages} />
            
            <PlayerList 
              players={mockPlayers} 
              totalOnline={24} 
            />
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            <StatsPanel stats={mockStats} />
            
            <InventoryDisplay 
              items={mockInventory} 
              totalSlots={36} 
            />
          </div>
        </div>
      </main>
    </div>
  );
}