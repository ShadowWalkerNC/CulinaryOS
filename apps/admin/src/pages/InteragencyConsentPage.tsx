import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  ShieldAlert,
  AlertCircle,
  CheckCircle2,
  Lock,
  ArrowRight,
  ExternalLink,
  Trash2,
  RefreshCw,
  Button,
} from '@culinaryos/ui';
import { getApiBase, getTenantId, apiHeaders } from '@culinaryos/shared';
import { useAuth } from '../context/AuthContext';

const API = getApiBase();
const DEFAULT_TENANT_ID = getTenantId();

interface ActiveGrant {
  id: string;
  tenantId: string;
  userId: string;
  audience: string;
  scopes: string[];
  expiresAt: string;
  revokedAt: string | null;
  createdAt: string;
}

const SCOPE_DESCRIPTIONS: Record<string, { label: string; desc: string }> = {
  recipes: {
    label: 'Recipes & Formulas',
    desc: 'Read recipe BOM formulas, yields, portion sizes, and ingredient ratios.',
  },
  menus: {
    label: 'Menu Catalogs',
    desc: 'Read menu items, categories, pricing, and modifier lists.',
  },
  purchases: {
    label: 'Purchasing & Invoices',
    desc: 'Read vendor order guides, purchase orders, and receiving invoice records.',
  },
  inventory: {
    label: 'Pantry & Stock Par',
    desc: 'Read on-hand stock quantities, storage locations, and par levels.',
  },
  sales_summary: {
    label: 'Aggregated Sales',
    desc: 'Read daily product sales units and line revenue (anonymized summary).',
  },
};

