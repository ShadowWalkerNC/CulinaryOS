/* CulinaryOS Intelligence dashboard — vanilla JS, no build. */
const $ = (id) => document.getElementById(id);
const state = { skills: [], agents: [], approvals: [], activeSkill: null };

async function api(path, opts = {}) {
  const res = await fetch(path, {
    headers: { 'content-type': 'application/json' },
    ...opts,
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || `request failed: ${res.status}`);
  return body;
}

function esc(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

function pill(text, cls) {
  return `<span class="pill ${cls}">${esc(text)}</span>`;
}

/* --- Tabs --- */
document.querySelectorAll('.nav-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.nav-btn').forEach((b) => b.classList.remove('active'));
    document.querySelectorAll('.tab').forEach((t) => t.classList.remove('active'));
    btn.classList.add('active');
    $(`tab-${btn.dataset.tab}`).classList.add('active');
    if (btn.dataset.tab === 'approvals') loadApprovals();
  });
});

/* --- Health --- */
async function loadHealth() {
  try {
    const h = await api('/api/health');
    $('modeBadge').textContent = `mode: ${h.mode}`;
    $('versionBadge').textContent = `v${h.version}`;
  } catch {
    $('modeBadge').textContent = 'offline';
  }
}

/* --- Ask --- */
$('askBtn').addEventListener('click', runAsk);
$('askInput').addEventListener('keydown', (e) => { if (e.key === 'Enter') runAsk(); });
$('askExamples').addEventListener('click', (e) => {
  if (e.target.tagName === 'BUTTON') { $('askInput').value = e.target.textContent; runAsk(); }
});

async function runAsk() {
  const text = $('askInput').value.trim();
  if (!text) return;
  const box = $('askResult');
  box.classList.remove('hidden');
  box.innerHTML = 'Routing…';
  try {
    const r = await api('/api/route', { method: 'POST', body: JSON.stringify({ text }) });
    box.innerHTML = `
      <h2>${esc(r.intent)}</h2>
      <div>${pill(r.agent, 'agent')}${pill(`risk: ${r.risk}`, r.risk)}</div>
      <dl class="kv">
        <dt>Context to load</dt><dd>${r.context.length ? r.context.map((c) => pill(c, 'info')).join('') : 'none'}</dd>
        <dt>Confidence</dt><dd><div class="confidence"><div style="width:${Math.round(r.confidence * 100)}%"></div></div></dd>
      </dl>
      <pre>${esc(JSON.stringify(r, null, 2))}</pre>`;
  } catch (err) {
    box.innerHTML = `<span class="err-text">${esc(err.message)}</span>`;
  }
}

/* --- Skills --- */
async function loadSkills() {
  state.skills = await api('/api/skills');
  const sel = $('skillSelect');
  sel.innerHTML = state.skills.map((s) => `<option value="${esc(s.id)}">${esc(s.id)} — ${esc(s.title)}</option>`).join('');
  if (state.skills.length) selectSkill(state.skills[0].id);
}
$('skillSelect').addEventListener('change', (e) => selectSkill(e.target.value));

function selectSkill(id) {
  const s = state.skills.find((x) => x.id === id);
  if (!s) return;
  state.activeSkill = s;
  const detail = $('skillDetail');
  detail.classList.remove('hidden');
  detail.innerHTML = `
    <h2>${esc(s.title)}</h2>
    <p class="lede">${esc(s.description)}</p>
    <div>${pill(s.agent, 'agent')}${pill(`risk: ${s.risk}`, s.risk)}</div>
    <dl class="kv">
      <dt>Permissions</dt><dd>${s.permissions.map((p) => pill(p, 'info')).join('')}</dd>
      <dt>Contracts</dt><dd>${s.requiredTools.map((t) => pill(t, 'info')).join('')}</dd>
      <dt>Outputs</dt><dd>${esc(s.outputs.join(', '))}</dd>
    </dl>
    <details><summary>Instructions</summary><p>${esc(s.instructions)}</p></details>`;
  const form = $('skillForm');
  form.classList.remove('hidden');
  form.innerHTML =
    s.schema.input.map((f) => fieldHtml(f)).join('') +
    `<div class="row"><button type="submit" class="primary">Run skill</button></div>`;
  $('skillResult').classList.add('hidden');
}

