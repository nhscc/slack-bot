import { ErrorMessage as NamedErrorMessage } from 'named-app-errors';

export * from 'named-app-errors';

/**
 * A collection of possible error and warning messages.
 */
export const ErrorMessage = {
  ...NamedErrorMessage
};
