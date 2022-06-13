import { MongoServerError, ObjectId } from 'mongodb';
import {
  ItemNotFoundError,
  ItemsNotFoundError,
  ValidationError,
  ErrorMessage
} from 'universe/error';
import { isPlainObject } from 'is-plain-object';
import { getDb } from 'multiverse/mongo-schema';
import { itemExists } from 'multiverse/mongo-item';
import { getEnv } from 'universe/backend/env';
import { toss } from 'toss-expression';

import {
  publicFileNodeProjection,
  publicMetaNodeProjection,
  publicUserProjection
} from 'universe/backend/db';

import type {
  PublicNode,
  NewNode,
  PatchNode,
  PublicUser,
  NewUser,
  PatchUser,
  Username,
  NodePermission,
  UserId,
  InternalUser,
  InternalNode,
  InternalFileNode,
  InternalMetaNode,
  NewFileNode,
  NewMetaNode,
  PatchFileNode,
  PatchMetaNode
} from 'universe/backend/db';

// TODO: switch to using itemToObjectId from mongo-item library

const emailRegex = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;
const usernameRegex = /^[a-zA-Z0-9_-]+$/;
const hexadecimalRegex = /^[a-fA-F0-9]+$/;

/**
 * Node properties that can be matched against with `searchNodes()` matchers.
 * Proxied properties should be listed in their final form.
 *
 * Specifically does not include tags or permissions, which are handled
 * specially.
 */
const matchableStrings = [
  'type',
  'owner',
  'createdAt',
  'modifiedAt',
  'name-lowercase', // * Proxied from name
  'size',
  'text'
];

/**
 * Node properties that can be matched against with `searchNodes()`
 * regexMatchers. Must be string fields. Proxied properties should be listed in
 * their final form.
 *
 * Specifically does not include tags or permissions, which are handled
 * specially.
 */
const regexMatchableStrings = [
  'type',
  'owner',
  'name-lowercase', // * Proxied from name
  'text'
];

/**
 * Whitelisted MongoDB sub-matchers that can be used with `searchNodes()`, not
 * including the special "$or" sub-matcher.
 */
const matchableSubStrings = ['$gt', '$lt', '$gte', '$lte'];

/**
 * Whitelisted MongoDB-esque sub-specifiers that can be used with
 * `searchNodes()` via the "$or" sub-matcher.
 */
type SubSpecifierObject = {
  [subspecifier in '$gt' | '$lt' | '$gte' | '$lte']?: number;
};

/**
 * Convert an array of node_id strings into a set of node_id ObjectIds.
 * TODO: replace with ItemToObjectIds
 */
const normalizeNodeIds = (ids: string[]) => {
  let node_id = '<uninitialized>';
  try {
    return Array.from(new Set(ids)).map((id) => {
      node_id = id;
      return new ObjectId(id);
    });
  } catch {
    throw new ValidationError(ErrorMessage.InvalidObjectId(node_id));
  }
};

/**
 * Convert an array of strings into a set of proper node tags (still strings).
 */
const normalizeTags = (tags: string[]) => {
  return Array.from(new Set(tags.map((tag) => tag.toLowerCase())));
};

/**
 * Validate a username string for correctness.
 */
const validateUsername = (username: unknown) => {
  return (
    typeof username == 'string' &&
    usernameRegex.test(username) &&
    username.length >= getEnv().MIN_USER_NAME_LENGTH &&
    username.length <= getEnv().MAX_USER_NAME_LENGTH
  );
};

/**
 * Validate a new or patch user data object.
 */
