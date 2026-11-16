import React, { useState } from 'react';
import { Button, Card, Badge } from '@culinaryos/ui';

interface SocialPost {
  id: string;
  title: string;
  platform: 'instagram' | 'facebook' | 'google_business' | 'meta';
  scheduledTime: string;
  status: 'draft' | 'scheduled' | 'published';
  caption: string;
  imageUrl?: string;
  targetAudience: string;
}

export const CampaignStudio: React.FC = () => {
  const [posts, setPosts] = useState<SocialPost[]>([
    {
      id: 'post-1',
      title: 'Taco Tuesday & Margaritas Special',
      platform: 'instagram',
      scheduledTime: 'Today at 4:30 PM',
      status: 'scheduled',
      caption: 'Crispy Quesabirria with 12-hour bone broth consomé. Pair with barrel-aged margaritas until 7 PM!',
      imageUrl: 'https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?w=600',
      targetAudience: 'Local Diners (5-mile radius)',
    },
    {
      id: 'post-2',
      title: 'Weekend Live Music & Fish Fry',
      platform: 'facebook',
      scheduledTime: 'Friday at 11:00 AM',
      status: 'draft',
      caption: 'Fresh Atlantic haddock in craft beer batter, tallow fries, and live bluegrass starting at 7 PM.',
      targetAudience: 'Loyalty Club & Families',
    },
  ]);

  const [brandTone, setBrandTone] = useState<'welcoming' | 'craft_artisan' | 'energetic' | 'irreverent'>('craft_artisan');
  const [newTitle, setNewTitle] = useState('');
  const [newCaption, setNewCaption] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState<'instagram' | 'facebook' | 'google_business'>('instagram');

  const handleCreatePost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newCaption.trim()) return;

    const newPost: SocialPost = {
      id: `post-${Date.now()}`,
      title: newTitle.trim(),
      platform: selectedPlatform,
      scheduledTime: 'Scheduled for tomorrow 12:00 PM',
      status: 'scheduled',
      caption: newCaption.trim(),
      targetAudience: 'All Followers',
    };

    setPosts([newPost, ...posts]);
    setNewTitle('');
    setNewCaption('');
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 bg-slate-950 text-slate-100 min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black uppercase tracking-wider text-white">Campaign Studio</h1>
            <Badge variant="outline" className="text-orange-400 border-orange-500/30 font-mono text-xs">
              Post-Pilot Engine
            </Badge>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Automated social marketing, brand voice guard, and guest campaign orchestration.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="min-h-[48px] px-4 font-bold border-slate-700 bg-slate-900 text-slate-200"
            onClick={() => alert('Brand Voice Guard synced with restaurant concept profile.')}
          >
            Voice Guard Settings
          </Button>
          <Button
            className="min-h-[48px] px-5 font-bold bg-orange-600 hover:bg-orange-500 text-white shadow-lg shadow-orange-600/20"
            onClick={() => alert('Meta Graph API webhook listening on /v1/cloud/campaigns')}
          >
            Connect Meta Account
          </Button>
        </div>
      </div>

      {/* Grid: Composer on Left, Schedule on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Quick Campaign Creator */}
        <Card className="lg:col-span-1 bg-slate-900 border-slate-800 p-5 space-y-5 rounded-xl">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-200">Compose Campaign</h2>
            <span className="text-xs font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/40">
              Voice Guard Active
            </span>
          </div>

          <form onSubmit={handleCreatePost} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-400 mb-1.5">Platform</label>
              <div className="grid grid-cols-3 gap-2">
                {(['instagram', 'facebook', 'google_business'] as const).map((plat) => (
                  <button
                    key={plat}
                    type="button"
                    onClick={() => setSelectedPlatform(plat)}
                    className={`min-h-[44px] text-xs font-bold rounded-lg border transition capitalize ${
                      selectedPlatform === plat
                        ? 'bg-orange-600/20 border-orange-500 text-orange-300'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    {plat.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-400 mb-1.5">Brand Tone</label>
              <select
                value={brandTone}
                onChange={(e) => setBrandTone(e.target.value as any)}
                className="w-full min-h-[44px] bg-slate-950 border border-slate-800 rounded-lg px-3 text-xs font-medium text-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="craft_artisan">Craft Artisan & Scratch Culinary</option>
                <option value="welcoming">Warm & Neighborhood Hospitality</option>
                <option value="energetic">Fast, Fun & Street Style</option>
                <option value="irreverent">Boring-Free Gastropub Humor</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-400 mb-1.5">Campaign Headline</label>
              <input
                type="text"
                placeholder="e.g. Dry-Aged Ribeye Weekend Pairing"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="w-full min-h-[44px] bg-slate-950 border border-slate-800 rounded-lg px-3 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-400 mb-1.5">Caption & Offer Details</label>
              <textarea
                rows={4}
                placeholder="Write message, featured specials, or tap auto-suggest..."
                value={newCaption}
                onChange={(e) => setNewCaption(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            <Button
              type="submit"
              className="w-full min-h-[48px] bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs uppercase tracking-wider rounded-lg transition"
            >
              Schedule Campaign Post
            </Button>
          </form>
        </Card>

        {/* Right: Active Campaigns & Feed Preview */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-200">Scheduled Social Feed</h2>
            <span className="text-xs text-slate-400 font-mono">{posts.length} Active Campaigns</span>
          </div>

          <div className="space-y-3">
            {posts.map((post) => (
              <Card key={post.id} className="bg-slate-900 border-slate-800 p-4 rounded-xl flex flex-col md:flex-row gap-4">
                {post.imageUrl && (
                  <img
                    src={post.imageUrl}
                    alt={post.title}
                    className="w-full md:w-32 h-28 object-cover rounded-lg border border-slate-800 shrink-0"
                  />
                )}
                <div className="flex-1 space-y-2">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <h3 className="font-bold text-sm text-white">{post.title}</h3>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono capitalize px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                        {post.platform}
                      </span>
                      <span
                        className={`text-[11px] font-bold uppercase px-2 py-0.5 rounded ${
                          post.status === 'published'
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                            : 'bg-amber-950 text-amber-400 border border-amber-800'
                        }`}
                      >
                        {post.status}
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">{post.caption}</p>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono pt-2 border-t border-slate-800/60">
                    <span>{post.scheduledTime}</span>
                    <span>Audience: {post.targetAudience}</span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CampaignStudio;
