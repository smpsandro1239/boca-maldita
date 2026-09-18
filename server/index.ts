import { createApp } from '../api/lib/app';

const { app, storage } = await createApp();

const port = Number(process.env.PORT ?? 3001);

const server = app.listen(port, () => {
  console.log(`API do Boca Maldita em http://localhost:${port}`);
});

function shutdown(): void {
  server.close(() => {});
  void storage.close();
}

process.on('SIGINT', () => {
  shutdown();
  process.exit(0);
});

process.on('SIGTERM', () => {
  shutdown();
  process.exit(0);
});