const validateUserData = (
  data: NewUser | PatchUser,
  { required }: { required: boolean }
) => {
  if (!isPlainObject(data)) {
    throw new ValidationError(ErrorMessage.InvalidJSON());
  }

  const {
    USER_KEY_LENGTH,
    USER_SALT_LENGTH,
    MIN_USER_EMAIL_LENGTH,
    MAX_USER_EMAIL_LENGTH
  } = getEnv();

  if (
    (required || (!required && data.email !== undefined)) &&
    (typeof data.email != 'string' ||
      !emailRegex.test(data.email) ||
      data.email.length < MIN_USER_EMAIL_LENGTH ||
      data.email.length > MAX_USER_EMAIL_LENGTH)
  ) {
    throw new ValidationError(
      ErrorMessage.InvalidStringLength(
        'email',
        MIN_USER_EMAIL_LENGTH,
        MAX_USER_EMAIL_LENGTH,
        'string'
      )
    );
  }

  if (
    (required || (!required && data.salt !== undefined)) &&
    (typeof data.salt != 'string' ||
      !hexadecimalRegex.test(data.salt) ||
      data.salt.length != USER_SALT_LENGTH)
  ) {
    throw new ValidationError(
      ErrorMessage.InvalidStringLength('salt', USER_SALT_LENGTH, null, 'hexadecimal')
    );
  }

  if (
    (required || (!required && data.key !== undefined)) &&
    (typeof data.key != 'string' ||
      !hexadecimalRegex.test(data.key) ||
      data.key.length != USER_KEY_LENGTH)
  ) {
    throw new ValidationError(
      ErrorMessage.InvalidStringLength('key', USER_KEY_LENGTH, null, 'hexadecimal')
    );
  }
};

/**
 * Validate a new or patch file or meta node data object. If no `type` is
 * explicitly provided, a data must be a valid NewNode instance with all
 * required fields. If `type` is provided, data must be a valid PatchNode
 * instance where all fields are optional.
 */
