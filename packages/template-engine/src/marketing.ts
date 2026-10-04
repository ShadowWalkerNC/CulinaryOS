// @culinaryos/template-engine — marketing skills (TypeScript port)
// Deterministic port of Post-Pilot `brand_guard` + `special_post` skills.
// Source rules (read-only reference, not imported):
//   services/marketing-python/skills/brand_guard/rules/guard_rules.md
//   services/marketing-python/skills/special_post/rules/special_rules.md
//   services/marketing-python/skills/special_post/prompts/caption.md
// No LLM calls here: auditBrandGuard runs the hard-fail checks and
// formatSpecialPostCaption is the deterministic template fallback.

export type BrandGuardVerdict = 'PASS' | 'FAIL';

export interface AuditBrandGuardOptions {
  /** Banned words/phrases — any hit is an automatic FAIL. */
  bannedWords?: string[] | string;
  /** When true, the draft must contain a visit/order/call/DM action. */
  requiredCta?: boolean;
  /** Platform key, e.g. 'instagram' | 'x' | 'google' | 'website'. */
  platform?: string;
  /** Expected brand tone, e.g. 'friendly' | 'community' | 'hype'. */
  tone?: string;
  /** Business name (accepted for prompt parity; unused by hard checks). */
  businessName?: string;
}

export interface BrandGuardAuditInput extends AuditBrandGuardOptions {
  draft: string;
}

export interface BrandGuardResult {
  verdict: BrandGuardVerdict;
  /** One entry per issue; empty when PASS. */
  reasons: string[];
  /** One-sentence fix, or 'none' when PASS. */
  suggestedFix: string;
  /** True when verdict is PASS (alias of ok). */
  pass: boolean;
  /** True when verdict is PASS (alias of pass). */
  ok: boolean;
  /** Alias of reasons for callers using either name. */
  issues: string[];
}

export interface SpecialPostInput {
  businessName?: string;
  businessType?: string;
  location?: string;
  itemName: string;
  description?: string;
  /** Repeated verbatim when a string; numbers render as $X.XX. Blank omits price. */
  price?: string | number;
  availableUntil?: string;
  tone?: string;
  platform?: string;
}

// ── Internal matchers ──────────────────────────────────────────────

const CTA_PATTERNS: RegExp[] = [
  /visit/i,
  /\border\b/i,
  /\bcall\b/i,
  /\bdm\b/i,
  /reserv/i,
  /\bbook\b/i,
  /stop by/i,
  /come (by|in)/i,
  /link in bio/i,
  /save this/i,
  /tag a friend/i,
  /comment below/i,
  /\bfollow\b/i,
  /order now/i,
  /see you/i,
  /try it/i,
  /get yours/i,
  /https?:\/\//,
  /\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/,
];

const PROFANITY_WORDS = ['fuck', 'shit', 'bitch', 'bastard', 'asshole', 'dick', 'cunt', 'slut', 'whore'];
const SNARK_WORDS = ['idiot', 'stupid', 'dumb', 'shut up', 'whatever'];
const HYPE_PHRASES = [
  'act now', 'limited time', 'hurry', 'last chance',
  "don't miss", 'do not miss', 'buy now', 'urgent',
  'guaranteed', 'best ever', '#1', '!!!',
];
const OFFER_PATTERNS: RegExp[] = [/%\s*off/i, /giveaway/i, /sold\s*out/i];
const NON_OFFER_FREE = /feel free|free\s+(wifi|wi-?fi|parking)/i;

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Whole-word match for plain words, case-insensitive substring otherwise. */
function containsBannedWord(draft: string, word: string): boolean {
  if (/^[a-z0-9]+$/i.test(word)) {
    return new RegExp(`\\b${escapeRegExp(word)}\\b`, 'i').test(draft);
  }
  return draft.toLowerCase().includes(word.toLowerCase());
}