function fieldHtml(f) {
  const label = `${esc(f.name)}${f.required ? ' *' : ''}`;
  const hint = f.description ? ` <span class="hint">— ${esc(f.description)}</span>` : '';
  if (f.enum) {
    return `<div class="field"><label>${label}${hint}</label><select name="${esc(f.name)}" ${f.required ? '' : ''}>
      ${f.required ? '' : '<option value="">—</option>'}${f.enum.map((v) => `<option>${esc(v)}</option>`).join('')}</select></div>`;
  }
  if (f.type === 'number') return `<div class="field"><label>${label}${hint}</label><input name="${esc(f.name)}" type="number" step="any"></div>`;
  if (f.type === 'boolean') return `<div class="field"><label>${label}${hint}</label><select name="${esc(f.name)}"><option value="">—</option><option value="true">true</option><option value="false">false</option></select></div>`;
  if (f.type === 'string[]') return `<div class="field"><label>${label} (comma-separated)${hint}</label><input name="${esc(f.name)}" type="text"></div>`;
  return `<div class="field"><label>${label}${hint}</label><input name="${esc(f.name)}" type="text"></div>`;
}

$('skillForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!state.activeSkill) return;
  const input = {};
  for (const f of state.activeSkill.schema.input) {
    const el = e.target.elements[f.name];
    if (!el) continue;
    const raw = el.value;
    if (raw === '' || raw === undefined) continue;
    if (f.type === 'number') input[f.name] = Number(raw);
    else if (f.type === 'boolean') input[f.name] = raw === 'true';
    else if (f.type === 'string[]') input[f.name] = raw.split(',').map((s) => s.trim()).filter(Boolean);
    else input[f.name] = raw;
  }
  await runSkill(state.activeSkill.id, input);
});

async function runSkill(id, input, approvedId) {
  const box = $('skillResult');
  box.classList.remove('hidden');
  box.innerHTML = 'Running…';
  try {
    const r = await api('/api/skills/run', { method: 'POST', body: JSON.stringify({ id, input, approvedId }) });
    let html;
    if (r.approvalRequired) {
      html = `<h2>Approval required</h2><p>${esc(r.summary)}</p>
        <div class="approval-actions">
          <button class="primary" data-approve="${esc(r.approvalId)}" data-skill="${esc(id)}">Approve &amp; resume</button>
          <button class="danger" data-reject="${esc(r.approvalId)}">Reject</button>
        </div>`;
      loadApprovals();
    } else if (!r.ok) {
      html = `<h2>Failed</h2><p class="err-text">${esc(r.error || 'unknown error')}</p>`;
    } else {
      html = `<h2>Done</h2><p>${esc(r.summary || '')}</p><pre>${esc(JSON.stringify(r.data ?? {}, null, 2))}</pre>`;
    }
    box.innerHTML = html;
  } catch (err) {
    box.innerHTML = `<span class="err-text">${esc(err.message)}</span>`;
  }
}

$('skillResult').addEventListener('click', async (e) => {
  const approve = e.target.dataset.approve;
  const reject = e.target.dataset.reject;
  if (approve) {
    await api('/api/approvals/decide', { method: 'POST', body: JSON.stringify({ id: approve, approved: true, decidedBy: 'gui' }) });
    const input = collectSkillInput();
    await runSkill(e.target.dataset.skill, input, approve);
    loadApprovals();
  } else if (reject) {
    await api('/api/approvals/decide', { method: 'POST', body: JSON.stringify({ id: reject, approved: false, decidedBy: 'gui' }) });
    $('skillResult').innerHTML = '<p>Rejected. The write was not executed.</p>';
    loadApprovals();
  }
});

