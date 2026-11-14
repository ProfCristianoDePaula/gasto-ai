import { AlertCircle, Inbox, RefreshCw } from 'lucide-react';
import { ReactNode } from 'react';

export function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse" aria-label="Carregando painel">
      <div className="h-16 rounded-2xl bg-[#eaedff]/70 dark:bg-[#131b2e]" />
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-32 rounded-2xl bg-[#eaedff]/70 dark:bg-[#131b2e] border border-[#E2E8F0] dark:border-white/8"
          />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 h-80 rounded-2xl bg-[#eaedff]/70 dark:bg-[#131b2e] border border-[#E2E8F0] dark:border-white/8" />
        <div className="lg:col-span-5 h-80 rounded-2xl bg-[#eaedff]/70 dark:bg-[#131b2e] border border-[#E2E8F0] dark:border-white/8" />
      </div>
    </div>
  );
}

export function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div
      className="rounded-2xl bg-[#ffffff] dark:bg-[#131b2e] border border-[#E2E8F0] dark:border-white/8 p-6 space-y-4 animate-pulse"
      aria-label="Carregando registros"
    >
      {Array.from({ length: rows }).map((_, idx) => (
        <div
          key={idx}
          className="h-14 rounded-xl bg-[#eaedff]/60 dark:bg-[#171f33]"
        />
      ))}
    </div>
  );
}

interface EmptyStateProps {
  title: string;
  description: string;
  action?: ReactNode;
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="py-12 px-4 text-center flex flex-col items-center justify-center space-y-3">
      <span
        className="w-11 h-11 rounded-2xl bg-[#f2f3ff] dark:bg-[#222a3d] text-[#5442db] dark:text-[#c5c0ff] inline-flex items-center justify-center"
        aria-hidden="true"
      >
        <Inbox size={20} />
      </span>
      <div className="space-y-1 max-w-sm">
        <p className="text-base font-semibold text-[#131b2e] dark:text-[#dae2fd]">
          {title}
        </p>
        <p className="text-sm text-[#787586] dark:text-[#928ea1]">
          {description}
        </p>
      </div>
      {action && <div className="pt-2">{action}</div>}
    </div>
  );
}

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
}

export function ErrorState({
  title = 'Não foi possível carregar os dados',
  message,
  onRetry,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className="rounded-2xl bg-[#ffffff] dark:bg-[#131b2e] border border-[#ba1a1a]/25 dark:border-[#ffb4ab]/25 p-8 text-center flex flex-col items-center space-y-3"
    >
      <span
        className="w-11 h-11 rounded-2xl bg-[#ffdad6]/50 dark:bg-[#93000a]/30 text-[#ba1a1a] dark:text-[#ffb4ab] inline-flex items-center justify-center"
        aria-hidden="true"
      >
        <AlertCircle size={20} />
      </span>
      <div className="space-y-1 max-w-md">
        <p className="text-base font-bold text-[#131b2e] dark:text-[#dae2fd]">
          {title}
        </p>
        <p className="text-sm text-[#474555] dark:text-[#c8c4d7]">{message}</p>
      </div>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="h-10 px-4 rounded-xl text-xs font-semibold bg-[#6d5ef5] text-white hover:bg-[#5b4de3] inline-flex items-center gap-2"
        >
          <RefreshCw size={14} />
          Tentar de novo
        </button>
      )}
    </div>
  );
}
