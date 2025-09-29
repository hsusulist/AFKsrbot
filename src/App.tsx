import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { queryClient } from "@/lib/queryClient";
import Index from "./pages/Index";
import DiscordBot from "./pages/DiscordBot";
import ServerConfig from "./pages/ServerConfig";
import Aternos from "./pages/Aternos";
import Inventory from "./pages/Inventory";
import DiscordLogs from "./pages/DiscordLogs";
import MinecraftLogs from "./pages/MinecraftLogs";
import Console from "./pages/Console";
import Settings from "./pages/Settings";
import HowToUse from "./pages/HowToUse";
import BotView from "./pages/BotView";
import NotFound from "./pages/NotFound";

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem
      disableTransitionOnChange
    >
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/discord-bot" element={<DiscordBot />} />
          <Route path="/server" element={<ServerConfig />} />
          <Route path="/aternos" element={<Aternos />} />
          <Route path="/inventory" element={<Inventory />} />
          <Route path="/discord-logs" element={<DiscordLogs />} />
          <Route path="/minecraft-logs" element={<MinecraftLogs />} />
          <Route path="/console" element={<Console />} />
          <Route path="/bot-view" element={<BotView />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/how-to-use" element={<HowToUse />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
