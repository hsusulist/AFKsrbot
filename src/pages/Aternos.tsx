import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Layout from "@/components/Layout";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, Play, Square, RotateCcw, Globe, AlertTriangle, Server, Activity } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface AternosSettings {
  username: string;
  password: string;
  serverName: string;
  autoStart: boolean;
}

const defaultSettings: AternosSettings = {
  username: "",
  password: "",
  serverName: "",
  autoStart: false,
};

export default function Aternos() {
  const [showPassword, setShowPassword] = useState(false);
  const [settings, setSettings] = useState<AternosSettings>(defaultSettings);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get current Aternos config
  const { data: config, isLoading } = useQuery({
    queryKey: ['/api/aternos/config'],
    queryFn: () => apiRequest('/api/aternos/config'),
    retry: false,
  });

  // Type the config
  const typedConfig = config as {
    username?: string;
    serverName?: string;
    autoStart?: boolean;
    isLoggedIn?: boolean;
    serverStatus?: string;
    playerCount?: string;
    serverIP?: string;
    version?: string;
    lastLogin?: string;
  } | undefined;

  // Update settings when config loads
  useEffect(() => {
    if (typedConfig) {
      setSettings(prev => ({
        ...prev,
        username: typedConfig.username || "",
        serverName: typedConfig.serverName || "",
        autoStart: typedConfig.autoStart || false,
        // Don't auto-fill password for security
      }));
    }
  }, [typedConfig]);

  // Save configuration mutation
  const saveConfigMutation = useMutation({
    mutationFn: (data: any) => apiRequest('/api/aternos/config', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    onSuccess: () => {
      toast({
        title: "Configuration Saved",
        description: "🎮 Aternos account configuration saved successfully!",
      });
      setSettings(prev => ({ ...prev, password: "" })); // Clear password from input for security
      queryClient.invalidateQueries({ queryKey: ['/api/aternos/config'] });
    },
    onError: (error: any) => {
      const errorMsg = error.message || "Failed to save configuration";
      toast({
        title: "Save Failed",
        description: `❌ ${errorMsg}`,
        variant: "destructive",
      });
    },
  });

  // Server control mutations
  const startServerMutation = useMutation({
    mutationFn: () => apiRequest('/api/aternos/start', {
      method: 'POST',
    }),
    onSuccess: () => {
      toast({
        title: "Server Starting",
        description: "🚀 Aternos server is starting up... This may take a few minutes.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/aternos/config'] });
    },
    onError: (error: any) => {
      toast({
        title: "Start Failed",
        description: `❌ ${error.message || "Failed to start server"}`,
        variant: "destructive",
      });
    },
  });

  const stopServerMutation = useMutation({
    mutationFn: () => apiRequest('/api/aternos/stop', {
      method: 'POST',
    }),
    onSuccess: () => {
      toast({
        title: "Server Stopping",
        description: "🛑 Aternos server is shutting down...",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/aternos/config'] });
    },
    onError: (error: any) => {
      toast({
        title: "Stop Failed",
        description: `❌ ${error.message || "Failed to stop server"}`,
        variant: "destructive",
      });
    },
  });

  const restartServerMutation = useMutation({
    mutationFn: () => apiRequest('/api/aternos/restart', {
      method: 'POST',
    }),
    onSuccess: () => {
      toast({
        title: "Server Restarting",
        description: "🔄 Aternos server is restarting... This may take a few minutes.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/aternos/config'] });
    },
    onError: (error: any) => {
      toast({
        title: "Restart Failed",
        description: `❌ ${error.message || "Failed to restart server"}`,
        variant: "destructive",
      });
    },
  });

  const handleSaveConfig = () => {
    if (!settings.username || !settings.password) {
      toast({
        title: "Missing Information",
        description: "Please provide both username and password",
        variant: "destructive",
      });
      return;
    }
    
    saveConfigMutation.mutate(settings);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'text-green-400';
      case 'starting': return 'text-yellow-400';
      case 'stopping': return 'text-orange-400';
      case 'offline': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online': return <Activity className="w-4 h-4 text-green-400" />;
      case 'starting': return <RotateCcw className="w-4 h-4 text-yellow-400 animate-spin" />;
      case 'stopping': return <Square className="w-4 h-4 text-orange-400" />;
      case 'offline': return <Server className="w-4 h-4 text-red-400" />;
      default: return <Server className="w-4 h-4 text-gray-400" />;
    }
  };

  return (
    <Layout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Aternos Control</h1>
            <p className="text-muted-foreground">Manage your Aternos Minecraft server</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open('https://aternos.org', '_blank')}
            >
              <Globe className="w-4 h-4 mr-2" />
              Aternos Website
            </Button>
          </div>
        </div>

        {/* Security Warning */}
        <Alert className="border-yellow-500/20 bg-yellow-500/10">
          <AlertTriangle className="h-4 w-4 text-yellow-500" />
          <AlertDescription className="text-yellow-300">
            <strong>Security Warning:</strong> By entering your Aternos credentials here, you understand that this could potentially compromise your account. Use this feature at your own risk. Consider creating a dedicated account for bot use.
          </AlertDescription>
        </Alert>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Account Configuration */}
          <Card className="glass-effect p-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <Server className="w-5 h-5" />
                <h3 className="text-lg font-semibold">Account Configuration</h3>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="aternos-username">Aternos Username</Label>
                  <Input
                    id="aternos-username"
                    type="text"
                    placeholder="Enter your Aternos username"
                    value={settings.username}
                    onChange={(e) => setSettings(prev => ({ ...prev, username: e.target.value }))}
                  />
                </div>

                <div>
                  <Label htmlFor="aternos-password">Aternos Password</Label>
                  <div className="relative">
                    <Input
                      id="aternos-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your Aternos password"
                      value={settings.password}
                      onChange={(e) => setSettings(prev => ({ ...prev, password: e.target.value }))}
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <div>
                  <Label htmlFor="server-name">Server Name (optional)</Label>
                  <Input
                    id="server-name"
                    type="text"
                    placeholder="Your server name"
                    value={settings.serverName}
                    onChange={(e) => setSettings(prev => ({ ...prev, serverName: e.target.value }))}
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="auto-start"
                    checked={settings.autoStart}
                    onCheckedChange={(checked) => setSettings(prev => ({ ...prev, autoStart: checked }))}
                  />
                  <Label htmlFor="auto-start">Auto-start server when bot connects</Label>
                </div>

                <Button 
                  onClick={handleSaveConfig}
                  disabled={saveConfigMutation.isPending}
                  className="w-full"
                >
                  {saveConfigMutation.isPending ? "Saving..." : "Save Configuration"}
                </Button>
              </div>
            </div>
          </Card>

          {/* Server Status & Controls */}
          <Card className="glass-effect p-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <Activity className="w-5 h-5" />
                <h3 className="text-lg font-semibold">Server Status</h3>
              </div>

              {typedConfig?.isLoggedIn ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-background/50 rounded-lg">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(typedConfig.serverStatus || 'unknown')}
                        <span className={`font-medium ${getStatusColor(typedConfig.serverStatus || 'unknown')}`}>
                          {(typedConfig.serverStatus || 'Unknown').charAt(0).toUpperCase() + (typedConfig.serverStatus || 'unknown').slice(1)}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">Server Status</p>
                    </div>

                    <div className="p-3 bg-background/50 rounded-lg">
                      <div className="font-medium">{typedConfig.playerCount || '0/20'}</div>
                      <p className="text-xs text-muted-foreground">Players Online</p>
                    </div>

                    {typedConfig.serverIP && (
                      <div className="p-3 bg-background/50 rounded-lg col-span-2">
                        <div className="font-medium text-sm">{typedConfig.serverIP}</div>
                        <p className="text-xs text-muted-foreground">Server IP</p>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <Button
                      onClick={() => startServerMutation.mutate()}
                      disabled={startServerMutation.isPending || typedConfig.serverStatus === 'online'}
                      variant="outline"
                      size="sm"
                    >
                      <Play className="w-4 h-4 mr-1" />
                      Start
                    </Button>

                    <Button
                      onClick={() => stopServerMutation.mutate()}
                      disabled={stopServerMutation.isPending || typedConfig.serverStatus === 'offline'}
                      variant="outline"
                      size="sm"
                    >
                      <Square className="w-4 h-4 mr-1" />
                      Stop
                    </Button>

                    <Button
                      onClick={() => restartServerMutation.mutate()}
                      disabled={restartServerMutation.isPending}
                      variant="outline"
                      size="sm"
                    >
                      <RotateCcw className="w-4 h-4 mr-1" />
                      Restart
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Server className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    Configure your Aternos account to manage your server
                  </p>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Discord Commands */}
        <Card className="glass-effect p-6">
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Globe className="w-5 h-5" />
              <h3 className="text-lg font-semibold">Available Commands</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="font-medium">Discord Commands</h4>
                <div className="space-y-1 text-sm text-muted-foreground">
                  <div><code>/startserver</code> - Start the Aternos server</div>
                  <div><code>/stopserver</code> - Stop the Aternos server</div>
                  <div><code>/restartserver</code> - Restart the Aternos server</div>
                  <div><code>/website</code> - Show the bot website</div>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium">In-Game Commands</h4>
                <div className="space-y-1 text-sm text-muted-foreground">
                  <div><code>?startserver &lt;name&gt;</code> - Start server by name</div>
                  <div><code>?stopserver &lt;name&gt;</code> - Stop server by name</div>
                  <div><code>?restartserver &lt;name&gt;</code> - Restart server by name</div>
                  <div className="text-xs mt-2 text-yellow-400">Commands detected from chat logs</div>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </Layout>
  );
}