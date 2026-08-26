import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { culinaryOsApiHeaders, culinaryOsBaseUrl } from "./api-headers.js";
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

const server = new McpServer({
  name: "KitchenKit",
  version: "1.0.0",
});

// Original KDS tools
server.tool("fetch_kds_tickets", "Fetches all active, uncompleted order tickets on the kitchen display queue", {}, async () => {
  const API_URL = culinaryOsBaseUrl();
  const headers = culinaryOsApiHeaders();
  const res = await fetch(`${API_URL}/v1/kds/tickets`, { headers });
  if (!res.ok) throw new Error(`Failed to fetch tickets from API: ${await res.text()}`);
  const body = await res.json() as any;
  return { content: [{ type: "text", text: JSON.stringify(body.data || [], null, 2) }] };
});

server.tool("bump_kds_ticket", "Completes and removes an order ticket from the active kitchen display queue", {
  ticketId: z.string().describe("ID of the ticket to bump")
}, async ({ ticketId }) => {
  const API_URL = culinaryOsBaseUrl();
  const headers = culinaryOsApiHeaders();
  const res = await fetch(`${API_URL}/v1/kds/tickets/${ticketId}/bump`, {
    method: "PATCH",
    headers,
  });
  if (!res.ok) throw new Error(`Failed to bump ticket: ${await res.text()}`);
  return { content: [{ type: "text", text: `Success: Ticket ${ticketId} bumped on KitchenKit.` }] };
});

// Merged from KitchenKit prep-mcp
const supabaseUrl = process.env.KITCHENKIT_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseKey = process.env.KITCHENKIT_SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
let supabase: any = null;
if (supabaseUrl && supabaseKey) {
  supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });
}

function formatDualOutput(markdown: string, jsonPayload: unknown) {
  const jsonBlock = `\`\`\`json\n${JSON.stringify(jsonPayload, null, 2)}\n\`\`\``;
  return `${markdown}\n\n${jsonBlock}`;
}

const CANONICAL_SHIFTS = ['AM', 'PM', 'Brunch', 'Dinner', 'Overnight', 'Custom'] as const;
type CanonicalShift = (typeof CANONICAL_SHIFTS)[number];

function normalizeShift(val: unknown): CanonicalShift {
  if (typeof val !== 'string') return 'Custom';
  const trimmed = val.trim();
  const lower = trimmed.toLowerCase();
  switch (lower) {
    case 'am': case 'morning': case 'breakfast': case 'early': return 'AM';
    case 'pm': case 'afternoon': case 'midday': case 'lunch': return 'PM';
    case 'brunch': return 'Brunch';
    case 'dinner': case 'evening': case 'night': case 'supper': return 'Dinner';
    case 'overnight': case 'graveyard': case 'late': return 'Overnight';
    case 'custom': return 'Custom';
    default: return CANONICAL_SHIFTS.find((s) => s.toLowerCase() === lower) || 'Custom';
  }
}

const shiftSchema = z.preprocess(normalizeShift, z.enum(CANONICAL_SHIFTS));

server.tool('build_shift_prep', 'Build a shift prep plan from par levels.', {
  user_id: z.string().uuid(),
  shift: shiftSchema,
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
}, async ({ user_id, shift, date }) => {
  if (!supabase) throw new Error("Supabase not configured");
  const planDate = date ?? new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase.rpc('build_shift_prep', { p_user_id: user_id, p_shift: shift, p_date: planDate });
  if (error) return { content: [{ type: 'text', text: `Error: ${error.message}` }], isError: true };
  if (!data || data.length === 0) return { content: [{ type: 'text', text: formatDualOutput(`### ${shift} Prep Plan — ${planDate}\n\nAll items are at par! Nothing to prep. ✅`, { user_id, shift, date: planDate, total_items: 0, items: [] }) }] };
  const rowsMarkdown = data.map((row: any) => `| ${row.ingredient_name} | ${Number(row.current_stock).toFixed(2)} | ${Number(row.par_amount).toFixed(2)} | +${Number(row.prep_amount).toFixed(2)} | ${row.unit} |`).join('\n');
  const markdown = [`### ${shift} Prep Plan — ${planDate}`, `Found ${data.length} item(s) below par.`, '', '| Ingredient | Stock | Par Level | Needed Prep | Unit |', '| :--- | ---: | ---: | ---: | :--- |', rowsMarkdown].join('\n');
  return { content: [{ type: 'text', text: formatDualOutput(markdown, { user_id, shift, date: planDate, total_items: data.length, items: data }) }] };
});

