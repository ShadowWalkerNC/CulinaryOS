import { describe, it, expect } from 'bun:test';
import {
  auditBrandGuard,
  formatSpecialPostCaption,
} from '../../packages/template-engine/src/index';

const CLEAN = 'Baja Shrimp Tacos are back at Taco Libre Truck! Cilantro-lime slaw, $9.99. Stop by 5th & Main or order now!';

describe('brand guard — banned words', () => {
  it('passes a clean draft', () => {
    const result = auditBrandGuard(CLEAN, { bannedWords: ['free', 'guaranteed'], requiredCta: true });
    expect(result.verdict).toBe('PASS');
    expect(result.pass).toBe(true);
    expect(result.ok).toBe(true);
    expect(result.reasons).toHaveLength(0);
    expect(result.suggestedFix).toBe('none');
  });

  it('fails when the draft contains a banned word', () => {
    const result = auditBrandGuard('Our tacos are the #1 best ever! Stop by today!', {
      bannedWords: ['#1'],
      requiredCta: true,
    });
    expect(result.verdict).toBe('FAIL');
    expect(result.pass).toBe(false);
    expect(result.reasons.join(' ')).toContain('#1');
    expect(result.suggestedFix).not.toBe('none');
  });

  it('matches banned words case-insensitively', () => {
    const result = auditBrandGuard('TRIPLE SMASH BURGER — GUARANTEED fresh. Order now!', {
      bannedWords: ['guaranteed'],
    });
    expect(result.verdict).toBe('FAIL');
    expect(result.reasons.join(' ').toLowerCase()).toContain('guaranteed');
  });

  it('accepts banned words as a comma-separated string', () => {
    const result = auditBrandGuard('Free chips with every bowl today! Visit us!', {
      bannedWords: 'free, guaranteed, #1',
    });
    expect(result.verdict).toBe('FAIL');
    expect(result.reasons.join(' ')).toContain('free');
  });

  it('does not flag partial matches inside larger words', () => {
    const result = auditBrandGuard('We celebrate freedom of flavor in every bowl. Visit us!', {
      bannedWords: ['free'],
    });
    expect(result.verdict).toBe('PASS');
  });
});

describe('brand guard — CTA validation', () => {
  it('fails when a CTA is required but missing', () => {
    const result = auditBrandGuard('Baja Shrimp Tacos, $9.99, today only.', { requiredCta: true });
    expect(result.verdict).toBe('FAIL');
    expect(result.reasons.join(' ').toLowerCase()).toContain('call to action');
  });

  it('passes when a visit/order/call/DM action is present', () => {
    const drafts = [
      'New ramen drop — visit us downtown tonight!',
      'New ramen drop — order online for pickup!',
      'New ramen drop — call (919) 555-0114 to reserve!',
      'New ramen drop — DM us to reserve your bowl!',
    ];
    for (const draft of drafts) {
      expect(auditBrandGuard(draft, { requiredCta: true }).verdict).toBe('PASS');
    }
  });

  it('passes without a CTA when none is required', () => {
    const result = auditBrandGuard('Baja Shrimp Tacos, $9.99, while it lasts.');
    expect(result.verdict).toBe('PASS');
  });
});

describe('brand guard — platform limits', () => {
  it('enforces the X/Twitter 280-character limit', () => {
    const long = `${'Taco Tuesday hype! Order now! '.repeat(12)}`;
    expect(long.length).toBeGreaterThan(280);
    expect(auditBrandGuard(long, { platform: 'x' }).verdict).toBe('FAIL');
    expect(auditBrandGuard('Taco Tuesday! Order now!', { platform: 'twitter' }).verdict).toBe('PASS');
  });

  it('rejects hashtags for Google Business', () => {
    expect(auditBrandGuard('Family dinner deals! #raleigh #foodie Visit us!', { platform: 'google' }).verdict).toBe('FAIL');
    expect(auditBrandGuard('Family dinner deals in Raleigh. Visit us!', { platform: 'gb' }).verdict).toBe('PASS');
  });

  it('limits the Instagram hook to 125 characters', () => {
    const hook = `${'A very long hook line that keeps going and going past the limit '.repeat(3)}`;
    expect(hook.length).toBeGreaterThan(125);
    expect(auditBrandGuard(`${hook}\nOrder now!`, { platform: 'instagram' }).verdict).toBe('FAIL');
  });

  it('limits website banners to 120 characters', () => {
    expect(auditBrandGuard(`${CLEAN} Extra banner words to push past the limit!`, { platform: 'website' }).verdict).toBe('FAIL');
    expect(auditBrandGuard('Taco Tuesday — $9.99. Stop by today!', { platform: 'web' }).verdict).toBe('PASS');
  });
});

describe('special post caption formatting', () => {
  const input = {
    businessName: 'Taco Libre Truck',
    businessType: 'food truck',
    location: '5th & Main, Raleigh',
    itemName: 'Baja Shrimp Tacos',
    description: 'cilantro-lime slaw, chipotle crema',
    price: '$9.99',
    availableUntil: '8pm today',
    tone: 'hype',
    platform: 'instagram',
  };

  it('leads with the item name in the first line', () => {
    const caption = formatSpecialPostCaption(input);
    const firstLine = caption.split('\n')[0] ?? '';
    expect(firstLine).toContain('Baja Shrimp Tacos');
  });

  it('repeats the price verbatim', () => {
    expect(formatSpecialPostCaption(input)).toContain('$9.99');
    expect(formatSpecialPostCaption({ ...input, price: '$12' })).toContain('$12');
  });

  it('omits price entirely when blank', () => {
    const caption = formatSpecialPostCaption({ ...input, price: '' });
    expect(caption).not.toContain('$');
    expect(caption.toLowerCase()).not.toContain('starting at');
  });

  it('always contains a CTA', () => {
    const caption = formatSpecialPostCaption(input).toLowerCase();
    const hasCta = ['visit', 'order', 'call', 'dm', 'stop by'].some((w) => caption.includes(w));
    expect(hasCta).toBe(true);
  });

  it('uses the stated availability window and invents none when blank', () => {
    expect(formatSpecialPostCaption(input)).toContain('8pm today');
    const noWindow = formatSpecialPostCaption({ ...input, availableUntil: '' }).toLowerCase();
    expect(noWindow).not.toContain('today only');
    expect(noWindow).not.toContain('while it lasts');
    expect(noWindow).not.toContain('available until');
    expect(noWindow).not.toContain('almost gone');
  });

  it('never invents discounts or freebies', () => {
    const caption = formatSpecialPostCaption(input).toLowerCase();
    expect(caption).not.toContain('free');
    expect(caption).not.toContain('% off');
    expect(caption).not.toContain('giveaway');
    expect(caption).not.toContain('discount');
    expect(caption).not.toContain('sold out');
  });

  it('produces captions that pass the brand guard with a required CTA', () => {
    const caption = formatSpecialPostCaption(input);
    const result = auditBrandGuard(caption, { requiredCta: true, platform: 'instagram' });
    expect(result.verdict).toBe('PASS');
  });

  it('stays within 280 characters for X/Twitter', () => {
    const caption = formatSpecialPostCaption({
      ...input,
      platform: 'twitter',
      description: 'A very long description that would overflow the tweet limit if kept verbatim. '.repeat(6),
    });
    expect(caption.length).toBeLessThanOrEqual(280);
    expect(caption).toContain('Baja Shrimp Tacos');
  });
});
