/**
 * File uploads via backend S3 storage API (legacy module name kept for imports).
 */
import { apiClient } from './services/api-client';

/**
 * Upload a file to S3 through the API.
 * @param bucket - Path prefix (e.g. company-logos)
 * @param path - File path within the bucket/prefix
 * @param file - The file to upload
 */
export async function uploadFile(
  bucket: string,
  path: string,
  file: File,
): Promise<string> {
  const key = path.startsWith(`${bucket}/`) ? path : `${bucket}/${path}`;
  return apiClient.uploadStorageFile(file, key);
}

/** @deprecated S3 deletes are not exposed via API; no-op for compatibility */
export async function deleteFile(_bucket: string, _path: string): Promise<void> {
  // Intentionally no-op until a DELETE /storage endpoint is added.
}
