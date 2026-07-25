import assert from 'node:assert';

const beforeAllFns = [];
const beforeEachFns = [];
let passCount = 0;
let failCount = 0;

export function beforeAll(fn) {
  beforeAllFns.push(fn);
}

export function beforeEach(fn) {
  beforeEachFns.push(fn);
}

export function describe(name, fn) {
  console.log(`\n  ${name}`);
  fn();
}

export async function it(name, fn) {
  for (const b of beforeEachFns) {
    await b();
  }
  try {
    await fn();
    passCount++;
    console.log(`    ✓ ${name}`);
  } catch (err) {
    failCount++;
    console.error(`    ❌ ${name}: ${err.message}`);
  }
}

export const test = it;

export function expect(actual) {
  return {
    toBe(expected) {
      assert.strictEqual(actual, expected);
    },
    toEqual(expected) {
      assert.deepStrictEqual(actual, expected);
    },
    toBeDefined() {
      assert.notStrictEqual(actual, undefined);
    },
    toBeUndefined() {
      assert.strictEqual(actual, undefined);
    },
    toBeGreaterThan(expected) {
      assert.ok(actual > expected, `Expected ${actual} > ${expected}`);
    },
    toBeLessThan(expected) {
      assert.ok(actual < expected, `Expected ${actual} < ${expected}`);
    },
    toBeCloseTo(expected, precision = 2) {
      const diff = Math.abs(actual - expected);
      const tolerance = Math.pow(10, -precision) / 2;
      assert.ok(diff <= tolerance, `Expected ${actual} to be close to ${expected}`);
    },
    toThrow(expected) {
      assert.throws(() => {
        if (typeof actual === 'function') actual();
      }, expected);
    },
    toContain(expected) {
      if (Array.isArray(actual) || typeof actual === 'string') {
        assert.ok(actual.includes(expected), `Expected ${JSON.stringify(actual)} to contain ${expected}`);
      } else {
        assert.ok(false, 'actual is not array or string');
      }
    },
    toBeTruthy() {
      assert.ok(Boolean(actual));
    },
    toBeFalsy() {
      assert.ok(!Boolean(actual));
    },
    toMatch(regex) {
      assert.ok(regex.test(actual), `Expected "${actual}" to match ${regex}`);
    }
  };
}

export function mock(fn = () => {}) {
  const mockFn = (...args) => {
    mockFn.calls.push(args);
    return fn(...args);
  };
  mockFn.calls = [];
  return mockFn;
}

mock.module = (modName, factory) => {
  // no-op for mock module registration in simple runner
};

export function getStats() {
  return { passCount, failCount };
}
