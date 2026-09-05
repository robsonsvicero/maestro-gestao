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
  ChevronRight,
  Power
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
          full_name: profile?.full_name || authUser.user_metadata?.full_name || authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'Usuário',
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
  const primaryNavItems = [
    { title: 'Dashboard', url: createPageUrl('Dashboard'), icon: LayoutDashboard },
    { title: 'Agenda', url: createPageUrl('Schedule'), icon: Calendar },
    { type: 'more', title: 'Mais', icon: MoreHorizontal },
    { title: 'Finanças', url: createPageUrl('Finances'), icon: Wallet },
    { title: 'Alunos', url: createPageUrl('Students'), icon: Users },
  ];

  const moreNavItems = [
    { title: "Agendamento Auto", url: createPageUrl("AutoSchedule"), icon: Sparkles },
    { title: "Meus Horários", url: createPageUrl("MyHours"), icon: Clock },
    { title: "Recibos", url: createPageUrl("Receipts"), icon: ReceiptIcon },
    ...(user?.role === 'admin' ? [{ title: "Licenças", url: createPageUrl("AdminLicenses"), icon: KeyRound }] : [])
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
              <div className="flex items-center gap-3">
                {appSettings?.logo_url ? (
                  <img
                    src={appSettings.logo_url}
                    alt={`Logo de ${appSettings.professional_name || 'profissional'}`}
                    className="h-11 w-11 shrink-0 rounded-full border border-slate-200 bg-white object-contain p-1 dark:border-slate-600"
                  />
                ) : (
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-xs font-bold text-slate-400 dark:border-slate-600 dark:bg-slate-700">
                    <Music className="h-5 w-5" />
                  </div>
                )}
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
                    {appSettings?.professional_name || user?.full_name || "Profissional"}
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
                <Link to={createPageUrl("Settings")} className="shrink-0 transition-transform hover:scale-105">
                  {appSettings?.logo_url ? (
                    <img
                      src={appSettings.logo_url}
                      alt={`Logo de ${appSettings.professional_name || 'profissional'}`}
                      className="h-10 w-10 rounded-full border border-slate-200 bg-white object-cover dark:border-slate-600"
                    />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-slate-100 text-xs font-bold text-slate-400 dark:border-slate-600 dark:bg-slate-800">
                      <Music className="h-5 w-5" />
                    </div>
                  )}
                </Link>
                <div className="min-w-0">
                  <h1 className="truncate text-base font-bold text-slate-900 dark:text-slate-100">
                    Olá, {(appSettings?.professional_name || user?.full_name || "Profissional").split(' ')[0]}!
                  </h1>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="shrink-0 text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-950/30 dark:hover:text-red-300"
                onClick={handleLogout}
              >
                <Power className="h-5 w-5" />
              </Button>
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
            <div className="flex h-20 items-center justify-around px-2">
              {primaryNavItems.map((item) => {
                if (item.type === 'more') {
                  return (
                    <DropdownMenu key={item.title}>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          aria-label={item.title}
                          title={item.title}
                          className="flex h-14 w-14 flex-col items-center justify-center rounded-xl transition-colors text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                        >
                          <item.icon className="h-5 w-5" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="center" side="top" className="w-56 rounded-xl p-2 pb-3 mb-2" sideOffset={10}>
                        {moreNavItems.map((moreItem) => {
                          const isActive = location.pathname === moreItem.url;
                          return (
                            <DropdownMenuItem key={moreItem.title} asChild>
                              <Link
                                to={moreItem.url}
                                className={`flex cursor-pointer items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors mb-1 ${
                                  isActive
                                    ? 'bg-[#094C7E] text-white'
                                    : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                                }`}
                              >
                                <moreItem.icon className="h-5 w-5" />
                                {moreItem.title}
                              </Link>
                            </DropdownMenuItem>
                          );
                        })}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  );
                }

                const isActive = location.pathname === item.url;
                return (
                  <Link
                    key={item.title}
                    to={item.url}
                    aria-label={item.title}
                    title={item.title}
                    className={`flex h-14 w-14 flex-col items-center justify-center rounded-xl transition-colors ${
                      isActive
                        ? 'bg-[#094C7E] text-white shadow-sm'
                        : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                    }`}
                  >
                    <item.icon className="h-5 w-5" />
                  </Link>
                );
              })}
            </div>
            
          </div>
        </nav>
      </div>
    </SidebarProvider>
  );
}
