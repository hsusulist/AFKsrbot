import Layout from "@/components/Layout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Bot, 
  Server, 
  Key, 
  Shield, 
  Play, 
  Settings,
  MessageSquare,
  Clock,
  Users,
  CheckCircle
} from "lucide-react";

export default function HowToUse() {
  return (
    <Layout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">How to Use the Bot</h1>
          <p className="text-muted-foreground">Complete guide to setting up and using your AFK Discord bot</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Setup Guide */}
          <Card className="glass-effect p-6">
            <h3 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
              <Settings className="w-5 h-5 text-primary" />
              Initial Setup
            </h3>
            
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium">
                  1
                </div>
                <div>
                  <h4 className="font-medium text-foreground">Create Discord Bot</h4>
                  <p className="text-sm text-muted-foreground">
                    Go to Discord Developer Portal, create an application, and generate a bot token
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium">
                  2
                </div>
                <div>
                  <h4 className="font-medium text-foreground">Configure Server Settings</h4>
                  <p className="text-sm text-muted-foreground">
                    Set your Minecraft server IP and port in the Server Config section
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium">
                  3
                </div>
                <div>
                  <h4 className="font-medium text-foreground">Connect Bot Token</h4>
                  <p className="text-sm text-muted-foreground">
                    Enter your Discord bot token in Bot Control and click "Connect Bot"
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-medium">
                  4
                </div>
                <div>
                  <h4 className="font-medium text-foreground">Start the Bot</h4>
                  <p className="text-sm text-muted-foreground">
                    Once connected, click "Start Bot" to begin accepting commands
                  </p>
                </div>
              </div>
            </div>
          </Card>

          {/* Bot Commands */}
          <Card className="glass-effect p-6">
            <h3 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-primary" />
              Bot Commands
            </h3>
            
            <div className="space-y-3">
              <div className="p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="secondary">!afk</Badge>
                  <span className="text-sm text-muted-foreground">Start AFK mode</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Makes the bot join the server and stay AFK
                </p>
              </div>

              <div className="p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="secondary">!stop</Badge>
                  <span className="text-sm text-muted-foreground">Stop AFK mode</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Disconnects the bot from the server
                </p>
              </div>

              <div className="p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="secondary">!status</Badge>
                  <span className="text-sm text-muted-foreground">Check bot status</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Shows if bot is connected and running
                </p>
              </div>

              <div className="p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="secondary">!time</Badge>
                  <span className="text-sm text-muted-foreground">AFK duration</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Shows how long the bot has been AFK
                </p>
              </div>

              <div className="p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="secondary">!help</Badge>
                  <span className="text-sm text-muted-foreground">Show all commands</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Lists all available bot commands
                </p>
              </div>
            </div>
          </Card>

          {/* Features Overview */}
          <Card className="glass-effect p-6">
            <h3 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
              <Bot className="w-5 h-5 text-primary" />
              Bot Features
            </h3>
            
            <div className="space-y-3">
              {[
                { icon: Clock, title: "Auto AFK", desc: "Automatically stays AFK on your server" },
                { icon: Shield, title: "AuthMe Support", desc: "Compatible with AuthMe authentication" },
                { icon: Users, title: "Multi-Server", desc: "Can connect to multiple servers" },
                { icon: Server, title: "Real-time Status", desc: "Monitor connection and uptime" },
                { icon: Key, title: "Secure Token", desc: "Encrypted Discord bot token storage" },
                { icon: Settings, title: "Easy Config", desc: "Simple web-based configuration" }
              ].map((feature, index) => (
                <div key={index} className="flex items-center gap-3">
                  <feature.icon className="w-5 h-5 text-primary" />
                  <div>
                    <h4 className="font-medium text-foreground">{feature.title}</h4>
                    <p className="text-xs text-muted-foreground">{feature.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Troubleshooting */}
          <Card className="glass-effect p-6">
            <h3 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              Troubleshooting
            </h3>
            
            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-foreground mb-2">Bot Won't Connect</h4>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-3 h-3 text-success mt-0.5" />
                    Verify your Discord bot token is correct
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-3 h-3 text-success mt-0.5" />
                    Check server IP and port settings
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-3 h-3 text-success mt-0.5" />
                    Ensure bot has necessary Discord permissions
                  </li>
                </ul>
              </div>

              <div>
                <h4 className="font-medium text-foreground mb-2">Bot Disconnects Frequently</h4>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-3 h-3 text-success mt-0.5" />
                    Check your internet connection stability
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-3 h-3 text-success mt-0.5" />
                    Verify server is accepting connections
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-3 h-3 text-success mt-0.5" />
                    Review Discord Logs for error messages
                  </li>
                </ul>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </Layout>
  );
}