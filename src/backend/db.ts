import { getCommonSchemaConfig } from 'multiverse/mongo-common';

import type { ObjectId, WithId, WithoutId } from 'mongodb';
import type { DbSchema } from 'multiverse/mongo-schema';
import { AppValidationError } from 'named-app-errors';

/**
 * A JSON representation of the backend Mongo database structure. This is used
 * for consistent app-wide db access across projects and to generate transient
 * versions of the db during testing.
 */
export function getSchemaConfig(): DbSchema {
  return getCommonSchemaConfig({
    databases: {
      'hscc-slack': {
        collections: [
          {
            name: 'chapters',
            // ? Collation allows for case-insensitive searching. See:
            // ? https://stackoverflow.com/a/40914924/1367414
            createOptions: { collation: { locale: 'en', strength: 2 } },
            indices: [
              { spec: 'name', options: { unique: true } },
              { spec: 'administrators.primary' },
              { spec: 'administrators.secondary' }
            ]
          },
          {
            name: 'apis',
            // ? Collation allows for case-insensitive searching. See:
            // ? https://stackoverflow.com/a/40914924/1367414
            createOptions: { collation: { locale: 'en', strength: 2 } },
            indices: [
              {
                spec: 'name',
                options: { unique: true }
              }
            ]
          }
        ]
      }
    },
    aliases: {}
  });
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ChapterId extends ObjectId {}
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ApiId extends ObjectId {}

/**
 * The shape of an internal chapters entry.
 */
export type InternalChapter = WithId<{
  name: string;
  administrators: {
    primary: string[];
    secondary: string[];
  };
}>;

/**
 * The shape of an internal apis entry.
 */
export type InternalApi = WithId<{
  name: string;
  baseUri: string;
  latestUnbans: {
    ip: { [chapter: string]: number };
    key: { [chapter: string]: number };
  };
}>;

/**
 * The shape of a public chapters item.
 */
export type PublicChapter = WithoutId<Pick<InternalChapter, 'name'>>;

/**
 * The shape of a public apis item.
 */
export type PublicApi = WithoutId<Pick<InternalApi, 'baseUri' | 'name'>>;

/**
 * A MongoDB PublicChapter projection.
 */
export const publicChapterProjection = { _id: false, name: true };

/**
 * A MongoDB PublicApi projection.
 */
export const publicApiProjection = { _id: false, name: true, baseUri: true };

/**
 * Type guard for the {@link InternalChapter} type.
 */
export function isInternalChapter(object: unknown): object is InternalChapter {
  return !!(object as InternalChapter).administrators;
}

/**
 * Type guard for the {@link InternalApi} type.
 */
export function isInternalApi(object: unknown): object is InternalApi {
  return !!(object as InternalApi).baseUri;
}

/**
 * Translates an internal DB entry into an item that is safe for public
 * consumption.
 */
export function toPublicEntry(entry: InternalChapter): PublicChapter;
export function toPublicEntry(entry: InternalApi): PublicApi;
export function toPublicEntry(
  entry: InternalChapter | InternalApi
): PublicChapter | PublicApi {
  if (isInternalChapter(entry)) {
    return { name: entry.name };
  } else if (isInternalApi(entry)) {
    return { name: entry.name, baseUri: entry.baseUri };
  } else {
    throw new AppValidationError('unable to translate object into a public entry');
  }
}
