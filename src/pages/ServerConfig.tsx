import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { 
  Server, 
  Globe, 
  Lock, 
  Shield, 
  CheckCircle,
  AlertCircle,
  Eye,
  EyeOff,
  Save,
  XCircle,
  Loader2
} from "lucide-react";

export default function ServerConfig() {
  const [serverIP, setServerIP] = useState("127.0.0.1");
  const [serverPort, setServerPort] = useState("25565");
  const [username, setUsername] = useState("");
  const [botPassword, setBotPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [shouldRegister, setShouldRegister] = useState(false);
  const [useWhitelist, setUseWhitelist] = useState(false);
  const [autoReconnect, setAutoReconnect] = useState(true);
  const [version, setVersion] = useState("1.20.4");
  const [platform, setPlatform] = useState("java");
  const { toast } = useToast();

  // Get current config
  const { data: config, isLoading } = useQuery({
    queryKey: ['/api/minecraft/config'],
  });

  // Type the config
  const typedConfig = config as {
    serverIP?: string;
    serverPort?: string;
    username?: string;
    password?: string;
    shouldRegister?: boolean;
    useWhitelist?: boolean;
    autoReconnect?: boolean;
    version?: string;
    platform?: string;
    isConnected?: boolean;
    ping?: string;
    uptime?: string;
    playersOnline?: string;
  } | undefined;

  // Update state when config loads
  useEffect(() => {
    if (typedConfig) {
      setServerIP(typedConfig.serverIP || "127.0.0.1");
      setServerPort(typedConfig.serverPort || "25565");
      setUsername(typedConfig.username || "");
      // Don't override password if it's empty in config (API doesn't return passwords for security)
      if (typedConfig.password) {
        setBotPassword(typedConfig.password);
      }
      setShouldRegister(typedConfig.shouldRegister || false);
      setUseWhitelist(typedConfig.useWhitelist || false);
      setAutoReconnect(typedConfig.autoReconnect !== undefined ? typedConfig.autoReconnect : true);
      setVersion(typedConfig.version || "1.20.4");
      setPlatform(typedConfig.platform || "java");
    }
  }, [typedConfig]);

  // Connect mutation
  const connectMutation = useMutation({
    mutationFn: (data: any) => apiRequest('/api/minecraft/connect', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    onSuccess: () => {
      toast({
        title: "Connected!",
        description: "🎮 Bot connected to server! Check Minecraft Logs to see activity.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/minecraft/config'] });
    },
    onError: (error: any) => {
      const errorMsg = error.message || "Failed to connect";
      let description = "❌ Connection failed";
      
      if (errorMsg.includes("ENOTFOUND") || errorMsg.includes("getaddrinfo")) {
        description = "❌ Server IP is invalid or server is offline";
      } else if (errorMsg.includes("ECONNREFUSED") || errorMsg.includes("ECONNRESET")) {
        description = "❌ Server port is invalid or server is not accepting connections";
      } else if (errorMsg.includes("timeout")) {
        description = "❌ Connection timeout - server may be slow to respond";
      }
      
      toast({
        title: "Connection Failed",
        description: description,
        variant: "destructive",
      });
    },
  });

  // Disconnect mutation
  const disconnectMutation = useMutation({
    mutationFn: () => apiRequest('/api/minecraft/disconnect', {
      method: 'POST',
    }),
    onSuccess: () => {
      toast({
        title: "Disconnected",
        description: "Disconnected from Minecraft server",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/minecraft/config'] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to disconnect",
        variant: "destructive",
      });
    },
  });

  const isConnected = typedConfig?.isConnected || false;

  const handleConnect = () => {
    if (!serverIP.trim() || !serverPort.trim() || !username.trim()) {
      toast({
        title: "Error",
        description: "Please enter server IP, port, and username",
        variant: "destructive"
      });
      return;
    }

    if (botPassword && botPassword.length < 4) {
      toast({
        title: "Error", 
        description: "Password must be at least 4 characters long",
        variant: "destructive"
      });
      return;
    }

    connectMutation.mutate({
      serverIP,
      serverPort,
      username,
      password: botPassword || undefined,
      shouldRegister,
      version,
      platform,
      autoReconnect,
      useWhitelist,
      mode24_7: true,
    });
  };

  const handleDisconnect = () => {
    disconnectMutation.mutate();
  };

  // Save settings mutation - handles both manual and auto-save
  const saveSettingsMutation = useMutation({
    mutationFn: (data: any) => apiRequest('/api/minecraft/config', {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
    onSuccess: (data, variables) => {
      // Reset in-flight flag for auto-saves
      if (variables.__autoSave) {
        inFlightRef.current = false;
      }
      
      // Only show toast and invalidate for manual saves, not auto-saves
      if (!variables.__autoSave) {
        toast({
          title: "✅ Settings Saved!",
          description: "Your server configuration has been saved successfully.",
        });
        queryClient.invalidateQueries({ queryKey: ['/api/minecraft/config'] });
      } else {
        // For auto-saves, silently update the last saved reference
        lastSavedConfigRef.current = {
          serverIP,
          serverPort,
          username,
          password: botPassword || undefined,
          shouldRegister,
          version,
          platform,
          autoReconnect,
          useWhitelist,
        };
      }
    },
    onError: (error: any, variables) => {
      // Reset in-flight flag for auto-saves
      if (variables.__autoSave) {
        inFlightRef.current = false;
      }
      
      // Only show error toast for manual saves
      if (!variables.__autoSave) {
        toast({
          title: "Save Failed",
          description: error.message || "Failed to save settings",
          variant: "destructive",
        });
      }
    },
  });

  const handleSave = () => {
    saveSettingsMutation.mutate({
      serverIP,
      serverPort,
      username,
      password: botPassword || undefined,
      shouldRegister,
      version,
      platform,
      autoReconnect,
      useWhitelist,
    });
  };

  // Stable auto-save system - prevents infinite loops and spam
  const timeoutRef = useRef<NodeJS.Timeout>();
  const inFlightRef = useRef(false);
  const lastSavedConfigRef = useRef<any>({});

  // Auto-save when form values change (silent, no toasts/invalidation)
  useEffect(() => {
    // Only auto-save if config has loaded
    if (!typedConfig) return;
    
    // Create current config object
    const currentConfig = {
      serverIP,
      serverPort,
      username,
      password: botPassword || undefined,
      shouldRegister,
      version,
      platform,
      autoReconnect,
      useWhitelist,
    };
    
    // Only save if config has actually changed (dirty check)
    const hasChanged = JSON.stringify(currentConfig) !== JSON.stringify(lastSavedConfigRef.current);
    if (!hasChanged) return;
    
    // Clear any pending auto-save
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    // Don't start new auto-save if one is already in flight
    if (inFlightRef.current) return;
    
    // Debounce auto-save (2 seconds)
    timeoutRef.current = setTimeout(() => {
      if (serverIP && serverPort && username && !inFlightRef.current) {
        inFlightRef.current = true;
        saveSettingsMutation.mutate({
          ...currentConfig,
          __autoSave: true, // Flag to prevent toasts/invalidation
        });
      }
    }, 2000);
    
    // Cleanup on unmount
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [serverIP, serverPort, username, botPassword, shouldRegister, version, platform, autoReconnect, useWhitelist, typedConfig]);

  return (
    <Layout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Server Configuration</h1>
            <p className="text-muted-foreground">Configure server connection and settings</p>
          </div>
          <div className="flex items-center gap-3">
            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
              isConnected 
                ? "bg-success/10 text-success border border-success/20" 
                : "bg-muted text-muted-foreground border border-border"
            }`}>
              {isConnected ? (
                <CheckCircle className="w-4 h-4" />
              ) : (
                <AlertCircle className="w-4 h-4" />
              )}
              <span className="text-sm font-medium">
                {isConnected ? "Connected" : "Disconnected"}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Connection Settings */}
          <Card className="glass-effect p-6">
            <h3 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
              <Globe className="w-5 h-5 text-primary" />
              Connection Settings
            </h3>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="serverIP" className="text-sm font-medium text-foreground">
                  Server IP Address
                </Label>
                <Input
                  id="serverIP"
                  value={serverIP}
                  onChange={(e) => setServerIP(e.target.value)}
                  className="mt-1"
                  placeholder="127.0.0.1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Enter the IP address of your game server
                </p>
              </div>

              <div>
                <Label htmlFor="serverPort" className="text-sm font-medium text-foreground">
                  Server Port
                </Label>
                <Input
                  id="serverPort"
                  value={serverPort}
                  onChange={(e) => setServerPort(e.target.value)}
                  className="mt-1"
                  placeholder="25565"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Default port is usually 25565
                </p>
              </div>

              <div>
                <Label htmlFor="username" className="text-sm font-medium text-foreground">
                  Bot Username
                </Label>
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="mt-1"
                  placeholder="Enter bot username"
                  data-testid="input-username"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Username for the bot to join the server
                </p>
              </div>

              <div>
                <Label htmlFor="botPassword" className="text-sm font-medium text-foreground">
                  Bot Password (Optional)
                </Label>
                <div className="relative mt-1">
                  <Input
                    id="botPassword"
                    type={showPassword ? "text" : "password"}
                    value={botPassword}
                    onChange={(e) => setBotPassword(e.target.value)}
                    placeholder="Enter password if required"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {botPassword && botPassword.length > 0 && botPassword.length < 4 ? 
                    "Password must be at least 4 characters long" :
                    "Leave empty if no password is required (minimum 4 characters if used)"
                  }
                </p>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium text-foreground">Register Account</Label>
                  <p className="text-xs text-muted-foreground">
                    {shouldRegister ? "Bot will register with password (AuthMe compatible)" : "Bot will login with password (AuthMe compatible)"}
                  </p>
                </div>
                <Switch
                  checked={shouldRegister}
                  onCheckedChange={setShouldRegister}
                  data-testid="switch-register"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="version">Minecraft Version</Label>
                  <select 
                    id="version"
                    value={version}
                    onChange={(e) => setVersion(e.target.value)}
                    className="w-full mt-1 px-3 py-2 bg-background border border-input rounded-md text-sm"
                  >
                    <option value="1.20.4">1.20.4</option>
                    <option value="1.20.1">1.20.1</option>
                    <option value="1.19.4">1.19.4</option>
                    <option value="1.18.2">1.18.2</option>
                    <option value="1.17.1">1.17.1</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="platform">Platform</Label>
                  <select 
                    id="platform"
                    value={platform}
                    onChange={(e) => setPlatform(e.target.value)}
                    className="w-full mt-1 px-3 py-2 bg-background border border-input rounded-md text-sm"
                  >
                    <option value="java">Java Edition</option>
                    <option value="bedrock">Bedrock Edition</option>
                  </select>
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium text-foreground">Auto-reconnect</Label>
                    <p className="text-xs text-muted-foreground">Automatically reconnect if connection is lost</p>
                  </div>
                  <Switch
                    checked={autoReconnect}
                    onCheckedChange={setAutoReconnect}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium text-foreground">24/7 Mode</Label>
                    <p className="text-xs text-muted-foreground">Keep bot running continuously</p>
                  </div>
                  <Switch
                    defaultChecked={true}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium text-foreground">Use whitelist</Label>
                    <p className="text-xs text-muted-foreground">Only allow whitelisted users</p>
                  </div>
                  <Switch
                    checked={useWhitelist}
                    onCheckedChange={setUseWhitelist}
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button 
                  onClick={handleSave}
                  variant="outline"
                  disabled={saveSettingsMutation.isPending}
                  className="flex-1"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {saveSettingsMutation.isPending ? "Saving..." : "Save Settings"}
                </Button>
                {!isConnected ? (
                  <Button 
                    onClick={handleConnect}
                    className="flex-1 gradient-gaming glow-primary"
                    disabled={connectMutation.isPending}
                  >
                    {connectMutation.isPending ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Server className="w-4 h-4 mr-2" />
                    )}
                    {connectMutation.isPending ? "Connecting..." : "Connect to Server"}
                  </Button>
                ) : (
                  <Button 
                    onClick={handleDisconnect}
                    variant="outline"
                    className="flex-1"
                    disabled={disconnectMutation.isPending}
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    {disconnectMutation.isPending ? "Disconnecting..." : "Disconnect"}
                  </Button>
                )}
              </div>
            </div>
          </Card>

          {/* Server Status & Info */}
          <Card className="glass-effect p-6">
            <h3 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              Server Status
            </h3>
            
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-muted/50">
                <h4 className="font-medium text-foreground mb-2">Connection Info</h4>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Status</span>
                    <span className={`text-sm font-medium ${isConnected ? "text-success" : "text-error"}`}>
                      {isConnected ? "Online" : "Offline"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Ping</span>
                    <span className="text-sm font-medium text-foreground">
                      {isConnected ? "23ms" : "N/A"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Uptime</span>
                    <span className="text-sm font-medium text-foreground">
                      {isConnected ? "1d 5h 23m" : "N/A"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Players Online</span>
                    <span className="text-sm font-medium text-foreground">
                      {isConnected ? "12/100" : "0/0"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-lg bg-muted/50">
                <h4 className="font-medium text-foreground mb-2">Server Details</h4>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Version</span>
                    <span className="text-sm font-medium text-foreground">1.20.1</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Game Mode</span>
                    <span className="text-sm font-medium text-foreground">Survival</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Difficulty</span>
                    <span className="text-sm font-medium text-foreground">Normal</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Whitelist</span>
                    <span className="text-sm font-medium text-foreground">
                      {useWhitelist ? "Enabled" : "Disabled"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" size="sm">
                  <Lock className="w-4 h-4 mr-2" />
                  Security
                </Button>
                <Button variant="outline" size="sm">
                  <Globe className="w-4 h-4 mr-2" />
                  Network
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </Layout>
  );
}