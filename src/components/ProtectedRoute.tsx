import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import { isSupabaseConfigured } from '../lib/supabase';
import { DashboardSkeleton } from './States';

/**
 * Protege rotas privadas da aplicação, exibindo skeleton enquanto a sessão é
 * restaurada e redirecionando usuários não autenticados para `/login`.
 */
export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { authReady, session } = useAuth();
  const location = useLocation();

  if (!authReady) {
    return (
      <div className="min-h-screen bg-[#faf8ff] dark:bg-[#0b1326] p-8">
        <div className="max-w-[1200px] mx-auto">
          <DashboardSkeleton />
        </div>
      </div>
    );
  }

  if (isSupabaseConfigured && !session) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <>{children}</>;
}
