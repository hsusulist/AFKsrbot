import Layout from "@/components/Layout";
import StatCard from "@/components/StatCard";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { 
  Users, 
  MessageSquare, 
  Bot, 
  Server, 
  Play, 
  Pause, 
  RotateCcw,
  Activity
} from "lucide-react";

export default function Dashboard() {
  return (
    <Layout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
            <p className="text-muted-foreground">Monitor and control your Discord bot</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <RotateCcw className="w-4 h-4 mr-2" />
              Restart Bot
            </Button>
            <Button size="sm" className="gradient-gaming glow-primary">
              <Play className="w-4 h-4 mr-2" />
              Start Bot
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Bot Health"
            value="20/20"
            description="Health & Hunger"
            icon={<Users className="w-6 h-6 text-primary" />}
            trend="up"
          />
          <StatCard
            title="Bot Commands"
            value="0"
            description="Commands executed today"
            icon={<MessageSquare className="w-6 h-6 text-accent" />}
            trend="neutral"
          />
          <StatCard
            title="Bot Uptime"
            value="Offline"
            description="Not connected to server"
            icon={<Server className="w-6 h-6 text-muted-foreground" />}
            trend="neutral"
          />
          <StatCard
            title="Bot Status"
            value="Disconnected"
            description="Ready to connect"
            icon={<Bot className="w-6 h-6 text-muted-foreground" />}
          />
        </div>

        {/* Quick Actions & Logs */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Quick Actions */}
          <Card className="glass-effect p-6">
            <h3 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary" />
              Quick Actions
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" className="h-16 flex-col">
                <Bot className="w-6 h-6 mb-2" />
                Configure Bot
              </Button>
              <Button variant="outline" className="h-16 flex-col">
                <Server className="w-6 h-6 mb-2" />
                Server Settings
              </Button>
              <Button variant="outline" className="h-16 flex-col">
                <MessageSquare className="w-6 h-6 mb-2" />
                View Logs
              </Button>
              <Button variant="outline" className="h-16 flex-col">
                <Users className="w-6 h-6 mb-2" />
                Manage Users
              </Button>
            </div>
          </Card>

          {/* Recent Activity */}
          <Card className="glass-effect p-6">
            <h3 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-primary" />
              Recent Activity
            </h3>
            <div className="space-y-3">
              {[
                { user: "User123", action: "Used !help command", time: "2 mins ago", status: "success" },
                { user: "Bot", action: "Connection established", time: "5 mins ago", status: "success" },
                { user: "Admin", action: "Changed bot settings", time: "10 mins ago", status: "info" },
                { user: "User456", action: "Failed command execution", time: "15 mins ago", status: "error" }
              ].map((activity, index) => (
                <div key={index} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <div className={`w-2 h-2 rounded-full ${
                    activity.status === "success" ? "bg-success" :
                    activity.status === "error" ? "bg-error" : "bg-primary"
                  }`} />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">{activity.action}</p>
                    <p className="text-xs text-muted-foreground">by {activity.user}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">{activity.time}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </Layout>
  );
}