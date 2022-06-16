/* eslint-disable no-await-in-loop */
import { ObjectId } from 'mongodb';
import { useMockDateNow } from 'multiverse/mongo-common';
import { getDb } from 'multiverse/mongo-schema';
import { setupMemoryServerOverride } from 'multiverse/mongo-test';
import { dummyAppData } from 'testverse/db';
import { mockEnvFactory } from 'testverse/setup';
import { getEnv } from 'universe/backend/env';
import { ErrorMessage } from 'universe/error';

import * as Backend from 'universe/backend';

import type { InternalApi, InternalChapter } from 'universe/backend/db';

setupMemoryServerOverride();
useMockDateNow();

const withMockedEnv = mockEnvFactory({ NODE_ENV: 'test' });

describe('::getAllApis', () => {
  it('lists all APIs in the system, including if they are using legacy/next-auth', async () => {
    expect.hasAssertions();
  });

  it('does not crash when database is empty', async () => {
    expect.hasAssertions();
  });

  it('rejects if the invoker does not exist', async () => {
    expect.hasAssertions();
  });

  it('does not reject if the invoker is not associated with any chapter', async () => {
    expect.hasAssertions();
  });
});

describe('::createApiKey', () => {
  it('creates a new API key if given API name and chapter name', async () => {
    expect.hasAssertions();
  });

  it('creates a new API key if given only API name', async () => {
    expect.hasAssertions();
  });

  it('rejects if missing chapter name and invoker is an admin of multiple chapters', async () => {
    expect.hasAssertions();
  });

  it('rejects if missing both API name and chapter name', async () => {
    expect.hasAssertions();
  });

  it('rejects if the specified API does not exist', async () => {
    expect.hasAssertions();
  });

  it('rejects if the specified chapter does not exist', async () => {
    expect.hasAssertions();
  });

  it('rejects if the invoker does not exist', async () => {
    expect.hasAssertions();
  });

  it('rejects if the invoker is not associated with any chapter', async () => {
    expect.hasAssertions();
  });

  it('only allows primary and secondary admins and sysadmin to create new API keys', async () => {
    expect.hasAssertions();
  });
});

describe('::getApiKeys', () => {
  it('lists all relevant API keys if given API name and chapter name', async () => {
    expect.hasAssertions();
  });

  it('lists all relevant API keys if given only API name', async () => {
    expect.hasAssertions();
  });

  it('lists all API keys if missing both API name and chapter name', async () => {
    expect.hasAssertions();
  });

  it('rejects if the specified API does not exist', async () => {
    expect.hasAssertions();
  });

  it('rejects if the specified chapter does not exist', async () => {
    expect.hasAssertions();
  });

  it('rejects if the invoker does not exist', async () => {
    expect.hasAssertions();
  });

  it('rejects if the invoker is not associated with any chapter', async () => {
    expect.hasAssertions();
  });

  it('lists all API keys in existence if invoker is sysadmin', async () => {
    expect.hasAssertions();
  });
});

describe('::deleteApiKey', () => {
  it('deletes an API key if given API name and key', async () => {
    expect.hasAssertions();
  });

  it('rejects if missing either API name or key', async () => {
    expect.hasAssertions();
  });

  it('rejects if the specified API does not exist', async () => {
    expect.hasAssertions();
  });

  it('rejects if the specified API key does not exist', async () => {
    expect.hasAssertions();
  });

  it('rejects if the invoker does not exist', async () => {
    expect.hasAssertions();
  });

  it('rejects if the invoker is not associated with any chapter', async () => {
    expect.hasAssertions();
  });

  it('only allows primary and secondary admins and sysadmin to delete API keys', async () => {
    expect.hasAssertions();
  });
});

