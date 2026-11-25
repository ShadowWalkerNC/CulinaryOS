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
    reviewText: 'The risotto was phenomenal and Sarah made our anniversary evening unforgettable!',
    guestIssue: '',
  });

  const [weeklyPlan, setWeeklyPlan] = useState<WeeklyPlanForm>({
    weekTheme: 'Autumn Comfort & Heritage Grains',
    specialsSummary: 'Monday: Half-priced Wine; Wednesday: Fresh Gnocchi Night; Friday: Prime Rib Roast',
  });

  const [customDraft, setCustomDraft] = useState('');

  const generatedCopy = useMemo(() => {
    const bName = restaurantName || 'Our Restaurant';

    if (activeSkill === 'special_post') {
      const item = special.itemName || "Today's Featured Special";
      const pr = special.price ? ` (${special.price})` : '';
      const desc = special.description ? ` — ${special.description}.` : '';
      const until = special.availableUntil ? ` Available until ${special.availableUntil}.` : ' Prepared fresh in-house today.';

      if (tone === 'hype') {
        return `SPECIAL RELEASE: Today at ${bName}, we are featuring ${item}${pr}${desc}${until} Order online or dine in before portions sell out.`;
      } else if (tone === 'artisanal') {
        return `From the line at ${bName}: ${item}${pr}${desc} Prepared in-house with regional purveyor ingredients. Reserve your table or order ahead for pickup.`;
      } else if (tone === 'playful') {
        return `Tonight's featured plate at ${bName}: ${item}${pr}${desc}${until} Reserve a table or order ahead online.`;
      } else {
        return `Featured today at ${bName}: ${item}${pr}${desc}${until} Join us in the dining room or order ahead on our website.`;
      }
    }

    if (activeSkill === 'event_campaign') {
      const { title, eventDate, description, ticketUrl, stage } = eventData;
      if (stage === 'announce') {
        return `Join us at ${bName} for ${title} on ${eventDate}. ${description}. Seating is limited — reserve seats at: ${ticketUrl}`;
      } else if (stage === 'reminder') {
        return `Upcoming at ${bName}: ${title} (${eventDate}). ${description}. Remaining tables available at: ${ticketUrl}`;
      } else {
        return `FINAL SEATING: Last tables remaining for ${title} at ${bName} (${eventDate}). Reserve directly at: ${ticketUrl}`;
      }
    }

    if (activeSkill === 'weekly_plan') {
      return (
        `THIS WEEK AT ${bName.toUpperCase()}\n` +
        `Menu Focus: ${weeklyPlan.weekTheme}\n\n` +
        `- Mon: Seasonal Vegetable & Local Cider Pairing\n` +
        `- Tue: Chef's Crudo & Raw Bar\n` +
        `- Wed: Cellar Selection (Half-off select bottles)\n` +
        `- Thu: Handmade Pasta & Heritage Grain Feature\n` +
        `- Fri: Coastal Fish Delivery Showcase\n` +
        `- Sat: Dry-Aged Prime Cut Dinner\n` +
        `- Sun: Family-Style Sunday Supper\n\n` +
        `Reserve a table or view the live menu online.`
      );
    }

    if (activeSkill === 'review_reply') {
      const name = review.reviewerName || 'valued guest';
      if (review.rating >= 4) {
        return (
          `Thank you for dining with us, ${name}. ` +
          `We appreciate your feedback on your visit to ${bName} and look forward to welcoming you back to the dining room soon.`
        );
      } else {
        return (
          `Hello ${name}, thank you for sharing this feedback. ` +
          `We hold our kitchen and floor service to strict standards at ${bName}, and we would like to follow up directly. ` +
          `Please contact our management desk at manager@${bName.toLowerCase().replace(/[^a-z0-9]/g, '')}.com.`
        );
      }
    }

    if (activeSkill === 'brand_guard') {
      return customDraft || `Tonight at ${bName}: House-made seasonal specialties prepared to order. View hours and order online.`;
    }

    return '';
  }, [activeSkill, restaurantName, tone, special, eventData, weeklyPlan, review, customDraft]);

  const brandGuardAudit = useMemo(() => {
    const text = generatedCopy.toLowerCase();
    const issues: string[] = [];

    const bannedSlang = ['cheap', 'crappy', 'garbage', 'fail', 'slow service', 'trash', 'microwaved'];
    bannedSlang.forEach((word) => {
      if (text.includes(word)) {
        issues.push(`Avoid negative/banned term "${word}" in brand communications`);
      }
    });

    const hasCta = /visit|order|call|link|bio|reserv|book|stop by|come in|view/i.test(generatedCopy);
    if (!hasCta) {
      issues.push('Missing explicit call-to-action (e.g. "order online", "reserve your table")');
    }

    if (activePlatform === 'x' && generatedCopy.length > 280) {
      issues.push(`Character count (${generatedCopy.length}) exceeds 280-character limit on X`);
    }

    const score = Math.max(20, 100 - issues.length * 25);
    return {
      passed: issues.length === 0,
      score,
      issues,
    };
  }, [generatedCopy, activePlatform]);

  const platformCaption = useMemo(() => {
    const hashtags = `#${restaurantName.toLowerCase().replace(/[^a-z0-9]/g, '')} #independentrestaurant #scratchkitchen`;
    switch (activePlatform) {
      case 'instagram':
        return `${generatedCopy}\n\nMenu & online ordering link in profile.\n\n${hashtags}`;
      case 'facebook':
        return `${generatedCopy}\n\nVisit our website for reservations and direct online pickup.`;
      case 'google':
        return `${generatedCopy}\n\nContact our host desk or visit our website for table reservations and current hours.`;
      case 'tiktok':
        return `${generatedCopy.split('.')[0]}. Direct ordering link in profile. ${hashtags}`;
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

  return (
    <div className="min-h-screen bg-[#0b0d10] text-white">
      <div className="border-b border-[#232832] bg-[#0e1116] sticky top-16 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono font-bold text-[#ff6b35] uppercase tracking-wider">
                STUDIO / DISPATCH ENGINE
              </span>
              <h1 className="text-base font-bold text-white tracking-tight">Campaign Planning Studio Preview</h1>
            </div>
            <p className="text-xs text-slate-400">Menu specials, event announcements, and brand compliance verification</p>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="px-3 py-2 rounded-lg bg-[#141820] border border-[#2a303c] text-xs font-mono text-slate-300">
              COMPLIANCE: <strong className="text-emerald-400">{brandGuardAudit.score}/100</strong>
            </div>

            <button
              type="button"
              onClick={handleCopy}
              className="min-h-[48px] px-5 rounded-lg bg-[#ff6b35] hover:bg-[#e85d2a] text-white font-bold text-xs uppercase tracking-wider active:scale-[0.97] transition-all duration-75 ease-out"
            >
              {copied ? 'COPIED TO CLIPBOARD' : 'COPY DISPATCH COPY'}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
            {[
              { id: 'special_post', code: '01', label: 'Daily Special', desc: 'Promote line specials & 86 countdowns' },
              { id: 'event_campaign', code: '02', label: 'Event Campaign', desc: 'Announce, reminder & final seating' },
              { id: 'weekly_plan', code: '03', label: '7-Day Schedule', desc: 'Weekly menu & cellar schedule' },
              { id: 'review_reply', code: '04', label: 'Guest Response', desc: 'Hospitality review responses' },
              { id: 'brand_guard', code: '05', label: 'Compliance Audit', desc: 'Audit copy against brand rules' },
            ].map((skill) => (
              <button
                key={skill.id}
                type="button"
                onClick={() => setActiveSkill(skill.id as SkillType)}
                className={`min-h-[60px] p-3.5 rounded-lg border text-left transition-all duration-75 ease-out active:scale-[0.97] flex flex-col justify-between ${
                  activeSkill === skill.id
                    ? 'bg-[#181c24] border-[#ff6b35] text-white'
                    : 'bg-[#12151b] border-[#232832] text-slate-300 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2 font-bold text-xs">
                  <span className="font-mono text-[#ff6b35]">{skill.code}</span>
                  <span>{skill.label}</span>
                </div>
                <span className="text-[11px] text-slate-400 mt-1 line-clamp-1">{skill.desc}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-[#12151b] border border-[#232832] rounded-xl p-6">
              <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-[#ff6b35] mb-4">
                VENUE &amp; VOICE PARAMETERS
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono uppercase text-slate-300 mb-1.5">Venue Name</label>
                  <input
                    type="text"
                    value={restaurantName}
                    onChange={(e) => setRestaurantName(e.target.value)}
                    className="w-full h-12 px-3.5 rounded-lg bg-[#0e1116] border border-[#2a303c] text-white text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase text-slate-300 mb-1.5">Editorial Tone</label>
                  <select
                    value={tone}
                    onChange={(e) => setTone(e.target.value as ToneType)}
                    className="w-full h-12 px-3.5 rounded-lg bg-[#0e1116] border border-[#2a303c] text-white text-sm"
                  >
                    <option value="friendly">Hospitality Standard</option>
                    <option value="hype">High-Volume Release</option>
                    <option value="artisanal">Chef &amp; Purveyor Craft</option>
                    <option value="playful">Casual Neighborhood</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="bg-[#12151b] border border-[#232832] rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-white">
                  WORKFLOW INPUTS
                </h2>
                {activeSkill === 'special_post' && (
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
                    className="text-xs font-mono text-[#ff6b35] hover:underline"
                  >
                    LOAD SAMPLE DISH
                  </button>
                )}
              </div>

              {activeSkill === 'special_post' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-mono text-slate-400 mb-1.5">Dish Name</label>
                      <input
                        type="text"
                        value={special.itemName}
                        onChange={(e) => setSpecial({ ...special, itemName: e.target.value })}
                        className="w-full h-12 px-3.5 rounded-lg bg-[#0e1116] border border-[#2a303c] text-white text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-mono text-slate-400 mb-1.5">Price</label>
                      <input
                        type="text"
                        value={special.price}
                        onChange={(e) => setSpecial({ ...special, price: e.target.value })}
                        className="w-full h-12 px-3.5 rounded-lg bg-[#0e1116] border border-[#2a303c] text-white text-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-mono text-slate-400 mb-1.5">Preparation &amp; Purveyor Notes</label>
                    <textarea
                      rows={3}
                      value={special.description}
                      onChange={(e) => setSpecial({ ...special, description: e.target.value })}
                      className="w-full p-3.5 rounded-lg bg-[#0e1116] border border-[#2a303c] text-white text-sm"
                    />
                  </div>
                </div>
              )}

              {activeSkill === 'event_campaign' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-mono text-slate-400 mb-1.5">Event Title</label>
                      <input
                        type="text"
                        value={eventData.title}
                        onChange={(e) => setEventData({ ...eventData, title: e.target.value })}
                        className="w-full h-12 px-3.5 rounded-lg bg-[#0e1116] border border-[#2a303c] text-white text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-mono text-slate-400 mb-1.5">Date &amp; Time</label>
                      <input
                        type="text"
                        value={eventData.eventDate}
                        onChange={(e) => setEventData({ ...eventData, eventDate: e.target.value })}
                        className="w-full h-12 px-3.5 rounded-lg bg-[#0e1116] border border-[#2a303c] text-white text-sm"
                      />
                    </div>
                  </div>
                </div>
              )}

              {activeSkill === 'weekly_plan' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-mono text-slate-400 mb-1.5">Weekly Menu Focus</label>
                    <input
                      type="text"
                      value={weeklyPlan.weekTheme}
                      onChange={(e) => setWeeklyPlan({ ...weeklyPlan, weekTheme: e.target.value })}
                      className="w-full h-12 px-3.5 rounded-lg bg-[#0e1116] border border-[#2a303c] text-white text-sm"
                    />
                  </div>
                </div>
              )}

              {activeSkill === 'review_reply' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-mono text-slate-400 mb-1.5">Guest Name</label>
                    <input
                      type="text"
                      value={review.reviewerName}
                      onChange={(e) => setReview({ ...review, reviewerName: e.target.value })}
                      className="w-full h-12 px-3.5 rounded-lg bg-[#0e1116] border border-[#2a303c] text-white text-sm"
                    />
                  </div>
                </div>
              )}

              {activeSkill === 'brand_guard' && (
                <div>
                  <label className="block text-xs font-mono text-slate-400 mb-1.5">Custom Copy</label>
                  <textarea
                    rows={4}
                    value={customDraft}
                    onChange={(e) => setCustomDraft(e.target.value)}
                    className="w-full p-3.5 rounded-lg bg-[#0e1116] border border-[#2a303c] text-white text-sm font-mono"
                  />
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-5 space-y-6">
            <div className="bg-[#12151b] border border-[#232832] rounded-xl p-5">
              <div className="grid grid-cols-5 gap-1.5 mb-4">
                {(['instagram', 'facebook', 'google', 'tiktok', 'x'] as PlatformType[]).map((plat) => (
                  <button
                    key={plat}
                    type="button"
                    onClick={() => setActivePlatform(plat)}
                    className={`min-h-[48px] rounded-lg text-xs font-mono uppercase font-bold transition-all active:scale-[0.97] ${
                      activePlatform === plat
                        ? 'bg-[#ff6b35] text-white'
                        : 'bg-[#0e1116] text-slate-400 border border-[#232832]'
                    }`}
                  >
                    {plat}
                  </button>
                ))}
              </div>

              <div className="bg-[#0e1116] border border-[#232832] rounded-lg p-4">
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#1c2029] text-xs font-mono text-slate-400">
                  <span>{restaurantName}</span>
                  <span>{platformCaption.length} CHARS</span>
                </div>
                <p className="text-xs leading-relaxed text-slate-200 whitespace-pre-wrap font-mono">
                  {platformCaption}
                </p>
              </div>

              <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
                <span>Need live POS 86 &amp; menu sync?</span>
                <Link href="/features" className="text-[#ff6b35] font-mono font-bold hover:underline">
                  INSPECT POS SPECS
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
