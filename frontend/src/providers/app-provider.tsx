import { type ReactNode } from 'react';

type AppProviderProps = {
  children: ReactNode;
};

export function AppProvider({ children }: AppProviderProps) {
  // Stack global providers here (theme, auth, query client, etc.)
  return <>{children}</>;
}
