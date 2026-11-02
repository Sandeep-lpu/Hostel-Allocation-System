import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Storage Service for Generated PDF Documents & Allotment Slips
 * Supports local storage with automatic directory creation and secure file retrieval.
 */
@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  private storageDir: string;

  constructor(private readonly configService: ConfigService) {
    this.storageDir = path.resolve(
      process.cwd(),
      this.configService.get<string>('LOCAL_STORAGE_PATH', './storage/documents'),
    );
  }

  onModuleInit(): void {
    if (!fs.existsSync(this.storageDir)) {
      fs.mkdirSync(this.storageDir, { recursive: true });
      this.logger.log(`Initialized document storage directory at: ${this.storageDir}`);
    }
  }

  /**
   * Save a PDF buffer to storage
   */
  async saveDocument(filename: string, buffer: Buffer): Promise<string> {
    const filePath = path.join(this.storageDir, filename);
    await fs.promises.writeFile(filePath, buffer);
    this.logger.log(`Saved document: ${filePath} (${buffer.length} bytes)`);
    return filePath;
  }

  /**
   * Check if document exists
   */
  documentExists(filename: string): boolean {
    const filePath = path.join(this.storageDir, filename);
    return fs.existsSync(filePath);
  }

  /**
   * Get absolute path of document
   */
  getDocumentPath(filename: string): string {
    return path.join(this.storageDir, filename);
  }

  /**
   * Read document buffer
   */
  async getDocumentBuffer(filename: string): Promise<Buffer> {
    const filePath = path.join(this.storageDir, filename);
    return fs.promises.readFile(filePath);
  }
}

