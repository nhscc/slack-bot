import { getCommonSchemaConfig } from 'multiverse/mongo-common';

import type { ObjectId, WithId } from 'mongodb';
import type { DbSchema } from 'multiverse/mongo-schema';

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
export interface PermissionId extends ObjectId {}
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
  uri: string;
  authVersion: 'legacy' | 'next-auth';
  lastUnbanAt: number | null;
}>;