const validateNodeData = async (
  data: NewNode | PatchNode,
  { type }: { type: NonNullable<NewNode['type']> | null }
) => {
  if (!isPlainObject(data)) {
    throw new ValidationError(ErrorMessage.InvalidJSON());
  }

  const isNewNode = (_obj: typeof data): _obj is NewNode => {
    return type === null;
  };

  const isNewFileNode = (obj: NewNode): obj is NewFileNode => {
    return isNewNode(obj) && obj.type == 'file';
  };

  const isNewMetaNode = (obj: NewNode): obj is NewMetaNode => {
    return isNewNode(obj) && obj.type != 'file';
  };

  const isPatchNode = (_obj: typeof data): _obj is PatchNode => {
    return type !== null;
  };

  const isPatchFileNode = (obj: typeof data): obj is PatchFileNode => {
    return isPatchNode(obj) && type == 'file';
  };

  const isPatchMetaNode = (obj: typeof data): obj is PatchMetaNode => {
    return isPatchNode(obj) && type != 'file';
  };

  const {
    MAX_USER_NAME_LENGTH,
    MIN_USER_NAME_LENGTH,
    MAX_LOCK_CLIENT_LENGTH,
    MAX_NODE_NAME_LENGTH,
    MAX_NODE_TAGS,
    MAX_NODE_TAG_LENGTH,
    MAX_NODE_PERMISSIONS,
    MAX_NODE_CONTENTS,
    MAX_NODE_TEXT_LENGTH_BYTES
  } = getEnv();

  const db = await getDb({ name: 'hscc-api-drive' });
  const users = db.collection('users');

  if (isNewNode(data)) {
    if (
      typeof data.type != 'string' ||
      !['file', 'directory', 'symlink'].includes(data.type)
    ) {
      throw new ValidationError(ErrorMessage.InvalidFieldValue('type'));
    }
  }

  const typeActual = (isNewNode(data) ? data.type : type) as NonNullable<NewNode['type']>;

  if (isNewNode(data) || data.name !== undefined) {
    if (
      typeof data.name != 'string' ||
      !data.name.length ||
      data.name.length > MAX_NODE_NAME_LENGTH
    ) {
      throw new ValidationError(
        ErrorMessage.InvalidStringLength('name', 1, MAX_NODE_NAME_LENGTH, 'string')
      );
    }
  }

  if (isNewNode(data) || data.permissions !== undefined) {
    if (!data.permissions || !isPlainObject(data.permissions)) {
      throw new ValidationError(ErrorMessage.InvalidFieldValue('permissions'));
    } else {
      const permsEntries = Object.entries(data.permissions);

      if (
        !permsEntries.every(([k, v]) => {
          return (
            typeof k == 'string' &&
            ['view', 'edit'].includes(v) &&
            (k != 'public' || (typeActual == 'file' && v == 'view'))
          );
        })
      ) {
        throw new ValidationError(ErrorMessage.InvalidObjectKeyValue('permissions'));
      } else if (permsEntries.length > MAX_NODE_PERMISSIONS) {
        throw new ValidationError(ErrorMessage.TooManyItemsRequested('permissions'));
      } else {
        await Promise.all(
          permsEntries.map(async ([username]) => {
            if (
              username != 'public' &&
              !(await itemExists(users, { key: 'username', id: username }))
            ) {
              throw new ItemNotFoundError(username, 'user (permissions)');
            }
          })
        );
      }
    }
  }

  if (isNewFileNode(data) || (isPatchFileNode(data) && data.text !== undefined)) {
    if (typeof data.text != 'string' || data.text.length > MAX_NODE_TEXT_LENGTH_BYTES) {
      throw new ValidationError(
        ErrorMessage.InvalidStringLength('text', 0, MAX_NODE_TEXT_LENGTH_BYTES, 'bytes')
      );
    }
  }

  if (isNewFileNode(data) || (isPatchFileNode(data) && data.tags !== undefined)) {
    if (!Array.isArray(data.tags)) {
      throw new ValidationError(ErrorMessage.InvalidFieldValue('tags'));
    } else if (data.tags.length > MAX_NODE_TAGS) {
      throw new ValidationError(ErrorMessage.TooManyItemsRequested('tags'));
    } else if (
      !data.tags.every(
        (tag) =>
          tag &&
          typeof tag == 'string' &&
          tag.length >= 1 &&
          tag.length <= MAX_NODE_TAG_LENGTH
      )
    ) {
      throw new ValidationError(
        ErrorMessage.InvalidStringLength(
          'tags',
          1,
          MAX_NODE_TAG_LENGTH,
          'alphanumeric',
          false,
          true
        )
      );
    }
  }

  if (isNewFileNode(data) || (isPatchFileNode(data) && data.lock !== undefined)) {
    if (data.lock !== null) {
      if (!data.lock || !isPlainObject(data.lock)) {
        throw new ValidationError(ErrorMessage.InvalidFieldValue('lock'));
      } else if (!validateUsername(data.lock.user)) {
        throw new ValidationError(
          ErrorMessage.InvalidStringLength(
            'lock.user',
            MIN_USER_NAME_LENGTH,
            MAX_USER_NAME_LENGTH
          )
        );
      } else if (
        typeof data.lock.client != 'string' ||
        data.lock.client.length < 1 ||
        data.lock.client.length > MAX_LOCK_CLIENT_LENGTH
      ) {
        throw new ValidationError(
          ErrorMessage.InvalidStringLength(
            'lock.client',
            1,
            MAX_LOCK_CLIENT_LENGTH,
            'string'
          )
        );
      } else if (typeof data.lock.createdAt != 'number' || data.lock.createdAt <= 0) {
        throw new ValidationError(ErrorMessage.InvalidFieldValue('lock.createdAt'));
      } else if (Object.keys(data.lock).length != 3) {
        throw new ValidationError(ErrorMessage.InvalidObjectKeyValue('lock'));
      }
    }
  }

  if (isNewMetaNode(data) || (isPatchMetaNode(data) && data.contents !== undefined)) {
    if (!Array.isArray(data.contents)) {
      throw new ValidationError(ErrorMessage.InvalidFieldValue('contents'));
    } else if (
      data.contents.length > MAX_NODE_CONTENTS ||
      (typeActual == 'symlink' && data.contents.length > 1)
    ) {
      throw new ValidationError(ErrorMessage.TooManyItemsRequested('content node_ids'));
    } else {
      const fileNodes = db.collection('file-nodes');
      const metaNodes = db.collection('meta-nodes');

      await Promise.all(
        data.contents.map(async (node_id) => {
          try {
            if (
              !(await itemExists(fileNodes, node_id)) &&
              !(await itemExists(metaNodes, node_id))
            ) {
              throw new ItemNotFoundError(node_id, 'node_id');
            }
          } catch (e) {
            if (e instanceof ItemNotFoundError) {
              throw e;
            } else {
              throw new ValidationError(
                ErrorMessage.InvalidArrayValue('contents', node_id)
              );
            }
          }
        })
      );
    }
  }

  if (isPatchNode(data) && data.owner !== undefined) {
    if (!(await itemExists(users, { key: 'username', id: data.owner }))) {
      throw new ItemNotFoundError(data.owner, 'user');
    }
  }
};

