import { useState } from "react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { 
  Settings as SettingsIcon, 
  Bell, 
  Shield, 
  Database, 
  Save,
  RotateCcw
} from "lucide-react";

export default function Settings() {
  const [dashboardName, setDashboardName] = useState("AFK Bot Dashboard");
  const [adminEmail, setAdminEmail] = useState("admin@example.com");
  const [enableNotifications, setEnableNotifications] = useState(true);
  const [enableLogging, setEnableLogging] = useState(true);
  const [autoBackup, setAutoBackup] = useState(false);
  const [maxLogEntries, setMaxLogEntries] = useState("1000");
  const [welcomeMessage, setWelcomeMessage] = useState("Welcome to our server!");
  const { toast } = useToast();

  const handleSave = () => {
    toast({
      title: "Settings Saved",
      description: "All settings have been saved successfully.",
      variant: "default"
    });
  };

  const handleReset = () => {
    setDashboardName("AFK Bot Dashboard");
    setAdminEmail("admin@example.com");
    setEnableNotifications(true);
    setEnableLogging(true);
    setAutoBackup(false);
    setMaxLogEntries("1000");
    setWelcomeMessage("Welcome to our server!");
    
    toast({
      title: "Settings Reset",
      description: "All settings have been reset to defaults.",
      variant: "default"
    });
  };

  return (
    <Layout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Settings</h1>
            <p className="text-muted-foreground">Configure your bot dashboard preferences</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleReset}>
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset
            </Button>
            <Button onClick={handleSave} className="gradient-gaming glow-primary">
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* General Settings */}
          <Card className="glass-effect p-6">
            <h3 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
              <SettingsIcon className="w-5 h-5 text-primary" />
              General Settings
            </h3>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="dashboardName" className="text-sm font-medium text-foreground">
                  Dashboard Name
                </Label>
                <Input
                  id="dashboardName"
                  value={dashboardName}
                  onChange={(e) => setDashboardName(e.target.value)}
                  className="mt-1"
                  placeholder="Enter dashboard name"
                />
              </div>

              <div>
                <Label htmlFor="adminEmail" className="text-sm font-medium text-foreground">
                  Admin Email
                </Label>
                <Input
                  id="adminEmail"
                  type="email"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  className="mt-1"
                  placeholder="admin@example.com"
                />
              </div>

              <div>
                <Label htmlFor="welcomeMessage" className="text-sm font-medium text-foreground">
                  Welcome Message
                </Label>
                <Textarea
                  id="welcomeMessage"
                  value={welcomeMessage}
                  onChange={(e) => setWelcomeMessage(e.target.value)}
                  className="mt-1"
                  placeholder="Enter welcome message for new users"
                  rows={3}
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium text-foreground">Enable Notifications</Label>
                    <p className="text-xs text-muted-foreground">Receive alerts for important events</p>
                  </div>
                  <Switch
                    checked={enableNotifications}
                    onCheckedChange={setEnableNotifications}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium text-foreground">System Logging</Label>
                    <p className="text-xs text-muted-foreground">Enable detailed activity logging</p>
                  </div>
                  <Switch
                    checked={enableLogging}
                    onCheckedChange={setEnableLogging}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium text-foreground">Auto Backup</Label>
                    <p className="text-xs text-muted-foreground">Automatically backup settings daily</p>
                  </div>
                  <Switch
                    checked={autoBackup}
                    onCheckedChange={setAutoBackup}
                  />
                </div>
              </div>
            </div>
          </Card>

          {/* Advanced Settings */}
          <Card className="glass-effect p-6">
            <h3 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              Advanced Settings
            </h3>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="maxLogEntries" className="text-sm font-medium text-foreground">
                  Max Log Entries
                </Label>
                <Input
                  id="maxLogEntries"
                  value={maxLogEntries}
                  onChange={(e) => setMaxLogEntries(e.target.value)}
                  className="mt-1"
                  placeholder="1000"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Maximum number of log entries to keep
                </p>
              </div>

              <div className="p-4 rounded-lg bg-muted/50">
                <h4 className="font-medium text-foreground mb-2">Security Settings</h4>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Session Timeout</span>
                    <span className="text-sm font-medium text-foreground">24 hours</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">2FA Status</span>
                    <span className="text-sm font-medium text-success">Enabled</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">API Rate Limit</span>
                    <span className="text-sm font-medium text-foreground">100/min</span>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-lg bg-muted/50">
                <h4 className="font-medium text-foreground mb-2">Performance</h4>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Cache Size</span>
                    <span className="text-sm font-medium text-foreground">256 MB</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Memory Usage</span>
                    <span className="text-sm font-medium text-foreground">45%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">CPU Usage</span>
                    <span className="text-sm font-medium text-foreground">12%</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" size="sm">
                  <Database className="w-4 h-4 mr-2" />
                  Backup Data
                </Button>
                <Button variant="outline" size="sm">
                  <Bell className="w-4 h-4 mr-2" />
                  Test Alerts
                </Button>
              </div>
            </div>
          </Card>
        </div>

        {/* System Information */}
        <Card className="glass-effect p-6">
          <h3 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
            <Database className="w-5 h-5 text-primary" />
            System Information
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h4 className="font-medium text-foreground mb-2">Application</h4>
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Version</span>
                  <span className="text-sm font-medium text-foreground">2.1.0</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Build</span>
                  <span className="text-sm font-medium text-foreground">#1247</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Environment</span>
                  <span className="text-sm font-medium text-foreground">Production</span>
                </div>
              </div>
            </div>
            
            <div>
              <h4 className="font-medium text-foreground mb-2">Database</h4>
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Status</span>
                  <span className="text-sm font-medium text-success">Connected</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Size</span>
                  <span className="text-sm font-medium text-foreground">2.4 GB</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Last Backup</span>
                  <span className="text-sm font-medium text-foreground">2h ago</span>
                </div>
              </div>
            </div>
            
            <div>
              <h4 className="font-medium text-foreground mb-2">Server</h4>
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Uptime</span>
                  <span className="text-sm font-medium text-foreground">15d 4h 32m</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Load Average</span>
                  <span className="text-sm font-medium text-foreground">0.34</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Network I/O</span>
                  <span className="text-sm font-medium text-foreground">12 MB/s</span>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </Layout>
  );
}