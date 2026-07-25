import assert from 'node:assert';

const beforeAllFns = [];
const beforeEachFns = [];
let passCount = 0;
let failCount = 0;

const testQueue = [];
let isRunning = false;

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

async function processQueue() {
  if (isRunning) return;
  isRunning = true;
  while (testQueue.length > 0) {
    const task = testQueue.shift();
    for (const b of task.beforeEachFns) {
      try {
        await b();
      } catch (err) {
        failCount++;
        process.exitCode = 1;
        console.error(`    ❌ beforeEach failed for ${task.name}: ${err.message}`);
      }
    }
    try {
      await task.fn();
      passCount++;
      console.log(`    ✓ ${task.name}`);
    } catch (err) {
      failCount++;
      process.exitCode = 1;
      console.error(`    ❌ ${task.name}: ${err.message}`);
    }
  }
  isRunning = false;
}

export function it(name, fn) {
  testQueue.push({ name, fn, beforeEachFns: [...beforeEachFns] });
  return processQueue();
}

export const test = it;

process.on('exit', () => {
  if (failCount > 0) {
    process.exitCode = 1;
  }
});

export function expect(actual) {
  const matchers = {
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
    toBeNull() {
      assert.strictEqual(actual, null);
    },
    toBeNaN() {
      assert.ok(Number.isNaN(actual), `Expected ${actual} to be NaN`);
    },
    toHaveLength(expected) {
      const len = actual ? actual.length : undefined;
      assert.strictEqual(len, expected, `Expected length ${expected}, got ${len}`);
    },
    toBeGreaterThan(expected) {
      assert.ok(actual > expected, `Expected ${actual} > ${expected}`);
    },
    toBeGreaterThanOrEqual(expected) {
      assert.ok(actual >= expected, `Expected ${actual} >= ${expected}`);
    },
    toBeLessThan(expected) {
      assert.ok(actual < expected, `Expected ${actual} < ${expected}`);
    },
    toBeLessThanOrEqual(expected) {
      assert.ok(actual <= expected, `Expected ${actual} <= ${expected}`);
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

  const notMatchers = {
    toBe(expected) {
      assert.notStrictEqual(actual, expected);
    },
    toEqual(expected) {
      assert.notDeepStrictEqual(actual, expected);
    },
    toBeDefined() {
      assert.strictEqual(actual, undefined);
    },
    toBeUndefined() {
      assert.notStrictEqual(actual, undefined);
    },
    toBeNull() {
      assert.notStrictEqual(actual, null);
    },
    toHaveLength(expected) {
      const len = actual ? actual.length : undefined;
      assert.notStrictEqual(len, expected, `Expected length not ${expected}, got ${len}`);
    },
    toContain(expected) {
      if (Array.isArray(actual) || typeof actual === 'string') {
        assert.ok(!actual.includes(expected), `Expected ${JSON.stringify(actual)} NOT to contain ${expected}`);
      } else {
        assert.ok(false, 'actual is not array or string');
      }
    },
    toBeTruthy() {
      assert.ok(!Boolean(actual));
    },
    toBeFalsy() {
      assert.ok(Boolean(actual));
    }
  };

  return {
    ...matchers,
    not: notMatchers
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
