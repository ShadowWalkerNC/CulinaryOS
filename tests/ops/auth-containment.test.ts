import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { configuredSupabase, isOffline, supabase } from '../../apps/ops/src/lib/supabase.js';
import { observeOpsSession, type OpsSessionState } from '../../apps/ops/src/hooks/useSession.js';

const UNCONFIGURED = 'Sign-in is unavailable: authentication is not configured.';
const CHECK_FAILED = 'Sign-in could not be checked. Please try again.';
const STALE_KEY = 'culinaryos_ops_demo_session';

function resolveRoot() {
  try {
    const here = path.dirname(fileURLToPath(import.meta.url));
    const candidate = path.resolve(here, '..', '..');
    if (fs.existsSync(path.join(candidate, 'apps', 'ops', 'src', 'lib', 'supabase.ts'))) return candidate;
  } catch {}
  return process.cwd();
}
const ROOT = resolveRoot();
const SUPABASE_PATH = path.join(ROOT, 'apps', 'ops', 'src', 'lib', 'supabase.ts');
const SESSION_PATH = path.join(ROOT, 'apps', 'ops', 'src', 'hooks', 'useSession.ts');
const LOGIN_PATH = path.join(ROOT, 'apps', 'ops', 'src', 'pages', 'LoginPage.tsx');

const supabaseSrc = fs.readFileSync(SUPABASE_PATH, 'utf8');
const sessionSrc = fs.readFileSync(SESSION_PATH, 'utf8');
const loginSrc = fs.readFileSync(LOGIN_PATH, 'utf8');

function tick(ms = 0) {
  return new Promise((r) => setTimeout(r, ms));
}

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

function installMockStorage(initial) {
  const store = new Map();
  if (initial) {
    for (const k of Object.keys(initial)) store.set(k, String(initial[k]));
  }
  const mock = {
    getItem(k) { return store.has(k) ? store.get(k) : null; },
    setItem(k, v) { store.set(k, String(v)); },
    removeItem(k) { store.delete(k); },
  };
  const prev = globalThis.localStorage;
  const hadPrev = Object.prototype.hasOwnProperty.call(globalThis, 'localStorage');
  globalThis.localStorage = mock;
  return {
    mock,
    restore() {
      if (!hadPrev) delete globalThis.localStorage;
      else globalThis.localStorage = prev;
    },
  };
}

function makeSession() {
  return {
    access_token: 'test-token',
    refresh_token: 'test-refresh',
    expires_in: 3600,
    token_type: 'bearer',
    user: {
      id: 'user-1',
      app_metadata: {},
      user_metadata: {},
      aud: 'authenticated',
      created_at: new Date().toISOString(),
      email: 'test@example.com',
    },
  };
}

function createMockClient(getSessionImpl) {
  let cb = null;
  let unsubscribed = false;
  const client = {
    auth: {
      getSession: getSessionImpl,
      onAuthStateChange(handler) {
        cb = handler;
        return { data: { subscription: { unsubscribe() { unsubscribed = true; } } } };
      },
    },
    emit(event, session) { if (cb) cb(event, session); },
    wasUnsubscribed() { return unsubscribed; },
  };
  return client;
}

