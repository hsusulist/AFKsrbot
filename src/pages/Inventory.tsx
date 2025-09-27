import { useState } from "react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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

const inventoryItems = [
  // Bot inventory is empty - bot needs to be connected to server to show items
];

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

export default function Inventory() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState("all");

  const filteredItems = inventoryItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = selectedType === "all" || item.type === selectedType;
    return matchesSearch && matchesType;
  });

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
          <Button variant="outline">
            <Package className="w-4 h-4 mr-2" />
            Refresh
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
          {filteredItems.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No Items Found</h3>
              <p className="text-muted-foreground">Bot inventory is empty. Connect to server to load items.</p>
            </div>
          ) : (
            filteredItems.map((item) => (
            <Card key={item.id} className="glass-effect p-4 transition-smooth hover:scale-105">
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
                  Quantity: <span className="font-semibold">{item.quantity}</span>
                </span>
              </div>
              
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="flex-1">
                  <Edit className="w-3 h-3 mr-1" />
                  Drop Item
                </Button>
                <Button size="sm" variant="outline" className="text-primary hover:text-primary">
                  <Trash2 className="w-3 h-3" />
                  Use Item
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
                <p className="text-2xl font-bold text-foreground">0</p>
                <p className="text-sm text-muted-foreground">Total Items</p>
              </div>
            </div>
          </Card>
          
          <Card className="glass-effect p-4">
            <div className="flex items-center gap-3">
              <Sword className="w-8 h-8 text-accent" />
              <div>
                <p className="text-2xl font-bold text-foreground">0</p>
                <p className="text-sm text-muted-foreground">Weapons</p>
              </div>
            </div>
          </Card>
          
          <Card className="glass-effect p-4">
            <div className="flex items-center gap-3">
              <ShieldIcon className="w-8 h-8 text-success" />
              <div>
                <p className="text-2xl font-bold text-foreground">0</p>
                <p className="text-sm text-muted-foreground">Armor</p>
              </div>
            </div>
          </Card>
          
          <Card className="glass-effect p-4">
            <div className="flex items-center gap-3">
              <Diamond className="w-8 h-8 text-warning" />
              <div>
                <p className="text-2xl font-bold text-foreground">0</p>
                <p className="text-sm text-muted-foreground">Legendary</p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </Layout>
  );
}