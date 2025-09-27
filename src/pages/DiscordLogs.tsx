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
                      <div className="h-4 w-1/2 bg-muted rounded animate-pulse" />
                    </div>
                  </div>
                </div>
              ))
            ) : filteredLogs.length === 0 ? (
              <div className="p-12 text-center">
                <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">No Discord Logs</h3>
                <p className="text-muted-foreground">No Discord activity found. Connect your bot to see logs here.</p>
              </div>
            ) : (
              filteredLogs.map((log) => {
                // Parse timestamp if it's a string
                const timestamp = typeof log.createdAt === 'string' 
                  ? new Date(log.createdAt).toLocaleString()
                  : log.timestamp || 'Unknown time';
                  
                return (
                  <div key={log.id} className="p-4 hover:bg-muted/50 transition-all duration-150 ease-out">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                        <MessageSquare className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge 
                            variant={log.level === "error" ? "destructive" : "default"}
                            className="text-xs"
                          >
                            {log.level || 'info'}
                          </Badge>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="w-3 h-3" />
                            {timestamp}
                          </div>
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm font-mono text-foreground bg-muted/30 px-2 py-1 rounded">
                            {log.message || 'No message'}
                          </p>
                          {log.details && (
                            <p className="text-sm text-muted-foreground">
                              {log.details}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
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