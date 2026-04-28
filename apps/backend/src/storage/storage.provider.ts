export interface StorageProvider {
  save(filename: string, buffer: Buffer, mimetype: string): Promise<string>;
  delete(filename: string): Promise<void>;
  getUrl(filename: string): string;
}
