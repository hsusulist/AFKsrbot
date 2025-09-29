import { useState, useEffect, useRef } from "react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import io from 'socket.io-client';
import { 
  Eye, 
  Gamepad2, 
  ArrowUp, 
  ArrowDown, 
  ArrowLeft, 
  ArrowRight,
  Space,
  Move,
  RotateCcw,
  Settings,
  Maximize,
  Minimize
} from "lucide-react";

// Socket.IO connection
const socket = io('http://localhost:3001');

export default function BotView() {
  const [isConnected, setIsConnected] = useState(false);
  const [movementStates, setMovementStates] = useState({
    forward: false,
    back: false,
    left: false,
    right: false,
    jump: false,
    sneak: false
  });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [botPosition, setBotPosition] = useState({ x: 0, y: 0, z: 0 });
  const [keysPressed, setKeysPressed] = useState(new Set());
  const { toast } = useToast();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Get bot viewer data
  const { data: viewerData, isLoading } = useQuery({
    queryKey: ['/api/viewer'],
    refetchInterval: 1000, // Refresh every second
    staleTime: 0,
  });

  const isViewerConnected = (viewerData as any)?.connected || false;

  // Socket.IO event handlers
  useEffect(() => {
    socket.on('connect', () => {
      setIsConnected(true);
      toast({
        title: "Real-time Connected",
        description: "Bot control stream is active",
      });
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.on('bot_position_update', (position) => {
      setBotPosition(position);
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('bot_position_update');
    };
  }, []);

  // Keyboard event handlers for WASD movement
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isViewerConnected) return;

      const key = event.key.toLowerCase();
      const keyMap: { [key: string]: keyof typeof movementStates } = {
        'w': 'forward',
        's': 'back',
        'a': 'left',
        'd': 'right',
        ' ': 'jump',
        'shift': 'sneak'
      };

      if (keyMap[key] && !keysPressed.has(key)) {
        setKeysPressed(prev => new Set([...prev, key]));
        
        const newStates = { 
          ...movementStates, 
          [keyMap[key]]: true 
        };
        setMovementStates(newStates);
        
        // Send movement control to server
        socket.emit('movement_control', {
          action: 'movement',
          key: keyMap[key],
          pressed: true
        });
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (!isViewerConnected) return;

      const key = event.key.toLowerCase();
      const keyMap: { [key: string]: keyof typeof movementStates } = {
        'w': 'forward',
        's': 'back',
        'a': 'left',
        'd': 'right',
        ' ': 'jump',
        'shift': 'sneak'
      };

      if (keyMap[key] && keysPressed.has(key)) {
        setKeysPressed(prev => {
          const newSet = new Set(prev);
          newSet.delete(key);
          return newSet;
        });
        
        const newStates = { 
          ...movementStates, 
          [keyMap[key]]: false 
        };
        setMovementStates(newStates);
        
        // Send movement control to server
        socket.emit('movement_control', {
          action: 'movement',
          key: keyMap[key],
          pressed: false
        });
      }
    };

    // Add event listeners
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [movementStates, keysPressed, isViewerConnected]);

  // Mock 3D view canvas (placeholder for prismarine-viewer)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (isViewerConnected) {
      // Draw simple world representation
      ctx.fillStyle = '#4a5568';
      ctx.fillRect(50, 150, 500, 200); // Ground
      
      ctx.fillStyle = '#48bb78';
      ctx.fillRect(100, 120, 30, 30); // Block
      ctx.fillRect(200, 100, 30, 50); // Tall block
      ctx.fillRect(350, 130, 30, 20); // Small block
      
      // Draw bot position indicator
      ctx.fillStyle = '#f56565';
      ctx.beginPath();
      const posX = (botPosition?.x || 0) * 10;
      const posZ = (botPosition?.z || 0) * 10;
      ctx.arc(300 + posX, 150 + posZ, 8, 0, 2 * Math.PI);
      ctx.fill();
      
      // Draw position text
      ctx.fillStyle = '#ffffff';
      ctx.font = '14px monospace';
      const x = (botPosition?.x || 0).toFixed(1);
      const y = (botPosition?.y || 0).toFixed(1);
      const z = (botPosition?.z || 0).toFixed(1);
      ctx.fillText(`Bot Position: X: ${x}, Y: ${y}, Z: ${z}`, 10, 30);
    } else {
      // Draw disconnected state
      ctx.fillStyle = '#666';
      ctx.font = '24px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('Bot Not Connected', canvas.width / 2, canvas.height / 2);
      ctx.font = '14px Arial';
      ctx.fillText('Connect bot to server to see world view', canvas.width / 2, canvas.height / 2 + 30);
    }
  }, [botPosition, isViewerConnected]);

  const getKeyStyle = (isPressed: boolean) => {
    return `transition-all duration-100 ${
      isPressed 
        ? 'bg-primary text-primary-foreground shadow-lg scale-95' 
        : 'bg-muted hover:bg-muted/80'
    }`;
  };

  return (
    <Layout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Bot Vision</h1>
            <p className="text-muted-foreground">See what your bot sees and control movement with WASD</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={isViewerConnected ? "default" : "secondary"}>
              {isViewerConnected ? "Bot Connected" : "Bot Offline"}
            </Badge>
            <Badge variant={isConnected ? "default" : "secondary"}>
              {isConnected ? "Real-time" : "Disconnected"}
            </Badge>
            <Button 
              variant="outline" 
              onClick={() => setIsFullscreen(!isFullscreen)}
            >
              {isFullscreen ? <Minimize className="w-4 h-4 mr-2" /> : <Maximize className="w-4 h-4 mr-2" />}
              {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          
          {/* Bot View - 3D Canvas */}
          <div className="lg:col-span-3">
            <Card className="glass-effect p-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <Eye className="w-5 h-5" />
                  Bot World View
                </h3>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Gamepad2 className="w-4 h-4" />
                  Use WASD + Space/Shift to control
                </div>
              </div>
              
              <div className={`relative bg-slate-900 rounded-lg overflow-hidden ${isFullscreen ? 'fixed inset-0 z-50' : 'aspect-video'}`}>
                <canvas
                  ref={canvasRef}
                  width={600}
                  height={400}
                  className="w-full h-full"
                  style={{ imageRendering: 'pixelated' }}
                />
                
                {/* Status Overlay */}
                <div className="absolute top-4 left-4 flex gap-2">
                  <Badge variant={isViewerConnected ? "default" : "destructive"}>
                    {isViewerConnected ? "Live View" : "Offline"}
                  </Badge>
                  {Object.entries(movementStates).some(([_, pressed]) => pressed) && (
                    <Badge variant="outline" className="bg-green-500/20 text-green-400">
                      Moving
                    </Badge>
                  )}
                </div>
                
                {/* Exit Fullscreen Button */}
                {isFullscreen && (
                  <Button
                    className="absolute top-4 right-4"
                    variant="outline"
                    onClick={() => setIsFullscreen(false)}
                  >
                    <Minimize className="w-4 h-4 mr-2" />
                    Exit Fullscreen
                  </Button>
                )}
              </div>
            </Card>
          </div>

          {/* Control Panel */}
          <div className="space-y-4">
            
            {/* Movement Status */}
            <Card className="glass-effect p-4">
              <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
                <Move className="w-5 h-5" />
                Movement Status
              </h3>
              <div className="space-y-2">
                {Object.entries(movementStates).map(([key, pressed]) => (
                  <div key={key} className="flex justify-between items-center">
                    <span className="text-sm capitalize text-muted-foreground">{key}</span>
                    <Badge variant={pressed ? "default" : "outline"}>
                      {pressed ? "Active" : "Idle"}
                    </Badge>
                  </div>
                ))}
              </div>
            </Card>

            {/* WASD Controls Visual */}
            <Card className="glass-effect p-4">
              <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
                <Gamepad2 className="w-5 h-5" />
                Controls
              </h3>
              <div className="grid grid-cols-3 gap-1 mb-3">
                <div></div>
                <Button 
                  size="sm" 
                  className={getKeyStyle(movementStates.forward)}
                  disabled
                >
                  <ArrowUp className="w-4 h-4" />
                </Button>
                <div></div>
                <Button 
                  size="sm" 
                  className={getKeyStyle(movementStates.left)}
                  disabled
                >
                  <ArrowLeft className="w-4 h-4" />
                </Button>
                <Button 
                  size="sm" 
                  className={getKeyStyle(movementStates.back)}
                  disabled
                >
                  <ArrowDown className="w-4 h-4" />
                </Button>
                <Button 
                  size="sm" 
                  className={getKeyStyle(movementStates.right)}
                  disabled
                >
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-1">
                <Button 
                  size="sm" 
                  className={getKeyStyle(movementStates.jump)}
                  disabled
                >
                  <Space className="w-3 h-3 mr-1" />
                  Jump
                </Button>
                <Button 
                  size="sm" 
                  className={getKeyStyle(movementStates.sneak)}
                  disabled
                >
                  Sneak
                </Button>
              </div>
              <div className="mt-3 text-xs text-muted-foreground">
                <p>• W/A/S/D: Move</p>
                <p>• Space: Jump</p>
                <p>• Shift: Sneak</p>
              </div>
            </Card>

            {/* Bot Stats */}
            <Card className="glass-effect p-4">
              <h3 className="text-lg font-semibold text-foreground mb-3">Bot Stats</h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Health</span>
                  <span className="text-sm font-mono">{(viewerData as any)?.health || 0}/20</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Food</span>
                  <span className="text-sm font-mono">{(viewerData as any)?.food || 0}/20</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Dimension</span>
                  <span className="text-sm font-mono">{(viewerData as any)?.dimension || 'N/A'}</span>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* Instructions Card */}
        <Card className="glass-effect p-4">
          <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
            <Settings className="w-5 h-5" />
            How to Use Bot Vision
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-muted-foreground">
            <div>
              <h4 className="font-medium text-foreground mb-2">Movement Controls</h4>
              <ul className="space-y-1">
                <li>• Use W/A/S/D keys to move the bot</li>
                <li>• Hold Space to jump</li>
                <li>• Hold Shift to sneak</li>
                <li>• Movement is real-time and continuous</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-foreground mb-2">View Features</h4>
              <ul className="space-y-1">
                <li>• Live world view from bot's perspective</li>
                <li>• Real-time position tracking</li>
                <li>• Movement status indicators</li>
                <li>• Fullscreen mode available</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-foreground mb-2">Requirements</h4>
              <ul className="space-y-1">
                <li>• Bot must be connected to server</li>
                <li>• Real-time connection active</li>
                <li>• Click on the canvas to focus controls</li>
                <li>• Keep this tab active for best performance</li>
              </ul>
            </div>
          </div>
        </Card>
      </div>
    </Layout>
  );
}