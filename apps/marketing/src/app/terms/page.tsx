import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description:
    'CulinaryOS terms of service: acceptable use, early-access terms, and liability limits. Updated September 2026.',
};

const updated = 'September 9, 2026';

export default function TermsPage() {
  return (
    <section className="py-24 px-4">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-4xl sm:text-5xl font-bold mb-3">
          Terms of <span className="gradient-text">Service</span>
        </h1>
        <p className="text-sm text-white/40 mb-12 font-mono">Last updated: {updated}</p>

        <div className="space-y-8 text-white/60 leading-relaxed">
          <p>
            These terms govern your use of the CulinaryOS website and early-access program.
            CulinaryOS is in active development — by using this site you agree to these terms.
            Questions?{' '}
            <a href="mailto:hello@culinaryos.io" className="text-brand-orange hover:text-white transition-colors">
              hello@culinaryos.io
            </a>
            .
          </p>

          <div>
            <h2 className="text-xl font-bold text-white mb-3">1. Early access</h2>
            <p>
              Joining the waitlist or starting a trial does not guarantee availability, uptime,
              or any specific feature. Early-access builds may change, break, or be discontinued
              without notice. We will always give you a way to export your data before a
              breaking change.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-bold text-white mb-3">2. Acceptable use</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>Do not attempt to access other tenants&apos; data or bypass access controls.</li>
              <li>Do not use the service for unlawful activity or to process payments outside of supported providers.</li>
              <li>Do not probe, scan, or load-test the service without written permission.</li>
            </ul>
          </div>

          <div>
            <h2 className="text-xl font-bold text-white mb-3">3. Open source components</h2>
            <p>
              RecipeOS and other designated components are licensed under the MIT License,
              which governs those components instead of these terms where they conflict.
              The CulinaryOS platform itself is commercial software; a separate subscription
              agreement applies to paying customers.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-bold text-white mb-3">4. Payments</h2>
            <p>
              Restaurants bring their own Stripe accounts; card data never touches CulinaryOS
              servers. CulinaryOS is not a payment processor and is not liable for
              processor outages, chargebacks, or payout timing.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-bold text-white mb-3">5. Liability</h2>
            <p>
              To the maximum extent permitted by law, CulinaryOS is provided “as is” without
              warranties of any kind. Our total liability for any claim is limited to the
              amounts you paid us in the 12 months before the claim (or $100 if you paid
              nothing). We are not liable for indirect, incidental, or consequential damages —
              including lost revenue during a dinner rush.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-bold text-white mb-3">6. Changes</h2>
            <p>
              We may update these terms as the product matures. Material changes will be
              announced on this site with the “Last updated” date revised. Continued use
              after changes take effect constitutes acceptance.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
