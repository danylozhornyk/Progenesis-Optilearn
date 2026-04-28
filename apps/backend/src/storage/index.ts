import { StorageProvider } from './storage.provider';
import { LocalStorageProvider } from './local.storage';
import { S3StorageProvider } from './s3.storage';

export type { StorageProvider };

const useS3 = process.env.STORAGE_PROVIDER === 's3';

const _provider: StorageProvider = useS3
  ? new S3StorageProvider()
  : new LocalStorageProvider();

export const storage = _provider;

export async function initStorage(): Promise<void> {
  if (useS3) {
    await (_provider as S3StorageProvider).init();
    console.log('Storage: S3 bucket ready');
  } else {
    console.log('Storage: local disk');
  }
}
