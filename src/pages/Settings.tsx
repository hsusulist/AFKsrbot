import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAutosave } from "@/hooks/useAutosave";
import { 
  Settings as SettingsIcon, 
  Bell, 
  Shield, 
  Database, 
  Save,
  RotateCcw,
  Moon,
  Sun,
  Monitor
} from "lucide-react";

interface SettingsData {
  dashboardName: string;
  adminEmail: string;
  enableNotifications: boolean;
  enableLogging: boolean;
  autoBackup: boolean;
  maxLogEntries: string;
  welcomeMessage: string;
}

const defaultSettings: SettingsData = {
  dashboardName: "AFK Bot Dashboard",
  adminEmail: "admin@example.com",
  enableNotifications: true,
  enableLogging: true,
  autoBackup: false,
  maxLogEntries: "1000",
  welcomeMessage: "Welcome to our server!"
};

export default function Settings() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const { toast } = useToast();
  
  // Autosave settings
  const { data: settings, setData: setSettings, isLoading, lastSaved, reset, save } = useAutosave<SettingsData>(
    'dashboard-settings',
    defaultSettings,
    {
      debounceMs: 1000,
      onSave: () => {
        // Could send to server here if needed
        console.log('Settings auto-saved');
      }
    }
  );

  // Handle hydration
  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSave = () => {
    save();
    toast({
      title: "Settings Saved",
      description: "All settings have been saved successfully.",
      variant: "default"
    });
  };

  const handleReset = () => {
    reset();
    toast({
      title: "Settings Reset",
      description: "All settings have been reset to defaults.",
      variant: "default"
    });
  };

  const updateSetting = <K extends keyof SettingsData>(key: K, value: SettingsData[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const getThemeIcon = () => {
    if (!mounted) return <Monitor className="w-4 h-4" />;
    switch (resolvedTheme) {
      case 'light': return <Sun className="w-4 h-4" />;
      case 'dark': return <Moon className="w-4 h-4" />;
      default: return <Monitor className="w-4 h-4" />;
    }
  };

  if (!mounted) {
    return null; // Avoid hydration mismatch
  }

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
            <Button onClick={handleSave} className="gradient-gaming glow-primary transition-all duration-150 ease-out hover:scale-105">
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
                <Label htmlFor="theme" className="text-sm font-medium text-foreground">
                  Theme Preference
                </Label>
                <Select value={theme} onValueChange={setTheme}>
                  <SelectTrigger className="mt-1">
                    <div className="flex items-center gap-2">
                      {getThemeIcon()}
                      <SelectValue placeholder="Select theme" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="light">
                      <div className="flex items-center gap-2">
                        <Sun className="w-4 h-4" />
                        <span>Light</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="dark">
                      <div className="flex items-center gap-2">
                        <Moon className="w-4 h-4" />
                        <span>Dark</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="system">
                      <div className="flex items-center gap-2">
                        <Monitor className="w-4 h-4" />
                        <span>System</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  Choose your preferred color scheme
                </p>
              </div>

              <div>
                <Label htmlFor="dashboardName" className="text-sm font-medium text-foreground">
                  Dashboard Name
                </Label>
                <Input
                  id="dashboardName"
                  value={settings.dashboardName}
                  onChange={(e) => updateSetting('dashboardName', e.target.value)}
                  className="mt-1 transition-all duration-150 ease-out"
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
                  value={settings.adminEmail}
                  onChange={(e) => updateSetting('adminEmail', e.target.value)}
                  className="mt-1 transition-all duration-150 ease-out"
                  placeholder="admin@example.com"
                />
              </div>

              <div>
                <Label htmlFor="welcomeMessage" className="text-sm font-medium text-foreground">
                  Welcome Message
                </Label>
                <Textarea
                  id="welcomeMessage"
                  value={settings.welcomeMessage}
                  onChange={(e) => updateSetting('welcomeMessage', e.target.value)}
                  className="mt-1 transition-all duration-150 ease-out"
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
                    checked={settings.enableNotifications}
                    onCheckedChange={(value) => updateSetting('enableNotifications', value)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium text-foreground">System Logging</Label>
                    <p className="text-xs text-muted-foreground">Enable detailed activity logging</p>
                  </div>
                  <Switch
                    checked={settings.enableLogging}
                    onCheckedChange={(value) => updateSetting('enableLogging', value)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium text-foreground">Auto Backup</Label>
                    <p className="text-xs text-muted-foreground">Automatically backup settings daily</p>
                  </div>
                  <Switch
                    checked={settings.autoBackup}
                    onCheckedChange={(value) => updateSetting('autoBackup', value)}
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
                  value={settings.maxLogEntries}
                  onChange={(e) => updateSetting('maxLogEntries', e.target.value)}
                  className="mt-1 transition-all duration-150 ease-out"
                  placeholder="1000"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Maximum number of log entries to keep
                </p>
              </div>
              
              {isLoading && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                  <span>Auto-saving...</span>
                </div>
              )}
              
              {lastSaved && (
                <div className="text-xs text-success">
                  Last saved: {lastSaved.toLocaleTimeString()}
                </div>
              )}

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