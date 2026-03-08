import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';

interface AuthGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const AuthGuard: React.FC<AuthGuardProps> = ({ children, fallback }) => {
  const { isAuthenticated, isLoading, signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground text-lg">Cargando...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    if (fallback) return <>{fallback}</>;

    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setError('');
      setSubmitting(true);
      const { error: err } = await signIn(email, password);
      if (err) setError(err.message);
      setSubmitting(false);
    };

    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <form onSubmit={handleSubmit} className="w-full max-w-sm p-8 bg-card rounded-xl border border-border shadow-lg space-y-4">
          <h1 className="text-2xl font-bold text-foreground text-center">Iniciar Sesión</h1>
          <p className="text-sm text-muted-foreground text-center">Acceso restringido a usuarios autorizados</p>
          {error && <div className="text-sm text-red-500 bg-red-50 dark:bg-red-950/30 p-2 rounded">{error}</div>}
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground focus:ring-2 focus:ring-primary/50 outline-none"
            required
          />
          <input
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-border bg-background text-foreground focus:ring-2 focus:ring-primary/50 outline-none"
            required
          />
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2 rounded-lg bg-primary text-primary-foreground font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {submitting ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>
      </div>
    );
  }

  return <>{children}</>;
};
