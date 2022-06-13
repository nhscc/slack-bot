import { getCommonSchemaConfig } from 'multiverse/mongo-common';

import type { ObjectId, WithId, WithoutId } from 'mongodb';
import type { UnixEpochMs } from '@xunnamius/types';
import type { DbSchema } from 'multiverse/mongo-schema';

/**
 * A JSON representation of the backend Mongo database structure. This is used
 * for consistent app-wide db access across projects and to generate transient
 * versions of the db during testing.
 */
export function getSchemaConfig(): DbSchema {
  return getCommonSchemaConfig({
    databases: {
      'hscc-api-drive': {
        collections: [
          {
            name: 'users',
            // ? Collation allows for case-insensitive searching. See:
            // ? https://stackoverflow.com/a/40914924/1367414
            createOptions: { collation: { locale: 'en', strength: 2 } },
            indices: [
              { spec: 'key' },
              {
                spec: 'username',
                options: { unique: true }
              },
              {
                spec: 'email',
                options: { unique: true }
              }
            ]
          },
          {
            name: 'file-nodes',
            indices: [
              { spec: 'owner' },
              { spec: 'name-lowercase' },
              { spec: 'tags' },
              // ? Wildcard indices to index permissions object keys
              // ? https://www.mongodb.com/docs/manual/core/index-wildcard
              { spec: 'permissions.$**' }
            ]
          },
          {
            name: 'meta-nodes',
            indices: [
              { spec: 'owner' },
              { spec: 'name-lowercase' },
              { spec: 'contents' },
              // ? Wildcard indices to index permissions object keys
              // ? https://www.mongodb.com/docs/manual/core/index-wildcard
              { spec: 'permissions.$**' }
            ]
          }
        ]
      }
    },
    aliases: {}
  });
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface UserId extends ObjectId {}
export type Username = string;
// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface NodeId extends ObjectId {}

/**
 * The shape of a filesystem node lock.
 */
export type NodeLock = {
  user: Username;
  client: string;
  createdAt: UnixEpochMs;
};

/**
 * The shape of a filesystem node permission value.
 */
export type NodePermission = 'view' | 'edit';

/**
 * The shape of an internal filesystem file node.
 */
export type InternalFileNode = WithId<{
  type: 'file';
  owner: Username;
  createdAt: UnixEpochMs;
  modifiedAt: UnixEpochMs;
  name: string;
  'name-lowercase': string;
  size: number;
  text: string;
  tags: string[];
  lock: NodeLock | null;
  permissions: Record<Username, NodePermission>;
}>;

/**
 * The shape of a public filesystem file node.
 */
export type PublicFileNode = WithoutId<Omit<InternalFileNode, 'name-lowercase'>> & {
  node_id: string;
};

/**
 * The shape of a new filesystem file node.
 */
export type NewFileNode = Partial<
  Omit<
    WithoutId<InternalFileNode>,
    'owner' | 'createdAt' | 'modifiedAt' | 'name-lowercase' | 'size'
  >
>;

/**
 * The shape of a patch filesystem file node.
 */
export type PatchFileNode = Partial<
  Omit<
    WithoutId<InternalFileNode>,
    'type' | 'createdAt' | 'modifiedAt' | 'name-lowercase' | 'size'
  >
>;

/**
 * The shape of an internal filesystem meta node.
 */
export type InternalMetaNode = WithId<{
  type: 'directory' | 'symlink';
  owner: Username;
  createdAt: UnixEpochMs;
  name: string;
  'name-lowercase': string;
  contents: NodeId[];
  permissions: Record<Username, NodePermission>;
}>;

/**
 * The shape of a public filesystem meta node.
 */
export type PublicMetaNode = Omit<
  WithoutId<InternalMetaNode>,
  'contents' | 'name-lowercase'
> & {
  node_id: string;
  contents: string[];
};

/**
 * The shape of a new filesystem meta node.
 */
export type NewMetaNode = Partial<
  Omit<
    WithoutId<InternalMetaNode>,
    'owner' | 'createdAt' | 'name-lowercase' | 'contents'
  > & {
    contents: string[];
  }
>;

/**
 * The shape of a patch filesystem meta node.
 */
export type PatchMetaNode = Partial<
  Omit<
    WithoutId<InternalMetaNode>,
    'type' | 'createdAt' | 'name-lowercase' | 'contents'
  > & { contents: string[] }
>;

/**
 * The shape of an internal filesystem node.
 */
export type InternalNode = InternalFileNode | InternalMetaNode;

/**
 * The shape of a public filesystem node.
 */
export type PublicNode = PublicFileNode | PublicMetaNode;

/**
 * The shape of a new filesystem node.
 */
export type NewNode = NewFileNode | NewMetaNode;

/**
 * The shape of a patch filesystem node.
 */
export type PatchNode = PatchFileNode | PatchMetaNode;

/**
 * The shape of an internal application user.
 */
export type InternalUser = WithId<{
  username: Username;
  salt: string;
  email: string;
  key: string;
}>;

/**
 * The shape of a public application user.
 */
export type PublicUser = Omit<WithoutId<InternalUser>, 'key'> & { user_id: string };

/**
 * The shape of a new application user.
 */
export type NewUser = Partial<WithoutId<InternalUser>>;

/**
 * The shape of a patch application user.
 */
export type PatchUser = Partial<Omit<WithoutId<InternalUser>, 'username'>>;

/**
 * Transforms an internal filesystem node into a public node.
 */
export function toPublicNode(internalNode: InternalNode): PublicNode {
  const publicNodeIntersection = {
    node_id: internalNode._id.toString(),
    type: internalNode.type,
    owner: internalNode.owner,
    createdAt: internalNode.createdAt,
    name: internalNode.name,
    permissions: internalNode.permissions
  } as {
    [key in keyof PublicFileNode & keyof PublicMetaNode]:
      | PublicFileNode[key]
      | PublicMetaNode[key];
  };

  if (internalNode.type == 'file') {
    const publicNode = publicNodeIntersection as PublicFileNode;

    publicNode.modifiedAt = internalNode.modifiedAt;
    publicNode.size = internalNode.size;
    publicNode.text = internalNode.text;
    publicNode.tags = internalNode.tags;
    publicNode.lock = internalNode.lock;

    return publicNode;
  } else {
    const publicNode = publicNodeIntersection as PublicMetaNode;

    publicNode.contents = internalNode.contents.map((id) => id.toString());

    return publicNode;
  }
}

/**
 * Transforms an internal user into a public user.
 */
export function toPublicUser(internalUser: InternalUser): PublicUser {
  return {
    user_id: internalUser._id.toString(),
    username: internalUser.username,
    email: internalUser.email,
    salt: internalUser.salt
  };
}

export const publicUserProjection = {
  _id: false,
  user_id: { $toString: '$_id' },
  username: true,
  salt: true,
  email: true
} as const;

export const publicFileNodeProjection = {
  _id: false,
  node_id: { $toString: '$_id' },
  type: true,
  owner: true,
  createdAt: true,
  modifiedAt: true,
  name: true,
  size: true,
  text: true,
  tags: true,
  lock: true,
  permissions: true
} as const;

export const publicMetaNodeProjection = {
  _id: false,
  node_id: { $toString: '$_id' },
  type: true,
  owner: true,
  createdAt: true,
  name: true,
  contents: { $map: { input: '$contents', as: 'id', in: { $toString: '$$id' } } },
  permissions: true
} as const;
