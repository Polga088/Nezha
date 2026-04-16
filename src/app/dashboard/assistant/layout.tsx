import { ReactNode } from 'react';
import { CalendarDays, Users, Package, Banknote } from 'lucide-react';
import Link from 'next/link';
import { LogoutLink } from '@/components/auth/LogoutLink';
import { DoctorStatusBanner } from '@/components/assistant/DoctorStatusBanner';
import { PatientCallListener } from '@/components/assistant/PatientCallListener';
export default function AssistantLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen bg-[#f8fafc]">
      <div className="w-72 bg-white p-8 flex flex-col gap-10 z-10 border-r border-slate-100">
        <div className="text-2xl font-bold text-slate-800 tracking-tight">
          Pôle <span className="text-blue-600">Accueil</span>
        </div>
        <nav className="flex flex-col gap-2 flex-grow">
          <Link href="/dashboard/assistant" className="flex items-center gap-4 p-3 rounded-xl hover:bg-slate-50 transition-colors font-semibold text-slate-700">
            <div className="p-2 bg-blue-50 rounded-full text-blue-600"><Package size={20} /></div>
            Accueil Rapide
          </Link>
          <Link href="/dashboard/agenda" className="flex items-center gap-4 p-3 rounded-xl hover:bg-slate-50 transition-colors font-semibold text-slate-700">
            <div className="p-2 bg-blue-50 rounded-full text-blue-600"><CalendarDays size={20} /></div>
            Agenda Général
          </Link>
          <Link href="/dashboard/patients" className="flex items-center gap-4 p-3 rounded-xl hover:bg-slate-50 transition-colors font-semibold text-slate-700">
            <div className="p-2 bg-blue-50 rounded-full text-blue-600"><Users size={20} /></div>
            Base Patients
          </Link>
          <Link href="/dashboard/assistant/caisse" className="flex items-center gap-4 p-3 rounded-xl hover:bg-slate-50 transition-colors font-semibold text-slate-700">
            <div className="p-2 bg-emerald-50 rounded-full text-emerald-600"><Banknote size={20} /></div>
            Encaissement
          </Link>
        </nav>

        <div className="pt-6 border-t border-slate-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-500 text-xs font-bold">AC</div>
              <div>
                <p className="text-sm font-bold text-slate-800">Secrétariat</p>
                <p className="text-xs text-slate-500">Connectée</p>
              </div>
            </div>
            <LogoutLink variant="sidebar" />
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-10 bg-[#f8fafc]">
        <div className="max-w-7xl mx-auto">
          <PatientCallListener />
          <DoctorStatusBanner />
          {children}
        </div>
      </div>
    </div>
  );
}
