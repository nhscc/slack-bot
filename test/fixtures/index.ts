import { asMockedFunction } from '@xunnamius/jest-types';

import {} from 'universe/backend';

import EndpointCommandListApis, {
  config as ConfigCommandListApis
} from 'universe/pages/api/command/list-apis';

import EndpointCommandGenApiKey, {
  config as ConfigCommandGenApiKey
} from 'universe/pages/api/command/gen-api-key';

import EndpointCommandListApiKeys, {
  config as ConfigCommandListApiKeys
} from 'universe/pages/api/command/list-api-keys';

import EndpointCommandDelApiKey, {
  config as ConfigCommandDelApiKey
} from 'universe/pages/api/command/del-api-key';

import EndpointCommandUnbanApiKey, {
  config as ConfigCommandUnbanApiKey
} from 'universe/pages/api/command/unban-api-key';

import EndpointCommandGrantPermissions, {
  config as ConfigCommandGrantPermissions
} from 'universe/pages/api/command/grant-permissions';

import EndpointCommandRevokePermissions, {
  config as ConfigCommandRevokePermissions
} from 'universe/pages/api/command/revoke-permissions';

import EndpointCommandListChapters, {
  config as ConfigCommandListChapters
} from 'universe/pages/api/command/list-chapters';

import EndpointCommandCreateChapter, {
  config as ConfigCommandCreateChapter
} from 'universe/pages/api/command/create-chapter';

import type { NextApiHandler, PageConfig } from 'next';

export type NextApiHandlerMixin = NextApiHandler & {
  config?: PageConfig;
  uri?: string;
};

/**
 * Dummy Slack client ID.
 */
export const SLACK_CLIENT_ID = '123456789123.1234567891234';

/**
 * Dummy Slack client secret.
 */
export const SLACK_CLIENT_SECRET = '12345678912345678912345678912345';

/**
 * Dummy Slack signing secret taken from
 * https://api.slack.com/authentication/verifying-requests-from-slack#sdk_support
 */
export const SLACK_SIGNING_SECRET = '8f742231b10e8888abcd99yyyzzz85a5';

/**
 * The entire live API topology gathered together into one convenient object.
 */
export const api = {
  commandListApis: EndpointCommandListApis as NextApiHandlerMixin,
  commandGenApiKey: EndpointCommandGenApiKey as NextApiHandlerMixin,
  commandListApiKeys: EndpointCommandListApiKeys as NextApiHandlerMixin,
  commandDelApiKey: EndpointCommandDelApiKey as NextApiHandlerMixin,
  commandUnbanApiKey: EndpointCommandUnbanApiKey as NextApiHandlerMixin,
  commandGrantPermissions: EndpointCommandGrantPermissions as NextApiHandlerMixin,
  commandRevokePermissions: EndpointCommandRevokePermissions as NextApiHandlerMixin,
  commandListChapters: EndpointCommandListChapters as NextApiHandlerMixin,
  commandCreateChapter: EndpointCommandCreateChapter as NextApiHandlerMixin
};

api.commandListApis.config = ConfigCommandListApis;
api.commandGenApiKey.config = ConfigCommandGenApiKey;
api.commandListApiKeys.config = ConfigCommandListApiKeys;
api.commandDelApiKey.config = ConfigCommandDelApiKey;
api.commandUnbanApiKey.config = ConfigCommandUnbanApiKey;
api.commandGrantPermissions.config = ConfigCommandGrantPermissions;
api.commandRevokePermissions.config = ConfigCommandRevokePermissions;
api.commandListChapters.config = ConfigCommandListChapters;
api.commandCreateChapter.config = ConfigCommandCreateChapter;

/**
 * A convenience function that mocks the entire backend and returns the mock
 * functions. Uses `beforeEach` under the hood.
 *
 * **WARNING: YOU MUST CALL `jest.mock('universe/backend')` before calling this
 * function!**
 */
export function setupMockBackend() {
  // TODO
  // const mockedAuthAppUser = asMockedFunction(authAppUser);
  // beforeEach(() => {
  //   mockedAuthAppUser.mockReturnValue(Promise.resolve(false));
  // });
  // return {
  //   mockedAuthAppUser,
  // };
}
