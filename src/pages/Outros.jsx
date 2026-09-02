import { Link } from 'react-router-dom';
import {
  CalendarClock,
  Clock3,
  Wallet,
  Users,
  ReceiptText,
  KeyRound,
} from 'lucide-react';
import { createPageUrl } from '@/utils';
import { useAuth } from '@/lib/AuthContext';

const otherItems = [
  { title: 'Agendamento Auto', description: 'Organize seus agendamentos', page: 'AutoSchedule', icon: CalendarClock },
  { title: 'Meus Horários', description: 'Configure sua disponibilidade', page: 'MyHours', icon: Clock3 },
  { title: 'Finanças', description: 'Acompanhe seus recebimentos', page: 'Finances', icon: Wallet },
  { title: 'Alunos', description: 'Consulte seus alunos', page: 'Students', icon: Users },
  { title: 'Recibos', description: 'Emita e consulte recibos', page: 'Receipts', icon: ReceiptText },
];

export default function Outros() {
  const { isAdmin } = useAuth();
  const items = isAdmin
    ? [...otherItems, { title: 'Licenças', description: 'Gerencie os acessos', page: 'AdminLicenses', icon: KeyRound }]
    : otherItems;

  return (
    <div className="w-full max-w-5xl space-y-8 p-5 md:p-8">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#094C7E] dark:text-blue-300">Atalhos</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-900 dark:text-slate-100">Outros</h1>
        <p className="mt-2 text-slate-600 dark:text-slate-400">Acesse rapidamente outras áreas do Maestro Gestão.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:gap-5">
        {items.map(({ title, description, page, icon: Icon }) => (
          <Link
            key={page}
            to={createPageUrl(page)}
            className="group flex min-h-40 flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-[#094C7E]/40 hover:shadow-md dark:border-slate-700 dark:bg-slate-900"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-700 transition-colors group-hover:bg-[#094C7E] group-hover:text-white dark:bg-slate-800 dark:text-slate-200">
              <Icon className="h-6 w-6" />
            </span>
            <span>
              <span className="block text-base font-semibold text-slate-900 dark:text-slate-100">{title}</span>
              <span className="mt-1 block text-xs leading-5 text-slate-500 dark:text-slate-400">{description}</span>
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
