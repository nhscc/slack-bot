import { sendHttpUnauthenticated } from 'multiverse/next-api-respond';
import { debugFactory } from 'multiverse/debug-extended';
import { ensureNextApiRequestHasRawBody } from 'multiverse/next-adhesive/add-raw-body';
import { ErrorMessage, GuruMeditationError } from 'named-app-errors';
import { getEnv } from 'universe/backend/env';
import { webcrypto as crypto } from 'node:crypto';

import type { NextApiRequest, NextApiResponse } from 'next';
import type { MiddlewareContext } from 'multiverse/next-api-glue';

const debug = debugFactory('middleware:auth-slack-request');

/**
 * Slack request signature versions supported by this middleware.
 */
const supportedSignatureVersions = ['v0'];

/**
 * A function that converts a ByteArray or any other array of bytes into a
 * string of hexadecimal digits
 */
const convertBufferToHex = (buffer: ArrayLike<number> | ArrayBufferLike) => {
  return (
    // This next line ensures we're dealing with an actual array
    [...new Uint8Array(buffer)]
      // Keep in mind that:
      // 1 byte = 8 bits
      // 1 hex digit = 4 bits
      // 1 byte = 2 hex digits
      // So, convert each 1 byte into 2 hexadecimal digits
      .map((byte) => byte.toString(16).padStart(2, '0'))
      // Concatenate it all together into one big string
      .join('')
  );
};

export type Options = {
  /**
   * If `true`, accessing this endpoint requires valid `X-Slack-Signature`
   * and `X-Slack-Request-Timestamp` headers.
   *
   * @see https://api.slack.com/authentication/verifying-requests-from-slack
   */
  requiresSlackAuth: boolean;
};

/**
 * Rejects unauthenticatable requests (via `X-Slack-Signature` and
 * `X-Slack-Request-Timestamp` headers).
 *
 * @see https://api.slack.com/authentication/verifying-requests-from-slack
 */
export default async function (
  req: NextApiRequest,
  res: NextApiResponse,
  context: MiddlewareContext<Options>
) {
  debug('entered middleware runtime');

  if (context.options.requiresSlackAuth) {
    const { valid, error } = await isValidSlackRequest(req);

    if (!valid) {
      debug(`request authentication failed: ${error}`);
      sendHttpUnauthenticated(res, { error });
    } else {
      debug('request authentication succeeded');
    }
  } else {
    debug(
      `middleware disabled (cause: options.requiresSlackAuth=${context.options.requiresSlackAuth})`
    );
  }
}

/**
 * Validates a request as originating from the Slack API.
 */
async function isValidSlackRequest(
  req: NextApiRequest
): Promise<{ valid: true; error: undefined } | { valid: false; error: string }> {
  /* istanbul ignore else */
  if (ensureNextApiRequestHasRawBody(req)) {
    const fiveMinutesAgoSec = Math.floor(Date.now() / 1000) - 60 * 5;
    const reqTimestampSec = Number.parseInt(
      req.headers['x-slack-request-timestamp']?.toString() || ''
    );

    if (
      Number.isNaN(reqTimestampSec) ||
      reqTimestampSec <= 0 ||
      reqTimestampSec < fiveMinutesAgoSec
    ) {
      return {
        valid: false,
        error: ErrorMessage.InvalidItem(
          reqTimestampSec,
          'x-slack-request-timestamp header'
        )
      };
    }

    const reqSignature = req.headers['x-slack-signature']?.toString() || '';
    const [reqSignatureVersion, reqSignatureHash] = reqSignature.split('=');

    if (!reqSignature || !reqSignatureHash) {
      return {
        valid: false,
        error: ErrorMessage.InvalidItem(reqSignature, 'x-slack-signature header')
      };
    }

    if (!supportedSignatureVersions.includes(reqSignatureVersion)) {
      return {
        valid: false,
        error: ErrorMessage.InvalidItem(
          reqSignatureVersion,
          'x-slack-signature header version'
        )
      };
    }

    const textEncoder = new TextEncoder();
    const algorithm = { name: 'HMAC', hash: 'SHA-256' };

    const secretKey = await crypto.subtle.importKey(
      'raw',
      textEncoder.encode(getEnv().SLACK_SIGNING_SECRET),
      algorithm,
      false,
      ['sign']
    );

    const computedSignatureHash = convertBufferToHex(
      await crypto.subtle.sign(
        algorithm,
        secretKey,
        textEncoder.encode(`${reqSignatureVersion}:${reqTimestampSec}:${req.rawBody}`)
      )
    );

    const valid = reqSignatureHash.toLowerCase() === computedSignatureHash.toLowerCase();

    return valid
      ? {
          valid: true,
          error: undefined
        }
      : {
          valid: false,
          error: ErrorMessage.InvalidItem(
            reqSignatureHash,
            'x-slack-signature header hash'
          )
        };
  }

  // * Technically this is dead code as it is not possible to reach this line
  /* istanbul ignore next */
  throw new GuruMeditationError();
}
