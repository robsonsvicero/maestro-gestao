import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { supabase } from "@/api/supabaseClient";
import {
  LayoutDashboard,
  Wallet,
  Users,
  LogOut,
  Music,
  Receipt as ReceiptIcon,
  Settings,
  Calendar,
  Clock,
  Sparkles,
  KeyRound,
  MoreHorizontal,
  ChevronRight
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
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/AuthContext";

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
  const { accessType, accessEndsAt } = useAuth();
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

  const accessDaysRemaining = accessEndsAt
    ? Math.max(0, Math.ceil((new Date(accessEndsAt).getTime() - Date.now()) / (24 * 60 * 60 * 1000)))
    : null;
  const showExpiryAlert = accessType && accessDaysRemaining !== null && accessDaysRemaining <= 4;
  const mobileNavigationItems = [
    { title: 'Dashboard', url: createPageUrl('Dashboard'), icon: LayoutDashboard },
    { title: 'Agenda', url: createPageUrl('Schedule'), icon: Calendar },
    { title: 'Outros', url: createPageUrl('Outros'), icon: MoreHorizontal },
    { title: 'Configurações', url: createPageUrl('Settings'), icon: Settings },
  ];

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
        .mobile-nav-scrollbar::-webkit-scrollbar { display: none; }
        .mobile-nav-scrollbar { scrollbar-width: none; }
      `}</style>
      
      <div className="min-h-screen flex w-full bg-slate-50 dark:bg-slate-900 transition-colors duration-200">
        <Sidebar className="border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 no-print transition-colors">
          <SidebarHeader className="border-b border-slate-200 dark:border-slate-800 p-4">
            <div className="flex items-center gap-3">
              <img
                src="/logo_maeztro.webp"
                alt="Logo MAEZTRO"
                className="h-11 w-11 shrink-0 rounded-full object-contain"
              />
              <h2 className="font-bold text-base leading-tight text-slate-900 dark:text-slate-100">
                MAEZTRO Gestão
              </h2>
            </div>
          </SidebarHeader>
          
          <SidebarContent className="p-3">
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  {user?.role !== 'admin' && navigationItems.map((item) => {
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
                  {user?.role !== 'admin' && <SidebarMenuItem>
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
                  </SidebarMenuItem>}
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
              <div className="flex items-center gap-3">
                {appSettings?.logo_url ? (
                  <img
                    src={appSettings.logo_url}
                    alt={`Logo de ${appSettings.school_name || 'professor'}`}
                    className="h-11 w-11 shrink-0 rounded-full border border-slate-200 bg-white object-contain p-1 dark:border-slate-600"
                  />
                ) : (
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-xs font-bold text-slate-400 dark:border-slate-600 dark:bg-slate-700">
                    <Music className="h-5 w-5" />
                  </div>
                )}
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
                    {user?.full_name || "Professor"}
                  </p>
                  <p className="truncate text-xs text-slate-600 dark:text-slate-300">
                    {user?.email || "usuario@exemplo.com"}
                  </p>
                </div>
              </div>
              
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
          <header className="border-b border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900 lg:hidden no-print">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <img
                  src="/logo_maeztro.webp"
                  alt="Logo MAEZTRO"
                  className="h-10 w-10 shrink-0 rounded-full object-contain"
                />
                <div className="min-w-0">
                  <h1 className="truncate text-base font-bold text-slate-900 dark:text-slate-100">
                    MAEZTRO Gestão
                  </h1>
                </div>
              </div>
            </div>
          </header>

          <div className="flex-1 overflow-auto bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 pb-[calc(5.25rem+env(safe-area-inset-bottom))] dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 lg:pb-0">
            {showExpiryAlert && (
              <div className="mx-4 mt-4 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 shadow-sm dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-100 md:mx-8">
                <strong>{accessType === 'trial' ? 'Seu teste gratuito' : 'Sua assinatura'} termina em {accessDaysRemaining} {accessDaysRemaining === 1 ? 'dia' : 'dias'}.</strong>{' '}
                {accessType === 'trial' ? 'Assine o Maestro Gestão para continuar acessando após esse período.' : 'Renove sua assinatura para não perder o acesso.'}
              </div>
            )}
            {children}
          </div>
        </main>

        <nav aria-label="Menu principal" className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_24px_rgba(15,23,42,0.10)] backdrop-blur dark:border-slate-700 dark:bg-slate-900/95 lg:hidden no-print">
          <div className="relative">
            <div className="mobile-nav-scrollbar flex h-20 items-center gap-1 overflow-x-auto px-2 pr-12">
              {mobileNavigationItems.map((item) => {
                const isActive = location.pathname === item.url;
                return (
                  <Link
                    key={item.title}
                    to={item.url}
                    aria-label={item.title}
                    title={item.title}
                    className={`flex h-14 min-w-16 shrink-0 items-center justify-center rounded-xl px-3 transition-colors ${
                      isActive
                        ? 'bg-[#094C7E] text-white shadow-sm'
                        : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                    }`}
                  >
                    <item.icon className="h-5 w-5" />
                  </Link>
                );
              })}
              <button
                type="button"
                aria-label="Sair"
                title="Sair"
                onClick={handleLogout}
                className="flex h-14 min-w-16 shrink-0 items-center justify-center rounded-xl px-3 text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
            
          </div>
        </nav>
      </div>
    </SidebarProvider>
  );
}
