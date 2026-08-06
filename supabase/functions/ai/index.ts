import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import Anthropic from 'https://esm.sh/@anthropic-ai/sdk@0.20.1';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { PROMPT_LIBRARY } from '../_shared/prompt_library.ts';

const anthropic = new Anthropic({
  apiKey: Deno.env.get('ANTHROPIC_API_KEY')!,
});

serve(async (req) => {
  const url = new URL(req.url);
  const segments = url.pathname.split('/').filter(Boolean);
  const promptName = segments[segments.length - 1];

  // Auth — require and VERIFY JWT
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  const jwt = authHeader.replace('Bearer ', '');

  const supabaseUser = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: `Bearer ${jwt}` } } },
  );

  const { data: userData, error: userErr } = await supabaseUser.auth.getUser(jwt);
  if (userErr || !userData?.user) {
    return new Response(JSON.stringify({ error: 'Invalid or expired token' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const template = PROMPT_LIBRARY[promptName];
  if (!template) {
    return new Response(JSON.stringify({ error: 'Unknown prompt' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const inputs = await req.json();

  // Resolve company/tenant from membership — never trust client-only scope
  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const claimedTenant =
    (typeof inputs.company_id === 'string' && inputs.company_id) ||
    (typeof inputs.tenant_id === 'string' && inputs.tenant_id) ||
    null;

  let companyId: string | null = claimedTenant;
  if (claimedTenant) {
    const { data: membership } = await admin
      .from('tenant_users')
      .select('tenant_id')
      .eq('user_id', userData.user.id)
      .eq('tenant_id', claimedTenant)
      .maybeSingle();
    if (!membership) {
      return new Response(JSON.stringify({ error: 'Forbidden for tenant' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  } else {
    const { data: membership } = await admin
      .from('tenant_users')
      .select('tenant_id')
      .eq('user_id', userData.user.id)
      .limit(1)
      .maybeSingle();
    companyId = membership?.tenant_id ?? null;
  }

  const systemPrompt = template.buildSystemPrompt(inputs);
  const userMessage = template.buildUserMessage(inputs);

  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: systemPrompt,
    messages: [{ role: 'user', content: userMessage }],
  });

  const output =
    message.content[0].type === 'text' ? message.content[0].text : '';

  await admin.from('ai_prompt_log').insert({
    prompt_name: promptName,
    prompt_version: template.version,
    company_id: companyId,
    user_id: userData.user.id,
    inputs,
    raw_output: output,
    review_status: 'pending',
    created_at: new Date().toISOString(),
  });

  return new Response(
    JSON.stringify({
      prompt_version: template.version,
      inputs,
      output,
    }),
    { headers: { 'Content-Type': 'application/json' } },
  );
});
