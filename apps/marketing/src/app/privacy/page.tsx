import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description:
    'CulinaryOS privacy policy: what data we collect, how we use it, and how to contact us. Updated September 2026.',
};

const updated = 'September 9, 2026';

export default function PrivacyPage() {
  return (
    <section className="py-24 px-4">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-4xl sm:text-5xl font-bold mb-3">
          Privacy <span className="gradient-text">Policy</span>
        </h1>
        <p className="text-sm text-white/40 mb-12 font-mono">Last updated: {updated}</p>

        <div className="space-y-8 text-white/60 leading-relaxed">
          <p>
            CulinaryOS is in active development. This policy describes what data we collect
            today through this website and our early-access waitlist, and how we handle it.
            If you have questions, email us at{' '}
            <a href="mailto:hello@culinaryos.io" className="text-brand-orange hover:text-white transition-colors">
              hello@culinaryos.io
            </a>
            .
          </p>

          <div>
            <h2 className="text-xl font-bold text-white mb-3">1. What we collect</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>
                <strong className="text-white">Waitlist / signup:</strong> the email address (and
                any details) you voluntarily provide when you join the early-access list.
              </li>
              <li>
                <strong className="text-white">Usage data:</strong> basic, aggregated analytics
                about page visits so we can tell which pages are useful. We do not run
                cross-site ad trackers.
              </li>
              <li>
                <strong className="text-white">Correspondence:</strong> emails you send us at
                hello@culinaryos.io, kept so we can answer you.
              </li>
            </ul>
          </div>

          <div>
            <h2 className="text-xl font-bold text-white mb-3">2. What we do not collect</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>No payment card data — ever. Card-present payments are handled entirely by Stripe.</li>
              <li>No sale of personal data to third parties, ever.</li>
              <li>No advertising profiles built from your visits.</li>
            </ul>
          </div>

          <div>
            <h2 className="text-xl font-bold text-white mb-3">3. How we use your data</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>To notify you about early access, product updates, and launch availability.</li>
              <li>To operate, secure, and improve this website.</li>
              <li>To comply with legal obligations.</li>
            </ul>
          </div>

          <div>
            <h2 className="text-xl font-bold text-white mb-3">4. Your rights</h2>
            <p>
              You can ask us at any time what data we hold about you, ask us to correct it,
              or ask us to delete it entirely. Email{' '}
              <a href="mailto:hello@culinaryos.io" className="text-brand-orange hover:text-white transition-colors">
                hello@culinaryos.io
              </a>{' '}
              with the subject “Privacy request” and we will respond within 30 days.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-bold text-white mb-3">5. Restaurant data (product)</h2>
            <p>
              When CulinaryOS launches, each restaurant&apos;s operational data (menus, orders,
              staff) will be isolated per tenant with row-level security. Service-role
              credentials never leave our servers. A separate data-processing addendum will
              be published before general availability.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-bold text-white mb-3">6. Changes to this policy</h2>
            <p>
              We will update the “Last updated” date above when this policy changes. Material
              changes will be announced on this site before they take effect.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
