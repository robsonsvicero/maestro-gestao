import { CalendarDays, CheckCircle2, LayoutDashboard, LogIn, UserPlus } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const features = [
  {
    icon: CalendarDays,
    title: "Agenda organizada",
    description: "Planeje aulas, horários e compromissos em um só lugar.",
  },
  {
    icon: LayoutDashboard,
    title: "Visão do negócio",
    description: "Acompanhe alunos, finanças e atividades da sua gestão.",
  },
  {
    icon: CheckCircle2,
    title: "Rotina mais simples",
    description: "Reduza tarefas manuais e mantenha suas informações acessíveis.",
  },
];

export default function PublicHome() {
  return (
    <main className="min-h-screen bg-[#f6f8f5] text-slate-900">
      <header className="border-b border-slate-200/80 bg-white/90">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <div className="flex items-center gap-3">
            <img src="/logo_maeztro.webp" alt="MAEZTRO Gestão" className="h-11 w-11 object-contain" />
            <span className="text-lg font-semibold tracking-tight">MAEZTRO Gestão</span>
          </div>
          <Button asChild variant="outline">
            <Link to="/login"><LogIn className="h-4 w-4" /> Entrar</Link>
          </Button>
        </div>
      </header>

      <section className="mx-auto grid max-w-6xl gap-12 px-6 py-20 md:grid-cols-[1.15fr_0.85fr] md:items-center md:py-28">
        <div>
          <p className="mb-5 text-sm font-semibold uppercase tracking-[0.18em] text-[#0b6b68]">Gestão para profissionais</p>
          <h1 className="max-w-3xl text-4xl font-semibold leading-tight tracking-tight text-slate-950 md:text-6xl">
            Organize sua rotina profissional com o MAEZTRO Gestão.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
            Uma plataforma para administrar sua agenda de aulas, alunos, finanças e compromissos com mais clareza.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg" className="bg-[#0b6b68] hover:bg-[#095754]">
              <Link to="/teste-gratis"><UserPlus className="h-4 w-4" /> Começar teste gratuito</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/login">Acessar minha conta</Link>
            </Button>
          </div>
        </div>
        <div className="rounded-[2rem] border border-[#b8d5cc] bg-[#dceee8] p-8 shadow-sm">
          <img src="/logo_maeztro.webp" alt="MAEZTRO Gestão" className="mx-auto h-40 w-40 object-contain" />
          <p className="mt-6 text-center text-xl font-medium text-[#164b46]">
            Mais tempo para ensinar. Mais clareza para administrar.
          </p>
        </div>
      </section>

      <section className="border-t border-slate-200/80 bg-white">
        <div className="mx-auto grid max-w-6xl gap-5 px-6 py-14 md:grid-cols-3">
          {features.map(({ icon: Icon, title, description }) => (
            <article key={title} className="border-l-2 border-[#8bc5b4] px-5">
              <Icon className="h-6 w-6 text-[#0b6b68]" />
              <h2 className="mt-4 text-lg font-semibold">{title}</h2>
              <p className="mt-2 leading-7 text-slate-600">{description}</p>
            </article>
          ))}
        </div>
      </section>

      <footer className="mx-auto max-w-6xl px-6 py-8 text-sm text-slate-500">
        MAEZTRO Gestão · Plataforma de organização profissional
      </footer>
    </main>
  );
}
