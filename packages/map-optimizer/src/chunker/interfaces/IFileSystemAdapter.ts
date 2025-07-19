// File system abstraction for testability
export interface IFileSystemAdapter {
  exists(path: string): Promise<boolean>;
  readFile(path: string): Promise<Buffer>;
  writeFile(path: string, data: Buffer): Promise<void>;
  createDirectory(path: string): Promise<void>;
  getFileSize(path: string): Promise<number>;
  deleteFile(path: string): Promise<void>;
}

export class NodeFileSystemAdapter implements IFileSystemAdapter {
  async exists(path: string): Promise<boolean> {
    try {
      const fs = await import('fs/promises');
      await fs.access(path);
      return true;
    } catch {
      return false;
    }
  }

  async readFile(path: string): Promise<Buffer> {
    const fs = await import('fs/promises');
    return fs.readFile(path);
  }

  async writeFile(path: string, data: Buffer): Promise<void> {
    const fs = await import('fs/promises');
    await fs.writeFile(path, data);
  }

  async createDirectory(path: string): Promise<void> {
    const fs = await import('fs/promises');
    await fs.mkdir(path, { recursive: true });
  }

  async getFileSize(path: string): Promise<number> {
    const fs = await import('fs/promises');
    const stats = await fs.stat(path);
    return stats.size;
  }

  async deleteFile(path: string): Promise<void> {
    const fs = await import('fs/promises');
    await fs.unlink(path);
  }
}