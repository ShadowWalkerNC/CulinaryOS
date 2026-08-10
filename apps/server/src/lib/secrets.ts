/** Treat placeholder env values as unset so demo/mock paths stay available. */

export function isPlaceholderSecret(value: string | undefined | null): boolean {
  if (!value) return true;
  const v = value.trim().toLowerCase();
  if (!v) return true;
  return (
    v.includes('your-project') ||
    v.includes('your-service-role') ||
    v.includes('your-anon-key') ||
    v.includes('your-supabase') ||
    v.includes('placeholder') ||
    v === 'changeme' ||
    v.startsWith('change-me') ||
    v.startsWith('sk_test_51placeholder')
  );
}

export function isLiveSupabaseConfigured(): boolean {
  const url = process.env.SUPABASE_URL ?? '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
  return Boolean(url && key && !isPlaceholderSecret(url) && !isPlaceholderSecret(key));
}
