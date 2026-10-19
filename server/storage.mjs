import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';

export function createStorage(pool, config, client) {
  const s3 = client || new S3Client({ region: 'auto', endpoint: config.R2_ENDPOINT,
    credentials: { accessKeyId: config.R2_ACCESS_KEY_ID, secretAccessKey: config.R2_SECRET_ACCESS_KEY } });
  return {
    async get(key) {
      if (key === 'agent/settings.json') {
        const { rows } = await pool.query('SELECT document FROM app_settings WHERE key=$1', [key]);
        return rows[0] ? { json: async () => JSON.parse(rows[0].document) } : null;
      }
      try {
        const object = await s3.send(new GetObjectCommand({ Bucket: config.R2_BUCKET, Key: key }));
        return { body: object.Body.transformToWebStream(), httpMetadata: { contentType: object.ContentType } };
      } catch (error) {
        if (error.name === 'NoSuchKey' || error.$metadata?.httpStatusCode === 404) return null;
        throw error;
      }
    },
    async put(key, body, options = {}) {
      if (key === 'agent/settings.json') {
        JSON.parse(body);
        await pool.query('INSERT INTO app_settings(key,document) VALUES ($1,$2) ON CONFLICT(key) DO UPDATE SET document=excluded.document, updated_at=now()', [key, body]);
        return;
      }
      const bytes = body instanceof ArrayBuffer ? new Uint8Array(body) : body;
      await s3.send(new PutObjectCommand({ Bucket: config.R2_BUCKET, Key: key, Body: bytes,
        ContentType: options.httpMetadata?.contentType || 'application/octet-stream' }));
    },
  };
}
