import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as puppeteer from 'puppeteer';
import { Browser, Page, PDFOptions } from 'puppeteer';

/**
 * High-Throughput Puppeteer Browser Page Pool Service
 *
 * Distributed Systems Rationale:
 * Launching headless Chrome per request is prohibitively expensive (500ms+ and 100MB+ RAM per process).
 * This service maintains a warm singleton browser instance with a bounded concurrency pool (max 5 concurrent pages)
 * to prevent CPU spikes and RAM exhaustion during peak 10,000+ student booking bursts.
 */
@Injectable()
export class PuppeteerPoolService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PuppeteerPoolService.name);
  private browser: Browser | null = null;
  private readonly maxConcurrentPages: number = 5;
  private activePages: number = 0;
  private readonly waitQueue: Array<() => void> = [];

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit(): Promise<void> {
    await this.initBrowser();
  }

  async onModuleDestroy(): Promise<void> {
    await this.closeBrowser();
  }

  private async initBrowser(): Promise<void> {
    try {
      this.logger.log('Initializing Puppeteer Warm Browser Pool...');
      const executablePath = this.configService.get<string>('PUPPETEER_EXECUTABLE_PATH') || undefined;

      this.browser = await puppeteer.launch({
        headless: true,
        executablePath,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--font-render-hinting=none',
          '--disable-extensions',
          '--no-first-run',
          '--no-zygote',
        ],
      });

      this.logger.log('Puppeteer Browser instance launched successfully and ready for A4 rendering.');
    } catch (err: any) {
      this.logger.error(`Failed to launch Puppeteer browser: ${err.message}`, err.stack);
    }
  }

  private async closeBrowser(): Promise<void> {
    if (this.browser) {
      this.logger.log('Closing Puppeteer Browser instance...');
      try {
        await this.browser.close();
      } catch (err: any) {
        this.logger.warn(`Error closing Puppeteer browser: ${err.message}`);
      }
      this.browser = null;
    }
  }

  /**
   * Acquire a bounded page slot
   */
  private async acquireSlot(): Promise<void> {
    if (this.activePages < this.maxConcurrentPages) {
      this.activePages++;
      return;
    }

    return new Promise<void>((resolve) => {
      this.waitQueue.push(resolve);
    });
  }

  /**
   * Release page slot to next queued request
   */
  private releaseSlot(): void {
    if (this.waitQueue.length > 0) {
      const next = this.waitQueue.shift();
      if (next) next();
    } else {
      this.activePages = Math.max(0, this.activePages - 1);
    }
  }

  /**
   * Render compiled HTML string to A4 PDF Buffer with bounded concurrency
   */
  async renderHtmlToPdf(html: string, options?: PDFOptions): Promise<Buffer> {
    if (!this.browser || !this.browser.connected) {
      this.logger.warn('Browser disconnected. Re-initializing before render...');
      await this.initBrowser();
    }

    await this.acquireSlot();
    let page: Page | null = null;

    try {
      page = await this.browser!.newPage();

      // Emulate print media for crisp CSS A4 reproduction
      await page.emulateMediaType('print');

      // Set compiled HTML with wait for network assets (QR code, web fonts)
      await page.setContent(html, {
        waitUntil: ['load', 'networkidle0'],
        timeout: 30000,
      });

      const defaultOptions: PDFOptions = {
        format: 'A4',
        printBackground: true,
        preferCSSPageSize: true,
        margin: {
          top: '15mm',
          bottom: '15mm',
          left: '15mm',
          right: '15mm',
        },
      };

      const pdfUint8Array = await page.pdf({ ...defaultOptions, ...options });
      return Buffer.from(pdfUint8Array);
    } finally {
      if (page) {
        try {
          await page.close();
        } catch (e: any) {
          this.logger.warn(`Error closing page: ${e.message}`);
        }
      }
      this.releaseSlot();
    }
  }

  /**
   * Check if browser pool is active and healthy
   */
  isHealthy(): boolean {
    return !!this.browser && this.browser.connected;
  }
}

