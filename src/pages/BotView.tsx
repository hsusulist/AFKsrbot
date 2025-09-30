import { useState, useEffect, useRef, useCallback } from "react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import io from 'socket.io-client';
import { 
  GamepadIcon, 
  ArrowUp, 
  ArrowDown, 
  ArrowLeft, 
  ArrowRight,
  Space,
  Move,
  RotateCcw,
  Settings,
  Maximize,
  Minimize,
  Target,
  Crosshair,
  Zap,
  Package,
  Shield,
  Sword,
  Eye,
  Lock,
  Unlock,
  SkipForward
} from "lucide-react";

export default function ControlBot() {
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<any>(null);
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
  const [worldSnapshot, setWorldSnapshot] = useState({ bot: { pos: { x: 0, y: 0, z: 0 }, yaw: 0, health: 20, food: 20 }, entities: [], lastUpdate: 0 });
  const [controlLocked, setControlLocked] = useState(false);
  const [controlOwner, setControlOwner] = useState(null);
  const [radarZoom, setRadarZoom] = useState(1);
  const [radarCenter, setRadarCenter] = useState({ x: 0, z: 0 });
  const [isManualControl, setIsManualControl] = useState(false);
  const [showInventory, setShowInventory] = useState(false);
  const [pvpEnabled, setPvpEnabled] = useState(false);
  const [pvpTarget, setPvpTarget] = useState(null);
  const [nearbyPlayers, setNearbyPlayers] = useState([]);
  const [mouseDown, setMouseDown] = useState(false);
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });
  const [inventory, setInventory] = useState({ inventory: [], hotbar: [] });
  const [selectedHotbarSlot, setSelectedHotbarSlot] = useState(0);
  const { toast } = useToast();
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Get bot viewer data
  const { data: viewerData, isLoading } = useQuery({
    queryKey: ['/api/viewer'],
    refetchInterval: 1000, // Refresh every second
    staleTime: 0,
  });

  // Get inventory data when showing inventory
  const { data: inventoryData, refetch: refetchInventory } = useQuery({
    queryKey: ['/api/inventory/refresh'],
    enabled: showInventory && isManualControl,
    refetchInterval: showInventory ? 2000 : false, // Refresh every 2 seconds when open
  });

  // Get PvP status
  const { data: pvpData } = useQuery({
    queryKey: ['/api/pvp/status'],
    enabled: isManualControl,
    refetchInterval: isManualControl ? 3000 : false,
  });

  const isViewerConnected = (viewerData as any)?.connected || false;

  // Socket.IO connection and event handlers - merged into single effect
  useEffect(() => {
    // Create socket connection with relative URL for Replit compatibility
    if (!socketRef.current) {
      socketRef.current = io({
        path: '/socket.io',
        transports: ['websocket', 'polling']
      });

      const socket = socketRef.current;

      // Bind all event listeners
      socket.on('connect', () => {
        setIsConnected(true);
        toast({
          title: "Real-time Connected",
          description: "Bot control stream is active",
        });
      });

      socket.on('disconnect', () => {
        setIsConnected(false);
        setIsManualControl(false);
        setControlLocked(false);
        toast({
          title: "Control Lost",
          description: "Connection lost, releasing control",
          variant: "destructive"
        });
      });

      socket.on('bot_position_update', (position) => {
        setBotPosition(position);
      });

      socket.on('world_snapshot', (snapshot) => {
        setWorldSnapshot(snapshot);
        setBotPosition(snapshot.bot.pos);
      });

      socket.on('control_granted', () => {
        setIsManualControl(true);
        setControlLocked(true);
        toast({
          title: "Control Granted",
          description: "You now have manual control of the bot",
        });
      });

      socket.on('control_denied', (data) => {
        toast({
          title: "Control Denied",
          description: data.reason || "Another user has control",
          variant: "destructive"
        });
      });

      socket.on('control_released', () => {
        setIsManualControl(false);
        setControlLocked(false);
        setControlOwner(null);
        toast({
          title: "Control Released",
          description: "Manual control has been released",
        });
      });

      socket.on('control_status', (status) => {
        setControlLocked(status.locked);
        setControlOwner(status.owner);
        setIsManualControl(status.manual);
      });

      socket.on('pvp_status', (status) => {
        setPvpEnabled(status.enabled);
        setPvpTarget(status.target);
      });

      socket.on('inventory_updated', () => {
        // Inventory refresh handled by separate query
      });
    }

    // Cleanup on unmount
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, []);

  // Control functions
  const requestControl = useCallback(async () => {
    try {
      if (socketRef.current) {
        socketRef.current.emit('control_request', { clientId: 'web-user' });
      }
    } catch (error) {
      toast({
        title: "Control Request Failed",
        description: "Failed to request bot control",
        variant: "destructive"
      });
    }
  }, []);

  const releaseControl = useCallback(async () => {
    try {
      if (socketRef.current) {
        socketRef.current.emit('control_release');
      }
      setIsManualControl(false);
      setControlLocked(false);
    } catch (error) {
      toast({
        title: "Release Failed",
        description: "Failed to release bot control",
        variant: "destructive"
      });
    }
  }, []);

  const stopAllMovement = useCallback(() => {
    if (!isManualControl) return;
    if (socketRef.current) {
      socketRef.current.emit('stop_all');
    }
    setMovementStates({
      forward: false,
      back: false,
      left: false,
      right: false,
      jump: false,
      sneak: false
    });
  }, [isManualControl]);

  // Inventory management functions
  const dropItem = useCallback(async (slot: number, count?: number) => {
    try {
      const response = await fetch('/api/inventory/drop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slot, count })
      });
      
      if (response.ok) {
        refetchInventory();
        toast({ title: "Item Dropped", description: "Item dropped successfully" });
      } else {
        const error = await response.json();
        toast({ 
          title: "Drop Failed", 
          description: error.error || "Failed to drop item",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({ 
        title: "Drop Failed", 
        description: "Network error",
        variant: "destructive"
      });
    }
  }, [refetchInventory]);

  const changeHotbarSlot = useCallback(async (slot: number) => {
    try {
      const response = await fetch('/api/inventory/hotbar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slot })
      });
      
      if (response.ok) {
        setSelectedHotbarSlot(slot);
        toast({ title: "Hotbar", description: `Selected slot ${slot + 1}` });
      }
    } catch (error) {
      toast({ 
        title: "Hotbar Failed", 
        description: "Failed to change hotbar slot",
        variant: "destructive"
      });
    }
  }, []);

  const equipItem = useCallback(async (slot: number, destination = 'hand') => {
    try {
      const response = await fetch('/api/inventory/equip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slot, destination })
      });
      
      if (response.ok) {
        refetchInventory();
        toast({ title: "Item Equipped", description: "Item equipped successfully" });
      }
    } catch (error) {
      toast({ 
        title: "Equip Failed", 
        description: "Failed to equip item",
        variant: "destructive"
      });
    }
  }, [refetchInventory]);

  const useItem = useCallback(async (slot: number) => {
    try {
      const response = await fetch('/api/inventory/use', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slot })
      });
      
      if (response.ok) {
        refetchInventory();
        toast({ title: "Item Used", description: "Item used successfully" });
      }
    } catch (error) {
      toast({ 
        title: "Use Failed", 
        description: "Failed to use item",
        variant: "destructive"
      });
    }
  }, [refetchInventory]);

  // PvP management functions
  const togglePvP = useCallback(async () => {
    try {
      const endpoint = pvpEnabled ? '/api/pvp/disable' : '/api/pvp/enable';
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.ok) {
        const result = await response.json();
        setPvpEnabled(result.enabled);
        toast({ 
          title: "PvP Mode", 
          description: `PvP ${result.enabled ? 'enabled' : 'disabled'}`,
          variant: result.enabled ? "destructive" : "default"
        });
      }
    } catch (error) {
      toast({ 
        title: "PvP Failed", 
        description: "Failed to toggle PvP mode",
        variant: "destructive"
      });
    }
  }, [pvpEnabled]);

  const setPvPTarget = useCallback(async (username: string | null) => {
    try {
      const response = await fetch('/api/pvp/target', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username })
      });
      
      if (response.ok) {
        const result = await response.json();
        setPvpTarget(result.target);
        toast({ 
          title: "PvP Target", 
          description: result.target ? `Targeting ${result.target}` : "Target cleared",
          variant: result.target ? "destructive" : "default"
        });
      }
    } catch (error) {
      toast({ 
        title: "Target Failed", 
        description: "Failed to set PvP target",
        variant: "destructive"
      });
    }
  }, []);

  // Update PvP data when received
  useEffect(() => {
    if (pvpData) {
      const data = pvpData as any;
      setPvpEnabled(data.enabled || false);
      setPvpTarget(data.target || null);
      setNearbyPlayers(data.nearbyPlayers || []);
    }
  }, [pvpData]);

  // Control heartbeat
  useEffect(() => {
    if (!isManualControl) return;
    
    const heartbeat = setInterval(() => {
      if (socketRef.current) {
        socketRef.current.emit('control_heartbeat');
      }
    }, 5000); // Every 5 seconds
    
    return () => clearInterval(heartbeat);
  }, [isManualControl]);

  // Modern keyboard handling for smooth movement like a normal player
  useEffect(() => {
    const pressedKeys = useRef(new Set<string>());
    
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isViewerConnected || !isManualControl) return;
      
      // Ignore key repeats for smooth movement
      if (event.repeat) return;

      const code = event.code;
      const keyMap: { [key: string]: keyof typeof movementStates } = {
        'KeyW': 'forward',
        'KeyS': 'back', 
        'KeyA': 'left',
        'KeyD': 'right',
        'Space': 'jump',
        'ShiftLeft': 'sneak',
        'ShiftRight': 'sneak'
      };

      if (keyMap[code] && !pressedKeys.current.has(code)) {
        pressedKeys.current.add(code);
        
        // Prevent browser defaults for Space and Arrow keys
        if (code === 'Space' || code.startsWith('Arrow')) {
          event.preventDefault();
        }
        
        const newStates = { 
          ...movementStates, 
          [keyMap[code]]: true 
        };
        setMovementStates(newStates);
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (!isViewerConnected || !isManualControl) return;

      const code = event.code;
      const keyMap: { [key: string]: keyof typeof movementStates } = {
        'KeyW': 'forward',
        'KeyS': 'back',
        'KeyA': 'left', 
        'KeyD': 'right',
        'Space': 'jump',
        'ShiftLeft': 'sneak',
        'ShiftRight': 'sneak'
      };

      if (keyMap[code] && pressedKeys.current.has(code)) {
        pressedKeys.current.delete(code);
        
        const newStates = { 
          ...movementStates, 
          [keyMap[code]]: false 
        };
        setMovementStates(newStates);
      }
    };

    // Clear all keys on window blur/focus loss
    const handleBlur = () => {
      if (isManualControl) {
        pressedKeys.current.clear();
        setMovementStates({
          forward: false,
          back: false,
          left: false,
          right: false,
          jump: false,
          sneak: false
        });
      }
    };

    // Add event listeners
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, [isViewerConnected, isManualControl]);

  // 20Hz movement state sync for smooth player-like movement
  useEffect(() => {
    if (!isManualControl) return;
    
    const syncInterval = setInterval(() => {
      // Send current movement state to server at 20Hz
      if (socketRef.current) {
        socketRef.current.emit('keys_state', {
          forward: movementStates.forward,
          back: movementStates.back,
          left: movementStates.left,
          right: movementStates.right,
          jump: movementStates.jump,
          sneak: movementStates.sneak
        });
      }
    }, 50); // 20Hz
    
    return () => clearInterval(syncInterval);
  }, [isManualControl, movementStates]);

  // 2D Radar canvas drawing
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (!isViewerConnected) {
      // Draw disconnected state
      ctx.fillStyle = '#64748b';
      ctx.font = '24px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('Bot Not Connected', canvas.width / 2, canvas.height / 2);
      ctx.font = '14px Arial';
      ctx.fillText('Connect bot to server to see radar view', canvas.width / 2, canvas.height / 2 + 30);
      return;
    }

    const centerX = canvas.width / 2;
    const centerZ = canvas.height / 2;
    const scale = 5 * radarZoom; // 5 pixels per block, adjustable zoom

    // Draw grid
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    for (let i = -50; i <= 50; i += 10) {
      // Vertical lines
      const x = centerX + i * scale;
      if (x >= 0 && x <= canvas.width) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      
      // Horizontal lines
      const z = centerZ + i * scale;
      if (z >= 0 && z <= canvas.height) {
        ctx.beginPath();
        ctx.moveTo(0, z);
        ctx.lineTo(canvas.width, z);
        ctx.stroke();
      }
    }

    // Draw compass rose
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(centerX, centerZ, 100, 0, 2 * Math.PI);
    ctx.stroke();
    
    // Draw cardinal directions
    ctx.fillStyle = '#cbd5e1';
    ctx.font = '12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('N', centerX, centerZ - 110);
    ctx.fillText('S', centerX, centerZ + 125);
    ctx.fillText('E', centerX + 110, centerZ + 5);
    ctx.fillText('W', centerX - 110, centerZ + 5);

    const bot = worldSnapshot.bot;
    const botScreenX = centerX + (bot.pos.x - radarCenter.x) * scale;
    const botScreenZ = centerZ + (bot.pos.z - radarCenter.z) * scale;

    // Draw entities
    worldSnapshot.entities.forEach((entity: any) => {
      const entityScreenX = centerX + (entity.pos.x - radarCenter.x) * scale;
      const entityScreenZ = centerZ + (entity.pos.z - radarCenter.z) * scale;
      
      // Only draw entities within canvas bounds
      if (entityScreenX < -20 || entityScreenX > canvas.width + 20 || 
          entityScreenZ < -20 || entityScreenZ > canvas.height + 20) return;

      let color = '#94a3b8'; // Default gray
      let size = 6;
      
      if (entity.type === 'player') {
        color = entity.username === pvpTarget ? '#ef4444' : '#22d3ee'; // Red for target, cyan for others
        size = 8;
      } else if (entity.kind && entity.kind.includes('hostile')) {
        color = '#f97316'; // Orange for hostile mobs
        size = 7;
      } else if (entity.kind && entity.kind.includes('animal')) {
        color = '#84cc16'; // Green for animals
        size = 6;
      } else if (entity.kind && entity.kind.includes('item')) {
        color = '#fbbf24'; // Yellow for items
        size = 4;
      }

      // Draw entity
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(entityScreenX, entityScreenZ, size, 0, 2 * Math.PI);
      ctx.fill();
      
      // Draw entity label
      if (entity.type === 'player' || (entity.kind && entity.kind.includes('hostile'))) {
        ctx.fillStyle = '#f1f5f9';
        ctx.font = '10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(entity.username || entity.kind, entityScreenX, entityScreenZ - size - 2);
      }
    });

    // Draw bot
    ctx.fillStyle = isManualControl ? '#10b981' : '#6366f1'; // Green if controlled, blue if autonomous
    ctx.beginPath();
    ctx.arc(botScreenX, botScreenZ, 12, 0, 2 * Math.PI);
    ctx.fill();
    
    // Draw bot direction indicator
    const directionLength = 20;
    const directionX = Math.cos(bot.yaw) * directionLength;
    const directionZ = Math.sin(bot.yaw) * directionLength;
    
    ctx.strokeStyle = isManualControl ? '#10b981' : '#6366f1';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(botScreenX, botScreenZ);
    ctx.lineTo(botScreenX + directionX, botScreenZ + directionZ);
    ctx.stroke();
    
    // Draw bot label
    ctx.fillStyle = '#f1f5f9';
    ctx.font = '12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('BOT', botScreenX, botScreenZ - 18);

    // Draw status info
    ctx.fillStyle = '#f1f5f9';
    ctx.font = '14px monospace';
    ctx.textAlign = 'left';
    const x = bot.pos.x.toFixed(1);
    const y = bot.pos.y.toFixed(1);
    const z = bot.pos.z.toFixed(1);
    ctx.fillText(`Position: X: ${x}, Y: ${y}, Z: ${z}`, 10, 25);
    ctx.fillText(`Health: ${bot.health}/20  Food: ${bot.food}/20`, 10, 45);
    ctx.fillText(`Zoom: ${radarZoom.toFixed(1)}x`, 10, canvas.height - 10);
    
    if (pvpEnabled) {
      ctx.fillStyle = '#ef4444';
      ctx.fillText(`PvP: ON ${pvpTarget ? `(Target: ${pvpTarget})` : ''}`, 10, 65);
    }

  }, [worldSnapshot, isViewerConnected, radarZoom, radarCenter, isManualControl, pvpEnabled, pvpTarget]);

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
            <h1 className="text-3xl font-bold text-foreground">Bot Control</h1>
            <p className="text-muted-foreground">Take manual control of your bot with 2D radar view</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={isViewerConnected ? "default" : "secondary"}>
              {isViewerConnected ? "Bot Connected" : "Bot Offline"}
            </Badge>
            <Badge variant={isConnected ? "default" : "secondary"}>
              {isConnected ? "Real-time" : "Disconnected"}
            </Badge>
            {controlLocked && controlOwner && (
              <Badge variant="outline" className="bg-yellow-500/20 text-yellow-400">
                {controlOwner === 'web-user' ? 'You have control' : `Controlled by ${controlOwner}`}
              </Badge>
            )}
            {isManualControl && (
              <Button 
                variant="destructive" 
                size="sm"
                onClick={releaseControl}
              >
                <Unlock className="w-4 h-4 mr-2" />
                Release Control
              </Button>
            )}
            {!isManualControl && isViewerConnected && (
              <Button 
                variant="default" 
                size="sm"
                onClick={requestControl}
                disabled={controlLocked && controlOwner !== 'web-user'}
              >
                <Lock className="w-4 h-4 mr-2" />
                Control Bot
              </Button>
            )}
            <Button 
              variant="outline" 
              onClick={() => setIsFullscreen(!isFullscreen)}
            >
              {isFullscreen ? <Minimize className="w-4 h-4 mr-2" /> : <Maximize className="w-4 h-4 mr-2" />}
              {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            </Button>
          </div>
        </div>

        {/* Inventory Panel - Only shown when in control mode and inventory is toggled */}
        {showInventory && isManualControl && (
          <Card className="glass-effect p-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <Package className="w-5 h-5" />
                Bot Inventory
              </h3>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setShowInventory(false)}
              >
                <Eye className="w-4 h-4 mr-2" />
                Hide
              </Button>
            </div>

            {inventoryData && (
              <div className="space-y-4">
                {/* Hotbar */}
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">Hotbar (1-9 Keys)</h4>
                  <div className="grid grid-cols-9 gap-1">
                    {Array.from({ length: 9 }, (_, i) => {
                      const item = (inventoryData as any)?.hotbar?.[i];
                      return (
                        <div
                          key={i}
                          className={`relative aspect-square border-2 rounded-lg p-2 cursor-pointer transition-all ${
                            selectedHotbarSlot === i 
                              ? 'border-primary bg-primary/20' 
                              : 'border-border bg-background hover:border-border/60'
                          }`}
                          onClick={() => changeHotbarSlot(i)}
                        >
                          <div className="absolute top-1 left-1 text-xs text-muted-foreground">
                            {i + 1}
                          </div>
                          {item && (
                            <div className="flex flex-col items-center justify-center h-full">
                              <div className="text-xs text-center font-mono truncate w-full">
                                {item.name?.replace('minecraft:', '')}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {item.count}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Full Inventory Grid */}
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-2">
                    Full Inventory ({(inventoryData as any)?.inventory?.filter(Boolean).length || 0} items)
                  </h4>
                  <div className="grid grid-cols-9 gap-1 max-h-64 overflow-y-auto">
                    {(inventoryData as any)?.inventory?.map((item: any, index: number) => (
                      <div
                        key={index}
                        className={`relative aspect-square border rounded p-1 text-xs ${
                          item 
                            ? 'border-border bg-background hover:border-border/60 cursor-pointer' 
                            : 'border-border/30 bg-muted/20'
                        }`}
                      >
                        <div className="absolute top-0 left-0 text-xs text-muted-foreground bg-background/80 px-1 rounded-br">
                          {index}
                        </div>
                        {item && (
                          <div className="flex flex-col items-center justify-center h-full pt-2">
                            <div className="text-xs text-center font-mono truncate w-full">
                              {item.name?.replace('minecraft:', '')}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {item.count}
                            </div>
                            {item.durability !== null && (
                              <div className="text-xs text-orange-400">
                                {item.durability}/{item.maxDurability}
                              </div>
                            )}
                            {/* Item Action Buttons */}
                            <div className="absolute inset-0 bg-black/80 opacity-0 hover:opacity-100 transition-opacity flex flex-col gap-1 p-1">
                              <Button 
                                size="sm" 
                                variant="destructive" 
                                className="text-xs py-0 px-1 h-5"
                                onClick={() => dropItem(index, 1)}
                              >
                                Drop 1
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="text-xs py-0 px-1 h-5"
                                onClick={() => dropItem(index)}
                              >
                                Drop All
                              </Button>
                              <Button 
                                size="sm" 
                                variant="default" 
                                className="text-xs py-0 px-1 h-5"
                                onClick={() => equipItem(index)}
                              >
                                Equip
                              </Button>
                              <Button 
                                size="sm" 
                                variant="secondary" 
                                className="text-xs py-0 px-1 h-5"
                                onClick={() => useItem(index)}
                              >
                                Use
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    )) || Array.from({ length: 36 }, (_, i) => (
                      <div key={i} className="aspect-square border border-border/30 bg-muted/20 rounded"></div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </Card>
        )}

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          
          {/* 2D Radar View */}
          <div className="lg:col-span-3">
            <Card className="glass-effect p-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  2D Radar View
                </h3>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <GamepadIcon className="w-4 h-4" />
                    {isManualControl ? 'WASD + Space/Shift' : 'Take control to move'}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setRadarZoom(Math.max(0.5, radarZoom - 0.5))}
                    >
                      -
                    </Button>
                    <span className="text-sm px-2">{radarZoom.toFixed(1)}x</span>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setRadarZoom(Math.min(5, radarZoom + 0.5))}
                    >
                      +
                    </Button>
                  </div>
                  {isManualControl && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={stopAllMovement}
                    >
                      <SkipForward className="w-4 h-4" />
                      Stop
                    </Button>
                  )}
                </div>
              </div>
              
              <div className={`relative bg-slate-900 rounded-lg overflow-hidden ${isFullscreen ? 'fixed inset-0 z-50' : 'aspect-video'}`}>
                <canvas
                  ref={canvasRef}
                  width={800}
                  height={600}
                  className="w-full h-full cursor-crosshair"
                  onMouseDown={(e) => {
                    if (!isManualControl) return;
                    setMouseDown(true);
                    setLastMousePos({ x: e.clientX, y: e.clientY });
                  }}
                  onMouseMove={(e) => {
                    if (!mouseDown || !isManualControl) return;
                    const deltaX = e.clientX - lastMousePos.x;
                    const deltaY = e.clientY - lastMousePos.y;
                    
                    // Send look delta to server
                    if (socketRef.current) {
                      socketRef.current.emit('look_delta', {
                        deltaYaw: deltaX * 0.01,
                        deltaPitch: deltaY * 0.01
                      });
                    }
                    
                    setLastMousePos({ x: e.clientX, y: e.clientY });
                  }}
                  onMouseUp={() => setMouseDown(false)}
                  onMouseLeave={() => setMouseDown(false)}
                  onWheel={(e) => {
                    e.preventDefault();
                    const delta = e.deltaY > 0 ? -0.2 : 0.2;
                    setRadarZoom(Math.max(0.5, Math.min(5, radarZoom + delta)));
                  }}
                />
                
                {/* Status Overlay */}
                <div className="absolute top-4 left-4 flex gap-2 flex-wrap">
                  <Badge variant={isViewerConnected ? "default" : "destructive"}>
                    {isViewerConnected ? "Live Radar" : "Offline"}
                  </Badge>
                  {isManualControl && (
                    <Badge variant="outline" className="bg-green-500/20 text-green-400">
                      Manual Control Active
                    </Badge>
                  )}
                  {Object.entries(movementStates).some(([_, pressed]) => pressed) && (
                    <Badge variant="outline" className="bg-blue-500/20 text-blue-400">
                      Moving
                    </Badge>
                  )}
                  {pvpEnabled && (
                    <Badge variant="outline" className="bg-red-500/20 text-red-400">
                      PvP Mode
                    </Badge>
                  )}
                </div>

                {/* Controls Help */}
                <div className="absolute bottom-4 right-4 text-xs text-muted-foreground bg-black/50 p-2 rounded">
                  <div>Mouse: Look around (hold)</div>
                  <div>Scroll: Zoom in/out</div>
                  <div>WASD: Move (when controlling)</div>
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
            
            {/* Bot Control Status */}
            <Card className="glass-effect p-4">
              <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
                <Crosshair className="w-5 h-5" />
                Control Status
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Mode</span>
                  <Badge variant={isManualControl ? "default" : "outline"}>
                    {isManualControl ? "Manual Control" : "Autonomous"}
                  </Badge>
                </div>
                {controlLocked && controlOwner && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Controlled by</span>
                    <Badge variant="outline" className="text-xs">
                      {controlOwner === 'web-user' ? 'You' : controlOwner}
                    </Badge>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">PvP Mode</span>
                  <Badge variant={pvpEnabled ? "destructive" : "outline"}>
                    {pvpEnabled ? "Enabled" : "Disabled"}
                  </Badge>
                </div>
                {pvpTarget && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Target</span>
                    <Badge variant="destructive" className="text-xs">
                      {pvpTarget}
                    </Badge>
                  </div>
                )}
              </div>
            </Card>
            
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

            {/* PvP Control Panel */}
            {isManualControl && nearbyPlayers.length > 0 && (
              <Card className="glass-effect p-4">
                <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  PvP Control
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">PvP Mode</span>
                    <Button 
                      size="sm" 
                      variant={pvpEnabled ? "destructive" : "outline"}
                      onClick={togglePvP}
                    >
                      {pvpEnabled ? 'Enabled' : 'Disabled'}
                    </Button>
                  </div>
                  
                  {pvpEnabled && (
                    <>
                      {pvpTarget && (
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Current Target</span>
                          <div className="flex items-center gap-2">
                            <Badge variant="destructive" className="text-xs">
                              {pvpTarget}
                            </Badge>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => setPvPTarget(null)}
                            >
                              Clear
                            </Button>
                          </div>
                        </div>
                      )}
                      
                      <div>
                        <h4 className="text-sm font-medium text-muted-foreground mb-2">
                          Nearby Players ({nearbyPlayers.length})
                        </h4>
                        <div className="space-y-1 max-h-32 overflow-y-auto">
                          {nearbyPlayers.map((player: any) => (
                            <div 
                              key={player.username}
                              className={`flex justify-between items-center p-2 rounded border transition-colors cursor-pointer ${
                                player.username === pvpTarget 
                                  ? 'border-red-500 bg-red-500/20' 
                                  : 'border-border hover:border-border/60 hover:bg-muted/50'
                              }`}
                              onClick={() => setPvPTarget(player.username)}
                            >
                              <div className="flex flex-col">
                                <span className="text-sm font-medium">{player.username}</span>
                                <span className="text-xs text-muted-foreground">
                                  {player.distance}m away
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="text-xs text-muted-foreground">
                                  ❤️ {player.health}/20
                                </div>
                                {player.username === pvpTarget && (
                                  <Crosshair className="w-4 h-4 text-red-500" />
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </Card>
            )}

            {/* Quick Actions */}
            {isManualControl && (
              <Card className="glass-effect p-4">
                <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
                  <Zap className="w-5 h-5" />
                  Quick Actions
                </h3>
                <div className="space-y-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full"
                    onClick={() => setShowInventory(!showInventory)}
                  >
                    <Package className="w-4 h-4 mr-2" />
                    {showInventory ? 'Hide' : 'Show'} Inventory
                  </Button>
                  <Button 
                    variant={pvpEnabled ? "destructive" : "outline"} 
                    size="sm" 
                    className="w-full"
                    onClick={togglePvP}
                  >
                    <Sword className="w-4 h-4 mr-2" />
                    {pvpEnabled ? 'Disable' : 'Enable'} PvP
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full"
                    onClick={stopAllMovement}
                  >
                    <SkipForward className="w-4 h-4 mr-2" />
                    Stop All Movement
                  </Button>
                </div>
              </Card>
            )}

            {/* WASD Controls Visual */}
            <Card className="glass-effect p-4">
              <h3 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
                <GamepadIcon className="w-5 h-5" />
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