import { useState } from "react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  MessageSquare, 
  Search, 
  Download, 
  RefreshCw,
  Hash,
  User,
  Clock
} from "lucide-react";

const discordLogs = [
  {
    id: 1,
    timestamp: "2024-01-15 14:35:22",
    user: "Player123",
    channel: "#bot-commands",
    command: "/start",
    status: "success",
    response: "Minecraft bot started successfully"
  },
  {
    id: 2,
    timestamp: "2024-01-15 14:34:15",
    user: "Admin",
    channel: "#general",
    command: "/setup",
    status: "success",
    response: "Status monitoring configured for this channel"
  },
  {
    id: 3,
    timestamp: "2024-01-15 14:33:45",
    user: "Player456",
    channel: "#bot-commands",
    command: "/inventory",
    status: "success",
    response: "Bot inventory displayed"
  },
  {
    id: 4,
    timestamp: "2024-01-15 14:32:30",
    user: "Player789",
    channel: "#bot-commands",
    command: "/command tp @a 0 100 0",
    status: "error",
    response: "Insufficient permissions to execute command"
  },
  {
    id: 5,
    timestamp: "2024-01-15 14:31:12",
    user: "Moderator",
    channel: "#admin",
    command: "/log",
    status: "success",
    response: "Chat logging enabled for this channel"
  },
  {
    id: 6,
    timestamp: "2024-01-15 14:30:45",
    user: "Player123",
    channel: "#bot-commands",
    command: "/status",
    status: "success",
    response: "Bot status: Online, Health: 100%, Position: X:125 Y:64 Z:-45"
  },
  {
    id: 7,
    timestamp: "2024-01-15 14:29:33",
    user: "Player456",
    channel: "#bot-commands",
    command: "/restart",
    status: "success",
    response: "Bot restarted successfully"
  },
  {
    id: 8,
    timestamp: "2024-01-15 14:28:21",
    user: "Player789",
    channel: "#bot-commands",
    command: "/stop",
    status: "success",
    response: "Minecraft bot stopped"
  }
];

export default function DiscordLogs() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");

  const filteredLogs = discordLogs.filter(log => {
    const matchesSearch = log.command.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         log.user.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         log.channel.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = selectedStatus === "all" || log.status === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  const statusTypes = ["all", "success", "error"];

  return (
    <Layout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Discord Logs</h1>
            <p className="text-muted-foreground">Monitor Discord bot commands and interactions</p>
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
                placeholder="Search commands, users, or channels..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <span className="text-sm text-muted-foreground px-2 py-1">Status:</span>
              {statusTypes.map((status) => (
                <Button
                  key={status}
                  variant={selectedStatus === status ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedStatus(status)}
                  className="capitalize"
                >
                  {status}
                </Button>
              ))}
            </div>
          </div>
        </Card>

        {/* Command Logs */}
        <Card className="glass-effect">
          <div className="divide-y divide-border">
            {filteredLogs.map((log) => (
              <div key={log.id} className="p-4 hover:bg-muted/50 transition-smooth">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                    <MessageSquare className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge 
                        variant={log.status === "success" ? "default" : "destructive"}
                        className="text-xs"
                      >
                        {log.status}
                      </Badge>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <User className="w-3 h-3" />
                        {log.user}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Hash className="w-3 h-3" />
                        {log.channel}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        {log.timestamp}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-mono text-foreground bg-muted/30 px-2 py-1 rounded">
                        {log.command}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {log.response}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Command Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="glass-effect p-4">
            <div className="flex items-center gap-3">
              <MessageSquare className="w-8 h-8 text-primary" />
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {discordLogs.length}
                </p>
                <p className="text-sm text-muted-foreground">Total Commands</p>
              </div>
            </div>
          </Card>
          
          <Card className="glass-effect p-4">
            <div className="flex items-center gap-3">
              <User className="w-8 h-8 text-success" />
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {new Set(discordLogs.map(log => log.user)).size}
                </p>
                <p className="text-sm text-muted-foreground">Active Users</p>
              </div>
            </div>
          </Card>
          
          <Card className="glass-effect p-4">
            <div className="flex items-center gap-3">
              <Hash className="w-8 h-8 text-accent" />
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {new Set(discordLogs.map(log => log.channel)).size}
                </p>
                <p className="text-sm text-muted-foreground">Channels Used</p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </Layout>
  );
}