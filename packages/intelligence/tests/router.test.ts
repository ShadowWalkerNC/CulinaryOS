import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { routeIntent } from '../src/router/router.ts';

describe('router', () => {
  it('routes production forecast to kitchen-manager with minimal context', () => {
    const r = routeIntent('forecast production for tonight');
    assert.equal(r.intent, 'production.forecast');
    assert.equal(r.agent, 'kitchen-manager');
    assert.equal(r.risk, 'low');
    assert.deepEqual(r.context, ['sales', 'menu', 'inventory', 'prep']);
    assert.ok(r.confidence > 0.3);
  });

  it('routes costing, par, order, temps, and handoff queries', () => {
    assert.equal(routeIntent('cost the margherita recipe').intent, 'recipe.cost');
    assert.equal(routeIntent('what is below par?').intent, 'inventory.par');
    assert.equal(routeIntent('draft a purchase order').intent, 'order.suggest');
    assert.equal(routeIntent('review the temperature logs').intent, 'temps.review');
    assert.equal(routeIntent('write the shift handoff').intent, 'shift.handoff');
  });

  it('marks purchase intent medium risk', () => {
    const r = routeIntent('what should I reorder from the supplier?');
    assert.equal(r.intent, 'order.suggest');
    assert.equal(r.risk, 'medium');
  });

  it('falls back for unrecognized text with zero confidence', () => {
    const r = routeIntent('zzz qqq xxx');
    assert.equal(r.intent, 'general.assist');
    assert.equal(r.confidence, 0);
    assert.deepEqual(r.context, []);
  });
});
