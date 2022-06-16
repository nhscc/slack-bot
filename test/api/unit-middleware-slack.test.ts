import { testApiHandler } from 'next-test-api-route-handler';
import { noopHandler, wrapHandler, mockEnvFactory } from 'testverse/setup';
import { useMockDateNow } from 'multiverse/mongo-common';
import { withMiddleware } from 'multiverse/next-api-glue';

import {
  SLACK_SIGNING_SECRET,
  SLACK_CLIENT_ID,
  SLACK_CLIENT_SECRET
} from 'testverse/fixtures';

import addRawBody, {
  Options as AddRawBodyOptions
} from 'multiverse/next-adhesive/add-raw-body';

import authSlackRequest, {
  Options as AuthSlackRequestOptions
} from 'universe/backend/middleware/auth-slack-request';
import { ErrorMessage } from 'universe/error';

type Options = AddRawBodyOptions & AuthSlackRequestOptions;

const withMockEnv = mockEnvFactory({
  NODE_ENV: 'test',
  SLACK_SIGNING_SECRET,
  SLACK_CLIENT_ID,
  SLACK_CLIENT_SECRET,
  SLACK_SYSADMIN_USER_ID: 'fake-id'
});

const getHandler = (options?: Options) => {
  return wrapHandler(
    withMiddleware<Options>(noopHandler, {
      use: [addRawBody, authSlackRequest],
      options
    }),
    { api: { bodyParser: false } }
  );
};

const mockSlackTimestamp = '1531420618';
const mockSlackSigVersion = 'v0';
const mockSlackSigBadVersion = 'v100';
const mockSlackSigHash =
  'a2114d57b48eac39b9ad189dd8316235a7b4a8d21a10bd27519666489c69b503';
const mockSlackSigHeader = `${mockSlackSigVersion}=${mockSlackSigHash}`;
const mockSlackSigBadHeader = `${mockSlackSigBadVersion}=${mockSlackSigHash}`;
const mockSlackRequestBody =
  'token=xyzz0WbapA4vBCDEFasx0q6G&team_id=T1DC2JH3J&team_domain=testteamnow&channel_id=G8PSS9T3V&channel_name=foobar&user_id=U2CERLKJA&user_name=roadrunner&command=%2Fwebhook-collect&text=&response_url=https%3A%2F%2Fhooks.slack.com%2Fcommands%2FT1DC2JH3J%2F397700885554%2F96rGlfmibIGlgcZRskXaIFfN&trigger_id=398738663015.47445629121.803a0bc887a14d10d2c447fce8b6703c';

useMockDateNow({ mockNow: parseInt(mockSlackTimestamp) + 1 });

it('is a noop by default', async () => {
  expect.hasAssertions();

  await withMockEnv(async () => {
    await testApiHandler({
      handler: getHandler(),
      test: async ({ fetch }) => expect((await fetch()).status).toBe(200)
    });
  });
});

it('throws if not using addRawBody middleware', async () => {
  expect.hasAssertions();

  await withMockEnv(async () => {
    await testApiHandler({
      rejectOnHandlerError: true,
      handler: wrapHandler(
        withMiddleware<Options>(noopHandler, {
          use: [authSlackRequest],
          useOnError: [
            (_, res, ctx) => {
              expect(ctx.runtime.error).toMatchObject({
                message: expect.stringContaining(
                  'encountered a NextApiRequest object without a rawBody property'
                )
              });

              res.send(200);
            }
          ],
          options: { requiresSlackAuth: true }
        }),
        { api: { bodyParser: false } }
      ),
      test: async ({ fetch }) => void (await fetch())
    });
  });
});

