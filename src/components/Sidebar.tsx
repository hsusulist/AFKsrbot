import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { 
  Home, 
  Settings, 
  Bot, 
  Server, 
  FileText, 
  Package,
  Activity,
  Shield,
  HelpCircle
} from "lucide-react";

const navigation = [
  { name: "Dashboard", href: "/", icon: Home },
  { name: "Discord Bot", href: "/discord-bot", icon: Bot },
  { name: "Server Config", href: "/server", icon: Server },
  { name: "Inventory", href: "/inventory", icon: Package },
  { name: "Discord Logs", href: "/discord-logs", icon: FileText },
  { name: "Minecraft Logs", href: "/minecraft-logs", icon: Activity },
  { name: "Console", href: "/console", icon: Shield },
  { name: "Settings", href: "/settings", icon: Settings },
  { name: "How to Use", href: "/how-to-use", icon: HelpCircle },
];

export default function Sidebar() {
  const location = useLocation();

  return (
    <div className="w-64 bg-sidebar border-r border-sidebar-border flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center glow-primary">
            <Shield className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-sidebar-foreground">AFK Bot</h1>
            <p className="text-sm text-muted-foreground">Control Panel</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {navigation.map((item) => {
          const isActive = location.pathname === item.href;
          const Icon = item.icon;
          
          return (
            <Link
              key={item.name}
              to={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-smooth",
                "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                isActive && "bg-primary text-primary-foreground glow-primary"
              )}
            >
              <Icon className="w-5 h-5" />
              <span className="font-medium">{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* Status */}
      <div className="p-4 border-t border-sidebar-border">
        <div className="flex items-center gap-3 p-3 bg-success/10 rounded-lg border border-success/20">
          <Activity className="w-4 h-4 text-success" />
          <div className="flex-1">
            <p className="text-sm font-medium text-sidebar-foreground">Bot Status</p>
            <p className="text-xs text-success">Connected</p>
          </div>
        </div>
      </div>
    </div>
  );
}