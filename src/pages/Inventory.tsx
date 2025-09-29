import { useState } from "react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useInventory, useRefreshInventory } from "@/hooks/useInventory";
import { 
  Package, 
  Search, 
  Plus, 
  Edit, 
  Trash2, 
  Diamond,
  Sword,
  Shield as ShieldIcon,
  Pickaxe
} from "lucide-react";


const getItemIcon = (type: string) => {
  switch (type) {
    case "weapon": return <Sword className="w-4 h-4" />;
    case "tool": return <Pickaxe className="w-4 h-4" />;
    case "armor": return <ShieldIcon className="w-4 h-4" />;
    case "material": return <Diamond className="w-4 h-4" />;
    default: return <Package className="w-4 h-4" />;
  }
};

const getRarityColor = (rarity: string) => {
  switch (rarity) {
    case "legendary": return "bg-yellow-500/10 text-yellow-400 border-yellow-400/20";
    case "epic": return "bg-purple-500/10 text-purple-400 border-purple-400/20";
    case "rare": return "bg-blue-500/10 text-blue-400 border-blue-400/20";
    case "common": return "bg-gray-500/10 text-gray-400 border-gray-400/20";
    default: return "bg-gray-500/10 text-gray-400 border-gray-400/20";
  }
};

interface InventoryItemWithType {
  id: string;
  name: string;
  count: number;
  slot?: number;
  metadata?: string;
  type: string;
  rarity: string;
  description: string;
  isFood?: boolean;
}

const getItemType = (name: string): string => {
  if (name.includes('sword') || name.includes('bow')) return 'weapon';
  if (name.includes('pickaxe') || name.includes('axe') || name.includes('hoe') || name.includes('shovel')) return 'tool';
  if (name.includes('helmet') || name.includes('chestplate') || name.includes('leggings') || name.includes('boots')) return 'armor';
  if (name.includes('diamond') || name.includes('emerald') || name.includes('gold') || name.includes('iron')) return 'material';
  if (name.includes('food') || name.includes('apple') || name.includes('bread') || name.includes('meat')) return 'consumable';
  return 'misc';
};

const getItemRarity = (name: string): string => {
  if (name.includes('diamond') || name.includes('netherite')) return 'legendary';
  if (name.includes('gold') || name.includes('enchanted')) return 'epic';
  if (name.includes('iron') || name.includes('stone')) return 'rare';
  return 'common';
};

const getItemDescription = (name: string): string => {
  return `A ${name.toLowerCase().replace(/_/g, ' ')} item from the Minecraft world.`;
};

