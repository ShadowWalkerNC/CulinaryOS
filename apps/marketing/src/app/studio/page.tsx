'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';

type SkillType = 'special_post' | 'event_campaign' | 'weekly_plan' | 'review_reply' | 'brand_guard';
type ToneType = 'friendly' | 'hype' | 'artisanal' | 'playful';
type PlatformType = 'instagram' | 'facebook' | 'google' | 'tiktok' | 'x';

interface SpecialForm {
  itemName: string;
  price: string;
  description: string;
  availableUntil: string;
}

interface EventForm {
  title: string;
  eventDate: string;
  description: string;
  ticketUrl: string;
  stage: 'announce' | 'reminder' | 'last_call';
}

interface ReviewForm {
  platform: 'google' | 'yelp' | 'tripadvisor';
  rating: number;
  reviewerName: string;
  reviewText: string;
  guestIssue: string;
}

interface WeeklyPlanForm {
  weekTheme: string;
  specialsSummary: string;
}

const PRESET_SPECIALS = [
  {
    name: 'Cast Iron Seared Salmon',
    price: '$26.00',
    description: 'Crisp skin, wild mushroom risotto, charred lemon beurre blanc',
    until: '9:00 PM',
  },
  {
    name: 'Smoked Beef Brisket Sandwich',
    price: '$16.50',
    description: '14-hour post oak smoked brisket, tangy house slaw on brioche',
    until: 'Until Sold Out',
  },
  {
    name: 'Crispy Fried Catfish Basket',
    price: '$14.99',
    description: '2 cornmeal dusted fillets, golden hushpuppies, homemade tartar sauce',
    until: '10:00 PM',
  },
  {
    name: 'Truffle Gnocchi alla Romana',
    price: '$24.00',
    description: 'Handmade potato gnocchi, black summer truffle, parmigiano reggiano',
    until: '8:30 PM',
  },
];

