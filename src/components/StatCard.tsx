import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: ReactNode;
  trend?: "up" | "down" | "neutral";
  className?: string;
}

export default function StatCard({ 
  title, 
  value, 
  description, 
  icon, 
  trend = "neutral",
  className 
}: StatCardProps) {
  return (
    <div className={cn(
      "glass-effect p-6 rounded-xl transition-smooth hover:scale-105",
      className
    )}>
      <div className="flex items-center justify-between mb-4">
        <div className="p-3 bg-primary/10 rounded-lg">
          {icon}
        </div>
        {trend !== "neutral" && (
          <div className={cn(
            "px-2 py-1 rounded-full text-xs font-medium",
            trend === "up" && "bg-success/10 text-success",
            trend === "down" && "bg-error/10 text-error"
          )}>
            {trend === "up" ? "↗" : "↘"}
          </div>
        )}
      </div>
      <div>
        <h3 className="text-2xl font-bold text-foreground mb-1">{value}</h3>
        <p className="text-sm font-medium text-muted-foreground mb-1">{title}</p>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </div>
    </div>
  );
}