export async function getAllUsers({
  after
}: {
  after: string | null;
}): Promise<PublicUser[]> {
  const afterId: UserId | null = (() => {
    try {
      return after ? new ObjectId(after) : null;
    } catch {
      throw new ValidationError(ErrorMessage.InvalidObjectId(after as string));
    }
  })();

  const db = await getDb({ name: 'hscc-api-drive' });
  const users = db.collection<InternalUser>('users');

  if (afterId && !(await itemExists(users, afterId))) {
    throw new ItemNotFoundError(after, 'user_id');
  }

  return users
    .find(afterId ? { _id: { $lt: afterId } } : {})
    .sort({ _id: -1 })
    .limit(getEnv().RESULTS_PER_PAGE)
    .project<PublicUser>(publicUserProjection)
    .toArray();
}

export async function getUser({ username }: { username: Username }): Promise<PublicUser> {
  const db = await getDb({ name: 'hscc-api-drive' });
  const users = db.collection<InternalUser>('users');

  return (
    (await users.find({ username }).project<PublicUser>(publicUserProjection).next()) ||
    toss(new ItemNotFoundError(username, 'user'))
  );
}

export async function createUser({ data }: { data: NewUser }): Promise<PublicUser> {
  validateUserData(data, { required: true });

  const { MAX_USER_NAME_LENGTH, MIN_USER_NAME_LENGTH } = getEnv();

  if (!validateUsername(data.username)) {
    throw new ValidationError(
      ErrorMessage.InvalidStringLength(
        'username',
        MIN_USER_NAME_LENGTH,
        MAX_USER_NAME_LENGTH
      )
    );
  }

  if (data.username == 'public') {
    throw new ValidationError(ErrorMessage.IllegalUsername());
  }

  const { email, username, key, salt, ...rest } = data as Required<NewUser>;
  const restKeys = Object.keys(rest);

  if (restKeys.length != 0) {
    throw new ValidationError(ErrorMessage.UnknownField(restKeys[0]));
  }

  const db = await getDb({ name: 'hscc-api-drive' });
  const users = db.collection<InternalUser>('users');

  // * At this point, we can finally trust this data is not malicious, but not
  // * necessarily valid...
  try {
    await users.insertOne({
      _id: new ObjectId(),
      username,
      email,
      salt: salt.toLowerCase(),
      key: key.toLowerCase()
    });
  } catch (e) {
    if (e instanceof MongoServerError && e.code == 11000) {
      if (e.keyPattern?.username !== undefined) {
        throw new ValidationError(ErrorMessage.DuplicateFieldValue('username'));
      }

      if (e.keyPattern?.email !== undefined) {
        throw new ValidationError(ErrorMessage.DuplicateFieldValue('email'));
      }
    }

    throw e;
  }

  return getUser({ username });
}

export async function updateUser({
  username,
  data
}: {
  username: Username;
  data: PatchUser;
}): Promise<void> {
  if (data && !Object.keys(data).length) return;
  validateUserData(data, { required: false });

  const { email, key, salt, ...rest } = data as Required<PatchUser>;
  const restKeys = Object.keys(rest);

  if (restKeys.length != 0) {
    throw new ValidationError(ErrorMessage.UnknownField(restKeys[0]));
  }

  const db = await getDb({ name: 'hscc-api-drive' });
  const users = db.collection<InternalUser>('users');

  // * At this point, we can finally trust this data is not malicious, but not
  // * necessarily valid...
  try {
    const result = await users.updateOne(
      { username },
      {
        $set: {
          ...(email ? { email } : {}),
          ...(salt ? { salt: salt.toLowerCase() } : {}),
          ...(key ? { key: key.toLowerCase() } : {})
        }
      }
    );

    if (!result.modifiedCount) {
      throw new ItemNotFoundError(username, 'user');
    }
  } catch (e) {
    if (e instanceof MongoServerError && e.code == 11000) {
      if (e.keyPattern?.email !== undefined) {
        throw new ValidationError(ErrorMessage.DuplicateFieldValue('email'));
      }
    }

    throw e;
  }
}

