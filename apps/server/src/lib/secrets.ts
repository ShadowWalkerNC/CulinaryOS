/** Treat placeholder env values as unset so demo/mock paths stay available. */
export { isPlaceholderSecret } from '@culinaryos/shared';
import { isPlaceholderSecret } from '@culinaryos/shared';

export function isLiveSupabaseConfigured(): boolean {
  const url = process.env.SUPABASE_URL ?? '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
  return Boolean(url && key && !isPlaceholderSecret(url) && !isPlaceholderSecret(key));
}
