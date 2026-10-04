import { test } from 'node:test';
import assert from 'node:assert/strict';
import { observeAuth, type AuthClient, type AuthState } from '../../apps/kitchenkit/src/lib/auth-state.ts';
import type { Session } from '@supabase/supabase-js';

const session: Session = {
  access_token: 'test-only', refresh_token: 'test-only', expires_in: 3600, token_type: 'bearer',
  user: { id: 'test-user', app_metadata: {}, user_metadata: {}, aud: 'authenticated', created_at: '2026-10-04' },
};
function fixture() {
  type Result = Awaited<ReturnType<AuthClient['auth']['getSession']>>;
  let resolve!: (value: Result) => void;
  let reject!: (error: Error) => void;
  const pending = new Promise<Result>((yes, no) => { resolve = yes; reject = no; });
  let callback: Parameters<AuthClient['auth']['onAuthStateChange']>[0] = () => {};
  let unsubscribed = false;
  const client: AuthClient = { auth: {
    getSession: () => pending,
    onAuthStateChange: cb => {
      callback = cb;
      return { data: { subscription: { id: 'test', callback: cb, unsubscribe: () => { unsubscribed = true; } } } };
    },
  } };
  const states: AuthState[] = [];
  return { client, states, resolve, reject,
    publish: (state: AuthState) => states.push(state),
    emit: (value: Session | null) => callback(value ? 'SIGNED_IN' : 'SIGNED_OUT', value),
    get unsubscribed() { return unsubscribed; },
  };
}
const flush = () => new Promise<void>(resolve => setImmediate(resolve));

test('missing configuration finishes loading without creating a session', () => {
  const states: AuthState[] = [];
  observeAuth(null, value => states.push(value))();
  assert.equal(states[0]?.session, null);
  assert.equal(states[0]?.loading, false);
  assert.match(states[0]?.error ?? '', /not configured/);
});
test('empty hydration remains unauthenticated', async t => {
  const f = fixture(); t.after(observeAuth(f.client, f.publish));
  f.resolve({ data: { session: null }, error: null }); await flush();
  assert.deepEqual(f.states.at(-1), { session: null, loading: false, error: null });
});
test('valid hydration is retained and logout removes it', async t => {
  const f = fixture(); t.after(observeAuth(f.client, f.publish));
  f.resolve({ data: { session }, error: null }); await flush();
  assert.equal(f.states.at(-1)?.session, session);
  await f.emit(null);
  assert.deepEqual(f.states.at(-1), { session: null, loading: false, error: null });
});
test('logout beats a stale successful hydration', async t => {
  const f = fixture(); t.after(observeAuth(f.client, f.publish));
  await f.emit(null);
  f.resolve({ data: { session }, error: null }); await flush();
  assert.equal(f.states.length, 1);
  assert.equal(f.states[0]?.session, null);
});
test('new sign-in beats a stale empty hydration', async t => {
  const f = fixture(); t.after(observeAuth(f.client, f.publish));
  await f.emit(session);
  f.resolve({ data: { session: null }, error: null }); await flush();
  assert.equal(f.states.at(-1)?.session, session);
});
test('rejected hydration fails closed without exposing provider error text', async t => {
  const f = fixture(); t.after(observeAuth(f.client, f.publish));
  f.reject(new Error('private provider diagnostic')); await flush();
  assert.equal(f.states.at(-1)?.session, null);
  assert.equal(f.states.at(-1)?.loading, false);
  assert.equal(f.states.at(-1)?.error, 'Sign-in could not be checked. Please try again.');
});
test('timeout terminates loading and ignores a delayed session', async t => {
  const f = fixture(); t.after(observeAuth(f.client, f.publish, 5));
  await new Promise(resolve => setTimeout(resolve, 20));
  assert.equal(f.states.at(-1)?.session, null);
  assert.equal(f.states.at(-1)?.loading, false);
  assert.ok(f.states.at(-1)?.error);
  f.resolve({ data: { session }, error: null }); await flush();
  assert.equal(f.states.length, 1);
});
test('unmount unsubscribes and ignores hydration and callbacks', async () => {
  const f = fixture(); observeAuth(f.client, f.publish)();
  f.resolve({ data: { session }, error: null }); await f.emit(session); await flush();
  assert.equal(f.unsubscribed, true);
  assert.equal(f.states.length, 0);
});

test('synchronous subscription failure finishes loading without a session', () => {
  const f = fixture();
  f.client.auth.onAuthStateChange = () => { throw new Error('subscription failed'); };
  observeAuth(f.client, f.publish)();
  assert.equal(f.states.at(-1)?.session, null);
  assert.equal(f.states.at(-1)?.loading, false);
  assert.ok(f.states.at(-1)?.error);
});

test('a synchronous hydration failure cannot overwrite an observed sign-in', () => {
  const f = fixture();
  const subscribe = f.client.auth.onAuthStateChange;
  f.client.auth.onAuthStateChange = cb => { const subscription = subscribe(cb); void cb('SIGNED_IN', session); return subscription; };
  f.client.auth.getSession = () => { throw new Error('hydration failed'); };
  observeAuth(f.client, f.publish)();
  assert.equal(f.states.at(-1)?.session, session);
  assert.equal(f.states.at(-1)?.error, null);
});