server.tool('save_prep_plan', 'Persist a prep plan to the database.', {
  user_id: z.string().uuid(),
  shift: shiftSchema,
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  items: z.array(z.object({ ingredient_name: z.string(), prep_amount: z.number(), unit: z.string() }))
}, async ({ user_id, shift, date, items }) => {
  if (!supabase) throw new Error("Supabase not configured");
  const planDate = date ?? new Date().toISOString().slice(0, 10);
  const { data: plan, error: planErr } = await supabase.from('prep_plans').upsert({ user_id, shift, plan_date: planDate }, { onConflict: 'user_id,shift,plan_date' }).select().single();
  if (planErr) return { content: [{ type: 'text', text: `Error upserting plan: ${planErr.message}` }], isError: true };
  await supabase.from('prep_plan_items').delete().eq('plan_id', plan.id).eq('is_done', false);
  if (items.length > 0) await supabase.from('prep_plan_items').insert(items.map((item: any) => ({ ...item, plan_id: plan.id })));
  const markdown = ['### Shift Prep Plan Saved', `**Shift**: ${shift}`, `**Date**: ${planDate}`, `**Plan ID**: \`${plan.id}\``, `**Queued Items**: ${items.length}`].join('\n');
  return { content: [{ type: 'text', text: formatDualOutput(markdown, { plan_id: plan.id, user_id, shift, date: planDate, items_count: items.length, items }) }] };
});

server.tool('complete_prep_item', 'Mark a single prep plan item as done.', {
  item_id: z.string().uuid(),
}, async ({ item_id }) => {
  if (!supabase) throw new Error("Supabase not configured");
  const { data: item, error: itemErr } = await supabase.from('prep_plan_items').update({ is_done: true, done_at: new Date().toISOString() }).eq('id', item_id).select('plan_id, ingredient_name, prep_amount, unit').single();
  if (itemErr || !item) return { content: [{ type: 'text', text: `Error: Prep item not found.` }], isError: true };
  const { data: allItems } = await supabase.from('prep_plan_items').select('is_done').eq('plan_id', item.plan_id);
  const total = allItems?.length ?? 1;
  const done = allItems?.filter((r: any) => r.is_done).length ?? 1;
  const allDone = done === total;
  const markdown = ['### Prep Item Completed', `✅ Marked **${item.ingredient_name}** done (+${item.prep_amount}${item.unit}).`, `**Progress**: ${done}/${total} items complete.`, allDone ? '🎉 All items done — shift prep complete!' : ''].filter(Boolean).join('\n');
  return { content: [{ type: 'text', text: formatDualOutput(markdown, { item_id, plan_id: item.plan_id, progress: { completed: done, total, all_done: allDone } }) }] };
});

server.tool('get_mise_en_place', 'Get a formatted mise en place checklist for a recipe.', {
  recipe_id: z.string().uuid(),
  target_base_weight: z.number().positive(),
  user_id: z.string().uuid().optional(),
}, async ({ recipe_id, target_base_weight, user_id }) => {
  if (!supabase) throw new Error("Supabase not configured");
  const { data: recipe, error: recipeErr } = await supabase.from('recipes').select('*').eq('id', recipe_id).single();
  if (recipeErr || !recipe) return { content: [{ type: 'text', text: `Error: Recipe not found.` }], isError: true };
  const { data: ingredients } = await supabase.from('ingredients').select('*').eq('recipe_id', recipe_id).order('sort_order').order('name');
  if (!ingredients || ingredients.length === 0) return { content: [{ type: 'text', text: `Error: Recipe has no ingredients.` }], isError: true };
  const items = ingredients.map((ing: any) => ({ ingredient_name: ing.name, scaled_amount: Math.round(Number(ing.ratio) * target_base_weight * 100) / 100, unit: ing.unit ?? 'g' }));
  const checklistMarkdown = items.map((item: any) => `- [ ] **${item.ingredient_name}**: ${item.scaled_amount}${item.unit}`).join('\n');
  const markdown = [`### Mise en Place — ${recipe.name}`, `**Target Base**: ${target_base_weight}${recipe.yield_unit ?? 'g'} ${recipe.base_ingredient}`, '', checklistMarkdown].join('\n');
  return { content: [{ type: 'text', text: formatDualOutput(markdown, { recipe_id: recipe.id, items }) }] };
});

