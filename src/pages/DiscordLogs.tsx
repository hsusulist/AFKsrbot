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

import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export default function DiscordLogs() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");

  // Fetch real logs from backend
  const { data: logs = [], isLoading, refetch } = useQuery({
    queryKey: ['/api/logs', 'discord'],
    queryFn: () => apiRequest('/api/logs?type=discord&limit=100'),
    refetchInterval: 2000, // Auto-refresh every 2 seconds
  });

  const filteredLogs = logs.filter((log: any) => {
    const searchText = `${log.message || ''} ${log.details || ''}`.toLowerCase();
    const matchesSearch = searchText.includes(searchTerm.toLowerCase());
    const matchesStatus = selectedStatus === "all" || log.level === selectedStatus;
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
                  {logs.length}
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
                  {new Set(logs.map((log: any) => log.message)).size}
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
                  {new Set(logs.map((log: any) => log.level)).size}
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