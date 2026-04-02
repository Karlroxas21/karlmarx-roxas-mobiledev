import { createServer } from './wire';
import { logger } from './config';

createServer()
    .then((server) => {
        server.start();
        logger.info('server started');
    })
    .catch((error) => {
        logger.error('failed to start server', { error });
        process.exit(1);
    });