server.tool('project_batch_size', 'Project the batch size needed to serve a given number of covers.', {
  portion_weight: z.number().positive(),
  covers: z.number().int().min(1),
  waste_factor: z.number().min(1).max(3).optional().default(1.1),
}, async ({ portion_weight, covers, waste_factor }) => {
  const wf = waste_factor ?? 1.1;
  const rawBatch = portion_weight * covers;
  const bufferedBatch = rawBatch * wf; // Simple implementation without prep-engine
  const markdown = ['### Batch Size Projection', `- **Covers**: ${covers}`, `- **Portion Weight**: ${portion_weight}g`, `- **Recommended Buffered Batch**: **${bufferedBatch.toFixed(1)}g**`].join('\n');
  return { content: [{ type: 'text', text: formatDualOutput(markdown, { covers, portion_weight, buffered_batch: bufferedBatch }) }] };
});

server.tool('update_stock', 'Update the current stock level for a par item.', {
  user_id: z.string().uuid(),
  ingredient_name: z.string().min(1),
  current_stock: z.number().min(0),
}, async ({ user_id, ingredient_name, current_stock }) => {
  if (!supabase) throw new Error("Supabase not configured");
  const { error, count } = await supabase.from('par_levels').update({ current_stock }, { count: 'exact' }).eq('user_id', user_id).ilike('ingredient_name', ingredient_name);
  if (error || !count) return { content: [{ type: 'text', text: `Error updating stock.` }], isError: true };
  return { content: [{ type: 'text', text: formatDualOutput(`Updated stock for **${ingredient_name}** to **${current_stock}**.`, { user_id, ingredient_name, current_stock }) }] };
});

server.tool('list_vendors', 'List registered food vendors and suppliers.', {
  user_id: z.string().uuid(),
}, async ({ user_id }) => {
  if (!supabase) throw new Error("Supabase not configured");
  const { data: vendors, error: vErr } = await supabase.from('vendors').select('*').eq('user_id', user_id).order('name');
  if (vErr) return { content: [{ type: 'text', text: `Error fetching vendors.` }], isError: true };
  const rows = vendors ?? [];
  const markdown = [`### Registered Vendors (${rows.length})`, ...rows.map((v: any) => `- **${v.name}** (${v.contact_name || 'No contact'})`)].join('\n');
  return { content: [{ type: 'text', text: formatDualOutput(markdown, rows) }] };
});

server.tool('get_order_guide', 'Generate an aggregated vendor order guide.', {
  user_id: z.string().uuid(),
}, async ({ user_id }) => {
  if (!supabase) throw new Error("Supabase not configured");
  const { data: parLevels } = await supabase.from('par_levels').select('*').eq('user_id', user_id);
  const belowPar = (parLevels ?? []).filter((p: any) => Number(p.current_stock) < Number(p.par_amount)).map((p: any) => ({ ingredient_name: p.ingredient_name, to_order: Number(p.par_amount) - Number(p.current_stock), unit: p.unit }));
  const markdown = [`### Vendor Order Guide`, ...belowPar.map((b: any) => `- **${b.ingredient_name}**: Need **+${b.to_order} ${b.unit}**`)].join('\n');
  return { content: [{ type: 'text', text: formatDualOutput(markdown, belowPar) }] };
});

server.tool('get_expiring_inventory', 'Get inventory batches expiring within a specified number of days.', {
  user_id: z.string().uuid(),
  days: z.number().int().min(1).default(3),
}, async ({ user_id, days }) => {
  if (!supabase) throw new Error("Supabase not configured");
  const targetDate = new Date(); targetDate.setDate(targetDate.getDate() + days);
  const targetStr = targetDate.toISOString().split('T')[0];
  const { data: batches } = await supabase.from('inventory_batches').select('*').eq('user_id', user_id).lte('expiration_date', targetStr).order('expiration_date');
  const rows = batches ?? [];
  const markdown = [`### Expiring Inventory Batches`, ...rows.map((b: any) => `- **${b.ingredient_name}**: ${b.quantity} ${b.unit} (Exp: **${b.expiration_date}**)` )].join('\n');
  return { content: [{ type: 'text', text: formatDualOutput(markdown, rows) }] };
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("KitchenKit KDS MCP Server running on STDIO");
}

main().catch((err) => {
  console.error("Fatal error starting KitchenKit MCP Server:", err);
  process.exit(1);
});
