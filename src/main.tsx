import { Component, StrictMode, type ErrorInfo, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

/**
 * Um erro de render deixava a página completamente em branco, sem forma de
 * recuperar sem recarregar à mão. Este boundary transforma um crash futuro em
 * mensagem e botão de recarregar.
 *
 * Sem libs: um error boundary tem de ser class component (a API do React só
 * oferece `getDerivedStateFromError` aí). Em desenvolvimento mostra a
 * mensagem e a stack para o diagnóstico ser rápido; em produção mostra apenas
 * a mensagem — stack em produção é informação de internos que não ajuda quem
 * está a ver a página e não ajuda o visitante a resolver.
 */
class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[boca-maldita] erro de render:', error, info.componentStack);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-obsidian px-6 text-center">
        <p className="text-xs uppercase tracking-[0.35em] text-caramel">Boca Maldita</p>
        <h1 className="font-serif text-3xl text-cream md:text-4xl">
          Algo correu mal ao desenhar a página.
        </h1>
        <p className="max-w-md text-sm leading-relaxed text-stone">
          Não foi culpa sua. Recarregue para tentar de novo; se o problema continuar, avise-nos.
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="rounded-full border border-gold px-7 py-3 text-sm font-medium text-gold transition-colors hover:bg-gold hover:text-obsidian focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold"
        >
          Recarregar
        </button>
        {import.meta.env.DEV ? (
          <pre className="mt-4 max-w-2xl overflow-auto rounded border border-hairline bg-charcoal p-4 text-left text-xs leading-relaxed text-muted">
            {error.message}
            {error.stack ? `\n\n${error.stack}` : ''}
          </pre>
        ) : null}
      </main>
    );
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
