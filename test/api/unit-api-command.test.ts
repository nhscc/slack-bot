/* eslint-disable @typescript-eslint/no-explicit-any */
import { testApiHandler } from 'next-test-api-route-handler';
import { api, setupMockBackend } from 'testverse/fixtures';

jest.mock('universe/backend');
jest.mock('universe/backend/middleware', () => {
  const { middlewareFactory } = require('multiverse/next-api-glue');
  const { default: handleError } = require('multiverse/next-adhesive/handle-error');

  return {
    withMiddleware: jest
      .fn()
      .mockImplementation(middlewareFactory({ use: [], useOnError: [handleError] }))
  };
});

describe('api/command', () => {
  describe('/list-apis [POST]', () => {
    void testApiHandler, api, setupMockBackend;
    test.todo('this');
  });

  describe('/gen-api-key [POST]', () => {
    test.todo('this');
  });

  describe('/list-api-keys [POST]', () => {
    test.todo('this');
  });

  describe('/del-api-key [POST]', () => {
    test.todo('this');
  });

  describe('/unban-api-key [POST]', () => {
    test.todo('this');
  });

  describe('/grant-permissions [POST]', () => {
    test.todo('this');
  });
});
