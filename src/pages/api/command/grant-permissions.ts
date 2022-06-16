import { withMiddleware } from 'universe/backend/middleware';
import { sendHttpOk } from 'multiverse/next-api-respond';
import { defaultConfig } from 'universe/backend/api';

// ? This is a NextJS special "config" export
export { defaultConfig as config } from 'universe/backend/api';

export default withMiddleware(
  async (req, res) => {
    // * POST
    void sendHttpOk, req, res;
  },
  {
    options: {
      allowedMethods: ['POST'],
      requiresSlackAuth: true,
      requestBodySizeLimit: defaultConfig.api?.bodyParser
        ? defaultConfig.api?.bodyParser.sizeLimit
        : null
    }
  }
);
