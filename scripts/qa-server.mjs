// Isolated browser QA server. Never uses the owner's live database.
import { createApp } from '../server.js';
import { resolve } from 'node:path';
const app = createApp({ dataDir: resolve('test-results/browser-data') });
app.server.listen(4174, '127.0.0.1', () => console.log('Isolated browser QA: http://127.0.0.1:4174'));
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, async () => { await app.close(); process.exit(0); });