export default function Inventory() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState("all");
  const { toast } = useToast();
  const { data: inventoryItems = [], isLoading, error, refetch } = useInventory();
  const refreshInventory = useRefreshInventory();

  const enrichedItems: InventoryItemWithType[] = inventoryItems.map(item => ({
    ...item,
    type: getItemType(item.name),
    rarity: getItemRarity(item.name),
    description: getItemDescription(item.name)
  }));

  const filteredItems = enrichedItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = selectedType === "all" || item.type === selectedType;
    return matchesSearch && matchesType;
  });

  const handleRefresh = async () => {
    try {
      await refreshInventory.mutateAsync();
      toast({
        title: "Inventory Refreshed",
        description: "Successfully updated inventory data",
      });
    } catch (error) {
      toast({
        title: "Refresh Failed",
        description: "Failed to refresh inventory. Bot may not be connected.",
        variant: "destructive"
      });
    }
  };

  const handleDropItem = async (slot: number, count: number) => {
    try {
      const response = await fetch('/api/inventory/drop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slot, count })
      });

      const result = await response.json();
      
      if (result.success) {
        toast({
          title: "Item Dropped",
          description: result.message,
        });
        refetch(); // Refresh inventory
      } else {
        toast({
          title: "Drop Failed",
          description: result.error,
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to drop item. Bot may not be connected.",
        variant: "destructive"
      });
    }
  };

  const handleUseItem = async (slot: number) => {
    try {
      const response = await fetch('/api/inventory/use', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slot })
      });

      const result = await response.json();
      
      if (result.success) {
        toast({
          title: "Item Used",
          description: result.message,
        });
        refetch(); // Refresh inventory
      } else {
        toast({
          title: "Use Failed",
          description: result.error,
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to use item. Bot may not be connected.",
        variant: "destructive"
      });
    }
  };

  const itemTypes = ["all", "weapon", "tool", "armor", "consumable", "material", "misc"];

  return (
    <Layout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Bot Inventory</h1>
            <p className="text-muted-foreground">View your AFKBot's current inventory items</p>
          </div>
          <Button 
            variant="outline" 
            onClick={handleRefresh}
            disabled={refreshInventory.isPending}
            className="transition-all duration-150 ease-out hover:scale-105"
          >
            <Package className="w-4 h-4 mr-2" />
            {refreshInventory.isPending ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>

        {/* Filters */}
        <Card className="glass-effect p-4">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search items..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              {itemTypes.map((type) => (
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
          </div>
        </Card>

        {/* Inventory Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {isLoading ? (
            // Loading skeletons
            Array.from({ length: 8 }).map((_, index) => (
              <Card key={index} className="glass-effect p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Skeleton className="w-8 h-8 rounded-lg" />
                    <div className="flex-1">
                      <Skeleton className="h-4 w-20 mb-1" />
                      <Skeleton className="h-3 w-12" />
                    </div>
                  </div>
                  <Skeleton className="h-5 w-16" />
                </div>
                <Skeleton className="h-3 w-full mb-3" />
                <Skeleton className="h-3 w-3/4 mb-3" />
                <div className="flex gap-2">
                  <Skeleton className="h-8 flex-1" />
                  <Skeleton className="h-8 w-8" />
                </div>
              </Card>
            ))
          ) : error ? (
            <div className="col-span-full text-center py-12">
              <Package className="w-12 h-12 text-error mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">Error Loading Inventory</h3>
              <p className="text-muted-foreground mb-4">Failed to load inventory. Bot may not be connected.</p>
              <Button onClick={() => refetch()} variant="outline">
                Try Again
              </Button>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No Items Found</h3>
              <p className="text-muted-foreground">Bot inventory is empty. Connect to server to load items.</p>
            </div>
          ) : (
            filteredItems.map((item) => (
            <Card key={item.id} className="glass-effect p-4 transition-all duration-150 ease-out hover:scale-105 hover:shadow-lg">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    {getItemIcon(item.type)}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground text-sm">{item.name}</h3>
                    <p className="text-xs text-muted-foreground capitalize">{item.type}</p>
                  </div>
                </div>
                <Badge className={getRarityColor(item.rarity)} variant="outline">
                  {item.rarity}
                </Badge>
              </div>
              
              <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
                {item.description}
              </p>
              
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-foreground">
                  Quantity: <span className="font-semibold">{item.count}</span>
                </span>
              </div>
              
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => handleDropItem(item.slot, item.count)}
                  disabled={!item.slot}
                >
                  <Edit className="w-3 h-3 mr-1" />
                  Drop Item
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className={`${item.isFood ? 'text-green-400 hover:text-green-300' : 'text-primary hover:text-primary'}`}
                  onClick={() => handleUseItem(item.slot)}
                  disabled={!item.slot}
                >
                  <Trash2 className="w-3 h-3" />
                  {item.isFood ? 'Eat' : 'Use'}
                </Button>
              </div>
            </Card>
            ))
          )}
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="glass-effect p-4">
            <div className="flex items-center gap-3">
              <Package className="w-8 h-8 text-primary" />
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {isLoading ? '-' : inventoryItems.length}
                </p>
                <p className="text-sm text-muted-foreground">Total Items</p>
              </div>
            </div>
          </Card>
          
          <Card className="glass-effect p-4">
            <div className="flex items-center gap-3">
              <Sword className="w-8 h-8 text-accent" />
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {isLoading ? '-' : enrichedItems.filter(item => item.type === 'weapon').length}
                </p>
                <p className="text-sm text-muted-foreground">Weapons</p>
              </div>
            </div>
          </Card>
          
          <Card className="glass-effect p-4">
            <div className="flex items-center gap-3">
              <ShieldIcon className="w-8 h-8 text-success" />
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {isLoading ? '-' : enrichedItems.filter(item => item.type === 'armor').length}
                </p>
                <p className="text-sm text-muted-foreground">Armor</p>
              </div>
            </div>
          </Card>
          
          <Card className="glass-effect p-4">
            <div className="flex items-center gap-3">
              <Diamond className="w-8 h-8 text-warning" />
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {isLoading ? '-' : enrichedItems.filter(item => item.rarity === 'legendary').length}
                </p>
                <p className="text-sm text-muted-foreground">Legendary</p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </Layout>
  );
}