import { useState, useEffect, useRef } from "react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useAutosave } from "@/hooks/useAutosave";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { 
  Terminal, 
  Send, 
  Trash2, 
  Download, 
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Copy,
  MessageCircle,
  UserPlus,
  UserMinus,
  Gamepad2
} from "lucide-react";

interface ConsoleEntry {
  id: number;
  timestamp: string;
  type: "command" | "response" | "error" | "info" | "chat" | "join" | "leave";
  content: string;
  user?: string;
}

export default function Console() {
  const [consoleEntries, setConsoleEntries] = useState<ConsoleEntry[]>([]);
  const [isExecuting, setIsExecuting] = useState(false);
  const { toast } = useToast();
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Get real logs from backend including chat messages
  const { data: logs = [], isLoading, refetch } = useQuery({
    queryKey: ['/api/logs?type=minecraft&limit=100'],
    refetchInterval: 2000, // Auto-refresh every 2 seconds
    staleTime: 0, // Always fetch fresh data
  });

  // Get bot connection status
  const { data: config } = useQuery({
    queryKey: ['/api/minecraft/config'],
    refetchInterval: 3000, // Refresh status every 3 seconds
    staleTime: 0, // Always fetch fresh data
  });

  const isConnected = (config as any)?.isConnected || false;
  
  // Auto-save command input
  const { data: command, setData: setCommand } = useAutosave<string>(
    'console-command',
    '',
    { debounceMs: 500 }
  );

  // Convert backend logs to console entries for display
  const allConsoleEntries: ConsoleEntry[] = [...(logs as any[]).map((log: any, index: number) => {
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
  }), ...consoleEntries].sort((a, b) => a.id - b.id);

  // Auto-scroll to bottom when new entries arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [allConsoleEntries]);

  const executeCommand = async () => {
    if (!command.trim()) return;
    
    const newCommand: ConsoleEntry = {
      id: consoleEntries.length + 1,
      timestamp: new Date().toLocaleTimeString("en-US", { 
        hour12: false, 
        hour: "2-digit", 
        minute: "2-digit", 
        second: "2-digit" 
      }),
      type: "command",
      content: command,
      user: "Dashboard"
    };

    setConsoleEntries(prev => [...prev, newCommand]);

    setIsExecuting(true);
    
    try {
      // Send raw content to server for classification
      const response = await fetch('/api/console/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: command })
      });

      const result = await response.json();
      
      const responseEntry: ConsoleEntry = {
        id: consoleEntries.length + 2,
        timestamp: new Date().toLocaleTimeString("en-US", { 
          hour12: false, 
          hour: "2-digit", 
          minute: "2-digit", 
          second: "2-digit" 
        }),
        type: result.success ? "response" : "error",
        content: result.response || result.error || "Command executed"
      };

      setConsoleEntries(prev => [...prev, responseEntry]);
      
      toast({
        title: result.success ? (command.startsWith('/') ? "Command Sent" : "Message Sent") : "Failed", 
        description: result.success ? (command.startsWith('/') ? "🎮 Command executed in game!" : "💬 Chat message sent!") : "❌ Bot is not connected to server",
        variant: result.success ? "default" : "destructive"
      });
      
      // Clear command input after successful send
      if (result.success) {
        setCommand('');
      }

    } catch (error) {
      const errorEntry: ConsoleEntry = {
        id: consoleEntries.length + 2,
        timestamp: new Date().toLocaleTimeString("en-US", { 
          hour12: false, 
          hour: "2-digit", 
          minute: "2-digit", 
          second: "2-digit" 
        }),
        type: "error",
        content: "Failed to send command - Bot not connected"
      };

      setConsoleEntries(prev => [...prev, errorEntry]);
      
      toast({
        title: "Connection Error",
        description: "❌ Cannot send command - Bot not connected to server",
        variant: "destructive"
      });
    } finally {
      setIsExecuting(false);
    }

  };

  const clearConsole = () => {
    setConsoleEntries([]);
    toast({
      title: "Console Cleared",
      description: "All console entries have been cleared",
    });
  };

  const copyEntry = (content: string) => {
    navigator.clipboard.writeText(content);
    toast({
      title: "Copied",
      description: "Console entry copied to clipboard",
    });
  };

  const getEntryIcon = (type: string) => {
    switch (type) {
      case "command": return <Terminal className="w-4 h-4 text-primary" />;
      case "response": return <CheckCircle className="w-4 h-4 text-success" />;
      case "error": return <XCircle className="w-4 h-4 text-error" />;
      case "chat": return <MessageCircle className="w-4 h-4 text-blue-400" />;
      case "join": return <UserPlus className="w-4 h-4 text-green-400" />;
      case "leave": return <UserMinus className="w-4 h-4 text-orange-400" />;
      case "info": return <Gamepad2 className="w-4 h-4 text-accent" />;
      default: return <Terminal className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getEntryColor = (type: string) => {
    switch (type) {
      case "command": return "text-primary";
      case "response": return "text-success";
      case "error": return "text-error";
      case "chat": return "text-blue-400";
      case "join": return "text-green-400";
      case "leave": return "text-orange-400";
      case "info": return "text-accent";
      default: return "text-foreground";
    }
  };

  return (
    <Layout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Console</h1>
            <p className="text-muted-foreground">Execute commands directly on the Minecraft server</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={isConnected ? "default" : "secondary"}>
              {isConnected ? "Connected" : "Disconnected"}
            </Badge>
            <Button variant="outline" onClick={clearConsole}>
              <Trash2 className="w-4 h-4 mr-2" />
              Clear
            </Button>
            <Button variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        {/* Console Interface */}
        <Card className="glass-effect h-[500px] flex flex-col">
          {/* Console Output */}
          <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
            <div className="space-y-2 font-mono text-sm">
              {allConsoleEntries.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Terminal className="w-12 h-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">No Chat Activity</h3>
                  <p className="text-muted-foreground">Chat messages and server events will appear here</p>
                </div>
              ) : (
                allConsoleEntries.map((entry) => (
                  <div 
                    key={entry.id} 
                    className="flex items-start gap-2 hover:bg-muted/30 p-2 rounded group transition-all duration-150 ease-out"
                  >
                  <span className="text-xs text-muted-foreground shrink-0 w-16">
                    {entry.timestamp}
                  </span>
                  <div className="shrink-0">
                    {getEntryIcon(entry.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className={`${getEntryColor(entry.type)} break-all`}>
                      {entry.type === "command" && entry.user && (
                        <span className="text-muted-foreground">[{entry.user}] </span>
                      )}
                      {entry.content}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyEntry(entry.content)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity p-1 h-6 w-6"
                  >
                    <Copy className="w-3 h-3" />
                  </Button>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>

          {/* Command Input */}
          <div className="border-t border-border p-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Terminal className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Type '/command' for server commands or just 'message' to chat..."
                  value={command}
                  onChange={(e) => setCommand(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && !isExecuting && executeCommand()}
                  className="pl-10 font-mono transition-all duration-150 ease-out focus-visible:ring-2 focus-visible:ring-primary"
                  disabled={!isConnected || isExecuting}
                />
                {isExecuting && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  </div>
                )}
              </div>
              <Button 
                onClick={executeCommand} 
                disabled={!command.trim() || !isConnected || isExecuting}
                className="gradient-gaming glow-primary transition-all duration-150 ease-out hover:scale-105"
              >
                <Send className="w-4 h-4 mr-2" />
                {isExecuting ? 'Sending...' : 'Execute'}
              </Button>
            </div>
            <div className="flex justify-between items-center mt-2 text-xs text-muted-foreground">
              <span>Tip: Type "/command" for server commands or plain text for chat messages</span>
              <span>{consoleEntries.length} entries</span>
            </div>
          </div>
        </Card>

        {/* Quick Commands */}
        <Card className="glass-effect p-4">
          <h3 className="text-lg font-semibold text-foreground mb-3">Quick Commands</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {[
              { label: "List Players", cmd: "/list" },
              { label: "Bot Status", cmd: "/say Bot status: Active at " + new Date().toLocaleTimeString() },
              { label: "Time Day", cmd: "/time set day" },
              { label: "Weather Clear", cmd: "/weather clear" },
              { label: "Save World", cmd: "/save-all" },
              { label: "Reload", cmd: "/reload" },
              { label: "Stop Rain", cmd: "/weather clear 1000000" },
              { label: "Spawn Protection", cmd: "/gamerule keepInventory true" }
            ].map((quickCmd) => (
              <Button
                key={quickCmd.label}
                variant="outline"
                size="sm"
                onClick={() => setCommand(quickCmd.cmd)}
                className="text-xs"
                disabled={!isConnected}
              >
                {quickCmd.label}
              </Button>
            ))}
          </div>
        </Card>
      </div>
    </Layout>
  );
}