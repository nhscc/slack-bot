import type { PageConfig } from 'next';

/**
 * The default app-wide Next.js API configuration object.
 *
 * @see https://nextjs.org/docs/api-routes/api-middlewares#custom-config
 */
export const defaultConfig: PageConfig = { api: { bodyParser: false } };
