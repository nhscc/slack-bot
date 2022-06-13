import { getEnv as getDefaultEnv } from 'multiverse/next-env';
import { InvalidAppEnvironmentError } from 'universe/error';

import type { Environment } from 'multiverse/next-env';

/**
 * Returns an object representing the application's runtime environment.
 */
// eslint-disable-next-line @typescript-eslint/ban-types
export function getEnv<T extends Environment = Environment>() {
  const env = getDefaultEnv({
    SLACK_CLIENT_ID: process.env.SLACK_CLIENT_ID || '',
    SLACK_CLIENT_SECRET: process.env.SLACK_CLIENT_SECRET || '',
    SLACK_SIGNING_SECRET: process.env.SLACK_SIGNING_SECRET || ''
  });

  // TODO: retire all of the following logic when expect-env is created. Also,
  // TODO: expect-env should have the ability to skip runs on certain NODE_ENV
  // TODO: unless OVERRIDE_EXPECT_ENV is properly defined.
  /* istanbul ignore next */
  if (
    (env.NODE_ENV != 'test' && env.OVERRIDE_EXPECT_ENV != 'force-no-check') ||
    env.OVERRIDE_EXPECT_ENV == 'force-check'
  ) {
    const errors: string[] = [];

    if (!env.SLACK_CLIENT_ID) {
      errors.push('bad SLACK_CLIENT_ID');
    }

    if (!env.SLACK_CLIENT_SECRET) {
      errors.push('bad SLACK_CLIENT_SECRET');
    }

    if (!env.SLACK_SIGNING_SECRET) {
      errors.push('bad SLACK_SIGNING_SECRET');
    }

    // TODO: make it easier to reuse error code from getDefaultEnv. Or is it
    // TODO: obsoleted by expect-env package? Either way, factor this logic out!
    if (errors.length) {
      throw new InvalidAppEnvironmentError(`bad variables:\n - ${errors.join('\n - ')}`);
    }
  }

  return env as typeof env & T;
}
