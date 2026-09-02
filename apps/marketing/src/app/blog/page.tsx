import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Blog',
  description: 'News, updates, and insights from the CulinaryOS team — restaurant technology, open source, and AI in food service.',
};

const posts = [
  {
    slug: 'introducing-culinaryos',
    title: 'Introducing CulinaryOS',
    date: 'September 1, 2026',
    author: 'The CulinaryOS Team',
    category: 'Announcement',
    excerpt:
      'Today we are excited to introduce CulinaryOS — the open-core, AI-native restaurant operating system built for independent operators who deserve enterprise-grade technology.',
    readTime: '5 min read',
  },
  {
    slug: 'ai-changing-restaurant-ops',
    title: 'How AI is Changing Restaurant Operations',
    date: 'August 22, 2026',
    author: 'Engineering Team',
    category: 'Insights',
    excerpt:
      'Demand forecasting, waste prediction, prep scaling — AI is not just a buzzword in food service. We break down the real operational impact of integrating language models into daily kitchen workflows.',
    readTime: '8 min read',
  },
  {
    slug: 'open-core-licensing-why-we-chose-mit',
    title: 'Open-Core Licensing: Why We Chose MIT for RecipeOS',
    date: 'August 10, 2026',
    author: 'Founder Note',
    category: 'Open Source',
    excerpt:
      'We believe the recipe layer should be free for every cook and restaurateur on the planet. Here is why we chose MIT for RecipeOS while keeping CulinaryOS commercial — and what that means for the community.',
    readTime: '6 min read',
  },
];

const categoryColors: Record<string, string> = {
  Announcement: 'bg-brand-orange/10 text-brand-orange',
  Insights: 'bg-blue-500/10 text-blue-400',
  'Open Source': 'bg-green-500/10 text-green-400',
};

export default function BlogPage() {
  return (
    <>
      <section className="py-24 px-4 text-center">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl sm:text-5xl font-bold mb-5">
            The CulinaryOS{' '}
            <span className="gradient-text">Blog</span>
          </h1>
          <p className="text-white/50 text-lg">
            Restaurant technology, open source, and AI from the team building CulinaryOS.
          </p>
        </div>
      </section>

      <section className="pb-24 px-4">
        <div className="max-w-4xl mx-auto space-y-6">
          {posts.map((post) => (
            <article
              key={post.slug}
              className="glass rounded-2xl border border-white/10 p-8 hover:border-white/20 transition-colors"
            >
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <span
                  className={`text-xs font-semibold px-3 py-1 rounded-full ${categoryColors[post.category] ?? 'bg-white/10 text-white/60'}`}
                >
                  {post.category}
                </span>
                <span className="text-xs text-white/40">{post.date}</span>
                <span className="text-xs text-white/40">·</span>
                <span className="text-xs text-white/40">{post.readTime}</span>
              </div>

              <h2 className="text-xl sm:text-2xl font-bold mb-3 hover:gradient-text transition-all cursor-pointer">
                {post.title}
              </h2>

              <p className="text-white/60 text-sm leading-relaxed mb-5">{post.excerpt}</p>

              <div className="flex items-center justify-between">
                <span className="text-xs text-white/40">{post.author}</span>
                <Link
                  href={`/blog/${post.slug}`}
                  className="text-sm text-brand-orange hover:text-white transition-colors font-semibold"
                >
                  Read more →
                </Link>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-12 text-center">
          <p className="text-sm text-white/30">More posts coming soon. Follow us on GitHub and Twitter/X for updates.</p>
        </div>
      </section>
    </>
  );
}