export async function deleteUser({ username }: { username: Username }): Promise<void> {
  const db = await getDb({ name: 'hscc-api-drive' });
  const users = db.collection<InternalUser>('users');
  const fileNodes = db.collection<InternalNode>('file-nodes');
  const metaNodes = db.collection<InternalNode>('meta-nodes');
  const result = await users.deleteOne({ username });

  if (!result.deletedCount) {
    throw new ItemNotFoundError(username, 'user');
  }

  await Promise.all(
    [fileNodes, metaNodes].map((col) =>
      col.updateMany(
        { [`permissions.${username}`]: { $exists: true } },
        { $unset: { [`permissions.${username}`]: '' } }
      )
    )
  );
}

export async function authAppUser({
  username,
  key
}: {
  username: Username;
  key: string;
}): Promise<boolean> {
  if (!key) return false;

  const db = await getDb({ name: 'hscc-api-drive' });
  const users = db.collection<InternalUser>('users');

  return !!(await users.countDocuments({ username, key }));
}

export async function getNodes({
  username,
  node_ids
}: {
  username: Username;
  node_ids: string[];
}): Promise<PublicNode[]> {
  const db = await getDb({ name: 'hscc-api-drive' });
  const users = db.collection<InternalUser>('users');

  if (node_ids.length > getEnv().MAX_PARAMS_PER_REQUEST) {
    throw new ValidationError(ErrorMessage.TooManyItemsRequested('node_ids'));
  }

  if (!(await itemExists(users, { key: 'username', id: username }))) {
    throw new ItemNotFoundError(username, 'user');
  }

  const nodeIds = normalizeNodeIds(node_ids);
  const $match = {
    _id: { $in: nodeIds },
    $or: [{ owner: username }, { [`permissions.${username}`]: { $exists: true } }]
  };

  const nodes = await db
    .collection('file-nodes')
    .aggregate<PublicNode>([
      { $match },
      { $project: { ...publicFileNodeProjection, _id: true } },
      {
        $unionWith: {
          coll: 'meta-nodes',
          pipeline: [{ $match }, { $project: { ...publicMetaNodeProjection, _id: true } }]
        }
      },
      { $sort: { _id: -1 } },
      { $limit: getEnv().RESULTS_PER_PAGE },
      { $project: { _id: false } }
    ])
    .toArray();

  if (nodes.length != node_ids.length) {
    throw new ItemsNotFoundError('node_ids');
  } else return nodes;
}