describe('P06-AUTH-02 ops auth containment', () => {
  it('1. unconfigured supabase loads closed and getters throw', () => {
    assert.ok(!supabaseSrc.includes('anon-key-placeholder'), 'must not contain anon-key-placeholder');
    assert.ok(!supabaseSrc.includes("url ?? 'http://localhost:54321'"), 'must not contain localhost fallback');
    assert.ok(!supabaseSrc.includes("key ?? 'anon-key-placeholder'"), 'must not contain key fallback');
    assert.ok(supabaseSrc.includes("url && key && !url.includes('your-project')"), 'must guard createClient');
    assert.ok(supabaseSrc.includes('createClient(url, key)'), 'must create client only when configured');
    assert.ok(supabaseSrc.includes('try') && supabaseSrc.includes('catch'), 'must wrap in try/catch');
    assert.ok(supabaseSrc.includes('configuredSupabase'), 'must export configuredSupabase');
    assert.ok(supabaseSrc.includes('isOffline'), 'must export isOffline');
    assert.ok(supabaseSrc.includes('function requireClient()'), 'must define requireClient');
    assert.ok(supabaseSrc.includes(UNCONFIGURED), 'must throw unconfigured message');
    assert.ok(supabaseSrc.includes('get auth()'), 'must expose auth getter');
    assert.ok(supabaseSrc.includes('requireClient().auth'), 'auth getter must go through requireClient');
    assert.ok(supabaseSrc.includes('get from()'), 'must expose from getter');
    assert.ok(supabaseSrc.includes('client.from.bind(client)'), 'from getter must bind requireClient');
    const postfixBang = supabaseSrc.match(/[\w)\]]!(?!=)/g);
    assert.equal(postfixBang, null, `zero non-null assertions, found: ${JSON.stringify(postfixBang)}`);

    assert.equal(configuredSupabase, null);
    assert.equal(isOffline, true);
    assert.throws(() => supabase.auth, { message: UNCONFIGURED });
    assert.throws(() => supabase.from, { message: UNCONFIGURED });
  });

  it('2. observeOpsSession(null) finishes loading immediately', () => {
    const states = [];
    const cleanup = observeOpsSession(null, (s) => states.push(s));
    assert.equal(typeof cleanup, 'function');
    assert.equal(states.length, 1);
    assert.deepEqual(states[0], { session: null, loading: false, error: UNCONFIGURED });
    cleanup();
  });

  it('3a. stale demo key is scrubbed when unconfigured', () => {
    const storage = installMockStorage({ [STALE_KEY]: 'true' });
    try {
      assert.equal(globalThis.localStorage.getItem(STALE_KEY), 'true');
      const states = [];
      const cleanup = observeOpsSession(null, (s) => states.push(s));
      assert.equal(globalThis.localStorage.getItem(STALE_KEY), null);
      assert.equal(states.length, 1);
      assert.equal(states[0].session, null);
      assert.equal(states[0].loading, false);
      assert.equal(states[0].error, UNCONFIGURED);
      cleanup();
    } finally {
      storage.restore();
    }
  });

  it('3b. stale demo key cannot grant a session when getSession returns null', async () => {
    const storage = installMockStorage({ [STALE_KEY]: 'true' });
    try {
      const client = createMockClient(() => Promise.resolve({ data: { session: null }, error: null }));
      const states = [];
      const cleanup = observeOpsSession(client, (s) => states.push(s), 1000);
      assert.equal(globalThis.localStorage.getItem(STALE_KEY), null);
      await tick(10);
      assert.ok(states.length >= 1);
      for (const s of states) assert.equal(s.session, null);
      assert.equal(states[states.length - 1].loading, false);
      cleanup();
    } finally {
      storage.restore();
    }
  });

  it('4. valid hydration is retained and SIGNED_OUT clears it', async () => {
    const session = makeSession();
    const client = createMockClient(() => Promise.resolve({ data: { session }, error: null }));
    const states = [];
    const cleanup = observeOpsSession(client, (s) => states.push(s), 1000);
    await tick(10);
    assert.ok(states.length >= 1);
    assert.equal(states[states.length - 1].session, session);
    assert.equal(states[states.length - 1].loading, false);
    assert.equal(states[states.length - 1].error, null);
    client.emit('SIGNED_OUT', null);
    assert.equal(states[states.length - 1].session, null);
    assert.equal(states[states.length - 1].loading, false);
    cleanup();
  });

  it('5. logout race beats a stale successful getSession hydration', async () => {
    const session = makeSession();
    const d = deferred();
    const client = createMockClient(() => d.promise);
    const states = [];
    const cleanup = observeOpsSession(client, (s) => states.push(s), 1000);
    client.emit('SIGNED_OUT', null);
    assert.equal(states.length, 1);
    assert.equal(states[0].session, null);
    d.resolve({ data: { session }, error: null });
    await tick(10);
    assert.equal(states.length, 1);
    assert.equal(states[0].session, null);
    cleanup();
  });

  it('6. new sign-in beats a stale empty getSession hydration', async () => {
    const session = makeSession();
    const d = deferred();
    const client = createMockClient(() => d.promise);
    const states = [];
    const cleanup = observeOpsSession(client, (s) => states.push(s), 1000);
    client.emit('SIGNED_IN', session);
    assert.equal(states.length, 1);
    assert.equal(states[0].session, session);
    d.resolve({ data: { session: null }, error: null });
    await tick(10);
    assert.equal(states.length, 1);
    assert.equal(states[0].session, session);
    cleanup();
  });

  it('7a. rejected hydration fails closed without raw provider text', async () => {
    const raw = 'Auth session missing! expired-token-xyz';
    const client = createMockClient(() => Promise.reject(new Error(raw)));
    const states = [];
    const cleanup = observeOpsSession(client, (s) => states.push(s), 1000);
    await tick(10);
    assert.equal(states.length, 1);
    assert.equal(states[0].session, null);
    assert.equal(states[0].loading, false);
    assert.equal(states[0].error, CHECK_FAILED);
    assert.ok(!states[0].error.includes('expired-token-xyz'));
    assert.ok(!states[0].error.includes('Auth session missing'));
    cleanup();
  });

  it('7b. expired-session error fails closed without raw provider text', async () => {
    const client = createMockClient(() => Promise.resolve({ data: { session: null }, error: { message: 'invalid JWT: expired totp-secret-123' } }));
    const states = [];
    const cleanup = observeOpsSession(client, (s) => states.push(s), 1000);
    await tick(10);
    assert.equal(states.length, 1);
    assert.equal(states[0].session, null);
    assert.equal(states[0].loading, false);
    assert.equal(states[0].error, CHECK_FAILED);
    assert.ok(!states[0].error.includes('expired'));
    assert.ok(!states[0].error.includes('totp-secret-123'));
    cleanup();
  });

  it('8. timeout terminates loading and ignores delayed hydration', async () => {
    const session = makeSession();
    const d = deferred();
    const client = createMockClient(() => d.promise);
    const states = [];
    const cleanup = observeOpsSession(client, (s) => states.push(s), 20);
    assert.equal(states.length, 0);
    await tick(50);
    assert.equal(states.length, 1);
    assert.deepEqual(states[0], { session: null, loading: false, error: CHECK_FAILED });
    d.resolve({ data: { session }, error: null });
    await tick(10);
    assert.equal(states.length, 1);
    cleanup();
  });

  it('9. unmount unsubscribes and ignores late hydration/callbacks', async () => {
    const session = makeSession();
    const d = deferred();
    const client = createMockClient(() => d.promise);
    const states = [];
    const cleanup = observeOpsSession(client, (s) => states.push(s), 30);
    cleanup();
    assert.equal(client.wasUnsubscribed(), true);
    d.resolve({ data: { session }, error: null });
    client.emit('SIGNED_IN', session);
    await tick(50);
    assert.equal(states.length, 0);
  });

  it('10. source contract: demo bypass removed, a11y preserved', () => {
    for (const [name, src] of [['supabase.ts', supabaseSrc], ['useSession.ts', sessionSrc], ['LoginPage.tsx', loginSrc]]) {
      assert.ok(!src.includes('MOCK_OPS_SESSION'), `${name} must not contain MOCK_OPS_SESSION`);
      assert.ok(!src.includes('handleDemoLogin'), `${name} must not contain handleDemoLogin`);
      assert.ok(!src.includes('Enter Demo Mode'), `${name} must not contain Enter Demo Mode`);
      assert.ok(!src.includes('anon-key-placeholder'), `${name} must not contain anon-key-placeholder`);
    }
    assert.ok(loginSrc.includes('aria-label="Email address"'), 'LoginPage must preserve Email address label');
    assert.ok(loginSrc.includes('role="alert"'), 'LoginPage must preserve role=alert');
    assert.ok(loginSrc.includes('autoComplete="email"'), 'LoginPage must preserve autoComplete=email');
    assert.ok(loginSrc.includes('Send Magic Link'), 'LoginPage must preserve Send Magic Link');
    assert.ok(!loginSrc.includes('Local Development & Demo'), 'LoginPage demo block removed');
    assert.ok(!loginSrc.includes('Or Supabase Magic Link'), 'LoginPage divider removed');
    assert.ok(!loginSrc.includes('You can use Demo Mode below.'), 'LoginPage demo hint removed');
    assert.ok(loginSrc.includes('configuredSupabase'), 'LoginPage must gate on configuredSupabase');
    assert.ok(loginSrc.indexOf('!configuredSupabase') !== -1 && loginSrc.indexOf('!configuredSupabase') < loginSrc.indexOf('signInWithOtp'), 'LoginPage must return before signInWithOtp when unconfigured');
    assert.ok(sessionSrc.includes('observeOpsSession'), 'useSession must export observeOpsSession');
    assert.ok(sessionSrc.includes('OpsSessionState'), 'useSession must export OpsSessionState');
    assert.ok(sessionSrc.includes('OpsAuthClient'), 'useSession must export OpsAuthClient');
    assert.ok(sessionSrc.includes('globalThis') && sessionSrc.includes(STALE_KEY), 'observeOpsSession must scrub stale key');
    assert.ok(sessionSrc.includes('if (!client)'), 'observeOpsSession must handle null client');
    assert.ok(sessionSrc.includes('onAuthStateChange'), 'observeOpsSession must subscribe');
    assert.ok(sessionSrc.includes('getSession()'), 'observeOpsSession must hydrate');
  });
});
