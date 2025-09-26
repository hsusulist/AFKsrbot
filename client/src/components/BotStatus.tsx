import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Bot, Heart, Utensils, MapPin, Clock } from "lucide-react";

interface BotStatusProps {
  isOnline: boolean;
  health: number;
  food: number;
  position: { x: number; y: number; z: number };
  uptime: string;
  playersNearby: number;
}

export default function BotStatus({ 
  isOnline, 
  health, 
  food, 
  position, 
  uptime, 
  playersNearby 
}: BotStatusProps) {
  return (
    <Card data-testid="card-bot-status">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Bot className="h-4 w-4" />
          Bot Status
        </CardTitle>
        <Badge 
          variant={isOnline ? "default" : "destructive"}
          data-testid="badge-bot-status"
        >
          {isOnline ? "Online" : "Offline"}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-1">
              <Heart className="h-3 w-3 text-red-500" />
              Health
            </span>
            <span className="font-mono">{health}%</span>
          </div>
          <Progress value={health} className="h-2" data-testid="progress-health" />
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-1">
              <Utensils className="h-3 w-3 text-orange-500" />
              Food
            </span>
            <span className="font-mono">{food}%</span>
          </div>
          <Progress value={food} className="h-2" data-testid="progress-food" />
        </div>

        <div className="grid grid-cols-2 gap-4 pt-2">
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3" />
              Position
            </div>
            <div className="font-mono text-xs" data-testid="text-position">
              {position.x}, {position.y}, {position.z}
            </div>
          </div>
          
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              Uptime
            </div>
            <div className="font-mono text-xs" data-testid="text-uptime">{uptime}</div>
          </div>
        </div>

        <div className="pt-2 border-t">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Players nearby</span>
            <span className="font-mono" data-testid="text-players-nearby">{playersNearby}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}