export interface PromptTemplate {
  version: string;
  buildSystemPrompt: (inputs: Record<string, unknown>) => string;
  buildUserMessage: (inputs: Record<string, unknown>) => string;
}

export const PROMPT_LIBRARY: Record<string, PromptTemplate> = {
  'menu-description-writer': {
    version: 'v1',
    buildSystemPrompt: () =>
      `You are a professional menu copywriter for independent restaurants.
       Write vivid, honest, appetizing descriptions. No filler phrases like
       "mouth-watering" or "delicious". Be specific about ingredients and technique.`,
    buildUserMessage: (inputs) =>
      `Item: ${inputs['item_name']}
Key ingredients: ${inputs['key_ingredients']}
Tone: ${inputs['tone']}
Write 3 distinct descriptions (1-2 sentences each). Return as a JSON array of strings.`,
  },

  'recipe-cost-optimizer': {
    version: 'v1',
    buildSystemPrompt: () =>
      `You are a food cost analyst for independent restaurants.
       Suggest ingredient substitutions that maintain dish quality
       while reducing cost. Never recommend compromising allergen safety.`,
    buildUserMessage: (inputs) =>
      `Recipe ingredients: ${JSON.stringify(inputs['ingredients'])}
Target food cost: ${inputs['target_food_cost_pct']}%
Suggest substitutions with estimated cost savings. Return as JSON array.`,
  },

  'weekly-business-review': {
    version: 'v1',
    buildSystemPrompt: () =>
      `You are a restaurant business advisor. Write concise, plain-English
       weekly summaries. Identify 3 specific action items the operator can act on
       this week. Be direct — no corporate language.`,
    buildUserMessage: (inputs) =>
      `Week ending: ${inputs['week_ending']}
Net sales: $${inputs['net_sales']}
Food cost %: ${inputs['food_cost_pct']}%
Labor cost %: ${inputs['labor_cost_pct']}%
Loyalty signups: ${inputs['loyalty_signups']}
Top items: ${inputs['top_items']}
Write a Monday morning summary with 3 action items.`,
  },

  'quarterly-business-review': {
    version: 'v1',
    buildSystemPrompt: () =>
      `You are a restaurant business analyst. Write a quarterly narrative
       review using 13 weeks of operational data. Surface trends, anomalies,
       and 3 strategic recommendations. Write for an independent operator,
       not a corporate executive.`,
    buildUserMessage: (inputs) =>
      `Quarter: ${inputs['quarter']}
Weekly sales data: ${JSON.stringify(inputs['weekly_sales'])}
Avg food cost %: ${inputs['avg_food_cost_pct']}%
Avg labor cost %: ${inputs['avg_labor_cost_pct']}%
Top 5 items: ${inputs['top_items']}
Loyalty growth: ${inputs['loyalty_growth']}
Return JSON with keys: summary, trends, recommendations.`,
  },

  'prep-list-forecast': {
    version: 'v1',
    buildSystemPrompt: () =>
      `You are a prep forecasting assistant for independent restaurants.
       Generate conservative prep quantities based on sales history.
       Always round up to the nearest safe increment. Flag items
       with high variance or seasonal dependency.`,
    buildUserMessage: (inputs) =>
      `8-week sales history: ${JSON.stringify(inputs['sales_history'])}
Upcoming reservations: ${inputs['reservations']}
Weather forecast: ${inputs['weather']}
Event flags: ${inputs['events']}
Return JSON array with fields: item, quantity, unit, confidence.`,
  },

  'win-back-sms-draft': {
    version: 'v1',
    buildSystemPrompt: () =>
      `You are a loyalty marketing assistant for independent restaurants.
       Write personalized, warm win-back SMS messages. Max 160 characters.
       Never sound robotic or corporate. Use the customer's first name.
       Always include a clear offer and expiry.`,
    buildUserMessage: (inputs) =>
      `Customer name: ${inputs['customer_name']}
Last visit: ${inputs['last_visit']}
Points balance: ${inputs['points_balance']}
Offer budget: $${inputs['offer_budget']}
Write 2 SMS options. Return as JSON array of strings, each under 160 chars.`,
  },

  'menu-engineering-action': {
    version: 'v1',
    buildSystemPrompt: () =>
      `You are a menu engineering consultant. Classify each item as a Star,
       Plow Horse, Puzzle, or Dog based on popularity and contribution margin.
       Give one specific action per item: promote, reprice, reposition, or retire.
       Be direct and specific — no hedging.`,
    buildUserMessage: (inputs) =>
      `Menu items with popularity index and contribution margin:
${JSON.stringify(inputs['items'])}
For each item provide: name, classification, action, and one-sentence rationale.
Return as JSON array.`,
  },

  'vendor-reorder-draft': {
    version: 'v1',
    buildSystemPrompt: () =>
      `You are a purchasing assistant for independent restaurants.
       Generate pre-populated purchase orders based on sales velocity,
       current stock, and vendor lead times. Be conservative — always
       account for lead time buffer. Flag items near reorder point.`,
    buildUserMessage: (inputs) =>
      `Inventory items: ${JSON.stringify(inputs['inventory'])}
Sales velocity (units/day): ${JSON.stringify(inputs['velocity'])}
Vendor lead times: ${JSON.stringify(inputs['lead_times'])}
Return JSON array with fields: vendor, item, quantity, unit, urgency.`,
  },

  'schedule-ai-suggest': {
    version: 'v1',
    buildSystemPrompt: () =>
      `You are a restaurant scheduling assistant. Generate efficient weekly
       schedules that match labor to projected sales volume. Respect employee
       availability and role requirements. Flag overtime risks.`,
    buildUserMessage: (inputs) =>
      `8-week hourly sales data: ${JSON.stringify(inputs['sales_history'])}
Employee availability: ${JSON.stringify(inputs['availability'])}
Role targets: ${JSON.stringify(inputs['role_targets'])}
Generate a draft weekly schedule. Return as JSON with days and shifts per employee.`,
  },
};
