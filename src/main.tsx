import React, { type ErrorInfo, type ReactNode } from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "@fontsource/barlow-condensed/latin-400.css";
import "@fontsource/barlow-condensed/latin-600.css";
import "@fontsource/barlow-condensed/latin-700.css";
import "./styles.css";

class AppErrorBoundary extends React.Component<{ children: ReactNode }, { error: string | null }> {
  state = { error: null as string | null };

  static getDerivedStateFromError(error: unknown) {
    return { error: error instanceof Error ? error.message : "Erro inesperado na interface." };
  }

  componentDidCatch(_error: unknown, _info: ErrorInfo) {
    // Keep the fallback visible without exposing tokens or implementation details.
  }

  render() {
    if (this.state.error !== null) {
      return (
        <main className="runtime-error">
          <h1>Não foi possível carregar esta tela</h1>
          <p>A sessão ou o perfil não puderam ser carregados. Atualize a página e tente novamente.</p>
          {this.state.error ? <small className="runtime-error-detail">Diagnóstico: {this.state.error}</small> : null}
        </main>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AppErrorBoundary>
      <App />
    </AppErrorBoundary>
  </React.StrictMode>,
);