export async function searchNodes({
  username,
  after,
  match,
  regexMatch
}: {
  username: Username;
  after: string | null;
  match: {
    [specifier: string]:
      | string
      | string[]
      | number
      | boolean
      | SubSpecifierObject
      | { $or: SubSpecifierObject[] }
      | Record<string, NodePermission>;
  };
  regexMatch: {
    [specifier: string]: string;
  };
}): Promise<PublicNode[]> {
  const { MAX_SEARCHABLE_TAGS, RESULTS_PER_PAGE } = getEnv();

  // ? Derive the actual after_id
  const afterId: UserId | null = (() => {
    try {
      return after ? new ObjectId(after) : null;
    } catch {
      throw new ValidationError(ErrorMessage.InvalidObjectId(after as string));
    }
  })();

  // ? Initial matcher validation
  if (!isPlainObject(match)) {
    throw new ValidationError(ErrorMessage.InvalidMatcher('match'));
  } else if (!isPlainObject(regexMatch)) {
    throw new ValidationError(ErrorMessage.InvalidMatcher('regexMatch'));
  }

  // ? Handle aliasing/proxying
  [regexMatch, match].forEach((matchSpec) => {
    if (typeof matchSpec.name == 'string') {
      matchSpec['name-lowercase'] = matchSpec.name.toLowerCase();
      delete matchSpec.name;
    }

    if (Array.isArray(matchSpec.tags)) {
      matchSpec.tags = normalizeTags(matchSpec.tags);
    }
  });

  // ? Validate username and after_id

  const db = await getDb({ name: 'hscc-api-drive' });
  const users = db.collection<InternalUser>('users');
  const fileNodes = db.collection('file-nodes');
  const metaNodes = db.collection('meta-nodes');

  if (
    afterId &&
    !(await itemExists(fileNodes, afterId)) &&
    !(await itemExists(metaNodes, afterId))
  ) {
    throw new ItemNotFoundError(after, 'node_id');
  }

  if (!(await itemExists(users, { key: 'username', id: username }))) {
    throw new ItemNotFoundError(username, 'user');
  }

  // ? Validate the match object
  let sawPermissionsSpecifier = false;
  for (const [key, val] of Object.entries(match)) {
    if (key == 'tags') {
      if (!Array.isArray(val)) {
        throw new ValidationError(
          ErrorMessage.InvalidSpecifierValueType(key, 'an array')
        );
      }

      if (val.length > MAX_SEARCHABLE_TAGS) {
        throw new ValidationError(ErrorMessage.TooManyItemsRequested('searchable tags'));
      }
    } else if (key == 'permissions') {
      throw new ValidationError(ErrorMessage.UnknownPermissionsSpecifier());
    } else if (key.startsWith('permissions.')) {
      if (sawPermissionsSpecifier) {
        throw new ValidationError(
          ErrorMessage.TooManyItemsRequested('permissions specifiers')
        );
      }
      sawPermissionsSpecifier = true;
    } else {
      if (!matchableStrings.includes(key)) {
        throw new ValidationError(ErrorMessage.UnknownSpecifier(key));
      }

      if (isPlainObject(val)) {
        let valNotEmpty = false;

        for (const [subkey, subval] of Object.entries(val)) {
          if (subkey == '$or') {
            if (!Array.isArray(subval) || subval.length != 2) {
              throw new ValidationError(ErrorMessage.InvalidOrSpecifier());
            }

            if (
              subval.every((sv, ndx) => {
                if (!isPlainObject(sv)) {
                  throw new ValidationError(
                    ErrorMessage.InvalidOrSpecifierNonObject(ndx)
                  );
                }

                const entries = Object.entries(sv);

                if (!entries.length) return false;
                if (entries.length != 1) {
                  throw new ValidationError(
                    ErrorMessage.InvalidOrSpecifierBadLength(ndx)
                  );
                }

                entries.forEach(([k, v]) => {
                  if (!matchableSubStrings.includes(k)) {
                    throw new ValidationError(
                      ErrorMessage.InvalidOrSpecifierInvalidKey(ndx, k)
                    );
                  }

                  if (typeof v != 'number') {
                    throw new ValidationError(
                      ErrorMessage.InvalidOrSpecifierInvalidValueType(ndx, k)
                    );
                  }
                });

                return true;
              })
            ) {
              valNotEmpty = true;
            }
          } else {
            valNotEmpty = true;
            if (!matchableSubStrings.includes(subkey)) {
              throw new ValidationError(ErrorMessage.UnknownSpecifier(subkey, true));
            }

            if (typeof subval != 'number') {
              throw new ValidationError(
                ErrorMessage.InvalidSpecifierValueType(subkey, 'a number', true)
              );
            }
          }
        }

        if (!valNotEmpty)
          throw new ValidationError(
            ErrorMessage.InvalidSpecifierValueType(key, 'a non-empty object')
          );
      } else if (val !== null && !['number', 'string', 'boolean'].includes(typeof val)) {
        throw new ValidationError(
          ErrorMessage.InvalidSpecifierValueType(
            key,
            'a number, string, boolean, or sub-specifier object'
          )
        );
      }
    }
  }

  // ? Validate the regexMatch object
  for (const [key, val] of Object.entries(regexMatch)) {
    if (key == 'permissions') {
      throw new ValidationError(ErrorMessage.UnknownPermissionsSpecifier());
    } else if (key.startsWith('permissions.')) {
      if (sawPermissionsSpecifier) {
        throw new ValidationError(
          ErrorMessage.TooManyItemsRequested('permissions specifiers')
        );
      }
      sawPermissionsSpecifier = true;
    } else {
      if (!regexMatchableStrings.includes(key)) {
        throw new ValidationError(ErrorMessage.UnknownSpecifier(key));
      }

      if (!val || typeof val != 'string') {
        throw new ValidationError(ErrorMessage.InvalidRegexString(key));
      }
    }
  }

  // ? Construct aggregation primitives

  const finalRegexMatch = Object.entries(regexMatch).reduce((obj, [spec, val]) => {
    obj[spec] = { $regex: val, $options: 'mi' };
    return obj;
  }, {} as Record<string, unknown>);

  const orMatcher: { [key: string]: SubSpecifierObject }[] = [];
  const tagsMatcher: { tags?: { $in: string[] } } = {};

  // ? Special handling for tags matching
  if (match.tags) {
    tagsMatcher.tags = { $in: match.tags as string[] };
    delete match.tags;
  }

  // ? Separate out the $or sub-specifiers for special treatment
  Object.entries(match).forEach(([spec, val]) => {
    if (isPlainObject(val)) {
      const obj = val as { $or?: unknown };

      if (obj.$or) {
        (obj.$or as SubSpecifierObject[]).forEach((operand) =>
          orMatcher.push({
            [spec]: operand
          })
        );
        delete obj.$or;
      }

      // ? Delete useless matchers if they've been emptied out
      if (obj && !Object.keys(obj).length) delete match[spec];
    }
  });

  const $match = {
    ...(afterId ? { _id: { $lt: afterId } } : {}),
    ...match,
    $and: [
      { $or: [{ owner: username }, { [`permissions.${username}`]: { $exists: true } }] },
      ...(orMatcher.length ? [{ $or: orMatcher }] : [])
    ],
    ...tagsMatcher,
    ...finalRegexMatch
  };

  const pipeline = [
    { $match },
    { $project: { ...publicFileNodeProjection, _id: true } },
    {
      $unionWith: {
        coll: 'meta-nodes',
        pipeline: [{ $match }, { $project: { ...publicMetaNodeProjection, _id: true } }]
      }
    },
    { $sort: { _id: -1 } },
    { $limit: RESULTS_PER_PAGE },
    { $project: { _id: false } }
  ];

  // ? Run the aggregation and return the result
  return db.collection('file-nodes').aggregate<PublicNode>(pipeline).toArray();
}

