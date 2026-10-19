import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';

export function createStorage(pool, config, client) {
  const useR2 = config.ASSET_STORAGE === 'r2';
  const s3 = useR2 ? (client || new S3Client({ region: 'auto', endpoint: config.R2_ENDPOINT,
    credentials: { accessKeyId: config.R2_ACCESS_KEY_ID, secretAccessKey: config.R2_SECRET_ACCESS_KEY } })) : null;
  return {
    async get(key) {
      if (key === 'agent/settings.json') {
        const { rows } = await pool.query('SELECT document FROM app_settings WHERE key=$1', [key]);
        return rows[0] ? { json: async () => JSON.parse(rows[0].document) } : null;
      }
      if (!useR2) {
        const {rows}=await pool.query('SELECT content,content_type FROM app_images WHERE key=$1',[key]);
        return rows[0] ? {body:new Uint8Array(rows[0].content),httpMetadata:{contentType:rows[0].content_type}} : null;
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
      if (!useR2) {
        if (!(bytes instanceof Uint8Array) || bytes.byteLength > 3 * 1024 * 1024) throw new Error('Image exceeds the upload limit.');
        await pool.query('INSERT INTO app_images(key,content,content_type) VALUES ($1,$2,$3) ON CONFLICT(key) DO UPDATE SET content=excluded.content,content_type=excluded.content_type',
          [key,Buffer.from(bytes),options.httpMetadata?.contentType || 'application/octet-stream']);
        return;
      }
      await s3.send(new PutObjectCommand({ Bucket: config.R2_BUCKET, Key: key, Body: bytes,
        ContentType: options.httpMetadata?.contentType || 'application/octet-stream' }));
    },
  };
}
