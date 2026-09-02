import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { supabase } from "@/api/supabaseClient";
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
  Sparkles,
  KeyRound
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
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";

const navigationItems = [
  { title: "Dashboard", url: createPageUrl("Dashboard"), icon: LayoutDashboard },
  { title: "Agenda", url: createPageUrl("Schedule"), icon: Calendar },
  { title: "Agendamento Auto", url: createPageUrl("AutoSchedule"), icon: Sparkles },
  { title: "Meus Horários", url: createPageUrl("MyHours"), icon: Clock },
  { title: "Finanças", url: createPageUrl("Finances"), icon: Wallet },
  { title: "Alunos", url: createPageUrl("Students"), icon: Users },
  { title: "Recibos", url: createPageUrl("Receipts"), icon: ReceiptIcon },
];

function NavigationLink({ to, children, className }) {
  const { isMobile, setOpenMobile } = useSidebar();

  return (
    <Link
      to={to}
      onClick={() => isMobile && setOpenMobile(false)}
      className={className}
    >
      {children}
    </Link>
  );
}

/** @param {{ children: React.ReactNode, currentPageName?: string }} props */
export default function Layout({ children, currentPageName: _currentPageName }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [appSettings, setAppSettings] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      let authUser = null;

      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error && error.status !== 401 && error.name !== 'AuthSessionMissingError') {
          throw error;
        }
        authUser = user;
      } catch (error) {
        if (error?.status !== 401 && error?.name !== 'AuthSessionMissingError') {
          throw error;
        }
      }

      if (authUser) {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('full_name, role')
          .eq('id', authUser.id)
          .maybeSingle();

        if (profileError && profileError.status !== 401) throw profileError;

        setUser({
          ...authUser,
          full_name: profile?.full_name || authUser.email?.split('@')[0] || 'Usuário',
          role: profile?.role || 'user',
        });
      }

      const { data: settings, error: settingsError } = await supabase
        .from('app_settings')
        .select('*')
        .limit(1);

      if (settingsError && settingsError.status !== 401) throw settingsError;
      if (settings && settings.length > 0) setAppSettings(settings[0]);
    } catch (error) {
      if (error?.status !== 401 && error?.name !== 'AuthSessionMissingError') {
        console.error("Error loading data:", error);
      }
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    navigate('/login');
  };

  const formatDocument = (value) => {
    if (!value) return "CPF / CNPJ";
    return value.replace(/\D/g, '').length <= 11 ? `CPF: ${value}` : `CNPJ: ${value}`;
  };

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
          <SidebarHeader className="border-b border-slate-200 dark:border-slate-800 p-4">
            <div className="flex items-start gap-3">
              {appSettings?.logo_url ? (
                <img 
                  src={appSettings.logo_url} 
                  alt="Logo" 
                  className="w-11 h-11 object-contain rounded-full border border-slate-200 bg-white p-1 shrink-0"
                />
              ) : (
                <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[#094C7E] to-[#0A5A94] flex items-center justify-center shadow-lg shrink-0">
                  <Music className="w-5 h-5 text-white" />
                </div>
              )}

              <div className="min-w-0 flex-1">
                <h2 className="font-bold text-sm leading-snug text-slate-900 dark:text-slate-100 break-words">
                  {appSettings?.school_name || "Professor"}
                </h2>
                <div className="mt-1 text-[10px] font-medium text-slate-600 dark:text-slate-300 break-words">
                  {formatDocument(appSettings?.cpf_cnpj)}
                </div>
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
                          <NavigationLink to={item.url} className="flex items-center gap-3 px-4 py-3">
                            <item.icon className="w-5 h-5" />
                            <span className="font-medium">{item.title}</span>
                          </NavigationLink>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                  <SidebarMenuItem>
                    <SidebarMenuButton 
                      asChild 
                      className={`rounded-xl transition-all duration-200 mb-1 ${
                        location.pathname === createPageUrl("Settings")
                          ? 'bg-gradient-to-r from-[#094C7E] to-[#0A5A94] text-white shadow-md hover:shadow-lg' 
                          : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <NavigationLink to={createPageUrl("Settings")} className="flex items-center gap-3 px-4 py-3">
                        <Settings className="w-5 h-5" />
                        <span className="font-medium">Configurações</span>
                      </NavigationLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  {user?.role === 'admin' && (
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        asChild
                        className={`rounded-xl transition-all duration-200 mb-1 ${
                          location.pathname === createPageUrl("AdminLicenses")
                            ? 'bg-gradient-to-r from-[#094C7E] to-[#0A5A94] text-white shadow-md hover:shadow-lg'
                            : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <NavigationLink to={createPageUrl("AdminLicenses")} className="flex items-center gap-3 px-4 py-3">
                          <KeyRound className="w-5 h-5" />
                          <span className="font-medium">Licenças</span>
                        </NavigationLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>

          <SidebarFooter className="border-t border-slate-200 dark:border-slate-800 p-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-100/80 p-3 dark:border-slate-700 dark:bg-slate-800/80">
              <div className="mb-3 text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">
                lOGADO
              </div>
              <p className="truncate text-sm text-slate-700 dark:text-slate-200">
                {user?.email || "usuario@exemplo.com"}
              </p>
              <Button
                variant="ghost"
                className="mt-3 w-full justify-center gap-2 text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-950/30 dark:hover:text-red-300"
                onClick={handleLogout}
              >
                <LogOut className="w-4 h-4" />
                Sair
              </Button>
            </div>
          </SidebarFooter>
        </Sidebar>

        <main className="flex min-w-0 flex-1 flex-col">
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
