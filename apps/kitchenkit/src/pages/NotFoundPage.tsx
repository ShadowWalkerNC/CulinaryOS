import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <div className="flex items-center justify-center min-h-[60vh] p-6">
      <div className="text-center space-y-4 max-w-sm">
        <p className="text-6xl font-bold text-zinc-700 tabular-nums">404</p>
        <h2 className="text-lg font-semibold text-zinc-100">Page not found</h2>
        <p className="text-sm text-zinc-500">
          That page doesn't exist or was moved.
        </p>
        <Link
          to="/dashboard"
          className="btn-primary inline-flex items-center gap-2 text-sm"
        >
          <ArrowLeft size={14} />
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
