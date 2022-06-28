import { globalJsonRequestOptions, jsonFetch } from 'multiverse/json-node-fetch';
import { MongoServerError, ObjectId } from 'mongodb';
import { isPlainObject } from 'is-plain-object';
import { getDb } from 'multiverse/mongo-schema';
import { itemExists } from 'multiverse/mongo-item';
import { getEnv } from 'universe/backend/env';
import { toss } from 'toss-expression';
import { ClientValidationError, ItemNotFoundError } from 'named-app-errors';
import { ErrorMessage } from 'universe/error';

import {
  ApiId,
  InternalApi,
  ChapterId,
  InternalChapter,
  publicApiProjection
} from 'universe/backend/db';

globalJsonRequestOptions.rejectIfNotOk = true;

const apiNameRegex = /^[a-z0-9-]+$/i;
const apiKeyRegex = /^[a-z0-9-]+$/;
const usernameRegex = /^[a-z0-9_-]+$/i;
const chapterNameRegex = /^[a-z0-9- ]+$/i;

/**
 * Validate an API name string for correctness.
 */
const isValidApiName = (name: unknown) => {
  return typeof name == 'string' && apiNameRegex.test(name);
};

/**
 * Validate an API key string for correctness.
 */
const isValidApiKey = (key: unknown) => {
  return typeof key == 'string' && apiKeyRegex.test(key);
};

/**
 * Validate a username string for correctness.
 */
const isValidUsername = (username: unknown) => {
  return typeof username == 'string' && usernameRegex.test(username);
};

/**
 * Validate a chapter name string for correctness.
 */
const isValidChapterName = (name: unknown) => {
  return typeof name == 'string' && chapterNameRegex.test(name);
};

const getCollections = async () => {
  const db = await getDb({ name: 'hscc-slack' });
  const apis = db.collection<InternalApi>('apis');
  const chapters = db.collection<InternalChapter>('chapters');

  return { apis, chapters };
};

export async function getAllApis() {
  const { apis } = await getCollections();

  return apis
    .find(
      {},
      {
        projection: publicApiProjection,
        limit: getEnv().RESULTS_PER_PAGE
      }
    )
    .toArray();
}

export async function createApiKey({
  api,
  chapter,
  invoker_user_id
}: {
  api: string | undefined;
  chapter: string | undefined;
  invoker_user_id: string | undefined;
}) {
  const { chapters, apis } = await getCollections();
  if (
    await chapters.findOne({
      name: chapter,
      $or: [
        { 'administrators.primary': invoker_user_id },
        { 'administrators.secondary': invoker_user_id }
      ]
    })
  ) {
    const { baseUri: uri } =
      (await apis.findOne({ name: api })) || toss(new ItemNotFoundError(api, 'api'));

    const res = await jsonFetch(`${uri}/sys/auth`, {
      method: 'POST',
      body: {
        // TODO
      }
    });
  }
}

export async function getApiKeys({
  invoker_user_id
}: {
  invoker_user_id: string | undefined;
}) {
  // TODO
}

export async function deleteApiKey({
  api,
  key,
  invoker_user_id
}: {
  api: string | undefined;
  key: string | undefined;
  invoker_user_id: string | undefined;
}) {
  // TODO
}

export async function unbanApiKey({
  api,
  key,
  invoker_user_id
}: {
  api: string | undefined;
  key: string | undefined;
  invoker_user_id: string | undefined;
}) {
  // TODO
}

export async function unbanIp({
  api,
  ip,
  invoker_user_id
}: {
  api: string | undefined;
  ip: string | undefined;
  invoker_user_id: string | undefined;
}) {
  // TODO
}

export async function grantPermissions({
  chapter,
  grantee_user_id,
  scope,
  invoker_user_id
}: {
  chapter: string | undefined;
  grantee_user_id: string | undefined;
  scope: string | undefined;
  invoker_user_id: string | undefined;
}) {
  // TODO
}

export async function revokePermissions({
  chapter,
  grantee_user_id,
  scope,
  invoker_user_id
}: {
  chapter: string | undefined;
  grantee_user_id: string | undefined;
  scope: string | undefined;
  invoker_user_id: string | undefined;
}) {
  // TODO
}

export async function getAllChapters() {
  // TODO
}

export async function createChapter({
  chapter,
  invoker_user_id
}: {
  chapter: string | undefined;
  invoker_user_id: string | undefined;
}) {
  // TODO
}