export default function CampaignStudioPage() {
  const [activeSkill, setActiveSkill] = useState<SkillType>('special_post');
  const [restaurantName, setRestaurantName] = useState('The Golden Fork');
  const [tone, setTone] = useState<ToneType>('friendly');
  const [activePlatform, setActivePlatform] = useState<PlatformType>('instagram');
  const [copied, setCopied] = useState(false);

  // Form states
  const [special, setSpecial] = useState<SpecialForm>({
    itemName: 'Cast Iron Seared Salmon',
    price: '$26.00',
    description: 'Crisp skin, wild mushroom risotto, charred lemon beurre blanc',
    availableUntil: '9:00 PM',
  });

  const [eventData, setEventData] = useState<EventForm>({
    title: 'Spring Harvest Wine Pairing Dinner',
    eventDate: 'Friday, Oct 24th @ 6:30 PM',
    description: '5-course seasonal tasting with Willamette Valley vintage selections',
    ticketUrl: 'https://goldenfork.test/tickets/wine-dinner',
    stage: 'announce',
  });

  const [review, setReview] = useState<ReviewForm>({
    platform: 'google',
    rating: 5,
    reviewerName: 'Marcus V.',
    reviewText: 'The risotto was absolutely phenomenal and the server Sarah made our anniversary evening unforgettable!',
    guestIssue: '',
  });

  const [weeklyPlan, setWeeklyPlan] = useState<WeeklyPlanForm>({
    weekTheme: 'Autumn Comfort & Heritage Grains',
    specialsSummary: 'Monday: Half-priced Wine; Wednesday: Fresh Gnocchi Night; Friday: Prime Rib Roast',
  });

  const [customDraft, setCustomDraft] = useState('');

  // Generated captions generator
  const generatedCopy = useMemo(() => {
    const bName = restaurantName || 'Our Restaurant';

    if (activeSkill === 'special_post') {
      const item = special.itemName || "Today's Featured Special";
      const pr = special.price ? ` for ${special.price}` : '';
      const desc = special.description ? ` — ${special.description}.` : '';
      const until = special.availableUntil ? ` Available until ${special.availableUntil}!` : ' Fresh from our scratch kitchen today.';

      if (tone === 'hype') {
        return `🔥 SPECIAL ALERT: Today at ${bName}, we're serving up ${item}${pr}!${desc}${until} Order online or dine-in with us before it's gone!`;
      } else if (tone === 'artisanal') {
        return `From Chef's station to your table: Today's featured selection at ${bName} is our ${item}${pr}.${desc} Prepared fresh in-house with locally sourced ingredients. Reserve your table or order ahead for pickup.`;
      } else if (tone === 'playful') {
        return `Your cravings called and we answered. 😉 Meet today's star at ${bName}: ${item}${pr}!${desc}${until} Grab yours now — thank us later!`;
      } else {
        return `Featured today at ${bName}: ${item}${pr}!${desc}${until} Stop in for lunch or dinner, or order ahead on our website!`;
      }
    }

    if (activeSkill === 'event_campaign') {
      const { title, eventDate, description, ticketUrl, stage } = eventData;
      if (stage === 'announce') {
        return `🎉 Join us at ${bName} for ${title} on ${eventDate}! ${description}. Seating is limited — reserve your tickets now: ${ticketUrl}`;
      } else if (stage === 'reminder') {
        return `⏳ Coming up fast! Don't miss ${title} at ${bName} (${eventDate}). ${description}. Tables are filling quickly: ${ticketUrl}`;
      } else {
        return `🚨 LAST CALL: Final tickets remaining for ${title} at ${bName} this ${eventDate}! Grab yours before doors close: ${ticketUrl}`;
      }
    }

    if (activeSkill === 'weekly_plan') {
      return (
        `✨ THIS WEEK AT ${bName.toUpperCase()} ✨\n` +
        `Theme: ${weeklyPlan.weekTheme}\n\n` +
        `• Mon: Meatless Monday & Local Cider Pairing\n` +
        `• Tue: Chef's Taco & Crudo Bar\n` +
        `• Wed: Wine Wednesday (Half-off select bottles)\n` +
        `• Thu: Fresh Pasta & Heritage Grain Features\n` +
        `• Fri: Seafood Delivery Showcase\n` +
        `• Sat: Prime Cut Saturday Night Dinner\n` +
        `• Sun: Family Style Sunday Supper\n\n` +
        `Visit our website to reserve a table or view our full dinner menu!`
      );
    }

    if (activeSkill === 'review_reply') {
      const name = review.reviewerName || 'valued guest';
      if (review.rating >= 4) {
        return (
          `Thank you so much for the glowing review, ${name}! ` +
          `We are delighted that you enjoyed your experience with us at ${bName}. ` +
          `The team takes great pride in crafting memorable meals, and we look forward to welcoming you back soon!`
        );
      } else {
        return (
          `Hello ${name}, thank you for taking the time to share your feedback. ` +
          `We hold ourselves to high hospitality standards at ${bName}, and we are sorry that your recent visit did not hit the mark. ` +
          `We would appreciate the opportunity to make this right — please reach out to our management team directly at manager@${bName.toLowerCase().replace(/[^a-z0-9]/g, '')}.com so we can connect.`
        );
      }
    }

    if (activeSkill === 'brand_guard') {
      return customDraft || `Tonight at ${bName}: Enjoy our house-made specialties prepared fresh to order. Click our bio link to view hours and order online!`;
    }

    return '';
  }, [activeSkill, restaurantName, tone, special, eventData, weeklyPlan, review, customDraft]);

  // Brand Guard audit results
  const brandGuardAudit = useMemo(() => {
    const text = generatedCopy.toLowerCase();
    const issues: string[] = [];

    const bannedSlang = ['cheap', 'crappy', 'garbage', 'fail', 'slow service', 'trash', 'microwaved'];
    bannedSlang.forEach((word) => {
      if (text.includes(word)) {
        issues.push(`Avoid negative/banned term "${word}" in brand communications`);
      }
    });

    const hasCta = /visit|order|call|link|bio|reserv|book|stop by|come in/i.test(generatedCopy);
    if (!hasCta) {
      issues.push('Missing explicit call-to-action (e.g. "order online", "reserve your table", "link in bio")');
    }

    if (activePlatform === 'x' && generatedCopy.length > 280) {
      issues.push(`Character count (${generatedCopy.length}) exceeds 280-character limit on X`);
    }

    if (text.includes('free') && !text.includes('parking') && !text.includes('wifi')) {
      issues.push('Promoting "free" items without terms can devalue restaurant positioning');
    }

    const score = Math.max(20, 100 - issues.length * 25);
    return {
      passed: issues.length === 0,
      score,
      issues,
    };
  }, [generatedCopy, activePlatform]);

  // Platform adapted variants
  const platformCaption = useMemo(() => {
    const hashtags = `#${restaurantName.toLowerCase().replace(/[^a-z0-9]/g, '')} #foodie #eatlocal #restaurantlife #freshflavors #dinner`;
    switch (activePlatform) {
      case 'instagram':
        return `${generatedCopy}\n\n📍 Link in bio to view full menu & order online.\n\n${hashtags}`;
      case 'facebook':
        return `${generatedCopy}\n\n👉 Stop in today or tap below to order online for easy pickup!`;
      case 'google':
        return `${generatedCopy.replace(/[🔥🎉✨🚨]/g, '')}\n\nCall our host desk or visit our website for table reservations and current takeout hours.`;
      case 'tiktok':
        return `${generatedCopy.split('.')[0]}! 🔊 Sound on — link in bio to order! ${hashtags}`;
      case 'x':
        return generatedCopy.length > 250 ? `${generatedCopy.slice(0, 247)}...` : generatedCopy;
      default:
        return generatedCopy;
    }
  }, [generatedCopy, activePlatform, restaurantName]);

  const handleCopy = () => {
    navigator.clipboard.writeText(platformCaption);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadPlan = () => {
    const content = `CULINARYOS MARKETING CAMPAIGN PLAN\nRestaurant: ${restaurantName}\nSkill: ${activeSkill}\nTone: ${tone}\nPlatform: ${activePlatform}\nCompliance Score: ${brandGuardAudit.score}/100\n\n-------------------------------\nCAPTION:\n${platformCaption}\n-------------------------------\nGenerated via CulinaryOS Autonomous Marketing Studio`;
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `campaign_${activeSkill}_${activePlatform}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-[#0c0c0c] text-white">
      {/* Studio Header Bar */}
      <div className="border-b border-white/10 bg-[#141414]/80 backdrop-blur-md sticky top-16 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-orange-500/20 border border-orange-500/30 flex items-center justify-center text-orange-400 font-bold text-sm">
              📢
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-white tracking-tight">Campaign Planning Studio</h1>
                <span className="text-[10px] font-mono uppercase bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded-full border border-orange-500/30">
                  Post-Pilot Engine
                </span>
              </div>
              <p className="text-xs text-white/50">Autonomous social campaigns, brand voice guardrails & review intelligence</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-white/70">
              <span className={`w-2 h-2 rounded-full ${brandGuardAudit.passed ? 'bg-emerald-400' : 'bg-amber-400'} animate-pulse`} />
              <span>Voice Guard: <strong>{brandGuardAudit.score}/100</strong></span>
            </div>

            <button
              type="button"
              onClick={handleDownloadPlan}
              className="min-h-[48px] px-4 rounded-xl bg-white/10 hover:bg-white/15 active:scale-[0.97] transition-all text-xs font-semibold text-white/90 flex items-center gap-1.5"
            >
              <span>Export Plan</span>
              <span>💾</span>
            </button>

            <button
              type="button"
              onClick={handleCopy}
              className={`min-h-[48px] px-5 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 shadow-lg active:scale-[0.97] ${
                copied
                  ? 'bg-emerald-600 text-white'
                  : 'bg-gradient-to-r from-orange-500 to-amber-600 text-white hover:opacity-95 shadow-orange-500/20'
              }`}
            >
              <span>{copied ? 'Copied to Clipboard!' : 'Copy Platform Copy'}</span>
              <span>{copied ? '✓' : '📋'}</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Top Skill Workflow Selector Pills */}
        <div className="mb-8">
          <label className="block text-xs font-semibold text-white/40 uppercase tracking-wider mb-2.5">
            Select Marketing Workflow (5 Post-Pilot Core Skills)
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
            {[
              { id: 'special_post', label: 'Daily Special Hype', icon: '⚡', desc: 'Promote specials & 86 countdowns' },
              { id: 'event_campaign', label: '3-Stage Event Promo', icon: '📅', desc: 'Announce, reminder & last call' },
              { id: 'weekly_plan', label: '7-Day Editorial Plan', icon: '🗓️', desc: 'Automate weekly social calendar' },
              { id: 'review_reply', label: 'Review Assistant', icon: '⭐', desc: 'Brand-aligned review responses' },
              { id: 'brand_guard', label: 'Brand Voice Guard', icon: '🛡️', desc: 'Audit copy against safety rules' },
            ].map((skill) => (
              <button
                key={skill.id}
                type="button"
                onClick={() => setActiveSkill(skill.id as SkillType)}
                className={`min-h-[60px] p-3 rounded-xl border text-left transition-all active:scale-[0.97] flex flex-col justify-between ${
                  activeSkill === skill.id
                    ? 'bg-orange-500/15 border-orange-500/50 text-white shadow-md shadow-orange-500/10 ring-1 ring-orange-500/30'
                    : 'bg-white/[0.03] border-white/10 text-white/70 hover:bg-white/[0.06] hover:text-white'
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold text-xs">
                  <span>{skill.icon}</span>
                  <span>{skill.label}</span>
                </div>
                <span className="text-[10px] text-white/40 mt-1 line-clamp-1">{skill.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 2-Column Workstation Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Context & Input Controls (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            {/* Brand & Tone Setup Card */}
            <div className="bg-[#141414] border border-white/10 rounded-2xl p-6 shadow-sm">
              <h2 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                <span>🍽️</span>
                <span>Restaurant Brand & Tone Settings</span>
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-xs font-medium text-white/60 mb-1.5">Restaurant Brand Name</label>
                  <input
                    type="text"
                    value={restaurantName}
                    onChange={(e) => setRestaurantName(e.target.value)}
                    className="w-full h-12 px-3.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-orange-500 transition-colors"
                    placeholder="e.g. The Golden Fork"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-white/60 mb-1.5">Brand Tone & Voice</label>
                  <select
                    value={tone}
                    onChange={(e) => setTone(e.target.value as ToneType)}
                    className="w-full h-12 px-3.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-orange-500 transition-colors"
                  >
                    <option value="friendly">Warm Hospitality (Friendly & Welcoming)</option>
                    <option value="hype">Hype & Bold (High Energy, Urgency)</option>
                    <option value="artisanal">Artisanal & Chef's Craft (Refined, Sourced)</option>
                    <option value="playful">Playful & Casual (Fun, Conversational)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Workflow Specific Inputs */}
            <div className="bg-[#141414] border border-white/10 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <span>⚙️</span>
                  <span>
                    {activeSkill === 'special_post' && 'Daily Special Details'}
                    {activeSkill === 'event_campaign' && 'Event Campaign Parameters'}
                    {activeSkill === 'weekly_plan' && 'Weekly Editorial Rhythm'}
                    {activeSkill === 'review_reply' && 'Guest Review Scenario'}
                    {activeSkill === 'brand_guard' && 'Copy Safety & Compliance Inspector'}
                  </span>
                </h2>

                {activeSkill === 'special_post' && (
                  <div className="text-xs text-orange-400 flex items-center gap-1">
                    <span>⚡ Quick Preset:</span>
                    <button
                      type="button"
                      onClick={() => {
                        const random = PRESET_SPECIALS[Math.floor(Math.random() * PRESET_SPECIALS.length)];
                        setSpecial({
                          itemName: random.name,
                          price: random.price,
                          description: random.description,
                          availableUntil: random.until,
                        });
                      }}
                      className="underline hover:text-orange-300 ml-1 cursor-pointer font-medium"
                    >
                      Cycle Menu Item
                    </button>
                  </div>
                )}
              </div>

              {/* Special Post Inputs */}
              {activeSkill === 'special_post' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-white/60 mb-1.5">Featured Item Name</label>
                      <input
                        type="text"
                        value={special.itemName}
                        onChange={(e) => setSpecial({ ...special, itemName: e.target.value })}
                        className="w-full h-12 px-3.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-orange-500"
                        placeholder="e.g. Cast Iron Seared Salmon"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-white/60 mb-1.5">Special Price</label>
                      <input
                        type="text"
                        value={special.price}
                        onChange={(e) => setSpecial({ ...special, price: e.target.value })}
                        className="w-full h-12 px-3.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-orange-500"
                        placeholder="e.g. $26.00"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-white/60 mb-1.5">Culinary Description / Ingredients</label>
                    <textarea
                      rows={3}
                      value={special.description}
                      onChange={(e) => setSpecial({ ...special, description: e.target.value })}
                      className="w-full p-3.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-orange-500"
                      placeholder="e.g. Crisp skin, wild mushroom risotto, charred lemon beurre blanc"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-white/60 mb-1.5">Availability / Urgency Hook</label>
                    <input
                      type="text"
                      value={special.availableUntil}
                      onChange={(e) => setSpecial({ ...special, availableUntil: e.target.value })}
                      className="w-full h-12 px-3.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-orange-500"
                      placeholder="e.g. 9:00 PM or until 15 portions sell out"
                    />
                  </div>
                </div>
              )}

              {/* Event Campaign Inputs */}
              {activeSkill === 'event_campaign' && (
                <div className="space-y-4">
                  <div className="flex gap-2 p-1.5 bg-white/5 rounded-xl border border-white/10">
                    {[
                      { id: 'announce', label: '1. Official Announce' },
                      { id: 'reminder', label: '2. Mid-Week Reminder' },
                      { id: 'last_call', label: '3. Last Call (Final Tickets)' },
                    ].map((st) => (
                      <button
                        key={st.id}
                        type="button"
                        onClick={() => setEventData({ ...eventData, stage: st.id as any })}
                        className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                          eventData.stage === st.id
                            ? 'bg-orange-500 text-white shadow-sm'
                            : 'text-white/60 hover:text-white'
                        }`}
                      >
                        {st.label}
                      </button>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-white/60 mb-1.5">Event Title</label>
                      <input
                        type="text"
                        value={eventData.title}
                        onChange={(e) => setEventData({ ...eventData, title: e.target.value })}
                        className="w-full h-12 px-3.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-orange-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-white/60 mb-1.5">Date & Time</label>
                      <input
                        type="text"
                        value={eventData.eventDate}
                        onChange={(e) => setEventData({ ...eventData, eventDate: e.target.value })}
                        className="w-full h-12 px-3.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-orange-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-white/60 mb-1.5">Event Experience Description</label>
                    <textarea
                      rows={2}
                      value={eventData.description}
                      onChange={(e) => setEventData({ ...eventData, description: e.target.value })}
                      className="w-full p-3.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-orange-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-white/60 mb-1.5">Reservation / Ticket Link</label>
                    <input
                      type="text"
                      value={eventData.ticketUrl}
                      onChange={(e) => setEventData({ ...eventData, ticketUrl: e.target.value })}
                      className="w-full h-12 px-3.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-orange-500"
                    />
                  </div>
                </div>
              )}

              {/* Weekly Plan Inputs */}
              {activeSkill === 'weekly_plan' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-white/60 mb-1.5">Weekly Theme</label>
                    <input
                      type="text"
                      value={weeklyPlan.weekTheme}
                      onChange={(e) => setWeeklyPlan({ ...weeklyPlan, weekTheme: e.target.value })}
                      className="w-full h-12 px-3.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-orange-500"
                      placeholder="e.g. Autumn Comfort & Local Craft Brews"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-white/60 mb-1.5">Weekly Highlights</label>
                    <textarea
                      rows={3}
                      value={weeklyPlan.specialsSummary}
                      onChange={(e) => setWeeklyPlan({ ...weeklyPlan, specialsSummary: e.target.value })}
                      className="w-full p-3.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-orange-500"
                    />
                  </div>
                </div>
              )}

              {/* Review Reply Inputs */}
              {activeSkill === 'review_reply' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-white/60 mb-1.5">Review Platform</label>
                      <select
                        value={review.platform}
                        onChange={(e) => setReview({ ...review, platform: e.target.value as any })}
                        className="w-full h-12 px-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-orange-500"
                      >
                        <option value="google">Google Business</option>
                        <option value="yelp">Yelp</option>
                        <option value="tripadvisor">TripAdvisor</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-white/60 mb-1.5">Rating (Stars)</label>
                      <select
                        value={review.rating}
                        onChange={(e) => setReview({ ...review, rating: Number(e.target.value) })}
                        className="w-full h-12 px-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-orange-500"
                      >
                        <option value={5}>⭐⭐⭐⭐⭐ 5 Stars</option>
                        <option value={4}>⭐⭐⭐⭐ 4 Stars</option>
                        <option value={3}>⭐⭐⭐ 3 Stars</option>
                        <option value={2}>⭐⭐ 2 Stars</option>
                        <option value={1}>⭐ 1 Star (Service Recovery)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-white/60 mb-1.5">Reviewer Name</label>
                      <input
                        type="text"
                        value={review.reviewerName}
                        onChange={(e) => setReview({ ...review, reviewerName: e.target.value })}
                        className="w-full h-12 px-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-orange-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-white/60 mb-1.5">Guest's Actual Review Text</label>
                    <textarea
                      rows={3}
                      value={review.reviewText}
                      onChange={(e) => setReview({ ...review, reviewText: e.target.value })}
                      className="w-full p-3.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-orange-500"
                    />
                  </div>
                </div>
              )}

              {/* Brand Guard Custom Draft */}
              {activeSkill === 'brand_guard' && (
                <div className="space-y-4">
                  <p className="text-xs text-white/60">
                    Paste custom copy to audit in real-time against FLSA terms, hospitality standards, and platform constraints.
                  </p>
                  <div>
                    <label className="block text-xs font-medium text-white/60 mb-1.5">Draft Copy to Audit</label>
                    <textarea
                      rows={4}
                      value={customDraft}
                      onChange={(e) => setCustomDraft(e.target.value)}
                      className="w-full p-3.5 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-orange-500 font-mono"
                      placeholder="Paste your drafted caption or promo message here..."
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Brand Voice Guard Live Card */}
            <div className={`border rounded-2xl p-5 transition-all ${
              brandGuardAudit.passed
                ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-200'
                : 'bg-amber-950/20 border-amber-500/30 text-amber-200'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{brandGuardAudit.passed ? '🛡️' : '⚠️'}</span>
                  <span className="font-bold text-sm text-white">Brand Guard Voice Compliance</span>
                </div>
                <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase ${
                  brandGuardAudit.passed ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
                }`}>
                  {brandGuardAudit.passed ? 'PASS (100% Compliant)' : `ATTENTION (${brandGuardAudit.score}/100)`}
                </span>
              </div>

              {brandGuardAudit.passed ? (
                <p className="text-xs text-emerald-300/80">
                  ✓ Perfect hospitality alignment. Strong call-to-action verified, character count within limits, zero banned claims.
                </p>
              ) : (
                <div className="space-y-1.5 mt-2">
                  {brandGuardAudit.issues.map((issue, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-xs text-amber-300/90">
                      <span className="text-amber-400">•</span>
                      <span>{issue}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Platform Simulator & Previews (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            {/* Platform Selector Pills */}
            <div className="bg-[#141414] border border-white/10 rounded-2xl p-4 shadow-sm">
              <label className="block text-xs font-semibold text-white/40 uppercase tracking-wider mb-2.5">
                Preview Platform Surface
              </label>
              <div className="grid grid-cols-5 gap-1.5">
                {[
                  { id: 'instagram', label: 'Instagram', icon: '📸' },
                  { id: 'facebook', label: 'Facebook', icon: '👥' },
                  { id: 'google', label: 'Google', icon: '📍' },
                  { id: 'tiktok', label: 'TikTok', icon: '🎵' },
                  { id: 'x', label: 'X', icon: '🐦' },
                ].map((plat) => (
                  <button
                    key={plat.id}
                    type="button"
                    onClick={() => setActivePlatform(plat.id as PlatformType)}
                    className={`min-h-[48px] py-2 px-1 rounded-xl text-center transition-all active:scale-[0.97] flex flex-col items-center justify-center ${
                      activePlatform === plat.id
                        ? 'bg-white text-black font-bold shadow-md'
                        : 'bg-white/5 text-white/60 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <span className="text-sm">{plat.icon}</span>
                    <span className="text-[10px] mt-0.5">{plat.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Simulated Device / Feed Preview Card */}
            <div className="bg-[#18181b] border border-white/15 rounded-3xl overflow-hidden shadow-2xl">
              {/* Device Header */}
              <div className="bg-[#0f0f11] px-5 py-3 border-b border-white/10 flex items-center justify-between text-xs text-white/60">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                  <span className="font-mono text-[11px] ml-2 text-white/40">
                    {activePlatform === 'instagram' && 'Instagram Feed • @thegoldenfork'}
                    {activePlatform === 'facebook' && 'Facebook Page • The Golden Fork'}
                    {activePlatform === 'google' && 'Google Business Profile'}
                    {activePlatform === 'tiktok' && 'TikTok • @goldenfork_official'}
                    {activePlatform === 'x' && 'X Post'}
                  </span>
                </div>
                <span className="text-[10px] font-mono bg-white/10 px-2 py-0.5 rounded text-white/70">
                  {platformCaption.length} chars
                </span>
              </div>

              {/* Feed Card Simulation */}
              <div className="p-5 space-y-4">
                {/* User / Page Identity Banner */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-orange-500 to-amber-400 flex items-center justify-center font-bold text-white text-sm shadow-md">
                      🍴
                    </div>
                    <div>
                      <div className="font-bold text-xs text-white flex items-center gap-1.5">
                        <span>{restaurantName}</span>
                        <span className="text-blue-400 text-[10px]">✓</span>
                      </div>
                      <div className="text-[10px] text-white/50">Downtown • Sponsored & Organic</div>
                    </div>
                  </div>
                  <span className="text-white/40 text-xs">•••</span>
                </div>

                {/* Simulated Media Frame */}
                {activePlatform !== 'x' && (
                  <div className="aspect-[4/3] rounded-2xl bg-gradient-to-br from-neutral-800 to-neutral-900 border border-white/10 flex flex-col items-center justify-center p-6 text-center relative overflow-hidden group">
                    <div className="absolute inset-0 bg-cover bg-center opacity-30 mix-blend-overlay" />
                    <span className="text-4xl mb-2">🍽️</span>
                    <span className="text-xs font-bold text-white uppercase tracking-wider">
                      {special.itemName || 'Fresh Hospitality Special'}
                    </span>
                    <span className="text-xs text-orange-400 font-mono mt-1 font-semibold">
                      {special.price || '$26.00'} • Limited Servings
                    </span>
                    <div className="absolute bottom-3 right-3 bg-black/60 backdrop-blur-md px-2 py-1 rounded text-[10px] font-mono text-white/70">
                      CulinaryOS Visual Asset
                    </div>
                  </div>
                )}

                {/* Caption / Copy Text Box */}
                <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                  <p className="text-xs leading-relaxed text-white/90 whitespace-pre-wrap font-sans">
                    {platformCaption}
                  </p>
                </div>

                {/* Simulated Interaction Buttons */}
                <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs text-white/60">
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1 hover:text-white cursor-pointer">
                      ❤️ <span className="text-[11px]">428</span>
                    </span>
                    <span className="flex items-center gap-1 hover:text-white cursor-pointer">
                      💬 <span className="text-[11px]">34</span>
                    </span>
                    <span className="flex items-center gap-1 hover:text-white cursor-pointer">
                      ↗️ <span className="text-[11px]">19</span>
                    </span>
                  </div>
                  <span className="text-[11px] text-white/40">🔖 Saved</span>
                </div>
              </div>
            </div>

            {/* Quick Links Back to Core Applications */}
            <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 text-xs text-white/60 flex items-center justify-between">
              <span>Looking for POS 86 / Specials sync?</span>
              <Link href="/features" className="text-orange-400 font-semibold hover:underline">
                Explore POS Integration →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
