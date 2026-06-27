import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

type FoundingCustomer = {
  customer_number: number;
  public_name: string;
  business_type: string;
  location: string;
  converted_at: string;
};

export default function FoundingCustomers() {
  const [customers, setCustomers] = useState<FoundingCustomer[]>([]);

  useEffect(() => {
    supabase
      .from('founding_customers')
      .select('customer_number, public_name, business_type, location, converted_at')
      .eq('public_permission', true)
      .order('customer_number')
      .then(({ data }: { data: any }) => setCustomers(data ?? []));
  }, []);

  const slots = [1, 2, 3, 4, 5];

  return (
    <main className="max-w-2xl mx-auto py-20 px-4">
      <h1 className="text-4xl font-bold text-gray-900 text-center">Founding Customers</h1>
      <p className="mt-3 text-gray-500 text-center">
        The first five operators who believed. Lifetime access. Forever. Documented.
      </p>

      <div className="mt-10 space-y-4">
        {slots.map(n => {
          const c = customers.find(x => x.customer_number === n);
          return (
            <div key={n} className={`rounded-xl border-2 p-6 flex items-center gap-5 ${
              c ? 'border-green-600 bg-green-50' : 'border-dashed border-gray-300 bg-gray-50'
            }`}>
              <div className={`text-3xl font-black w-12 text-center ${
                c ? 'text-green-700' : 'text-gray-300'
              }`}>#{n}</div>
              {c ? (
                <div>
                  <div className="font-bold text-lg text-gray-900">{c.public_name}</div>
                  <div className="text-sm text-gray-500">
                    {c.business_type} · {c.location}
                  </div>
                  <div className="text-xs text-green-700 mt-1 font-medium">
                    ✅ Lifetime Enterprise Access — Since{' '}
                    {new Date(c.converted_at).toLocaleDateString('en-US', {
                      month: 'long', year: 'numeric',
                    })}
                  </div>
                </div>
              ) : (
                <div className="text-gray-400 italic">This spot is still open.</div>
              )}
            </div>
          );
        })}
      </div>

      <p className="mt-10 text-center text-sm text-gray-400">
        Founding customers are documented in their subscription agreement and on this page permanently.
        This guarantee is irrevocable and transfers with any business sale.
      </p>
    </main>
  );
}
