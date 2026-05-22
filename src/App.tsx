import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import Index from "./pages/Index.tsx";
import ProfilePage from "./pages/ProfilePage.tsx";
import SettingsPage from "./pages/SettingsPage.tsx";
import ResetPasswordPage from "./pages/ResetPasswordPage.tsx";
import AdminPage from "./pages/AdminPage.tsx";
import CreateGroupPage from "./pages/CreateGroupPage.tsx";
import CreateCommunityPage from "./pages/CreateCommunityPage.tsx";
import NotFound from "./pages/NotFound.tsx";
import WhatsappAgentPage from "./pages/WhatsappAgentPage.tsx";
import MyAgentsPage from "./pages/MyAgentsPage.tsx";
import AgentLandingPage from "./pages/AgentLandingPage.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/admin" element={<AdminPage />} />
            <Route path="/create-group" element={<CreateGroupPage />} />
            <Route path="/create-community" element={<CreateCommunityPage />} />
            <Route path="/whatsapp-agent" element={<WhatsappAgentPage />} />
            <Route path="/my-agents" element={<MyAgentsPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
