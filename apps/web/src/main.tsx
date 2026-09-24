import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ApiError } from './lib/api';
import { ThemeProvider } from './lib/theme';
import { I18nProvider } from './lib/i18n';
import { App } from './App';
import './styles/index.css';

const queryClient: QueryClient = new QueryClient({
  // A 401 on any data request means the session ended (expired, password changed, signed out elsewhere):
  // drop the cached user so the app returns to sign-in instead of polling with a dead session.
  queryCache: new QueryCache({
    onError: (error, query) => {
      if (error instanceof ApiError && error.status === 401 && query.queryKey[0] !== 'me') queryClient.setQueryData(['me'], null);
    },
  }),
  defaultOptions: {
    queries: {
      staleTime: 20_000,
      refetchOnWindowFocus: false,
      retry: (count, err) => !(err instanceof ApiError && err.status >= 400 && err.status < 500) && count < 2,
    },
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <I18nProvider>
          <App />
        </I18nProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </StrictMode>,
);
