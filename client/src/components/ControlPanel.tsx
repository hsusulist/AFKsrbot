import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, Square, RotateCcw, Settings, Power } from "lucide-react";
import { useState } from "react";

interface ControlPanelProps {
  isConnected: boolean;
  isRunning: boolean;
  onStart: () => void;
  onStop: () => void;
  onRestart: () => void;
  onSettings: () => void;
}

export default function ControlPanel({ 
  isConnected, 
  isRunning, 
  onStart, 
  onStop, 
  onRestart, 
  onSettings 
}: ControlPanelProps) {
  const [isStarting, setIsStarting] = useState(false);
  const [isStopping, setIsStopping] = useState(false);

  const handleStart = () => {
    setIsStarting(true);
    console.log('Bot start triggered');
    onStart();
    setTimeout(() => setIsStarting(false), 2000);
  };

  const handleStop = () => {
    setIsStopping(true);
    console.log('Bot stop triggered');
    onStop();
    setTimeout(() => setIsStopping(false), 1500);
  };

  const handleRestart = () => {
    console.log('Bot restart triggered');
    onRestart();
  };

  const handleSettings = () => {
    console.log('Settings panel triggered');
    onSettings();
  };

  return (
    <Card data-testid="card-control-panel">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Power className="h-4 w-4" />
          Bot Control
        </CardTitle>
        <Badge 
          variant={isConnected ? "default" : "destructive"}
          data-testid="badge-connection-status"
        >
          {isConnected ? "Connected" : "Disconnected"}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Button
            onClick={handleStart}
            disabled={isRunning || isStarting}
            className="w-full"
            data-testid="button-start-bot"
          >
            <Play className="h-4 w-4 mr-2" />
            {isStarting ? "Starting..." : "Start"}
          </Button>
          
          <Button
            onClick={handleStop}
            disabled={!isRunning || isStopping}
            variant="destructive"
            className="w-full"
            data-testid="button-stop-bot"
          >
            <Square className="h-4 w-4 mr-2" />
            {isStopping ? "Stopping..." : "Stop"}
          </Button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Button
            onClick={handleRestart}
            variant="outline"
            className="w-full"
            data-testid="button-restart-bot"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Restart
          </Button>
          
          <Button
            onClick={handleSettings}
            variant="outline"
            className="w-full"
            data-testid="button-settings"
          >
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
        </div>

        <div className="pt-2 border-t text-xs text-muted-foreground">
          <div className="flex justify-between">
            <span>Status:</span>
            <span className="font-mono" data-testid="text-bot-status">
              {isRunning ? "Active" : "Idle"}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}