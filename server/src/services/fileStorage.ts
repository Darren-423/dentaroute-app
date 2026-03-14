import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

export interface UploadFile {
  originalName: string;
  mimeType: string;
  buffer: Buffer;
  sizeBytes: number;
}

export interface StoredFile {
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  storageKey: string;
}

export interface FileStorage {
  storeDoctorLicenseFiles(userId: string, files: UploadFile[]): Promise<StoredFile[]>;
}

const sanitizeFilename = (filename: string): string => {
  return filename.replace(/[^a-zA-Z0-9._-]/g, "_");
};

export class LocalFileStorage implements FileStorage {
  constructor(private readonly uploadDir: string) {}

  async storeDoctorLicenseFiles(userId: string, files: UploadFile[]): Promise<StoredFile[]> {
    const relativeDirectory = path.join("licenses", userId);
    const absoluteDirectory = path.join(this.uploadDir, relativeDirectory);
    await mkdir(absoluteDirectory, { recursive: true });

    const storedFiles: StoredFile[] = [];

    for (const file of files) {
      const ext = path.extname(file.originalName) || ".bin";
      const fileName = `${randomUUID()}-${sanitizeFilename(path.basename(file.originalName, ext))}${ext}`;
      const storageKey = path.join(relativeDirectory, fileName).replace(/\\/g, "/");
      const absoluteFilePath = path.join(this.uploadDir, storageKey);
      await writeFile(absoluteFilePath, file.buffer);

      storedFiles.push({
        originalName: file.originalName,
        mimeType: file.mimeType,
        sizeBytes: file.sizeBytes,
        storageKey,
      });
    }

    return storedFiles;
  }
}
