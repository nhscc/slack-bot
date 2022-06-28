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

const knownChapterId = new ObjectId();

/**
 * Test data for the application database.
 */
export const dummyAppData: DummyAppData = {
  _generatedAt: mockDateNowMs,
  // ! Order matters in unit and integration tests, so APPEND ONLY
  chapters: [
    {
      _id: knownChapterId,
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
      name: 'legacy-api-name-1',
      baseUri: 'https://mongodb.uri.1.com',
      latestUnbans: {
        ip: {},
        key: {}
      }
    },
    {
      _id: new ObjectId(),
      name: 'latest-api-name-2',
      baseUri: 'https://mongodb.uri.2.com',
      latestUnbans: {
        ip: { [knownChapterId.toString()]: mockDateNowMs - 10 ** 5 },
        key: {}
      }
    },
    {
      _id: new ObjectId(),
      name: 'latest-api-name-3',
      baseUri: 'https://mongodb.uri.3.com',
      latestUnbans: {
        ip: {},
        key: { [knownChapterId.toString()]: mockDateNowMs - 10 ** 5 }
      }
    }
  ]
};
