import { asMockedFunction } from '@xunnamius/jest-types';

import {
  authAppUser,
  createNode,
  createUser,
  deleteNodes,
  deleteUser,
  getAllUsers,
  getNodes,
  getUser,
  searchNodes,
  updateNode,
  updateUser
} from 'universe/backend';

import EndpointCommand, {
  config as ConfigCommand
} from 'universe/pages/api/command/[command]';

import type { NextApiHandler, PageConfig } from 'next';
import type { PublicNode, PublicUser } from 'universe/backend/db';

export type NextApiHandlerMixin = NextApiHandler & {
  config?: PageConfig;
  uri?: string;
};

/**
 * The entire live API topology gathered together into one convenient object.
 */
export const api = {
  command: EndpointCommand as NextApiHandlerMixin
};

api.command.config = ConfigCommand;

/**
 * A convenience function that mocks the entire backend and returns the mock
 * functions. Uses `beforeEach` under the hood.
 *
 * **WARNING: YOU MUST CALL `jest.mock('universe/backend')` before calling this
 * function!**
 */
export function setupMockBackend() {
  const mockedAuthAppUser = asMockedFunction(authAppUser);
  const mockedCreateNode = asMockedFunction(createNode);
  const mockedCreateUser = asMockedFunction(createUser);
  const mockedDeleteNodes = asMockedFunction(deleteNodes);
  const mockedDeleteUser = asMockedFunction(deleteUser);
  const mockedGetAllUsers = asMockedFunction(getAllUsers);
  const mockedGetNodes = asMockedFunction(getNodes);
  const mockedGetUser = asMockedFunction(getUser);
  const mockedSearchNodes = asMockedFunction(searchNodes);
  const mockedUpdateNode = asMockedFunction(updateNode);
  const mockedUpdateUser = asMockedFunction(updateUser);

  beforeEach(() => {
    mockedAuthAppUser.mockReturnValue(Promise.resolve(false));
    mockedCreateNode.mockReturnValue(Promise.resolve({} as PublicNode));
    mockedCreateUser.mockReturnValue(Promise.resolve({} as PublicUser));
    mockedDeleteNodes.mockReturnValue(Promise.resolve());
    mockedDeleteUser.mockReturnValue(Promise.resolve());
    mockedGetAllUsers.mockReturnValue(Promise.resolve([]));
    mockedGetNodes.mockReturnValue(Promise.resolve([]));
    mockedGetUser.mockReturnValue(Promise.resolve({} as PublicUser));
    mockedSearchNodes.mockReturnValue(Promise.resolve([]));
    mockedUpdateNode.mockReturnValue(Promise.resolve());
    mockedUpdateUser.mockReturnValue(Promise.resolve());
  });

  return {
    mockedAuthAppUser,
    mockedCreateNode,
    mockedCreateUser,
    mockedDeleteNodes,
    mockedDeleteUser,
    mockedGetAllUsers,
    mockedGetNodes,
    mockedGetUser,
    mockedSearchNodes,
    mockedUpdateNode,
    mockedUpdateUser
  };
}
