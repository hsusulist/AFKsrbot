import { useState } from "react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  Terminal, 
  Send, 
  Trash2, 
  Download, 
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Copy
} from "lucide-react";

interface ConsoleEntry {
  id: number;
  timestamp: string;
  type: "command" | "response" | "error" | "info";
  content: string;
  user?: string;
}

const initialConsoleEntries: ConsoleEntry[] = [
  {
    id: 1,
    timestamp: "14:35:22",
    type: "info",
    content: "Console connection established"
  },
  {
    id: 2,
    timestamp: "14:35:25",
    type: "command",
    content: "/list",
    user: "Admin"
  },
  {
    id: 3,
    timestamp: "14:35:26",
    type: "response",
    content: "There are 3 of a max of 20 players online: AFKBot, Player123, Player456"
  },
  {
    id: 4,
    timestamp: "14:35:45",
    type: "command",
    content: "/gamemode creative Player123",
    user: "Admin"
  },
  {
    id: 5,
    timestamp: "14:35:46",
    type: "response",
    content: "Set Player123's game mode to Creative Mode"
  }
];

export default function Console() {
  const [command, setCommand] = useState("");
  const [consoleEntries, setConsoleEntries] = useState<ConsoleEntry[]>(initialConsoleEntries);
  const [isConnected, setIsConnected] = useState(true);
  const { toast } = useToast();

  const executeCommand = () => {
    if (!command.trim()) return;
    
    if (!isConnected) {
      toast({
        title: "Error",
        description: "Console is not connected to the server",
        variant: "destructive"
      });
      return;
    }

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

    // Simulate response based on command
    let response: ConsoleEntry;
    const cmd = command.toLowerCase();
    
    if (cmd.startsWith("/list")) {
      response = {
        id: consoleEntries.length + 2,
        timestamp: new Date().toLocaleTimeString("en-US", { 
          hour12: false, 
          hour: "2-digit", 
          minute: "2-digit", 
          second: "2-digit" 
        }),
        type: "response",
        content: "There are 3 of a max of 20 players online: AFKBot, Player123, Player456"
      };
    } else if (cmd.startsWith("/tp")) {
      response = {
        id: consoleEntries.length + 2,
        timestamp: new Date().toLocaleTimeString("en-US", { 
          hour12: false, 
          hour: "2-digit", 
          minute: "2-digit", 
          second: "2-digit" 
        }),
        type: "response",
        content: "Teleported successfully"
      };
    } else if (cmd.startsWith("/give")) {
      response = {
        id: consoleEntries.length + 2,
        timestamp: new Date().toLocaleTimeString("en-US", { 
          hour12: false, 
          hour: "2-digit", 
          minute: "2-digit", 
          second: "2-digit" 
        }),
        type: "response",
        content: "Gave items successfully"
      };
    } else if (cmd.startsWith("/ban") || cmd.startsWith("/kick")) {
      response = {
        id: consoleEntries.length + 2,
        timestamp: new Date().toLocaleTimeString("en-US", { 
          hour12: false, 
          hour: "2-digit", 
          minute: "2-digit", 
          second: "2-digit" 
        }),
        type: "error",
        content: "You do not have permission to use this command"
      };
    } else {
      response = {
        id: consoleEntries.length + 2,
        timestamp: new Date().toLocaleTimeString("en-US", { 
          hour12: false, 
          hour: "2-digit", 
          minute: "2-digit", 
          second: "2-digit" 
        }),
        type: "response",
        content: "Command executed"
      };
    }

    setConsoleEntries([...consoleEntries, newCommand, response]);
    setCommand("");
    
    toast({
      title: "Command Executed",
      description: `Executed: ${command}`,
    });
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
      case "info": return <AlertTriangle className="w-4 h-4 text-accent" />;
      default: return <Terminal className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getEntryColor = (type: string) => {
    switch (type) {
      case "command": return "text-primary";
      case "response": return "text-success";
      case "error": return "text-error";
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
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-2 font-mono text-sm">
              {consoleEntries.map((entry) => (
                <div 
                  key={entry.id} 
                  className="flex items-start gap-2 hover:bg-muted/30 p-2 rounded group"
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
              ))}
            </div>
          </ScrollArea>

          {/* Command Input */}
          <div className="border-t border-border p-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Terminal className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Enter Minecraft command (e.g., /list, /tp, /give)..."
                  value={command}
                  onChange={(e) => setCommand(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && executeCommand()}
                  className="pl-10 font-mono"
                  disabled={!isConnected}
                />
              </div>
              <Button 
                onClick={executeCommand} 
                disabled={!command.trim() || !isConnected}
                className="gradient-gaming glow-primary"
              >
                <Send className="w-4 h-4 mr-2" />
                Execute
              </Button>
            </div>
            <div className="flex justify-between items-center mt-2 text-xs text-muted-foreground">
              <span>Tip: Commands are executed with operator permissions</span>
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