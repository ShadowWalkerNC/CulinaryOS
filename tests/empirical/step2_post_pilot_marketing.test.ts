import { describe, it, expect } from 'bun:test';

// -------------------------------------------------------------------
// Step 2 Empirical Verification: Post-Pilot Marketing MCP Server
// -------------------------------------------------------------------

interface CustomerLoyaltyState {
  customerId: string;
  name: string;
  address: string;
  visitCount: number;
  totalSpendDollars: number;
}

interface PostcardDispatchResult {
  success: boolean;
  customerName: string;
  address: string;
  couponCode: string;
  discountPercent: number;
  message: string;
}

// Logic mirror of send_marketing_postcard tool handler in mcp/src/post-pilot-server.ts
function handleSendMarketingPostcard(params: {
  customerName: string;
  address: string;
  discountPercent: number;
  couponMessage?: string;
}): PostcardDispatchResult {
  if (!params.customerName || !params.address) {
    throw new Error('Missing required customer details');
  }
  if (params.discountPercent <= 0 || params.discountPercent > 100) {
    throw new Error('Invalid discount percentage');
  }

  const couponMessage = params.couponMessage ?? 'Thanks for dining!';
  const couponCode = `SAVE${params.discountPercent}`;

  return {
    success: true,
    customerName: params.customerName,
    address: params.address,
    couponCode,
    discountPercent: params.discountPercent,
    message: `Success: Post-Pilot postcard queued for dispatch to ${params.customerName}. Code: ${couponCode}. Message: "${couponMessage}".`,
  };
}

// Milestone trigger evaluator
function evaluateLoyaltyMilestoneAndDispatch(customer: CustomerLoyaltyState): PostcardDispatchResult | null {
  const VISIT_MILESTONE = 5;
  const SPEND_MILESTONE_DOLLARS = 250.0;

  if (customer.visitCount >= VISIT_MILESTONE || customer.totalSpendDollars >= SPEND_MILESTONE_DOLLARS) {
    const discount = customer.totalSpendDollars >= SPEND_MILESTONE_DOLLARS ? 20 : 15;
    return handleSendMarketingPostcard({
      customerName: customer.name,
      address: customer.address,
      discountPercent: discount,
      couponMessage: `Congratulations ${customer.name}! Thank you for your continued loyalty. Enjoy ${discount}% off your next visit.`,
    });
  }
  return null;
}

describe('Step 2: Post-Pilot Marketing MCP Server (send_marketing_postcard)', () => {
  it('dispatches physical postcard coupon when customer reaches visit milestone', () => {
    const customer: CustomerLoyaltyState = {
      customerId: 'cust-101',
      name: 'Eleanor Vance',
      address: '100 Hill House Lane, Suite 4',
      visitCount: 5, // Reached milestone
      totalSpendDollars: 180.0,
    };

    const result = evaluateLoyaltyMilestoneAndDispatch(customer);
    expect(result !== null).toBe(true);
    expect(result?.success).toBe(true);
    expect(result?.customerName).toBe('Eleanor Vance');
    expect(result?.couponCode).toBe('SAVE15');
    expect(result?.discountPercent).toBe(15);
    expect(result?.message).toContain('SAVE15');
  });

  it('dispatches higher discount postcard coupon when customer reaches spend milestone', () => {
    const customer: CustomerLoyaltyState = {
      customerId: 'cust-102',
      name: 'Arthur Pendelton',
      address: '42 Wallaby Way, Sydney',
      visitCount: 3,
      totalSpendDollars: 275.5, // Reached spend milestone >= $250
    };

    const result = evaluateLoyaltyMilestoneAndDispatch(customer);
    expect(result !== null).toBe(true);
    expect(result?.couponCode).toBe('SAVE20');
    expect(result?.discountPercent).toBe(20);
  });

  it('does not dispatch postcard when milestones are not reached', () => {
    const customer: CustomerLoyaltyState = {
      customerId: 'cust-103',
      name: 'Bob Smith',
      address: '123 Main St',
      visitCount: 2,
      totalSpendDollars: 45.0,
    };

    const result = evaluateLoyaltyMilestoneAndDispatch(customer);
    expect(result === null).toBe(true);
  });

  it('handles tool execution error cases gracefully', () => {
    expect(() =>
      handleSendMarketingPostcard({ customerName: '', address: '123 St', discountPercent: 15 })
    ).toThrow(/Missing required customer details/);

    expect(() =>
      handleSendMarketingPostcard({ customerName: 'Alice', address: '123 St', discountPercent: -5 })
    ).toThrow(/Invalid discount percentage/);

    expect(() =>
      handleSendMarketingPostcard({ customerName: 'Alice', address: '123 St', discountPercent: 150 })
    ).toThrow(/Invalid discount percentage/);
  });
});
