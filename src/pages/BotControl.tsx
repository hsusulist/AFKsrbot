import { useState } from "react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { 
  Bot, 
  Key, 
  Shield, 
  Settings, 
  CheckCircle, 
  XCircle,
  Eye,
  EyeOff
} from "lucide-react";

export default function BotControl() {
  const [botToken, setBotToken] = useState("");
  const [botName, setBotName] = useState("AFK Bot");
  const [isConnected, setIsConnected] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [autoStart, setAutoStart] = useState(true);
  const { toast } = useToast();

  const handleConnect = () => {
    if (!botToken.trim()) {
      toast({
        title: "Error",
        description: "Please enter a valid bot token",
        variant: "destructive"
      });
      return;
    }

    // Simulate connection
    setTimeout(() => {
      setIsConnected(true);
      toast({
        title: "Success",
        description: "Discord bot token connected!",
        variant: "default"
      });
    }, 1000);
  };

  const handleDisconnect = () => {
    setIsConnected(false);
    toast({
      title: "Disconnected",
      description: "Bot has been disconnected",
      variant: "default"
    });
  };

  return (
    <Layout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Bot Control</h1>
            <p className="text-muted-foreground">Configure and manage your Discord bot</p>
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
                <XCircle className="w-4 h-4" />
              )}
              <span className="text-sm font-medium">
                {isConnected ? "Connected" : "Disconnected"}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Bot Configuration */}
          <Card className="glass-effect p-6">
            <h3 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
              <Bot className="w-5 h-5 text-primary" />
              Bot Configuration
            </h3>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="botName" className="text-sm font-medium text-foreground">
                  Bot Name
                </Label>
                <Input
                  id="botName"
                  value={botName}
                  onChange={(e) => setBotName(e.target.value)}
                  className="mt-1"
                  placeholder="Enter bot name"
                />
              </div>

              <div>
                <Label htmlFor="botToken" className="text-sm font-medium text-foreground">
                  Discord Bot Token
                </Label>
                <div className="relative mt-1">
                  <Input
                    id="botToken"
                    type={showToken ? "text" : "password"}
                    value={botToken}
                    onChange={(e) => setBotToken(e.target.value)}
                    placeholder="Enter your Discord bot token"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowToken(!showToken)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Get your bot token from Discord Developer Portal
                </p>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium text-foreground">Auto-start on boot</Label>
                  <p className="text-xs text-muted-foreground">Start bot automatically when server starts</p>
                </div>
                <Switch
                  checked={autoStart}
                  onCheckedChange={setAutoStart}
                />
              </div>

              <div className="flex gap-2 pt-4">
                {!isConnected ? (
                  <Button 
                    onClick={handleConnect}
                    className="flex-1 gradient-gaming glow-primary"
                  >
                    <Key className="w-4 h-4 mr-2" />
                    Connect Bot
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

          {/* Bot Status & Permissions */}
          <Card className="glass-effect p-6">
            <h3 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              Status & Permissions
            </h3>
            
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-muted/50">
                <h4 className="font-medium text-foreground mb-2">Current Status</h4>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Connection</span>
                    <span className={`text-sm font-medium ${isConnected ? "text-success" : "text-error"}`}>
                      {isConnected ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Uptime</span>
                    <span className="text-sm font-medium text-foreground">
                      {isConnected ? "2h 34m" : "0m"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Commands Processed</span>
                    <span className="text-sm font-medium text-foreground">
                      {isConnected ? "147" : "0"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-lg bg-muted/50">
                <h4 className="font-medium text-foreground mb-2">Required Permissions</h4>
                <div className="space-y-2">
                  {[
                    "Send Messages",
                    "Read Message History",
                    "Manage Messages",
                    "Add Reactions",
                    "Use Slash Commands"
                  ].map((permission, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-success" />
                      <span className="text-sm text-foreground">{permission}</span>
                    </div>
                  ))}
                </div>
              </div>

              <Button variant="outline" className="w-full">
                <Settings className="w-4 h-4 mr-2" />
                Advanced Settings
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </Layout>
  );
}