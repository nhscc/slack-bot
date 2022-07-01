import { name as pkgName } from 'package';
import { toss } from 'toss-expression';
import { GuruMeditationError } from 'universe/error';
import debugFactory from 'debug';

import type { Promisable } from 'type-fest';
import type { NextApiHandlerMixin } from 'testverse/fixtures';

// TODO: XXX: turn a lot of this into some kind of package; needs to be generic
// TODO: XXX: enough to handle various use cases though :) Maybe
// TODO: XXX: @xunnamius/fable for the generic version, along with
// TODO: XXX: @xunnamius/fable-next, @xunnamius/fable-next-api (below),
// TODO: XXX: @xunnamius/fable-X plugins. Initial version of @xunnamius/fable
// TODO: XXX: would just be the next API version.

// TODO: XXX: add an `id` param that allows getResultAt using that `id` (along
// TODO: XXX:  with index)

// TODO: XXX: document functionality: RUN_ONLY='#, ##,###,...'
// TODO: XXX: "fail fast" should be optional

const debug = debugFactory(`${pkgName}:integration-fixtures`);

/**
 * A single test result stored in `memory`.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type TestResult<T = any> = {
  status: number;
  json: T | undefined;
};

/**
 * Stored results from past fixtures runs made available for future fixtures
 * runs via `memory`.
 */
export type TestResultset = TestResult[] & {
  /**
   * A property containing a mapping between optional test ids and their
   * results.
   */
  idMap: Record<string, TestResult>;
  /**
   * A property containing the most previous resultset.
   */
  latest: TestResult;
  /**
   * Get the HTTP response status and json result from previously run tests by
   * index. You can pass a negative index to begin counting backwards from the
   * current test. Tests are zero-indexed, i.e. use `getResultAt(0)` to refer to
   * the very first resultset. `getResultAt(1)` will return the second
   * resultset. `getResultAt(-1)` will return the immediately previous resultset
   * (same as what the `latest` property returns).
   *
   * @param index Specify a previous test result index starting at 1 (not zero!)
   */
  getResultAt<T = unknown>(index: number): TestResult<T>;
  getResultAt<T = unknown>(index: number, prop: string): T;
  getResultAt<T = unknown>(index: string): TestResult<T>;
  getResultAt<T = unknown>(index: string, prop: string): T;
};

/**
 * Represents a test that executes an HTTP request and evaluate the response
 * for correctness.
 */
export type TestFixture = {
  /**
   * An optional id that can be used to reference the result from this fixture
   * directly as opposed to by index.
   *
   * @example getResultAt('my-id') === getResultAt(22)
   */
  id?: string;
  /**
   * If `invisible == true`, the test is not counted when generating positional
   * fixtures.
   *
   * @default false
   */
  invisible?: boolean;
  /**
   * The test index X (as in "#X") that is reported to the user when a test
   * fails.
   */
  displayIndex: number;
  /**
   * A very brief couple of words added to the end of the test title.
   */
  subject?: string;
  /**
   * The handler under test.
   */
  handler?: NextApiHandlerMixin;
  /**
   * The method of the mock request.
   */
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  /**
   * Represents mock "processed" dynamic route components and query params.
   */
  params?:
    | Record<string, string | string[]>
    | ((prevResults: TestResultset) => Promisable<Record<string, string | string[]>>);
  /**
   * The body of the mock request. Automatically stringified.
   */
  body?:
    | Record<string, unknown>
    | ((prevResults: TestResultset) => Promisable<Record<string, unknown>>);
  /**
   * The expected shape of the HTTP response.
   */
  response?: {
    /**
     * The expected response status. If status != 200, we expect `json.success`
     * to be `false`. Otherwise, we expect it to be `true`. All status-related
     * checks are skipped if a callback is provided that returns `undefined`.
     */
    status?:
      | number
      | ((
          status: number,
          prevResults: TestResultset
        ) => Promisable<number | undefined>);
    /**
     * The expected JSON response body. No need to test for `success` as that is
     * handled automatically (unless a status callback was used and it returned
     * `undefined`). Jest async matchers are also supported. All json-related
     * checks are skipped if a callback is provided that returns `undefined` or
     * `json` itself is `undefined`.
     */
    json?:
      | Record<string, unknown>
      | jest.AsymmetricMatcher
      | ((
          json: Record<string, unknown> | undefined,
          prevResults: TestResultset
        ) => Promisable<
          Record<string, unknown> | jest.AsymmetricMatcher | undefined
        >);
  };
};

export function getFixtures(
  api: typeof import('testverse/fixtures').api
): TestFixture[] {
  const runOnly = process.env.RUN_ONLY?.split(',')
    .flatMap((n) => {
      const range = n
        .split('-')
        .map((m) => parseInt(m))
        .filter((m) => !Number.isNaN(m));

      const min = Math.min(...range);
      const max = Math.max(...range);

      debug(`min: ${min}`);
      debug(`max: ${max}`);
      debug(`range: ${range}`);

      if (!(0 < min && min <= max && max < Infinity)) {
        throw new GuruMeditationError(`invalid RUN_ONLY range "${min}-${max}"`);
      } else {
        const finalRange = Array.from({ length: max - min + 1 }).map(
          (_, ndx) => min + ndx
        );
        debug(`final range: ${finalRange}`);
        return finalRange;
      }
    })
    .sort((a, b) => a - b);

  const fixtures: Omit<TestFixture, 'displayIndex'>[] = [
    // TODO
  ];

  // TODO: XXX: ability to specify "depends" via index or name/id

  const filteredFixtures = fixtures.filter<TestFixture>(
    (test, ndx): test is TestFixture => {
      const displayIndex = ndx + 1;
      if (runOnly && !runOnly.includes(displayIndex)) return false;
      (test as TestFixture).displayIndex = !runOnly
        ? displayIndex
        : runOnly.shift() ??
          toss(new GuruMeditationError('ran out of RUN_ONLY indices'));
      return true;
    }
  );

  // TODO: XXX: add ability to capture/suppress output via fixture option (even better: selectively use mock plugins like withMockEnv and withMockOutput via config options)

  // TODO: XXX: with @xunnamius/fable, have an "every X" type construct (the below is "every 10")
  // TODO: XXX: also allow middleware
  // TODO: XXX: also custom props for fixtures
  // for (let i = 9; i < filteredFixtures.length; i += 10) {
  //   const invisibleCount = filteredFixtures
  //     .slice(Math.max(0, i - 10), i)
  //     .filter((f) => f.invisible).length;

  //   // ? Ensure counts remain aligned by skipping tests that don't increase
  //   // ? internal contrived counter
  //   i += invisibleCount;

  //   filteredFixtures.splice(i, 0, {
  //     displayIndex: -1,
  //     subject: 'handle contrived',
  //     handler: api.v1.users,
  //     method: 'POST',
  //     body: {},
  //     response: {
  //       status: 555,
  //       json: { error: expect.stringContaining('contrived') }
  //     }
  //   });
  // }

  return filteredFixtures;
}
