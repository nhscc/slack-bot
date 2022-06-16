import { ObjectId } from 'mongodb';
import { getCommonDummyData, mockDateNowMs } from 'multiverse/mongo-common';

import type { DummyData } from 'multiverse/mongo-test';
import type { InternalApi, InternalChapter } from 'universe/backend/db';

/**
 * Returns data used to hydrate databases and their collections.
 */
export function getDummyData(): DummyData {
  return getCommonDummyData({ 'hscc-slack': dummyAppData });
}

/**
 * The shape of the application database's test data.
 */
export type DummyAppData = {
  _generatedAt: number;
  chapters: InternalChapter[];
  apis: InternalApi[];
};

/**
 * Test data for the application database.
 */
export const dummyAppData: DummyAppData = {
  _generatedAt: mockDateNowMs,
  // ! Order matters in unit and integration tests, so APPEND ONLY
  chapters: [
    {
      _id: new ObjectId(),
      name: 'chapter-1',
      administrators: { primary: ['U012ABCDEF'], secondary: [] }
    },
    {
      _id: new ObjectId(),
      name: 'chapter-2',
      administrators: { primary: ['U345GHIJKL'], secondary: ['U678MNOPQR', 'U012ABCDEF'] }
    },
    {
      _id: new ObjectId(),
      name: 'chapter-3',
      administrators: { primary: [], secondary: ['U678MNOPQR'] }
    }
  ],
  apis: [
    {
      _id: new ObjectId(),
      name: 'api-name-1',
      uri: 'mongodb-uri-1',
      authVersion: 'legacy',
      lastUnbanAt: null
    },
    {
      _id: new ObjectId(),
      name: 'api-name-2',
      uri: 'mongodb-uri-2',
      authVersion: 'next-auth',
      lastUnbanAt: null
    },
    {
      _id: new ObjectId(),
      name: 'api-name-3',
      uri: 'mongodb-uri-3',
      authVersion: 'next-auth',
      lastUnbanAt: mockDateNowMs - 10 ** 5
    }
  ]
};
