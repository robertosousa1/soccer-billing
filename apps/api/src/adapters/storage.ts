import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { storageConfig } from "../config/storage";

export interface StorageAdapter {
  save(originalName: string, buffer: Buffer): Promise<string>; // retorna a key
}

class LocalStorageAdapter implements StorageAdapter {
  async save(originalName: string, buffer: Buffer): Promise<string> {
    await fs.mkdir(storageConfig.localDir, { recursive: true });
    const key = `${randomUUID()}-${originalName}`;
    await fs.writeFile(path.join(storageConfig.localDir, key), buffer);
    return key;
  }
}

class S3StorageAdapter implements StorageAdapter {
  private readonly client: S3Client;

  constructor() {
    this.client = new S3Client({
      region: storageConfig.s3Region,
      ...(storageConfig.s3Endpoint ? { endpoint: storageConfig.s3Endpoint, forcePathStyle: true } : {}),
    });
  }

  async save(originalName: string, buffer: Buffer): Promise<string> {
    const now = new Date();
    const prefix = [
      "extracts",
      now.getUTCFullYear(),
      String(now.getUTCMonth() + 1).padStart(2, "0"),
      String(now.getUTCDate()).padStart(2, "0"),
    ].join("/");
    const key = `${prefix}/${randomUUID()}-${originalName}`;
    await this.client.send(
      new PutObjectCommand({
        Bucket: storageConfig.s3Bucket,
        Key: key,
        Body: buffer,
        ContentType: "text/csv",
      }),
    );
    return key;
  }
}

export function getStorageAdapter(): StorageAdapter {
  return storageConfig.driver === "s3" ? new S3StorageAdapter() : new LocalStorageAdapter();
}
