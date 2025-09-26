import { useState } from "react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  FileText, 
  Search, 
  Filter, 
  Download, 
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Info
} from "lucide-react";

const logEntries = [
  {
    id: 1,
    timestamp: "2024-01-15 14:32:15",
    type: "success",
    source: "Bot",
    message: "Discord bot token connected!",
    user: "System"
  },
  {
    id: 2,
    timestamp: "2024-01-15 14:31:45",
    type: "info",
    source: "Bot",
    message: "Bot initialization started",
    user: "System"
  },
  {
    id: 3,
    timestamp: "2024-01-15 14:30:12",
    type: "info",
    source: "Command",
    message: "User executed !help command",
    user: "Player123"
  },
  {
    id: 4,
    timestamp: "2024-01-15 14:29:33",
    type: "warning",
    source: "Server",
    message: "High memory usage detected (85%)",
    user: "System"
  },
  {
    id: 5,
    timestamp: "2024-01-15 14:28:21",
    type: "info",
    source: "Command",
    message: "User executed !inventory command",
    user: "Player456"
  },
  {
    id: 6,
    timestamp: "2024-01-15 14:27:54",
    type: "error",
    source: "Command",
    message: "Failed to execute !trade command - insufficient permissions",
    user: "Player789"
  },
  {
    id: 7,
    timestamp: "2024-01-15 14:26:18",
    type: "success",
    source: "Server",
    message: "Player connected to server",
    user: "Player123"
  },
  {
    id: 8,
    timestamp: "2024-01-15 14:25:42",
    type: "info",
    source: "Bot",
    message: "Scheduled backup completed successfully",
    user: "System"
  }
];

const getLogIcon = (type: string) => {
  switch (type) {
    case "success": return <CheckCircle className="w-4 h-4 text-success" />;
    case "error": return <XCircle className="w-4 h-4 text-error" />;
    case "warning": return <AlertTriangle className="w-4 h-4 text-warning" />;
    case "info": return <Info className="w-4 h-4 text-primary" />;
    default: return <Info className="w-4 h-4 text-muted-foreground" />;
  }
};

const getLogBadge = (type: string) => {
  switch (type) {
    case "success": return "bg-success/10 text-success border-success/20";
    case "error": return "bg-error/10 text-error border-error/20";
    case "warning": return "bg-warning/10 text-warning border-warning/20";
    case "info": return "bg-primary/10 text-primary border-primary/20";
    default: return "bg-muted/10 text-muted-foreground border-border";
  }
};

export default function Logs() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState("all");
  const [selectedSource, setSelectedSource] = useState("all");

  const filteredLogs = logEntries.filter(log => {
    const matchesSearch = log.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         log.user.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = selectedType === "all" || log.type === selectedType;
    const matchesSource = selectedSource === "all" || log.source === selectedSource;
    return matchesSearch && matchesType && matchesSource;
  });

  const logTypes = ["all", "success", "error", "warning", "info"];
  const logSources = ["all", "Bot", "Server", "Command"];

  return (
    <Layout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground">System Logs</h1>
            <p className="text-muted-foreground">Monitor bot activity and system events</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
            <Button variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card className="glass-effect p-4">
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search logs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <div className="flex gap-1">
                <span className="text-sm text-muted-foreground px-2 py-1">Type:</span>
                {logTypes.map((type) => (
                  <Button
                    key={type}
                    variant={selectedType === type ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedType(type)}
                    className="capitalize"
                  >
                    {type}
                  </Button>
                ))}
              </div>
              <div className="flex gap-1">
                <span className="text-sm text-muted-foreground px-2 py-1">Source:</span>
                {logSources.map((source) => (
                  <Button
                    key={source}
                    variant={selectedSource === source ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedSource(source)}
                    className="capitalize"
                  >
                    {source}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </Card>

        {/* Logs List */}
        <Card className="glass-effect">
          <div className="divide-y divide-border">
            {filteredLogs.map((log) => (
              <div key={log.id} className="p-4 hover:bg-muted/50 transition-smooth">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">
                    {getLogIcon(log.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className={getLogBadge(log.type)} variant="outline">
                        {log.type}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {log.source}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {log.timestamp}
                      </span>
                    </div>
                    <p className="text-sm text-foreground font-medium mb-1">
                      {log.message}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      by {log.user}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Log Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="glass-effect p-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-8 h-8 text-success" />
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {logEntries.filter(log => log.type === "success").length}
                </p>
                <p className="text-sm text-muted-foreground">Success</p>
              </div>
            </div>
          </Card>
          
          <Card className="glass-effect p-4">
            <div className="flex items-center gap-3">
              <Info className="w-8 h-8 text-primary" />
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {logEntries.filter(log => log.type === "info").length}
                </p>
                <p className="text-sm text-muted-foreground">Info</p>
              </div>
            </div>
          </Card>
          
          <Card className="glass-effect p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-8 h-8 text-warning" />
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {logEntries.filter(log => log.type === "warning").length}
                </p>
                <p className="text-sm text-muted-foreground">Warning</p>
              </div>
            </div>
          </Card>
          
          <Card className="glass-effect p-4">
            <div className="flex items-center gap-3">
              <XCircle className="w-8 h-8 text-error" />
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {logEntries.filter(log => log.type === "error").length}
                </p>
                <p className="text-sm text-muted-foreground">Errors</p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </Layout>
  );
}