import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  change: string;
  trend: 'up' | 'down';
}

export function StatsCard({ title, value, icon: Icon, change, trend }: StatsCardProps) {
  return (
    <div className="premium-panel flex h-[118px] flex-col justify-center p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-[0_16px_35px_rgba(37,99,235,0.08)]">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-blue-100 bg-blue-50 text-blue-600">
          <Icon className="h-4 w-4" />
        </div>
        <div className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-semibold ${trend === 'up' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-rose-200 bg-rose-50 text-rose-700'}`}>
          {trend === 'up' ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          <span>{change}</span>
        </div>
      </div>
      <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-slate-500">{title}</p>
      <h3 className="mt-2 text-[1.8rem] font-semibold leading-none tracking-[-0.04em] text-slate-900">{value}</h3>
    </div>
  );
}
