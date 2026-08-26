import { ReactNode } from 'react';

export default function RequireAuth({ children }: { children: ReactNode }) {
  // Auth bypassed for local development/testing
  return <>{children}</>;
}