function containsWord(draft: string, word: string): boolean {
  if (/^[a-z0-9' ]+$/i.test(word) && !word.includes(' ')) {
    return new RegExp(`\\b${escapeRegExp(word)}\\b`, 'i').test(draft);
  }
  return draft.toLowerCase().includes(word.toLowerCase());
}

function normalizeBannedWords(input: string[] | string | undefined): string[] {
  if (!input) return [];
  const list = Array.isArray(input) ? input : input.split(',');
  return list.map((w) => w.trim()).filter((w) => w.length > 0);
}

function hasCta(draft: string): boolean {
  return CTA_PATTERNS.some((re) => re.test(draft));
}

/** Canonical platform key: 'tw' | 'gb' | 'ig' | 'web' | 'fb' | 'tt' | 'yt' | raw. */
function normalizePlatform(platform: string | undefined): string {
  const p = (platform ?? '').trim().toLowerCase().replace(/[\s_-]+/g, '');
  switch (p) {
    case 'x':
    case 'twitter':
    case 'tw':
      return 'tw';
    case 'google':
    case 'googlebusiness':
    case 'gb':
    case 'gmb':
      return 'gb';
    case 'instagram':
    case 'ig':
    case 'insta':
      return 'ig';
    case 'website':
    case 'web':
    case 'banner':
    case 'site':
      return 'web';
    case 'facebook':
    case 'fb':
      return 'fb';
    case 'tiktok':
    case 'tt':
      return 'tt';
    case 'youtube':
    case 'yt':
      return 'yt';
    default:
      return p;
  }
}

function hasUnverifiedOffer(draft: string): string | null {
  for (const re of OFFER_PATTERNS) {
    const hit = draft.match(re);
    if (hit) return hit[0];
  }
  const stripped = draft.replace(NON_OFFER_FREE, '');
  const freeHit = stripped.match(/\bfree\b/i);
  if (freeHit) return freeHit[0];
  return null;
}

interface GuardIssue {
  reason: string;
  fix: string;
}

// ── auditBrandGuard ────────────────────────────────────────────────

export function auditBrandGuard(
  draft: string,
  options?: AuditBrandGuardOptions,
): BrandGuardResult;
export function auditBrandGuard(input: BrandGuardAuditInput): BrandGuardResult;
export function auditBrandGuard(
  draftOrInput: string | BrandGuardAuditInput,
  options?: AuditBrandGuardOptions,
): BrandGuardResult {
  const draft = typeof draftOrInput === 'string' ? draftOrInput : draftOrInput.draft;
  const opts: AuditBrandGuardOptions =
    typeof draftOrInput === 'string' ? (options ?? {}) : draftOrInput;

  const issues: GuardIssue[] = [];
  const text = typeof draft === 'string' ? draft : '';

  if (!text.trim()) {
    issues.push({
      reason: 'Draft caption is required.',
      fix: 'Provide a draft caption to audit.',
    });
    return toResult(issues);
  }

  // 1. Banned words — automatic FAIL.
  for (const word of normalizeBannedWords(opts.bannedWords)) {
    if (containsBannedWord(text, word)) {
      issues.push({
        reason: `Banned word/phrase found: "${word}".`,
        fix: `Remove or replace "${word}".`,
      });
    }
  }

  // 2. Invented offers — fail unless the caller lists them as confirmed
  // via bannedWords exemption is out of scope, so any hit fails.
  const offerHit = hasUnverifiedOffer(text);
  if (offerHit) {
    issues.push({
      reason: `Unverified offer claim ("${offerHit}") not confirmed in source data.`,
      fix: 'Remove the unverified offer claim or confirm it in the source data.',
    });
  }

  // 3. Platform limits.
  const platform = normalizePlatform(opts.platform);
  if ((platform === 'tw' || platform === 'x') && text.length > 280) {
    issues.push({
      reason: `Exceeds X/Twitter 280-character limit (${text.length} chars).`,
      fix: 'Shorten the draft to 280 characters or fewer.',
    });
  }
  if (platform === 'gb' && text.includes('#')) {
    issues.push({
      reason: 'Google Business posts must not contain hashtags.',
      fix: 'Remove all hashtags for Google Business.',
    });
  }
  if (platform === 'ig') {
    const hook = text.split('\n')[0] ?? text;
    if (hook.length > 125) {
      issues.push({
        reason: `Instagram hook (first line) exceeds 125 characters (${hook.length} chars).`,
        fix: 'Shorten the first line to 125 characters or fewer.',
      });
    }
  }
  if (platform === 'web' && text.length > 120) {
    issues.push({
      reason: `Website banner exceeds 120 characters (${text.length} chars).`,
      fix: 'Shorten the banner to 120 characters or fewer.',
    });
  }

  // 4. Tone break — hype in friendly/community voice; profanity/snark always.
  const profanityHit = PROFANITY_WORDS.find((w) => containsWord(text, w));
  if (profanityHit) {
    issues.push({
      reason: `Profanity detected ("${profanityHit}").`,
      fix: 'Rewrite without profanity.',
    });
  }
  const snarkHit = SNARK_WORDS.find((w) => containsWord(text, w));
  if (snarkHit) {
    issues.push({
      reason: `Snark detected ("${snarkHit}").`,
      fix: 'Rewrite in a respectful brand voice.',
    });
  }
  const tone = (opts.tone ?? '').trim().toLowerCase();
  if (tone === 'friendly' || tone === 'community') {
    const hypeHit = HYPE_PHRASES.find((h) => text.toLowerCase().includes(h.toLowerCase()));
    if (hypeHit) {
      issues.push({
        reason: `Tone break: hype/urgent language ("${hypeHit}") conflicts with ${tone} voice.`,
        fix: `Rewrite without hype to match the ${tone} tone.`,
      });
    }
  }

  // 5. Missing CTA.
  if (opts.requiredCta === true && !hasCta(text)) {
    issues.push({
      reason: 'Missing required call to action (visit/order/call/DM).',
      fix: 'Add a clear call to action (e.g. "Stop by today or order now!").',
    });
  }

  return toResult(issues);
}

function toResult(issues: GuardIssue[]): BrandGuardResult {
  const verdict: BrandGuardVerdict = issues.length === 0 ? 'PASS' : 'FAIL';
  const reasons = issues.map((i) => i.reason);
  const suggestedFix = verdict === 'PASS' ? 'none' : (issues[0]?.fix ?? 'none');
  const pass = verdict === 'PASS';
  return { verdict, reasons, suggestedFix, pass, ok: pass, issues: [...reasons] };
}

// ── formatSpecialPostCaption ───────────────────────────────────────

type LooseSpecialPostInput = SpecialPostInput & Record<string, unknown>;

function asText(value: unknown): string {
  if (typeof value === 'string') return value.trim();
  if (value === null || value === undefined) return '';
  if (typeof value === 'number' || typeof value === 'boolean') return String(value).trim();
  return '';
}

function formatPrice(price: unknown): string {
  if (typeof price === 'number') {
    if (!Number.isFinite(price)) return '';
    return `$${price.toFixed(2)}`;
  }
  return asText(price);
}

/**
 * Deterministic daily-special caption (template fallback, no LLM).
 * Guarantees: item name in the first line, verbatim price (or none),
 * exactly one CTA, at most one urgency cue, no invented offers.
 */
export function formatSpecialPostCaption(input: SpecialPostInput): string {
  const loose = input as LooseSpecialPostInput;
  const itemName = asText(
    loose.itemName ?? loose.item_name ?? loose.item ?? loose.name ?? loose.title ?? loose.special,
  );
  if (!itemName) {
    throw new Error('itemName is required.');
  }
  const businessName = asText(loose.businessName ?? loose.business_name ?? loose.business);
  const location = asText(loose.location ?? loose.address ?? loose.city);
  const description = asText(loose.description ?? loose.details ?? loose.detail);
  const availableUntil = asText(
    loose.availableUntil ?? loose.available_until ?? loose.until ?? loose.available,
  );
  const platform = asText(loose.platform) || 'instagram';
  const price = formatPrice(loose.price ?? loose.cost ?? loose.amount);

  // One urgency cue max, only when an availability window is stated.
  const urgency = availableUntil
    ? (/today/i.test(availableUntil) ? 'today only' : 'while it lasts')
    : '';
  const cta = location ? `Stop by ${location} or order now!` : 'Stop by today or order now!';

  const hook = businessName
    ? `${itemName} is today's special at ${businessName}!`
    : `${itemName} — today's special!`;

  const plat = normalizePlatform(platform);

  // Website banner: compact single line within the 120-char limit.
  if (plat === 'web') {
    const banner = `${itemName}${price ? ` — ${price}` : ''} · Stop by today!`;
    return banner.length <= 120 ? banner : `${banner.slice(0, 117).trimEnd()}...`;
  }

  const lines: string[] = [hook];
  if (description) lines.push(description);
  const metaParts: string[] = [];
  if (price) metaParts.push(price);
  if (availableUntil) {
    metaParts.push(`Available until ${availableUntil}${urgency ? ` — ${urgency}` : ''}`);
  }
  if (metaParts.length > 0) lines.push(metaParts.join(' · '));
  lines.push(cta);

  // Instagram: keep the hook within the 125-char limit.
  if (plat === 'ig' && (lines[0]?.length ?? 0) > 125) {
    lines[0] = itemName.length <= 124 ? `${itemName}!` : itemName;
  }

  let caption = lines.join('\n');

  // X/Twitter: stay within 280 chars by dropping the description first.
  if (plat === 'tw' && caption.length > 280) {
    const compactMeta = metaParts.join(' · ');
    const compact = [lines[0] ?? hook, compactMeta, cta].filter((p) => p).join('\n');
    caption = compact.length <= 280 ? compact : `${compact.slice(0, 277).trimEnd()}...`;
  }

  return caption;
}
