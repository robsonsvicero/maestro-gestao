import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { supabase } from "@/lib/supabaseClient";
import {
  LayoutDashboard,
  Wallet,
  Users,
  LogOut,
  Menu,
  Music,
  Receipt as ReceiptIcon,
  Settings,
  Calendar,
  Clock,
  Sparkles
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const navigationItems = [
  { title: "Dashboard", url: createPageUrl("Dashboard"), icon: LayoutDashboard },
  { title: "Agenda", url: createPageUrl("Schedule"), icon: Calendar },
  { title: "Agendamento Auto", url: createPageUrl("AutoSchedule"), icon: Sparkles },
  { title: "Meus Horários", url: createPageUrl("MyHours"), icon: Clock },
  { title: "Finanças", url: createPageUrl("Finances"), icon: Wallet },
  { title: "Alunos", url: createPageUrl("Students"), icon: Users },
  { title: "Recibos", url: createPageUrl("Receipts"), icon: ReceiptIcon },
];

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [appSettings, setAppSettings] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // 1. Usuário autenticado
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;

      if (authUser) {
        // full_name e role não vêm no auth.users por padrão —
        // busca na tabela "profiles" (padrão comum no Supabase)
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("full_name, role")
          .eq("id", authUser.id)
          .single();

        if (profileError) throw profileError;

        setUser({
          ...authUser,
          full_name: profile?.full_name,
          role: profile?.role
        });
      }

      // 2. Configurações do app
      const { data: settings, error: settingsError } = await supabase
        .from("app_settings")
        .select("*")
        .limit(1);

      if (settingsError) throw settingsError;
      if (settings && settings.length > 0) {
        setAppSettings(settings[0]);
      }
    } catch (error) {
      console.error("Error loading data:", error);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate(createPageUrl("Login"));
  };

  const getUserInitials = () => {
    if (!user?.full_name) return "U";
    return user.full_name.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase();
  };

  const isAdmin = user?.role === 'admin';

  return (
    <SidebarProvider>
      <style>{`
        @media print {
          .no-print {
            display: none !important;
          }
          body {
            background: white !important;
          }
        }
      `}</style>

      <div className="min-h-screen flex w-full bg-slate-50 dark:bg-slate-900 transition-colors duration-200">
        <Sidebar className="border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 no-print transition-colors">
          <SidebarHeader className="border-b border-slate-200 dark:border-slate-800 p-6">
            <div className="flex items-center gap-3">
              {appSettings?.logo_url ? (
                <img 
                  src={appSettings.logo_url} 
                  alt="Logo" 
                  className="w-10 h-10 object-contain rounded-lg"
                />
              ) : (
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#094C7E] to-[#0A5A94] flex items-center justify-center shadow-lg">
                  <Music className="w-6 h-6 text-white" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h2 className="font-bold truncate text-slate-900 dark:text-slate-100">
                  {appSettings?.school_name || "Escola de Música"}
                </h2>
              </div>
            </div>
          </SidebarHeader>

          <SidebarContent className="p-3">
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  {navigationItems.map((item) => {
                    const isActive = location.pathname === item.url;
                    return (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton 
                          asChild 
                          className={`rounded-xl transition-all duration-200 mb-1 ${
                            isActive 
                              ? 'bg-gradient-to-r from-[#094C7E] to-[#0A5A94] text-white shadow-md hover:shadow-lg' 
                              : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          <Link to={item.url} className="flex items-center gap-3 px-4 py-3">
                            <item.icon className="w-5 h-5" />
                            <span className="font-medium">{item.title}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                  {isAdmin && (
                    <SidebarMenuItem>
                      <SidebarMenuButton 
                        asChild 
                        className={`rounded-xl transition-all duration-200 mb-1 ${
                          location.pathname === createPageUrl("Settings")
                            ? 'bg-gradient-to-r from-[#094C7E] to-[#0A5A94] text-white shadow-md hover:shadow-lg' 
                            : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <Link to={createPageUrl("Settings")} className="flex items-center gap-3 px-4 py-3">
                          <Settings className="w-5 h-5" />
                          <span className="font-medium">Configurações</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>

          <SidebarFooter className="border-t border-slate-200 dark:border-slate-800 p-4">
            <div className="flex items-center gap-3 mb-3">
              <Avatar className="w-10 h-10 border-2 border-[#094C7E]">
                <AvatarFallback className="bg-gradient-to-br from-[#094C7E] to-[#0A5A94] text-white font-semibold">
                  {getUserInitials()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate text-slate-900 dark:text-slate-100">
                  {user?.full_name || "Usuário"}
                </p>
                <p className="text-xs truncate text-slate-500 dark:text-slate-400">
                  {user?.email}
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              className="w-full justify-start gap-2 text-slate-600 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:border-red-300 dark:hover:border-red-600 border-slate-300 dark:border-slate-700"
              onClick={handleLogout}
            >
              <LogOut className="w-4 h-4" />
              Sair
            </Button>
          </SidebarFooter>
        </Sidebar>

        <main className="flex-1 flex flex-col">
          <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-4 lg:hidden no-print">
            <div className="flex items-center gap-4">
              <SidebarTrigger className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
                <Menu className="w-5 h-5" />
              </SidebarTrigger>
              <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                {appSettings?.school_name || "Escola de Música"}
              </h1>
            </div>
          </header>

          <div className="flex-1 overflow-auto bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}