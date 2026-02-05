import { ReactNode } from 'react';

interface AccessGateProps {
  children: ReactNode;
}

// Access gate removed - IA is now freely accessible
export function AccessGate({ children }: AccessGateProps) {
  return <>{children}</>;
}
