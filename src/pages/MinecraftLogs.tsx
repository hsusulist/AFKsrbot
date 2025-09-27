import { useState } from "react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Gamepad2, 
  Search, 
  Download, 
  RefreshCw,
  MessageCircle,
  UserPlus,
  UserMinus,
  Zap,
  Skull
} from "lucide-react";

const minecraftLogs = [
  {
    id: 1,
    timestamp: "2024-01-15 14:36:45",
    type: "chat",
    player: "Player123",
    message: "Hello everyone!",
    icon: MessageCircle
  },
  {
    id: 2,
    timestamp: "2024-01-15 14:36:12",
    type: "join",
    player: "Player456",
    message: "Player456 joined the game",
    icon: UserPlus
  },
  {
    id: 3,
    timestamp: "2024-01-15 14:35:33",
    type: "chat",
    player: "AFKBot",
    message: "Hello Player456! Welcome to the server!",
    icon: MessageCircle
  },
  {
    id: 4,
    timestamp: "2024-01-15 14:34:21",
    type: "command",
    player: "Admin",
    message: "/tp Player123 100 64 200",
    icon: Zap
  },
  {
    id: 5,
    timestamp: "2024-01-15 14:33:45",
    type: "death",
    player: "Player789",
    message: "Player789 was slain by Zombie",
    icon: Skull
  },
  {
    id: 6,
    timestamp: "2024-01-15 14:32:18",
    type: "chat",
    player: "Player789",
    message: "Can someone help me with enchanting?",
    icon: MessageCircle
  },
  {
    id: 7,
    timestamp: "2024-01-15 14:31:55",
    type: "leave",
    player: "Player001",
    message: "Player001 left the game",
    icon: UserMinus
  },
  {
    id: 8,
    timestamp: "2024-01-15 14:31:22",
    type: "chat",
    player: "AFKBot",
    message: "I'm at coordinates 125, 64, -45 if anyone needs me!",
    icon: MessageCircle
  },
  {
    id: 9,
    timestamp: "2024-01-15 14:30:45",
    type: "join",
    player: "Player001",
    message: "Player001 joined the game",
    icon: UserPlus
  },
  {
    id: 10,
    timestamp: "2024-01-15 14:29:33",
    type: "command",
    player: "Moderator",
    message: "/gamemode creative Player123",
    icon: Zap
  }
];

const getTypeColor = (type: string) => {
  switch (type) {
    case "chat": return "bg-primary/10 text-primary border-primary/20";
    case "join": return "bg-success/10 text-success border-success/20";
    case "leave": return "bg-warning/10 text-warning border-warning/20";
    case "death": return "bg-error/10 text-error border-error/20";
    case "command": return "bg-accent/10 text-accent border-accent/20";
    default: return "bg-muted/10 text-muted-foreground border-border";
  }
};

export default function MinecraftLogs() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState("all");

  const filteredLogs = minecraftLogs.filter(log => {
    const matchesSearch = log.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         log.player.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = selectedType === "all" || log.type === selectedType;
    return matchesSearch && matchesType;
  });

  const logTypes = ["all", "chat", "join", "leave", "death", "command"];

  return (
    <Layout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Minecraft Logs</h1>
            <p className="text-muted-foreground">Monitor in-game chat, events, and player activity</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
            <Button variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card className="glass-effect p-4">
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search messages, players, or events..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="text-sm text-muted-foreground px-2 py-1">Type:</span>
              {logTypes.map((type) => (
                <Button
                  key={type}
                  variant={selectedType === type ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedType(type)}
                  className="capitalize"
                >
                  {type}
                </Button>
              ))}
            </div>
          </div>
        </Card>

        {/* Game Logs */}
        <Card className="glass-effect">
          <div className="divide-y divide-border">
            {filteredLogs.map((log) => {
              const IconComponent = log.icon;
              return (
                <div key={log.id} className="p-4 hover:bg-muted/50 transition-smooth">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                      <IconComponent className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className={getTypeColor(log.type)} variant="outline">
                          {log.type}
                        </Badge>
                        <span className="text-sm font-medium text-foreground">
                          {log.player}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {log.timestamp}
                        </span>
                      </div>
                      <p className="text-sm text-foreground">
                        {log.message}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Event Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card className="glass-effect p-4">
            <div className="flex items-center gap-3">
              <MessageCircle className="w-6 h-6 text-primary" />
              <div>
                <p className="text-xl font-bold text-foreground">
                  {minecraftLogs.filter(log => log.type === "chat").length}
                </p>
                <p className="text-xs text-muted-foreground">Chat Messages</p>
              </div>
            </div>
          </Card>
          
          <Card className="glass-effect p-4">
            <div className="flex items-center gap-3">
              <UserPlus className="w-6 h-6 text-success" />
              <div>
                <p className="text-xl font-bold text-foreground">
                  {minecraftLogs.filter(log => log.type === "join").length}
                </p>
                <p className="text-xs text-muted-foreground">Player Joins</p>
              </div>
            </div>
          </Card>
          
          <Card className="glass-effect p-4">
            <div className="flex items-center gap-3">
              <UserMinus className="w-6 h-6 text-warning" />
              <div>
                <p className="text-xl font-bold text-foreground">
                  {minecraftLogs.filter(log => log.type === "leave").length}
                </p>
                <p className="text-xs text-muted-foreground">Player Leaves</p>
              </div>
            </div>
          </Card>
          
          <Card className="glass-effect p-4">
            <div className="flex items-center gap-3">
              <Skull className="w-6 h-6 text-error" />
              <div>
                <p className="text-xl font-bold text-foreground">
                  {minecraftLogs.filter(log => log.type === "death").length}
                </p>
                <p className="text-xs text-muted-foreground">Deaths</p>
              </div>
            </div>
          </Card>
          
          <Card className="glass-effect p-4">
            <div className="flex items-center gap-3">
              <Zap className="w-6 h-6 text-accent" />
              <div>
                <p className="text-xl font-bold text-foreground">
                  {minecraftLogs.filter(log => log.type === "command").length}
                </p>
                <p className="text-xs text-muted-foreground">Commands</p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </Layout>
  );
}