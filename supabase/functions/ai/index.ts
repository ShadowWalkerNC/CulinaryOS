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

  // Auth
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
    });
  }
  const jwt = authHeader.replace('Bearer ', '');

  // Lookup versioned prompt template
  const template = PROMPT_LIBRARY[promptName];
  if (!template) {
    return new Response(JSON.stringify({ error: 'Unknown prompt' }), {
      status: 404,
    });
  }

  const inputs = await req.json();

  // Build prompts from template
  const systemPrompt = template.buildSystemPrompt(inputs);
  const userMessage = template.buildUserMessage(inputs);

  // Call Anthropic claude-sonnet-4-6
  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: systemPrompt,
    messages: [{ role: 'user', content: userMessage }],
  });

  const output =
    message.content[0].type === 'text' ? message.content[0].text : '';

  // Audit log — append only
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );
  await supabase.from('ai_prompt_log').insert({
    prompt_name: promptName,
    prompt_version: template.version,
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