export async function createNode({
  username,
  data
}: {
  username: Username;
  data: NewNode;
}): Promise<PublicNode> {
  await validateNodeData(data, { type: null });

  const db = await getDb({ name: 'hscc-api-drive' });
  const users = db.collection<InternalUser>('users');
  const node_id = new ObjectId();

  if (!(await itemExists(users, { key: 'username', id: username }))) {
    throw new ItemNotFoundError(username, 'user');
  }

  if (data.type == 'file') {
    const fileNodes = db.collection<InternalFileNode>('file-nodes');
    const { type, name, text, tags, lock, permissions, ...rest } =
      data as Required<NewFileNode>;
    const restKeys = Object.keys(rest);

    if (restKeys.length != 0) {
      throw new ValidationError(ErrorMessage.UnknownField(restKeys[0]));
    }

    // * At this point, we can finally trust this data is not malicious.
    await fileNodes.insertOne({
      _id: node_id,
      owner: username,
      createdAt: Date.now(),
      modifiedAt: Date.now(),
      type,
      name,
      'name-lowercase': name.toLowerCase(),
      text,
      size: text.length,
      tags: normalizeTags(tags),
      lock,
      permissions
    });
  } else {
    const metaNodes = db.collection<InternalMetaNode>('meta-nodes');
    const { type, name, contents, permissions, ...rest } = data as Required<NewMetaNode>;
    const restKeys = Object.keys(rest);

    if (restKeys.length != 0) {
      throw new ValidationError(ErrorMessage.UnknownField(restKeys[0]));
    }

    // * At this point, we can finally trust this data is not malicious.
    await metaNodes.insertOne({
      _id: node_id,
      owner: username,
      createdAt: Date.now(),
      type,
      name,
      'name-lowercase': name.toLowerCase(),
      contents: normalizeNodeIds(contents),
      permissions
    });
  }

  return (await getNodes({ username, node_ids: [node_id.toString()] }))[0];
}

