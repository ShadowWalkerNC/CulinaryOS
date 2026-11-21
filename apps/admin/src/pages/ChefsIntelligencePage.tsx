import React from 'react';
import { ChefsIntelligenceHub } from '@culinaryos/ui';

export function ChefsIntelligencePage() {
  const apiBase =
    (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_API_URL) || '';

  return (
    <div className="space-y-6">
      <ChefsIntelligenceHub surface="admin" apiBase={apiBase} />
    </div>
  );
}

export default ChefsIntelligencePage;
