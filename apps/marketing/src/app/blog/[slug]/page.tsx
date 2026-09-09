import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';

type Post = {
  slug: string;
  title: string;
  date: string;
  author: string;
  category: string;
  readTime: string;
  description: string;
  body: string[];
};

const posts: Post[] = [
  {
    slug: 'introducing-culinaryos',
    title: 'Introducing CulinaryOS',
    date: 'September 1, 2026',
    author: 'The CulinaryOS Team',
    category: 'Announcement',
    readTime: '5 min read',
    description:
      'Today we are excited to introduce CulinaryOS — the open-core, AI-native restaurant operating system built for independent operators who deserve enterprise-grade technology.',
    body: [
      'Independent restaurants run on some of the hardest operational software problems in any industry: sub-second order routing, offline-first terminals, tip law compliance, and food-cost math that has to balance to the cent. The incumbents charge per-terminal fees that punish multi-terminal rooms, lock you into proprietary hardware, and treat your data as their asset.',
      'CulinaryOS is our answer: one platform covering POS, kitchen display, online ordering, prep, and back-office ops — open-core, with the recipe and pantry layer (RecipeOS) free under the MIT license forever.',
      'A few principles we are building on. First, restaurants bring their own Stripe accounts: your processing relationship stays between you and Stripe, and we take a flat SaaS fee instead of a cut of every swipe. Second, no hardware lock-in: any ESC/POS thermal printer, any cash drawer with a kick port, any tablet with a browser. Third, money in integer cents, idempotency keys on every payment write, and audit logs you can actually read.',
      'We are in active development with a pilot deployment in progress. If you run an independent restaurant and want enterprise-grade tooling without the enterprise invoice, join the waitlist — we would love to build this with you.',
    ],
  },
  {
    slug: 'ai-changing-restaurant-ops',
    title: 'How AI is Changing Restaurant Operations',
    date: 'August 22, 2026',
    author: 'Engineering Team',
    category: 'Insights',
    readTime: '8 min read',
    description:
      'Demand forecasting, waste prediction, prep scaling — AI is not just a buzzword in food service. We break down the real operational impact of integrating language models into daily kitchen workflows.',
    body: [
      'Strip away the hype and AI has three concrete jobs in a restaurant: forecasting demand, predicting waste, and turning raw numbers into coaching. A Friday-night forecast that is 10% more accurate is not a demo — it is two fewer over-prepped pans and one less 86 during the rush.',
      'Waste prediction works the same way. Kitchens already log waste events; the missing piece is connecting them to prep sheets, par levels, and cover forecasts so the system can say "you are about to over-prep short ribs for Thursday" before the walk-in is full.',
      'Our stance is deliberately boring: AI is an accessory, off by default, behind a feature flag. Every AI call is logged with token counts per tenant, because an operator should be able to see exactly what the "AI" cost them this month. If the AI layer cannot justify its own invoice line, it does not ship.',
      'The unglamorous truth is that most restaurant AI value comes from clean data — pars, yields, waste reasons — not from bigger models. Get the data layer right and the models become straightforward. That is why we built the ops data model before the AI features.',
    ],
  },
  {
    slug: 'open-core-licensing-why-we-chose-mit',
    title: 'Open-Core Licensing: Why We Chose MIT for RecipeOS',
    date: 'August 10, 2026',
    author: 'Founder Note',
    category: 'Open Source',
    readTime: '6 min read',
    description:
      'We believe the recipe layer should be free for every cook and restaurateur on the planet. Here is why we chose MIT for RecipeOS while keeping CulinaryOS commercial — and what that means for the community.',
    body: [
      'Recipes are culture. No company should own the layer where a kitchen stores its food memory — the vault, the scaling math, the allergen tags. That is why RecipeOS, the recipe and pantry layer of CulinaryOS, is MIT-licensed: use it, fork it, sell it, embed it in a competitor. It is yours.',
      'The MIT license is the most permissive credible choice, and that is the point. A copyleft license would have kept corporate kitchens at arm\'s length; a custom "source available" license would have kept the community at arm\'s length. MIT keeps everyone in the same room.',
      'CulinaryOS itself — POS, KDS, payments orchestration, tip engine — is commercial software. That is the honest trade: the recipe layer is a public good, and the operational layer that has to answer for money, compliance, and uptime is a product with a support contract behind it.',
      'What this means for the community: contributions to RecipeOS flow directly into the CulinaryOS platform, and improvements the community makes to scaling, pantry sync, and allergen handling ship to every restaurant on the platform. Open core only works if the "open" part is genuinely useful on its own — so we are making sure it is.',
    ],
  },
];

export function generateStaticParams() {
  return posts.map((p) => ({ slug: p.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const post = posts.find((p) => p.slug === params.slug);
  if (!post) return { title: 'Post not found' };
  return {
    title: post.title,
    description: post.description,
  };
}

export default function BlogPostPage({ params }: { params: { slug: string } }) {
  const post = posts.find((p) => p.slug === params.slug);
  if (!post) notFound();

  return (
    <section className="py-24 px-4">
      <article className="max-w-3xl mx-auto">
        <Link
          href="/blog"
          className="inline-block text-sm text-brand-orange hover:text-white transition-colors font-semibold mb-10"
        >
          ← Back to blog
        </Link>

        <div className="flex flex-wrap items-center gap-3 mb-5">
          <span className="text-xs font-semibold px-3 py-1 rounded-full bg-white/10 text-white/60">
            {post.category}
          </span>
          <span className="text-xs text-white/40">{post.date}</span>
          <span className="text-xs text-white/40">·</span>
          <span className="text-xs text-white/40">{post.readTime}</span>
          <span className="text-xs text-white/40">·</span>
          <span className="text-xs text-white/40">{post.author}</span>
        </div>

        <h1 className="text-4xl sm:text-5xl font-bold mb-10 leading-tight">{post.title}</h1>

        <div className="space-y-6 text-white/65 leading-relaxed text-lg">
          {post.body.map((paragraph, i) => (
            <p key={i}>{paragraph}</p>
          ))}
        </div>

        <div className="mt-14 pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-white/40">Enjoying the blog? Get launch updates:</p>
          <Link
            href="/signup"
            className="px-6 py-3 rounded-xl gradient-bg text-white font-semibold hover:opacity-90 transition-opacity"
          >
            Join the waitlist
          </Link>
        </div>
      </article>
    </section>
  );
}
