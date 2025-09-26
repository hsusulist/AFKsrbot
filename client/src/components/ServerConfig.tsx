import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Server, Settings, Save, X } from "lucide-react";
import { useState } from "react";

interface ServerConfigProps {
  currentConfig: {
    name: string;
    host: string;
    port: number;
    username: string;
    version: string;
  } | null;
  isConnected: boolean;
  onSave: (config: {
    name: string;
    host: string;
    port: number;
    username: string;
    password?: string;
    version: string;
  }) => void;
  onCancel?: () => void;
}

export default function ServerConfig({ 
  currentConfig, 
  isConnected, 
  onSave, 
  onCancel 
}: ServerConfigProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: currentConfig?.name || 'Default Server',
    host: currentConfig?.host || 'localhost',
    port: currentConfig?.port || 25565,
    username: currentConfig?.username || 'AFKsrbot',
    password: '',
    version: currentConfig?.version || '1.21.1'
  });

  const handleSave = () => {
    onSave(formData);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setFormData({
      name: currentConfig?.name || 'Default Server',
      host: currentConfig?.host || 'localhost',
      port: currentConfig?.port || 25565,
      username: currentConfig?.username || 'AFKsrbot',
      password: '',
      version: currentConfig?.version || '1.21.1'
    });
    setIsEditing(false);
    onCancel?.();
  };

  return (
    <Card data-testid="card-server-config">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Server className="h-4 w-4" />
          Server Configuration
        </CardTitle>
        <div className="flex items-center gap-2">
          <Badge 
            variant={isConnected ? "default" : "destructive"}
            data-testid="badge-config-status"
          >
            {isConnected ? "Active" : "Inactive"}
          </Badge>
          {!isEditing && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditing(true)}
              disabled={isConnected}
              data-testid="button-edit-config"
            >
              <Settings className="h-3 w-3 mr-1" />
              Edit
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isEditing ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-muted-foreground">Server Name</div>
                <div className="font-mono text-sm" data-testid="text-config-name">
                  {currentConfig?.name || 'Not configured'}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Username</div>
                <div className="font-mono text-sm" data-testid="text-config-username">
                  {currentConfig?.username || 'Not configured'}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-muted-foreground">Host</div>
                <div className="font-mono text-sm" data-testid="text-config-host">
                  {currentConfig?.host || 'Not configured'}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Port</div>
                <div className="font-mono text-sm" data-testid="text-config-port">
                  {currentConfig?.port || 'Not configured'}
                </div>
              </div>
            </div>

            <div>
              <div className="text-xs text-muted-foreground">Version</div>
              <div className="font-mono text-sm" data-testid="text-config-version">
                {currentConfig?.version || 'Not configured'}
              </div>
            </div>

            {isConnected && (
              <div className="pt-2 border-t text-xs text-muted-foreground">
                Stop the bot to modify server configuration
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="config-name">Server Name</Label>
                <Input
                  id="config-name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="My Minecraft Server"
                  data-testid="input-config-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="config-username">Bot Username</Label>
                <Input
                  id="config-username"
                  value={formData.username}
                  onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                  placeholder="AFKsrbot"
                  data-testid="input-config-username"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2 col-span-2">
                <Label htmlFor="config-host">Server Host/IP</Label>
                <Input
                  id="config-host"
                  value={formData.host}
                  onChange={(e) => setFormData(prev => ({ ...prev, host: e.target.value }))}
                  placeholder="play.example.com"
                  data-testid="input-config-host"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="config-port">Port</Label>
                <Input
                  id="config-port"
                  type="number"
                  value={formData.port}
                  onChange={(e) => setFormData(prev => ({ ...prev, port: parseInt(e.target.value) || 25565 }))}
                  placeholder="25565"
                  min="1"
                  max="65535"
                  data-testid="input-config-port"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="config-password">Password (Optional)</Label>
                <Input
                  id="config-password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  placeholder="Leave empty for offline mode"
                  data-testid="input-config-password"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="config-version">Minecraft Version</Label>
                <Input
                  id="config-version"
                  value={formData.version}
                  onChange={(e) => setFormData(prev => ({ ...prev, version: e.target.value }))}
                  placeholder="1.21.1"
                  data-testid="input-config-version"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                onClick={handleSave}
                className="flex-1"
                data-testid="button-save-config"
              >
                <Save className="h-4 w-4 mr-2" />
                Save Configuration
              </Button>
              <Button
                variant="outline"
                onClick={handleCancel}
                data-testid="button-cancel-config"
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}