function collectSkillInput() {
  const form = $('skillForm');
  const input = {};
  if (!state.activeSkill) return input;
  for (const f of state.activeSkill.schema.input) {
    const el = form.elements[f.name];
    if (!el) continue;
    const raw = el.value;
    if (raw === '' || raw === undefined) continue;
    if (f.type === 'number') input[f.name] = Number(raw);
    else if (f.type === 'boolean') input[f.name] = raw === 'true';
    else if (f.type === 'string[]') input[f.name] = raw.split(',').map((s) => s.trim()).filter(Boolean);
    else input[f.name] = raw;
  }
  return input;
}

/* --- Approvals --- */
$('approvalRefresh').addEventListener('click', loadApprovals);

async function loadApprovals() {
  try {
    state.approvals = await api('/api/approvals');
  } catch {
    state.approvals = [];
  }
  const badge = $('approvalBadge');
  badge.textContent = String(state.approvals.length);
  badge.classList.toggle('hidden', state.approvals.length === 0);
  const list = $('approvalList');
  if (state.approvals.length === 0) {
    list.innerHTML = '<div class="card">No pending approvals. Risky writes will pause here.</div>';
    return;
  }
  list.innerHTML = state.approvals.map((a) => `
    <div class="card">
      <h2>${esc(a.action)}</h2>
      <div>${pill(a.skillId, 'agent')}${pill(a.category, 'high')}${pill(`risk: ${a.risk}`, a.risk)}</div>
      <p>${esc(a.summary)}</p>
      <details><summary>Payload</summary><pre>${esc(JSON.stringify(a.payload, null, 2))}</pre></details>
      <div class="approval-actions">
        <button class="primary" data-approve="${esc(a.id)}">Approve</button>
        <button class="danger" data-reject="${esc(a.id)}">Reject</button>
      </div>
    </div>`).join('');
}

$('approvalList').addEventListener('click', async (e) => {
  const approve = e.target.dataset.approve;
  const reject = e.target.dataset.reject;
  if (!approve && !reject) return;
  await api('/api/approvals/decide', {
    method: 'POST',
    body: JSON.stringify({ id: approve || reject, approved: Boolean(approve), decidedBy: 'gui' }),
  });
  loadApprovals();
});

/* --- Workflows --- */
async function loadWorkflows() {
  const wfs = await api('/api/workflows');
  $('workflowList').innerHTML = wfs.map((w) => `
    <div class="card">
      <h2>${esc(w.title)}</h2>
      <p class="lede">${esc(w.description || '')}</p>
      <p>Steps: ${esc(w.steps.map((s) => s.skillId).join(' → '))}</p>
      <button class="primary" data-workflow="${esc(w.id)}">Run</button>
    </div>`).join('');
}

$('workflowList').addEventListener('click', async (e) => {
  const id = e.target.dataset.workflow;
  if (!id) return;
  const box = $('workflowResult');
  box.classList.remove('hidden');
  box.innerHTML = 'Running workflow…';
  try {
    const r = await api('/api/workflows/run', { method: 'POST', body: JSON.stringify({ id }) });
    box.innerHTML = r.steps.map((s) => `
      <div class="step"><div class="step-head">${s.result.ok ? '<span class="ok-text">✔</span>' : '<span class="err-text">✖</span>'} ${esc(s.stepId)} (${esc(s.skillId)})</div>
      <div>${esc(s.result.summary || s.result.error || '')}</div></div>`).join('') +
      (r.approvalRequired ? `<p>⏸ Paused for approval ${esc(r.approvalId)} — decide in the Approvals tab, then re-run.</p>` : '');
    loadApprovals();
  } catch (err) {
    box.innerHTML = `<span class="err-text">${esc(err.message)}</span>`;
  }
});

/* --- Agents --- */
async function loadAgents() {
  state.agents = await api('/api/agents');
  $('agentList').innerHTML = state.agents.map((a) => `
    <div class="card">
      <h2>${esc(a.title)}</h2>
      <p class="lede">${esc(a.description)}</p>
      <div>${a.skillIds.map((s) => pill(s, 'info')).join('')}</div>
    </div>`).join('');
}

/* --- Boot --- */
loadHealth();
loadSkills().catch(() => {});
loadApprovals();
loadWorkflows().catch(() => {});
loadAgents().catch(() => {});
setInterval(loadApprovals, 15000);