export async function updateNode({
  username,
  node_id,
  data
}: {
  username: Username;
  node_id: string;
  data: PatchNode;
}): Promise<void> {
  if (data && !Object.keys(data).length) return;

  const db = await getDb({ name: 'hscc-api-drive' });
  const users = db.collection<InternalUser>('users');
  const fileNodes = db.collection<InternalFileNode>('file-nodes');
  const metaNodes = db.collection<InternalMetaNode>('meta-nodes');

  const nodeId = (() => {
    try {
      return new ObjectId(node_id);
    } catch {
      throw new ValidationError(ErrorMessage.InvalidObjectId(node_id));
    }
  })();

  if (!(await itemExists(users, { key: 'username', id: username }))) {
    throw new ItemNotFoundError(username, 'user');
  }

  const $match = {
    _id: nodeId,
    $or: [{ owner: username }, { [`permissions.${username}`]: 'edit' }]
  };

  const node = await db
    .collection('file-nodes')
    .aggregate<PublicNode>([
      { $match },
      { $project: { type: true } },
      {
        $unionWith: {
          coll: 'meta-nodes',
          pipeline: [{ $match }, { $project: { type: true } }]
        }
      }
    ])
    .next();

  if (!node) {
    throw new ItemNotFoundError(node_id, 'node_id');
  }

  await validateNodeData(data, { type: node.type });

  if (node.type == 'file') {
    const { name, text, tags, lock, permissions, owner, ...rest } = data as PatchFileNode;
    const restKeys = Object.keys(rest);

    if (restKeys.length != 0) {
      throw new ValidationError(ErrorMessage.UnknownField(restKeys[0]));
    }

    // * At this point, we can finally trust this data is not malicious.
    await fileNodes.updateOne(
      { _id: nodeId },
      {
        $set: {
          modifiedAt: Date.now(),
          ...(owner ? { owner } : {}),
          ...(name ? { name, 'name-lowercase': name.toLowerCase() } : {}),
          ...(text ? { text, size: text.length } : {}),
          ...(tags ? { tags: normalizeTags(tags) } : {}),
          ...(lock ? { lock } : {}),
          ...(permissions ? { permissions } : {})
        }
      }
    );
  } else {
    const { name, contents, permissions, owner, ...rest } = data as PatchMetaNode;
    const restKeys = Object.keys(rest);

    if (restKeys.length != 0) {
      throw new ValidationError(ErrorMessage.UnknownField(restKeys[0]));
    }

    // * At this point, we can finally trust this data is not malicious.
    await metaNodes.updateOne(
      { _id: nodeId },
      {
        $set: {
          ...(owner ? { owner } : {}),
          ...(name ? { name, 'name-lowercase': name.toLowerCase() } : {}),
          ...(contents ? { contents: normalizeNodeIds(contents) } : {}),
          ...(permissions ? { permissions } : {})
        }
      }
    );
  }
}

export async function deleteNodes({
  username,
  node_ids
}: {
  username: Username;
  node_ids: string[];
}): Promise<void> {
  if (node_ids.length > getEnv().MAX_PARAMS_PER_REQUEST) {
    throw new ValidationError(ErrorMessage.TooManyItemsRequested('node_ids'));
  }

  const db = await getDb({ name: 'hscc-api-drive' });
  const users = db.collection<InternalUser>('users');
  const fileNodes = db.collection<InternalNode>('file-nodes');
  const metaNodes = db.collection<InternalNode>('meta-nodes');
  const nodeIds = normalizeNodeIds(node_ids);

  if (!(await itemExists(users, { key: 'username', id: username }))) {
    throw new ItemNotFoundError(username, 'user');
  }

  await Promise.all([
    fileNodes.deleteMany({ _id: { $in: nodeIds }, owner: username }),
    metaNodes.deleteMany({ _id: { $in: nodeIds }, owner: username })
  ]);

  await metaNodes.updateMany(
    // * Is this more optimal than a full scan?
    { contents: { $in: nodeIds } },
    { $pull: { contents: { $in: nodeIds } } }
  );
}