export function InteragencyConsentPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { session, isManagerOrOwner } = useAuth();
  const tenantId = session?.tenantId || DEFAULT_TENANT_ID;

  const redirectUri = searchParams.get('redirect_uri') || searchParams.get('redirectUri') || '';
  const challenge = searchParams.get('code_challenge') || searchParams.get('challenge') || '';
  const state = searchParams.get('state') || '';
  const scopeParam = searchParams.get('scope') || searchParams.get('scopes') || 'recipes,sales_summary';
  const requestedScopes = scopeParam.split(/[,\s]+/).filter(Boolean);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [redirecting, setRedirecting] = useState(false);
  const [grants, setGrants] = useState<ActiveGrant[]>([]);
  const [loadingGrants, setLoadingGrants] = useState(false);

  const isValidLoopback = /^http:\/\/127\.0\.0\.1:[0-9]{4,5}\/interagency\/callback$/.test(redirectUri);
  const hasValidChallenge = /^[A-Za-z0-9_-]{43}$/.test(challenge);
  const hasValidState = /^[A-Za-z0-9_-]{32,128}$/.test(state);
  const isRequestValid = isValidLoopback && hasValidChallenge && hasValidState && requestedScopes.length > 0;

  useEffect(() => {
    fetchGrants();
  }, [tenantId]);

  function getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Tenant-Id': tenantId,
    };
    if (session?.accessToken) {
      headers['Authorization'] = `Bearer ${session.accessToken}`;
    }
    return headers;
  }

  async function fetchGrants() {
    if (!tenantId) return;
    setLoadingGrants(true);
    try {
      const res = await fetch(`${API}/v1/interagency/grants`, {
        headers: getHeaders(),
      });
      if (res.ok) {
        const body = await res.json();
        setGrants(body.grants || []);
      }
    } catch {
      // Graceful fallback when backend is offline
    } finally {
      setLoadingGrants(false);
    }
  }

  async function handleAuthorize() {
    if (!isRequestValid || !tenantId) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API}/v1/interagency/authorize`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          redirectUri,
          challenge,
          state,
          scopes: requestedScopes,
        }),
      });

      const body = await res.json();
      if (!res.ok) {
        throw new Error(body.error || 'Authorization failed');
      }

      setRedirecting(true);
      setTimeout(() => {
        window.location.href = body.redirect;
      }, 800);
    } catch (err: any) {
      setError(err.message || 'Authorization failed');
      setLoading(false);
    }
  }

  async function handleRevoke(grantId: string) {
    if (!tenantId) return;
    try {
      const res = await fetch(`${API}/v1/interagency/grants/${grantId}/revoke`, {
        method: 'POST',
        headers: getHeaders(),
      });
      if (res.ok) {
        await fetchGrants();
      }
    } catch (err: any) {
      setError(`Failed to revoke grant: ${err.message}`);
    }
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8 pb-6 border-b border-slate-200">
        <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-sm">
          <ShieldCheck className="w-8 h-8" />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Interagency Read Bridge
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Authorizing secure, scoped read-only access for local analytical tools.
          </p>
        </div>
      </div>

      {redirecting ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-emerald-200 shadow-sm">
          <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto mb-4 animate-bounce" />
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Authorization Granted</h2>
          <p className="text-slate-500">Redirecting to local application at {redirectUri}...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Authorization Card */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8">
              <div className="flex items-start justify-between gap-4 mb-6">
                <div>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-indigo-100 text-indigo-700 uppercase tracking-wider">
                    OAuth 2.0 PKCE Bridge
                  </span>
                  <h2 className="text-xl font-bold text-slate-900 mt-2">
                    Connect Axom AI / Kitchen Tools
                  </h2>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
                  <Lock className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Loopback Secured</span>
                </div>
              </div>

              {/* Security Validation Notice */}
              {!isRequestValid && (
                <div className="mb-6 p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-start gap-3 text-amber-800 text-sm">
                  <AlertCircle className="w-5 h-5 flex-shrink-0 text-amber-600 mt-0.5" />
                  <div>
                    <span className="font-semibold">Missing or Invalid Authorization Parameters:</span>
                    <ul className="list-disc list-inside mt-1 space-y-0.5 text-xs">
                      {!isValidLoopback && <li>Callback URI must be exact loopback (127.0.0.1:1024+)</li>}
                      {!hasValidChallenge && <li>Valid 43-character PKCE SHA-256 challenge required</li>}
                      {!hasValidState && <li>Valid state string (32-128 chars) required</li>}
                      {requestedScopes.length === 0 && <li>At least one resource scope required</li>}
                    </ul>
                  </div>
                </div>
              )}

              {error && (
                <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 flex items-start gap-3 text-rose-800 text-sm">
                  <ShieldAlert className="w-5 h-5 flex-shrink-0 text-rose-600 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {/* Requested Scopes */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-slate-900 mb-3">
                  Requested Permissions ({requestedScopes.length}):
                </h3>
                <div className="space-y-2.5">
                  {requestedScopes.map((scope) => {
                    const info = SCOPE_DESCRIPTIONS[scope] || {
                      label: scope,
                      desc: `Read access to ${scope} resource.`,
                    };
                    return (
                      <div
                        key={scope}
                        className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-start gap-3"
                      >
                        <CheckCircle2 className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <div className="text-sm font-semibold text-slate-900">{info.label}</div>
                          <div className="text-xs text-slate-500 mt-0.5">{info.desc}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Explicit Exclusion Guarantee */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 mb-8">
                <div className="text-xs font-semibold text-slate-900 flex items-center gap-1.5 mb-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Hardcoded Privacy Exclusions</span>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Payment card numbers, customer identities, credit card tokens, and employee payroll
                  records are strictly excluded and cannot be read by this bridge under any scope.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <Button
                  onClick={handleAuthorize}
                  disabled={!isRequestValid || loading}
                  className="w-full sm:w-auto min-h-[48px] px-8 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-2xl shadow-sm flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Authorizing...</span>
                    </>
                  ) : (
                    <>
                      <span>Authorize Connection</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </Button>

                <Button
                  variant="outline"
                  onClick={() => navigate('/integrations')}
                  className="w-full sm:w-auto min-h-[48px] px-6 rounded-2xl border-slate-200 text-slate-700 font-semibold hover:bg-slate-50"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>

          {/* Sidebar / Active Grants */}
          <div className="space-y-6">
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold text-slate-900">Active Connections</h3>
                <button
                  onClick={fetchGrants}
                  disabled={loadingGrants}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-50 transition-colors"
                  title="Refresh"
                >
                  <RefreshCw className={`w-4 h-4 ${loadingGrants ? 'animate-spin' : ''}`} />
                </button>
              </div>

              {grants.length === 0 ? (
                <p className="text-xs text-slate-400 py-4 text-center">
                  No active third-party read grants.
                </p>
              ) : (
                <div className="space-y-3">
                  {grants.map((g) => (
                    <div
                      key={g.id}
                      className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-start justify-between gap-3"
                    >
                      <div>
                        <div className="text-xs font-semibold text-slate-900">
                          {g.audience}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          Scopes: {g.scopes.join(', ')}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-1">
                          Expires: {new Date(g.expiresAt).toLocaleDateString()}
                        </div>
                      </div>
                      <button
                        onClick={() => handleRevoke(g.id)}
                        className="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition-colors"
                        title="Revoke connection"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="p-5 rounded-3xl bg-slate-50 border border-slate-200 text-xs text-slate-500 space-y-2">
              <div className="font-semibold text-slate-700">Developer Architecture Note</div>
              <p>
                Authorization codes expire in 5 minutes. Scoped access tokens rotate automatically
                every 15 minutes via refresh token rotation.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
