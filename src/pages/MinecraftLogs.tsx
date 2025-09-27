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

import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

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

  // Fetch real logs from backend
  const { data: logs = [], isLoading, refetch } = useQuery({
    queryKey: ['/api/logs', 'minecraft'],
    queryFn: () => apiRequest('/api/logs?type=minecraft&limit=100'),
    refetchInterval: 2000, // Auto-refresh every 2 seconds
  });

  const filteredLogs = logs.filter((log: any) => {
    const searchText = `${log.message || ''} ${log.details || ''}`.toLowerCase();
    const matchesSearch = searchText.includes(searchTerm.toLowerCase());
    const matchesType = selectedType === "all" || log.level === selectedType;
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
            <Button 
              variant="outline" 
              onClick={() => refetch()}
              disabled={isLoading}
              className="transition-all duration-150 ease-out hover:scale-105"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              {isLoading ? 'Refreshing...' : 'Refresh'}
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
            {isLoading ? (
              // Loading skeletons
              Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="p-4">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-muted rounded-full animate-pulse" />
                    <div className="flex-1 space-y-2">
                      <div className="flex gap-2">
                        <div className="h-5 w-16 bg-muted rounded animate-pulse" />
                        <div className="h-4 w-20 bg-muted rounded animate-pulse" />
                      </div>
                      <div className="h-4 w-3/4 bg-muted rounded animate-pulse" />
                    </div>
                  </div>
                </div>
              ))
            ) : filteredLogs.length === 0 ? (
              <div className="p-12 text-center">
                <Gamepad2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">No Minecraft Logs</h3>
                <p className="text-muted-foreground">No Minecraft activity found. Connect your bot to a server to see logs here.</p>
              </div>
            ) : (
              filteredLogs.map((log) => {
                // Parse timestamp if it's a string
                const timestamp = typeof log.createdAt === 'string' 
                  ? new Date(log.createdAt).toLocaleString()
                  : 'Unknown time';
                  
                // Get appropriate icon based on log level or type
                const getIcon = () => {
                  if (log.message && log.message.includes('joined')) return UserPlus;
                  if (log.message && log.message.includes('left')) return UserMinus;
                  if (log.message && (log.message.includes('died') || log.message.includes('slain'))) return Skull;
                  if (log.message && log.message.includes('command')) return Zap;
                  return MessageCircle;
                };
                const IconComponent = getIcon();
                
                return (
                  <div key={log.id} className="p-4 hover:bg-muted/50 transition-all duration-150 ease-out">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                        <IconComponent className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge 
                            className={getTypeColor(log.level || 'info')} 
                            variant="outline"
                          >
                            {log.level || 'info'}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {timestamp}
                          </span>
                        </div>
                        <p className="text-sm text-foreground">
                          {log.message || 'No message'}
                        </p>
                        {log.details && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {log.details}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Card>

        {/* Event Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card className="glass-effect p-4">
            <div className="flex items-center gap-3">
              <MessageCircle className="w-6 h-6 text-primary" />
              <div>
                <p className="text-xl font-bold text-foreground">
                  {logs.filter((log: any) => log.message && log.message.includes('💬')).length}
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
                  {logs.filter((log: any) => log.message && log.message.includes('joined')).length}
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
                  {logs.filter((log: any) => log.message && log.message.includes('left')).length}
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
                  {logs.filter((log: any) => log.message && (log.message.includes('died') || log.message.includes('slain'))).length}
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
                  {logs.filter((log: any) => log.message && log.message.includes('Console command')).length}
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