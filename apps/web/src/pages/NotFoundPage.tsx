import { useNavigate } from 'react-router-dom';
import { MarketingHeader, UtensilsCrossed, ArrowRight, Button } from '@culinaryos/ui';

export function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-slate-900 flex flex-col">
      <MarketingHeader />

      <main className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-3xl border border-slate-200 p-8 text-center shadow-lg space-y-5">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto text-slate-400">
            <UtensilsCrossed className="w-8 h-8" />
          </div>

          <div className="space-y-1">
            <span className="text-4xl font-mono font-black text-slate-900">404</span>
            <h1 className="text-lg font-black text-slate-900">Restaurant Menu Not Found</h1>
            <p className="text-xs text-slate-500 font-medium max-w-xs mx-auto">
              We couldn’t find an active dining location for this URL slug.
            </p>
          </div>

          <Button
            type="button"
            variant="brand"
            size="lg"
            onClick={() => navigate('/menu/demo')}
            className="w-full px-4 text-xs font-black uppercase tracking-wider shadow-md"
          >
            <span>Explore Demo Storefront</span>
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </main>
    </div>
  );
}
