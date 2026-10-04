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
