import { MongoServerError, ObjectId } from 'mongodb';
import { isPlainObject } from 'is-plain-object';
import { getDb } from 'multiverse/mongo-schema';
import { itemExists } from 'multiverse/mongo-item';
import { getEnv } from 'universe/backend/env';
import { toss } from 'toss-expression';

import type {
  ApiId,
  InternalApi,
  PermissionId,
  InternalChapter
} from 'universe/backend/db';

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

export async function getAllApis() {
  const db = await getDb({ name: 'hscc-slack' });
  const apis = db.collection<InternalApi>('apis');

  return apis.find().sort({ _id: -1 }).limit(getEnv().RESULTS_PER_PAGE).toArray();
}

export async function createApiKey() {
  // TODO
}

export async function getApiKeys() {
  // TODO
}

export async function deleteApiKey() {
  // TODO
}

export async function unbanApiKey() {
  // TODO
}

export async function grantPermissions() {
  // TODO
}

export async function revokePermissions() {
  // TODO
}

export async function getAllChapters() {
  // TODO
}

export async function createChapter() {
  // TODO
}
