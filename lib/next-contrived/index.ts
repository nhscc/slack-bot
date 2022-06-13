import { getEnv } from 'multiverse/next-env';
import { debugFactory } from 'multiverse/debug-extended';

const debug = debugFactory('next-contrived:isDueForContrivedError');

/**
 * Global (but only per lambda instance's lifetime) request counting state.
 */
// @ts-expect-error: global
global._nextContrived$RequestCounter = 0;

/**
 * Returns `true` if a request should be rejected with a pseudo-error.
 *
 * Note that this is a per-serverless-function request counter and not global
 * across all Vercel virtual machines.
 */
export function isDueForContrivedError() {
  const { REQUESTS_PER_CONTRIVED_ERROR: reqPerErr } = getEnv();

  if (reqPerErr) {
    // @ts-expect-error: global
    const counter: number = (global._nextContrived$RequestCounter += 1);
    debug(`contrived error request count: ${counter}/${reqPerErr}`);

    if (counter >= reqPerErr) {
      // @ts-expect-error: global
      global._nextContrived$RequestCounter = 0;
      debug('determined request is due for contrived error');
      return true;
    }
  } else {
    debug(`middleware disabled (cause: REQUESTS_PER_CONTRIVED_ERROR=${reqPerErr})`);
  }

  return false;
}
