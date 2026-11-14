import type { Session, User } from '@supabase/supabase-js';
import { useQueryClient } from '@tanstack/react-query';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useNavigate } from 'react-router';
import { registerUnauthorizedHandler } from '../lib/api';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { getUserDisplayName, getUserInitials } from '../utils/authErrors';

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  authReady: boolean;
  isPasswordRecovery: boolean;
  displayName: string | null;
  initials: string;
  signOut: () => Promise<void>;
  updateDisplayName: (nextName: string) => Promise<{ error: string | null }>;
  clearPasswordRecovery: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState<boolean>(!isSupabaseConfigured);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);
  const previousUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!supabase) {
      setAuthReady(true);
      return;
    }

    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      const nextSession = data.session ?? null;
      previousUserIdRef.current = nextSession?.user.id ?? null;
      setSession(nextSession);
      setAuthReady(true);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange(
      (event, nextSession) => {
        const nextUserId = nextSession?.user.id ?? null;

        // Limpa cache ao sair ou trocar de conta para nunca misturar dados entre usuários
        if (
          !nextSession ||
          (previousUserIdRef.current &&
            nextUserId &&
            previousUserIdRef.current !== nextUserId)
        ) {
          queryClient.clear();
        }
        previousUserIdRef.current = nextUserId;
        setSession(nextSession);
        setAuthReady(true);

        if (event === 'PASSWORD_RECOVERY') {
          setIsPasswordRecovery(true);
          navigate('/login?recovery=1', { replace: true });
        }
      }
    );

    return () => {
      mounted = false;
      subscription.subscription.unsubscribe();
    };
  }, [navigate, queryClient]);

  // Redireciona para /login sempre que qualquer chamada à API retornar 401
  useEffect(() => {
    registerUnauthorizedHandler(() => {
      supabase?.auth.signOut().catch(() => undefined);
      queryClient.clear();
      navigate('/login', { replace: true });
    });
    return () => registerUnauthorizedHandler(null);
  }, [navigate, queryClient]);

  const signOut = useCallback(async () => {
    await supabase?.auth.signOut();
    queryClient.clear();
    setIsPasswordRecovery(false);
    navigate('/login', { replace: true });
  }, [navigate, queryClient]);

  const updateDisplayName = useCallback(
    async (nextName: string): Promise<{ error: string | null }> => {
      if (!supabase) {
        return { error: 'Autenticação não configurada neste ambiente.' };
      }
      const trimmed = nextName.trim();
      const { data, error } = await supabase.auth.updateUser({
        data: { display_name: trimmed || null },
      });
      if (error) {
        return {
          error: 'Não foi possível salvar seu nome agora. Tente novamente.',
        };
      }
      if (data.user) {
        setSession((prev) =>
          prev ? { ...prev, user: data.user } : prev
        );
      }
      return { error: null };
    },
    []
  );

  const clearPasswordRecovery = useCallback(() => {
    setIsPasswordRecovery(false);
  }, []);

  const user = session?.user ?? null;
  const displayName = useMemo(() => getUserDisplayName(user), [user]);
  const initials = useMemo(
    () => getUserInitials(displayName, user?.email ?? null),
    [displayName, user?.email]
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user,
      authReady,
      isPasswordRecovery,
      displayName,
      initials,
      signOut,
      updateDisplayName,
      clearPasswordRecovery,
    }),
    [
      session,
      user,
      authReady,
      isPasswordRecovery,
      displayName,
      initials,
      signOut,
      updateDisplayName,
      clearPasswordRecovery,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider.');
  }
  return ctx;
}
