import { Loader2 } from 'lucide-react';

export default function FullScreenSpinner() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-surface">
      <Loader2 className="animate-spin text-brand-500" size={32} />
    </div>
  );
}
