import { useState, useEffect, useRef } from "react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Gamepad2, 
  Search, 
  Download, 
  RefreshCw,
  MessageCircle,
  UserPlus,
  UserMinus,
  Zap,
  Skull,
  Terminal,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Info
} from "lucide-react";

import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface ConsoleEntry {
  id: number;
  timestamp: string;
  type: "command" | "response" | "error" | "info" | "chat" | "join" | "leave";
  content: string;
  user?: string;
}

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
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Fetch real logs from backend
  const { data: logs = [], isLoading, refetch } = useQuery({
    queryKey: ['/api/logs', 'minecraft'],
    queryFn: () => apiRequest('/api/logs?type=minecraft&limit=100'),
    refetchInterval: 2000, // Auto-refresh every 2 seconds
  });

  // Convert backend logs to console entries for display (same as Console.tsx)
  const allConsoleEntries: ConsoleEntry[] = logs.map((log: any, index: number) => {
    let type = 'info';
    let content = log.message || '';
    
    // Determine entry type based on log content
    if (content.includes('executed:') || content.includes('/')) {
      type = 'command';
    } else if (content.includes('<') && content.includes('>')) {
      type = 'chat';
      // Extract chat message format: "<username> message"
      const chatMatch = content.match(/<([^>]+)>\s*(.*)/);
      if (chatMatch) {
        content = `[${chatMatch[1]}] ${chatMatch[2]}`;
      }
    } else if (content.includes('joined') || content.includes('🟢')) {
      type = 'join';
    } else if (content.includes('left') || content.includes('🔴')) {
      type = 'leave';
    } else if (log.level === 'error') {
      type = 'error';
    }
    
    return {
      id: index + 1000, // Use offset to avoid conflicts
      timestamp: new Date(log.createdAt).toLocaleTimeString("en-US", { 
        hour12: false, 
        hour: "2-digit", 
        minute: "2-digit", 
        second: "2-digit" 
      }),
      type: type as "command" | "response" | "error" | "info" | "chat" | "join" | "leave",
      content: content,
      user: type === 'chat' ? 'Game' : undefined
    };
  });

  // Auto-scroll to bottom when new entries arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [allConsoleEntries]);

  const filteredEntries = allConsoleEntries.filter((entry) => {
    const searchText = entry.content.toLowerCase();
    const matchesSearch = searchText.includes(searchTerm.toLowerCase());
    const matchesType = selectedType === "all" || entry.type === selectedType;
    return matchesSearch && matchesType;
  });

  const logTypes = ["all", "chat", "join", "leave", "error", "command", "info"];

  const getEntryIcon = (type: string) => {
    switch (type) {
      case "command": return <Terminal className="w-4 h-4 text-primary" />;
      case "response": return <CheckCircle className="w-4 h-4 text-success" />;
      case "error": return <XCircle className="w-4 h-4 text-error" />;
      case "chat": return <MessageCircle className="w-4 h-4 text-accent" />;
      case "join": return <UserPlus className="w-4 h-4 text-success" />;
      case "leave": return <UserMinus className="w-4 h-4 text-warning" />;
      default: return <Info className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getEntryTextColor = (type: string) => {
    switch (type) {
      case "command": return "text-primary";
      case "response": return "text-success";
      case "error": return "text-error";
      case "chat": return "text-accent";
      case "join": return "text-success";
      case "leave": return "text-warning";
      default: return "text-foreground";
    }
  };

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

        {/* Console Output - Read Only */}
        <Card className="glass-effect p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Terminal className="w-6 h-6 text-primary" />
              <h2 className="text-xl font-semibold text-foreground">Minecraft Console (Read-Only)</h2>
            </div>
            <div className="text-sm text-muted-foreground">
              {filteredEntries.length} entries
            </div>
          </div>
          
          <div className="bg-background/80 border border-border rounded-lg overflow-hidden">
            <ScrollArea className="h-[500px]" ref={scrollAreaRef}>
              <div className="p-4 space-y-1 font-mono text-sm">
                {isLoading ? (
                  <div className="text-muted-foreground">Loading console logs...</div>
                ) : filteredEntries.length === 0 ? (
                  <div className="text-center py-8">
                    <Terminal className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <div className="text-muted-foreground">No Minecraft logs available.</div>
                    <div className="text-muted-foreground text-xs mt-2">Connect the bot to a server to see live logs here.</div>
                  </div>
                ) : (
                  filteredEntries.map((entry) => (
                    <div key={entry.id} className="flex items-start gap-3 hover:bg-muted/30 px-2 py-1 rounded transition-colors">
                      <span className="text-muted-foreground text-xs mt-0.5 min-w-[60px]">
                        {entry.timestamp}
                      </span>
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        {getEntryIcon(entry.type)}
                        <span className={`${getEntryTextColor(entry.type)} break-all`}>
                          {entry.content}
                        </span>
                        {entry.user && (
                          <span className="text-muted-foreground text-xs">
                            ({entry.user})
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
          
          <div className="mt-4 p-3 bg-muted/30 rounded-lg">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Info className="w-4 h-4" />
              <span>This is a read-only view of Minecraft server logs. Use the Console page to send commands.</span>
            </div>
          </div>
        </Card>

        {/* Event Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card className="glass-effect p-4">
            <div className="flex items-center gap-3">
              <MessageCircle className="w-6 h-6 text-primary" />
              <div>
                <p className="text-xl font-bold text-foreground">
                  {filteredEntries.filter(entry => entry.type === 'chat').length}
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
                  {filteredEntries.filter(entry => entry.type === 'join').length}
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
                  {filteredEntries.filter(entry => entry.type === 'leave').length}
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
                  {filteredEntries.filter(entry => entry.type === 'error').length}
                </p>
                <p className="text-xs text-muted-foreground">Errors</p>
              </div>
            </div>
          </Card>
          
          <Card className="glass-effect p-4">
            <div className="flex items-center gap-3">
              <Zap className="w-6 h-6 text-accent" />
              <div>
                <p className="text-xl font-bold text-foreground">
                  {filteredEntries.filter(entry => entry.type === 'command').length}
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