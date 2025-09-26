import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, User, Bot } from "lucide-react";

interface ChatMessage {
  id: string;
  timestamp: string;
  player: string;
  message: string;
  type: 'chat' | 'join' | 'leave' | 'system' | 'bot';
}

interface ChatLogProps {
  messages: ChatMessage[];
}

export default function ChatLog({ messages }: ChatLogProps) {
  const getMessageIcon = (type: string) => {
    switch (type) {
      case 'bot': return <Bot className="h-3 w-3 text-primary" />;
      case 'system': return <MessageCircle className="h-3 w-3 text-muted-foreground" />;
      default: return <User className="h-3 w-3 text-green-500" />;
    }
  };

  const getMessageColor = (type: string) => {
    switch (type) {
      case 'bot': return 'text-primary';
      case 'join': return 'text-green-500';
      case 'leave': return 'text-red-500';
      case 'system': return 'text-muted-foreground';
      default: return 'text-foreground';
    }
  };

  return (
    <Card data-testid="card-chat-log">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <MessageCircle className="h-4 w-4" />
          Chat Log
        </CardTitle>
        <Badge variant="secondary" data-testid="badge-message-count">
          {messages.length} messages
        </Badge>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-64" data-testid="scroll-chat-messages">
          <div className="space-y-2">
            {messages.map((msg) => (
              <div 
                key={msg.id} 
                className="flex items-start gap-2 text-sm hover-elevate rounded-md p-2"
                data-testid={`message-${msg.id}`}
              >
                <div className="flex items-center gap-1 min-w-0 flex-1">
                  {getMessageIcon(msg.type)}
                  <span className="font-mono text-xs text-muted-foreground">
                    {msg.timestamp}
                  </span>
                  <span className="font-medium text-xs">
                    {msg.player}:
                  </span>
                  <span className={`${getMessageColor(msg.type)} break-words`}>
                    {msg.message}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}