describe('::unbanApiKey', () => {
  it('unbans an API key if given API name and key', async () => {
    expect.hasAssertions();
  });

  it('rejects if too many unban attempts in too short a time period', async () => {
    expect.hasAssertions();
  });

  it('rejects if missing either API name or key', async () => {
    expect.hasAssertions();
  });

  it('rejects if the specified API does not exist', async () => {
    expect.hasAssertions();
  });

  it('rejects if the specified API key does not exist', async () => {
    expect.hasAssertions();
  });

  it('rejects if the invoker does not exist', async () => {
    expect.hasAssertions();
  });

  it('rejects if the invoker is not associated with any chapter', async () => {
    expect.hasAssertions();
  });

  it('rejects if API key is not banned', async () => {
    expect.hasAssertions();
  });

  it('only allows primary and secondary admins and sysadmin to unban', async () => {
    expect.hasAssertions();
  });

  it('supports multiple unbans in too short a time period from sysadmin', async () => {
    expect.hasAssertions();
  });
});

describe('::grantPermissions', () => {
  it('grants secondary permissions to a user if given username and chapter name and "secondary" designation', async () => {
    expect.hasAssertions();
  });

  it('grants secondary permissions to a user if given username and chapter name', async () => {
    expect.hasAssertions();
  });

  it('grants secondary permissions to a user if given username', async () => {
    expect.hasAssertions();
  });

  it('rejects if missing both username and chapter name', async () => {
    expect.hasAssertions();
  });

  it('rejects if missing chapter name and invoker is an admin of multiple chapters', async () => {
    expect.hasAssertions();
  });

  it('rejects if the user does not exist', async () => {
    expect.hasAssertions();
  });

  it('rejects if the invoker does not exist', async () => {
    expect.hasAssertions();
  });

  it('rejects if the invoker is not associated with any chapter', async () => {
    expect.hasAssertions();
  });

  it('rejects granting permissions if grantee already has primary or secondary permissions', async () => {
    // TODO: if primary, cannot also be secondary; if secondary, cannot also be primary
    expect.hasAssertions();
  });

  it('invoker cannot grant permissions to self', async () => {
    expect.hasAssertions();
  });

  it('only allows primary admins and sysadmin to grant permissions', async () => {
    expect.hasAssertions();
  });

  it('only allows sysadmin to use "primary" designation', async () => {
    expect.hasAssertions();
  });
});

describe('::revokePermissions', () => {
  it("revokes user's permissions if given username and chapter name", async () => {
    expect.hasAssertions();
  });

  it("revokes user's permissions if given username", async () => {
    expect.hasAssertions();
  });

  it('rejects if missing both username and chapter name', async () => {
    expect.hasAssertions();
  });

  it('rejects if missing chapter name and invoker is an admin of multiple chapters', async () => {
    expect.hasAssertions();
  });

  it('rejects if the user does not exist', async () => {
    expect.hasAssertions();
  });

  it('rejects if the invoker does not exist', async () => {
    expect.hasAssertions();
  });

  it('rejects if the invoker is not associated with any chapter', async () => {
    expect.hasAssertions();
  });

  it('rejects revoking permissions if user has no permissions over API', async () => {
    // TODO: if primary, cannot also be secondary; if secondary, cannot also be primary
    expect.hasAssertions();
  });

  it('invoker cannot revoke own permissions', async () => {
    expect.hasAssertions();
  });

  it('only allows primary admins and sysadmin to revoke permissions', async () => {
    expect.hasAssertions();
  });

  it('only allows sysadmin to revoke primary admin permissions', async () => {
    expect.hasAssertions();
  });
});

describe('::getAllChapters', () => {
  it('lists all chapters in the system along with the usernames and designations of their administrators', async () => {
    expect.hasAssertions();
  });

  it('rejects if the invoker does not exist', async () => {
    expect.hasAssertions();
  });

  it('does not reject if the invoker is not associated with any chapter', async () => {
    expect.hasAssertions();
  });

  it('does not crash when database is empty', async () => {
    expect.hasAssertions();
  });
});

describe('::createChapter', () => {
  it('creates a new chapter if given chapter name', async () => {
    expect.hasAssertions();
  });

  it('rejects if missing chapter name', async () => {
    expect.hasAssertions();
  });

  it('rejects if a chapter with the specified name already exists', async () => {
    expect.hasAssertions();
  });

  it('rejects if the invoker does not exist', async () => {
    expect.hasAssertions();
  });

  it('rejects if invoker is not sysadmin', async () => {
    expect.hasAssertions();
  });
});
