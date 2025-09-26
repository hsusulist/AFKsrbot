import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Server, Wifi, Users, Timer } from "lucide-react";

interface ServerInfoProps {
  host: string;
  port: number;
  isConnected: boolean;
  playerCount: number;
  maxPlayers: number;
  ping: number;
  version: string;
}

export default function ServerInfo({ 
  host, 
  port, 
  isConnected, 
  playerCount, 
  maxPlayers, 
  ping, 
  version 
}: ServerInfoProps) {
  const getPingColor = (ping: number) => {
    if (ping < 50) return "text-green-500";
    if (ping < 100) return "text-yellow-500";
    return "text-red-500";
  };

  return (
    <Card data-testid="card-server-info">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Server className="h-4 w-4" />
          Server Info
        </CardTitle>
        <Badge 
          variant={isConnected ? "default" : "destructive"}
          data-testid="badge-server-status"
        >
          {isConnected ? "Connected" : "Offline"}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Address:</span>
            <span className="font-mono text-sm" data-testid="text-server-address">
              {host}:{port}
            </span>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Version:</span>
            <span className="font-mono text-sm" data-testid="text-server-version">
              {version}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 pt-2 border-t">
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Users className="h-3 w-3" />
              Players
            </div>
            <div className="font-mono text-sm" data-testid="text-player-count">
              {playerCount}/{maxPlayers}
            </div>
          </div>
          
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Wifi className="h-3 w-3" />
              Ping
            </div>
            <div className={`font-mono text-sm ${getPingColor(ping)}`} data-testid="text-ping">
              {ping}ms
            </div>
          </div>
        </div>

        <div className="pt-2 border-t">
          <div className="flex items-center gap-2 text-xs">
            <Timer className="h-3 w-3 text-muted-foreground" />
            <span className="text-muted-foreground">Connected for:</span>
            <span className="font-mono" data-testid="text-connection-time">1h 23m</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}