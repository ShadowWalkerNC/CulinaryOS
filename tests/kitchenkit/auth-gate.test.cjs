const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const { runInNewContext } = require('node:vm');
const ts = require('typescript');

function component(relative, state) {
  const code = ts.transpileModule(readFileSync(resolve(__dirname, '../../apps/kitchenkit/src', relative), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const navigation = [];
  const location = { pathname: '/recipes' };
  const modules = {
    react: { useEffect: effect => effect() },
    'react/jsx-runtime': { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }), Fragment: 'fragment' },
    'react-router-dom': { Navigate: 'redirect', useLocation: () => location, useNavigate: () => (...args) => navigation.push(args) },
    '@/context/AuthContext': { useAuth: () => state },
    '@/components/ui/FullScreenSpinner': { default: 'spinner' },
  };
  const exports = {};
  runInNewContext(code, { exports, require: name => {
    if (!(name in modules)) throw new Error(`Unexpected component dependency: ${name}`);
    return modules[name];
  } });
  return { render: exports.default, navigation, location };
}
test('protected children stay hidden during loading', () => {
  const c = component('components/auth/RequireAuth.tsx', { session: null, loading: true, error: null });
  assert.equal(c.render({ children: 'private-content' }).type, 'spinner');
});
test('no session redirects to login and retains the attempted location', () => {
  const c = component('components/auth/RequireAuth.tsx', { session: null, loading: false, error: null });
  const result = c.render({ children: 'private-content' });
  assert.equal(result.type, 'redirect');
  assert.equal(result.props.to, '/login');
  assert.equal(result.props.state.from, c.location);
  assert.equal(result.props.replace, true);
});
test('unavailable authentication renders an error instead of protected children', () => {
  const c = component('components/auth/RequireAuth.tsx', { session: null, loading: false, error: 'Unavailable' });
  const result = c.render({ children: 'private-content' });
  assert.equal(result.props.role, 'alert');
  assert.doesNotMatch(JSON.stringify(result), /private-content/);
});
test('a session permits protected children', () => {
  const c = component('components/auth/RequireAuth.tsx', { session: { user: { id: 'test' } }, loading: false, error: null });
  assert.equal(c.render({ children: 'private-content' }).props.children, 'private-content');
});
test('callback waits for hydration, routes real session correctly and fails visibly', () => {
  for (const state of [
    { session: null, loading: true, error: null },
    { session: null, loading: false, error: null },
    { session: { user: { id: 'test' } }, loading: false, error: null },
    { session: null, loading: false, error: 'Unavailable' },
  ]) {
    const c = component('pages/AuthCallbackPage.tsx', state);
    const result = c.render();
    if (state.loading || state.error) assert.equal(c.navigation.length, 0);
    else assert.equal(c.navigation[0][0], state.session ? '/dashboard' : '/login');
    if (state.error) assert.equal(result.props.role, 'alert');
  }
});

