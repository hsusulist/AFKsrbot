import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { BarChart3, MessageSquare, Footprints, Heart, Target } from "lucide-react";

interface BotStats {
  messagesReceived: number;
  greetingsSent: number;
  distanceWalked: number;
  playersGreeted: number;
  uptimePercentage: number;
  interactionsToday: number;
}

interface StatsPanelProps {
  stats: BotStats;
}

export default function StatsPanel({ stats }: StatsPanelProps) {
  const formatDistance = (distance: number) => {
    if (distance < 1000) return `${distance}m`;
    return `${(distance / 1000).toFixed(1)}km`;
  };

  const formatNumber = (num: number) => {
    if (num < 1000) return num.toString();
    if (num < 1000000) return `${(num / 1000).toFixed(1)}k`;
    return `${(num / 1000000).toFixed(1)}M`;
  };

  const getUptimeColor = (uptime: number) => {
    if (uptime >= 95) return "text-green-500";
    if (uptime >= 80) return "text-yellow-500";
    return "text-red-500";
  };

  return (
    <Card data-testid="card-stats-panel">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <BarChart3 className="h-4 w-4" />
          Bot Statistics
        </CardTitle>
        <Badge variant="secondary" data-testid="badge-uptime">
          {stats.uptimePercentage}% uptime
        </Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <MessageSquare className="h-3 w-3" />
              Messages
            </div>
            <div className="font-mono text-lg font-bold" data-testid="text-messages-received">
              {formatNumber(stats.messagesReceived)}
            </div>
          </div>
          
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Heart className="h-3 w-3" />
              Greetings
            </div>
            <div className="font-mono text-lg font-bold" data-testid="text-greetings-sent">
              {formatNumber(stats.greetingsSent)}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Footprints className="h-3 w-3" />
              Distance
            </div>
            <div className="font-mono text-lg font-bold" data-testid="text-distance-walked">
              {formatDistance(stats.distanceWalked)}
            </div>
          </div>
          
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Target className="h-3 w-3" />
              Players Met
            </div>
            <div className="font-mono text-lg font-bold" data-testid="text-players-greeted">
              {stats.playersGreeted}
            </div>
          </div>
        </div>

        <div className="space-y-2 pt-2 border-t">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Daily Interactions</span>
            <span className="font-mono" data-testid="text-interactions-today">
              {stats.interactionsToday}
            </span>
          </div>
          
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Uptime</span>
              <span className={`font-mono ${getUptimeColor(stats.uptimePercentage)}`}>
                {stats.uptimePercentage}%
              </span>
            </div>
            <Progress 
              value={stats.uptimePercentage} 
              className="h-2" 
              data-testid="progress-uptime"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}