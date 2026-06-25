'use client';

import { useState } from 'react';
import { format, startOfMonth } from 'date-fns';
import { Download, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

type FinanceExportButtonProps = {
  from?: Date;
  to?: Date;
  className?: string;
};

/** Télécharge l’export CSV des stats finance (admin uniquement côté API). */
export function FinanceExportButton({ from, to, className }: FinanceExportButtonProps) {
  const [loading, setLoading] = useState(false);

  const defaultFrom = from ?? startOfMonth(new Date());
  const defaultTo = to ?? new Date();

  const download = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        format: 'csv',
        from: format(defaultFrom, 'yyyy-MM-dd'),
        to: format(defaultTo, 'yyyy-MM-dd'),
      });
      const res = await fetch(`/api/admin/finance/export?${params}`, {
        credentials: 'same-origin',
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        toast.error(typeof j.error === 'string' ? j.error : 'Export impossible');
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const cd = res.headers.get('Content-Disposition');
      const m = cd?.match(/filename="([^"]+)"/);
      a.download = m?.[1] ?? `nezha-finance-stats-${format(defaultFrom, 'yyyy-MM-dd')}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Export téléchargé');
    } catch {
      toast.error('Erreur réseau');
    } finally {
      setLoading(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className={className} disabled={loading}>
          {loading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Download className="mr-2 h-4 w-4" />
          )}
          Exporter
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={() => void download()}>Export CSV statistiques</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