function magicLink(configured, send) {
  const code = ts.transpileModule(readFileSync(resolve(__dirname, '../../apps/kitchenkit/src/lib/auth.ts'), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const exports = {};
  runInNewContext(code, { exports, window: { location: { origin: 'https://test.invalid' } }, require: name => {
    assert.equal(name, './supabase');
    return { configuredSupabase: configured, supabase: { auth: { signInWithOtp: send } } };
  } });
  return exports.signInWithMagicLink;
}
test('missing configuration does not attempt to send a sign-in link', async () => {
  const result = await magicLink(null, () => { throw new Error('must not be called'); })('chef@test.invalid');
  assert.match(result.error, /not configured/);
});
test('rejected sign-in request returns an actionable error', async () => {
  const result = await magicLink({}, async () => { throw new Error('private diagnostic'); })('chef@test.invalid');
  assert.equal(result.error, 'The sign-in link could not be sent. Please try again.');
});
test('configured sign-in retains the existing callback and email contract', async () => {
  let request;
  const result = await magicLink({}, async value => { request = value; return { error: null }; })('chef@test.invalid');
  assert.equal(result.error, null);
  assert.equal(request.email, 'chef@test.invalid');
  assert.equal(request.options.emailRedirectTo, 'https://test.invalid/auth/callback');
});

function loginPageRender() {
  const code = ts.transpileModule(readFileSync(resolve(__dirname, '../../apps/kitchenkit/src/pages/LoginPage.tsx'), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const modules = {
    react: { useState: initial => [initial, () => {}] },
    'react/jsx-runtime': { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }), Fragment: 'fragment' },
    'lucide-react': { ChefHat: 'chef-hat', MailCheck: 'mail-check' },
    '@culinaryos/ui': { Button: 'button' },
    '@/lib/auth': { signInWithMagicLink: async () => ({ error: null }) },
  };
  const exports = {};
  runInNewContext(code, { exports, require: name => {
    if (!(name in modules)) throw new Error(`Unexpected LoginPage dependency: ${name}`);
    return modules[name];
  } });
  return exports.default();
}

function supabaseSource() {
  return readFileSync(resolve(__dirname, '../../apps/kitchenkit/src/lib/supabase.ts'), 'utf8');
}

function loadSupabase(env, createClient) {
  const patched = supabaseSource().split('import.meta.env').join('__KITCHENKIT_ENV__');
  const code = ts.transpileModule(patched, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const exports = {};
  runInNewContext(code, { exports, __KITCHENKIT_ENV__: env, require: name => {
    assert.equal(name, '@supabase/supabase-js');
    return { createClient };
  } });
  return exports;
}

function authModule(configured) {
  const code = ts.transpileModule(readFileSync(resolve(__dirname, '../../apps/kitchenkit/src/lib/auth.ts'), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const exports = {};
  runInNewContext(code, { exports, window: { location: { origin: 'https://test.invalid' } }, require: name => {
    assert.equal(name, './supabase');
    return { configuredSupabase: configured, supabase: { auth: {
      signOut: () => { throw new Error('signOut must not touch supabase.auth'); },
      getSession: () => { throw new Error('getSession must not touch supabase.auth'); },
    } } };
  } });
  return exports;
}

test('error alert offers no demo bypass and references no demo session flag', () => {
  const c = component('components/auth/RequireAuth.tsx', { session: null, loading: false, error: 'Unavailable' });
  const rendered = JSON.stringify(c.render({ children: 'private-content' }));
  assert.doesNotMatch(rendered, /demo mode/i);
  assert.doesNotMatch(rendered, /culinaryos_kitchenkit_demo_session/);
  const source = readFileSync(resolve(__dirname, '../../apps/kitchenkit/src/components/auth/RequireAuth.tsx'), 'utf8');
  assert.doesNotMatch(source, /culinaryos_kitchenkit_demo_session/);
  assert.doesNotMatch(source, /Enter Local Demo Mode/);
  assert.match(source, /Return to sign in/);
});

test('login page offers no demo bypass and keeps the magic-link helper', () => {
  const rendered = JSON.stringify(loginPageRender());
  assert.doesNotMatch(rendered, /demo mode/i);
  assert.doesNotMatch(rendered, /or local demo/i);
  assert.doesNotMatch(rendered, /culinaryos_kitchenkit_demo_session/);
  assert.match(rendered, /No password required/);
  const source = readFileSync(resolve(__dirname, '../../apps/kitchenkit/src/pages/LoginPage.tsx'), 'utf8');
  assert.doesNotMatch(source, /culinaryos_kitchenkit_demo_session/);
  assert.doesNotMatch(source, /Enter Demo Mode/);
  assert.match(source, /No password required\. We'll email you a one-click sign-in link\./);
});

test('unconfigured supabase module loads closed with no mocks or non-null assertions', () => {
  const source = supabaseSource();
  assert.doesNotMatch(source, /!\./);
  assert.doesNotMatch(source, /mock/i);
  assert.doesNotMatch(source, /MOCK_/);
  const mod = loadSupabase({}, () => { throw new Error('createClient must not be called'); });
  assert.strictEqual(mod.configuredSupabase, null);
});

test('unconfigured supabase accessors throw instead of serving mock data', () => {
  const mod = loadSupabase({}, () => { throw new Error('createClient must not be called'); });
  assert.throws(() => mod.supabase.auth, /authentication is not configured/);
  assert.throws(() => mod.supabase.from('recipes'), /authentication is not configured/);
});

test('configured supabase delegates auth and queries to the real client', () => {
  const env = { VITE_SUPABASE_URL: 'https://test.supabase.co', VITE_SUPABASE_ANON_KEY: 'test-anon-key' };
  const fromCalls = [];
  const fakeClient = {
    auth: { sentinel: 'real-auth' },
    from(table) { fromCalls.push(table); return { table }; },
  };
  let seen;
  const mod = loadSupabase(env, (url, key) => { seen = { url, key }; return fakeClient; });
  assert.strictEqual(mod.configuredSupabase, fakeClient);
  assert.deepEqual(seen, { url: env.VITE_SUPABASE_URL, key: env.VITE_SUPABASE_ANON_KEY });
  assert.strictEqual(mod.supabase.auth, fakeClient.auth);
  assert.deepEqual(mod.supabase.from('recipes'), { table: 'recipes' });
  assert.deepEqual(fromCalls, ['recipes']);
});

test('signOut and getSession fail closed when unconfigured', async () => {
  const auth = authModule(null);
  assert.strictEqual(await auth.signOut(), undefined);
  assert.strictEqual(await auth.getSession(), null);
  const source = readFileSync(resolve(__dirname, '../../apps/kitchenkit/src/lib/auth.ts'), 'utf8');
  assert.match(source, /if \(!configuredSupabase\) return;/);
  assert.match(source, /if \(!configuredSupabase\) return null;/);
});
