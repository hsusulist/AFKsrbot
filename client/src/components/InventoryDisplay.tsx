import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Package, Sword, Shield, Apple } from "lucide-react";

interface InventoryItem {
  id: string;
  name: string;
  count: number;
  slot: number;
  type: 'weapon' | 'armor' | 'food' | 'block' | 'tool' | 'misc';
}

interface InventoryDisplayProps {
  items: InventoryItem[];
  totalSlots: number;
}

export default function InventoryDisplay({ items, totalSlots }: InventoryDisplayProps) {
  const getItemIcon = (type: string) => {
    switch (type) {
      case 'weapon': return <Sword className="h-3 w-3 text-red-500" />;
      case 'armor': return <Shield className="h-3 w-3 text-blue-500" />;
      case 'food': return <Apple className="h-3 w-3 text-green-500" />;
      default: return <Package className="h-3 w-3 text-muted-foreground" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'weapon': return 'bg-red-500/10 text-red-500';
      case 'armor': return 'bg-blue-500/10 text-blue-500';
      case 'food': return 'bg-green-500/10 text-green-500';
      case 'tool': return 'bg-orange-500/10 text-orange-500';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const usedSlots = items.length;
  const freeSlots = totalSlots - usedSlots;

  return (
    <Card data-testid="card-inventory">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Package className="h-4 w-4" />
          Bot Inventory
        </CardTitle>
        <Badge variant="secondary" data-testid="badge-slot-count">
          {usedSlots}/{totalSlots}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-2 text-xs text-center">
          <div>
            <div className="text-muted-foreground">Used</div>
            <div className="font-mono font-bold" data-testid="text-used-slots">{usedSlots}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Free</div>
            <div className="font-mono font-bold" data-testid="text-free-slots">{freeSlots}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Total</div>
            <div className="font-mono font-bold" data-testid="text-total-slots">{totalSlots}</div>
          </div>
        </div>

        <div className="space-y-2 max-h-32 overflow-y-auto" data-testid="inventory-items">
          {items.map((item) => (
            <div 
              key={item.id}
              className="flex items-center justify-between p-2 hover-elevate rounded-md"
              data-testid={`item-${item.id}`}
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                {getItemIcon(item.type)}
                <span className="text-sm truncate">{item.name}</span>
              </div>
              
              <div className="flex items-center gap-2">
                <Badge 
                  variant="outline" 
                  className={`text-xs ${getTypeColor(item.type)}`}
                >
                  {item.type}
                </Badge>
                <span className="font-mono text-xs text-muted-foreground">
                  x{item.count}
                </span>
              </div>
            </div>
          ))}
          
          {items.length === 0 && (
            <div className="text-center py-4 text-sm text-muted-foreground">
              Inventory is empty
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}