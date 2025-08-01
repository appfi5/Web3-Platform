import pino, { type BaseLogger } from 'pino';
import pretty from 'pino-pretty';

import { env } from '~/env';

let logger: typeof console | BaseLogger;
if (env.API_BUILD) {
  logger = console;
} else {
  logger = pino(pretty({ colorize: true }));
  logger.level = env.AGGREGATOR_LOG_LEVEL;
}

export default logger;
