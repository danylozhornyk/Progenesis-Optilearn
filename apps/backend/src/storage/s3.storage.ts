import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  CreateBucketCommand,
  HeadBucketCommand,
  PutBucketPolicyCommand,
} from '@aws-sdk/client-s3';
import { StorageProvider } from './storage.provider';

export class S3StorageProvider implements StorageProvider {
  private client: S3Client;
  private bucket: string;
  private publicUrl: string;

  constructor() {
    const endpoint = process.env.S3_ENDPOINT;
    this.bucket   = process.env.S3_BUCKET  || 'optilearn';
    // S3_PUBLIC_URL is the base URL used to build image links.
    // For MinIO:   http://localhost:9000
    // For AWS S3:  https://<bucket>.s3.<region>.amazonaws.com  (omit bucket in PUBLIC_URL)
    // For R2:      https://pub-<hash>.r2.dev
    this.publicUrl = (process.env.S3_PUBLIC_URL || endpoint || '').replace(/\/$/, '');

    this.client = new S3Client({
      region: process.env.S3_REGION || 'us-east-1',
      ...(endpoint ? { endpoint, forcePathStyle: true } : {}),
      credentials: {
        accessKeyId:     process.env.S3_ACCESS_KEY!,
        secretAccessKey: process.env.S3_SECRET_KEY!,
      },
    });
  }

  // Call once at app startup to ensure the bucket exists and is publicly readable
  async init(): Promise<void> {
    try {
      await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }));
    } catch {
      await this.client.send(new CreateBucketCommand({ Bucket: this.bucket }));
      // Make the bucket publicly readable so image URLs work without signed tokens
      await this.client.send(new PutBucketPolicyCommand({
        Bucket: this.bucket,
        Policy: JSON.stringify({
          Version: '2012-10-17',
          Statement: [{
            Sid: 'PublicRead',
            Effect: 'Allow',
            Principal: '*',
            Action: 's3:GetObject',
            Resource: `arn:aws:s3:::${this.bucket}/*`,
          }],
        }),
      }));
    }
  }

  async save(filename: string, buffer: Buffer, mimetype: string): Promise<string> {
    await this.client.send(new PutObjectCommand({
      Bucket: this.bucket,
      Key: filename,
      Body: buffer,
      ContentType: mimetype,
    }));
    return this.getUrl(filename);
  }

  async delete(filename: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: filename,
    }));
  }

  getUrl(filename: string): string {
    return `${this.publicUrl}/${this.bucket}/${filename}`;
  }
}