it('sends 401 on requests with bad auth headers when auth required', async () => {
  expect.hasAssertions();

  await withMockEnv(async () => {
    await testApiHandler({
      handler: getHandler({ requiresSlackAuth: true }),
      test: async ({ fetch }) => {
        const res = await fetch();

        expect(res.status).toBe(401);
        await expect(res.json()).resolves.toStrictEqual({
          success: false,
          error: ErrorMessage.InvalidItem(undefined, 'x-slack-request-timestamp header')
        });
      }
    });
  });

  await withMockEnv(async () => {
    await testApiHandler({
      handler: getHandler({ requiresSlackAuth: true }),
      test: async ({ fetch }) => {
        const res = await fetch({
          headers: { 'x-slack-request-timestamp': 'xyz' }
        });

        expect(res.status).toBe(401);
        await expect(res.json()).resolves.toStrictEqual({
          success: false,
          error: ErrorMessage.InvalidItem(undefined, 'x-slack-request-timestamp header')
        });
      }
    });
  });

  await withMockEnv(async () => {
    await testApiHandler({
      handler: getHandler({ requiresSlackAuth: true }),
      test: async ({ fetch }) => {
        const res = await fetch({
          headers: { 'x-slack-request-timestamp': '-5' }
        });

        expect(res.status).toBe(401);
        await expect(res.json()).resolves.toStrictEqual({
          success: false,
          error: ErrorMessage.InvalidItem(-5, 'x-slack-request-timestamp header')
        });
      }
    });
  });

  await withMockEnv(async () => {
    await testApiHandler({
      handler: getHandler({ requiresSlackAuth: true }),
      test: async ({ fetch }) => {
        const res = await fetch({
          headers: { 'x-slack-request-timestamp': mockSlackTimestamp }
        });

        expect(res.status).toBe(401);
        await expect(res.json()).resolves.toStrictEqual({
          success: false,
          error: ErrorMessage.InvalidItem(undefined, 'x-slack-signature header')
        });
      }
    });
  });

  await withMockEnv(async () => {
    await testApiHandler({
      handler: getHandler({ requiresSlackAuth: true }),
      test: async ({ fetch }) => {
        const res = await fetch({
          headers: {
            'x-slack-request-timestamp': mockSlackTimestamp,
            'x-slack-signature': 'bad sig'
          }
        });

        expect(res.status).toBe(401);
        await expect(res.json()).resolves.toStrictEqual({
          success: false,
          error: ErrorMessage.InvalidItem('bad sig', 'x-slack-signature header')
        });
      }
    });
  });

  await withMockEnv(async () => {
    await testApiHandler({
      handler: getHandler({ requiresSlackAuth: true }),
      test: async ({ fetch }) => {
        const res = await fetch({
          headers: {
            'x-slack-request-timestamp': mockSlackTimestamp,
            'x-slack-signature': mockSlackSigBadHeader
          }
        });

        expect(res.status).toBe(401);
        await expect(res.json()).resolves.toStrictEqual({
          success: false,
          error: ErrorMessage.InvalidItem(
            mockSlackSigBadVersion,
            'x-slack-signature header version'
          )
        });
      }
    });
  });

  await withMockEnv(async () => {
    await testApiHandler({
      handler: getHandler({ requiresSlackAuth: true }),
      test: async ({ fetch }) => {
        const res = await fetch({
          method: 'POST',
          headers: {
            'x-slack-request-timestamp': mockSlackTimestamp,
            'x-slack-signature': `${mockSlackSigVersion}=nope`
          },
          body: mockSlackRequestBody
        });

        expect(res.status).toBe(401);
        await expect(res.json()).resolves.toStrictEqual({
          success: false,
          error: ErrorMessage.InvalidItem('nope', 'x-slack-signature header hash')
        });
      }
    });
  });
});

it('sends 401 on requests with timestamp auth header older than five minutes ago', async () => {
  expect.hasAssertions();

  const fiveMinAgoPlus1Sec = Math.floor(parseInt(mockSlackTimestamp) / 1000) - 60 * 5 - 1;

  await withMockEnv(async () => {
    await testApiHandler({
      handler: getHandler({ requiresSlackAuth: true }),
      test: async ({ fetch }) => {
        const res = await fetch({
          headers: { 'x-slack-request-timestamp': fiveMinAgoPlus1Sec.toString() }
        });

        expect(res.status).toBe(401);
        await expect(res.json()).resolves.toStrictEqual({
          success: false,
          error: ErrorMessage.InvalidItem(
            fiveMinAgoPlus1Sec,
            'x-slack-request-timestamp header'
          )
        });
      }
    });
  });
});

it('does not send 401 on requests with good auth headers when auth required', async () => {
  expect.hasAssertions();

  await withMockEnv(async () => {
    await testApiHandler({
      handler: getHandler({ requiresSlackAuth: true }),
      test: async ({ fetch }) => {
        const res = await fetch({
          method: 'POST',
          headers: {
            'x-slack-request-timestamp': mockSlackTimestamp,
            'x-slack-signature': mockSlackSigHeader
          },
          body: mockSlackRequestBody
        });

        expect(res.status).toBe(200);
      }
    });
  });
});
