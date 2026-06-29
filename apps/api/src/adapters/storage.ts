import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";
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
  async save(_originalName: string, _buffer: Buffer): Promise<string> {
    // Implementação real do upload ao S3 entra aqui (Fase 2 avançada/produção).
    // Mantido como stub explícito para não mascarar a ausência de credenciais em dev.
    throw new Error("Driver S3 não configurado neste ambiente — use STORAGE_DRIVER=local em dev.");
  }
}

export function getStorageAdapter(): StorageAdapter {
  return storageConfig.driver === "s3" ? new S3StorageAdapter() : new LocalStorageAdapter();
}
