import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Users, Crown, Sword, Eye } from "lucide-react";

interface Player {
  id: string;
  username: string;
  ping: number;
  isOperator: boolean;
  distance: number;
  lastSeen: string;
}

interface PlayerListProps {
  players: Player[];
  totalOnline: number;
}

export default function PlayerList({ players, totalOnline }: PlayerListProps) {
  const getPingBadge = (ping: number) => {
    if (ping < 50) return "default";
    if (ping < 100) return "secondary";
    return "destructive";
  };

  const formatDistance = (distance: number) => {
    return distance < 1000 ? `${distance}m` : `${(distance / 1000).toFixed(1)}km`;
  };

  return (
    <Card data-testid="card-player-list">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Users className="h-4 w-4" />
          Players Online
        </CardTitle>
        <Badge variant="secondary" data-testid="badge-total-players">
          {totalOnline}
        </Badge>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-48" data-testid="scroll-player-list">
          <div className="space-y-2">
            {players.map((player) => (
              <div 
                key={player.id}
                className="flex items-center justify-between p-2 hover-elevate rounded-md"
                data-testid={`player-${player.username}`}
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={`https://crafatar.com/avatars/${player.username}?size=24`} />
                    <AvatarFallback className="text-xs">
                      {player.username.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex items-center gap-1 min-w-0">
                    <span className="text-sm font-medium truncate">
                      {player.username}
                    </span>
                    {player.isOperator && (
                      <Crown className="h-3 w-3 text-yellow-500" />
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <Eye className="h-3 w-3" />
                    {formatDistance(player.distance)}
                  </div>
                  <Badge 
                    variant={getPingBadge(player.ping)}
                    className="text-xs"
                  >
                    {player.ping}ms
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}