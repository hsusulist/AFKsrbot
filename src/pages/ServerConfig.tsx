import { useState } from "react";
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
  EyeOff
} from "lucide-react";

export default function ServerConfig() {
  const [serverIP, setServerIP] = useState("127.0.0.1");
  const [serverPort, setServerPort] = useState("25565");
  const [botPassword, setBotPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [useWhitelist, setUseWhitelist] = useState(false);
  const [autoReconnect, setAutoReconnect] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const { toast } = useToast();

  const handleConnect = () => {
    if (!serverIP.trim() || !serverPort.trim()) {
      toast({
        title: "Error",
        description: "Please enter valid server IP and port",
        variant: "destructive"
      });
      return;
    }

    // Simulate connection
    setTimeout(() => {
      setIsConnected(true);
      toast({
        title: "Success",
        description: "Connected to server successfully!",
        variant: "default"
      });
    }, 1000);
  };

  const handleDisconnect = () => {
    setIsConnected(false);
    toast({
      title: "Disconnected",
      description: "Disconnected from server",
      variant: "default"
    });
  };

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
                  Leave empty if no password is required
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="version">Minecraft Version</Label>
                  <select 
                    id="version"
                    className="w-full mt-1 px-3 py-2 bg-background border border-input rounded-md text-sm"
                    defaultValue="1.20.4"
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
                    className="w-full mt-1 px-3 py-2 bg-background border border-input rounded-md text-sm"
                    defaultValue="java"
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
                {!isConnected ? (
                  <Button 
                    onClick={handleConnect}
                    className="flex-1 gradient-gaming glow-primary"
                  >
                    <Server className="w-4 h-4 mr-2" />
                    Connect to Server
                  </Button>
                ) : (
                  <Button 
                    onClick={handleDisconnect}
                    variant="outline"
                    className="flex-1"
                  >
                    Disconnect
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