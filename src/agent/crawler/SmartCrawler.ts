import { chromium, Browser, Page, ElementHandle } from 'playwright';
import { ElementData } from '../../types/interfaces';
import { ElementActionUtils } from '../../utils/ElementActionUtils';

class SmartCrawler {
  private browser: Browser | null = null;
  private page: Page | null = null;
  private visitedUrls = new Set<string>();
  public elementInventory = new Map<string, ElementData[]>();
  private readonly maxRetries = 3;
  private readonly retryDelay = 2000; // 2 seconds

  async initialize() {
    try {
      // First, ensure any existing browser is closed
      if (this.browser) {
        await this.browser.close();
      }

      // Launch browser with minimal configuration
      this.browser = await chromium.launch({
        headless: false,
        args: ['--no-sandbox']
      });

      // Create a new context with specific settings
      const context = await this.browser.newContext({
        viewport: { width: 1280, height: 800 },
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      });

      // Create a new page in the context
      this.page = await context.newPage();
      
      // Set default timeouts
      this.page.setDefaultTimeout(30000);
      this.page.setDefaultNavigationTimeout(30000);
      
      console.log('Browser initialized successfully');
    } catch (error) {
      console.error('Failed to initialize browser:', error);
      // Clean up if initialization fails
      if (this.browser) {
        await this.browser.close();
        this.browser = null;
      }
      this.page = null;
      throw error;
    }
  }

  async crawl(startUrl: string, depth = 3) {
    if (!this.page) throw new Error('Page not initialized. Call initialize() first.');
    if (depth === 0 || this.visitedUrls.has(startUrl)) return;

    this.visitedUrls.add(startUrl);

    try {
      console.log(`Navigating to ${startUrl}...`);
      await this.navigateWithRetry(startUrl);

      // Wait for the page to be fully loaded
      await this.waitForPageLoad();

      // Discover interactive elements
      const elements = await this.discoverElements();
      this.elementInventory.set(startUrl, elements);

      // Recursive crawling
      const pageLinks = await this.page.$$eval('a', as => as.map(a => a.href));
      for (const link of pageLinks) {
        if (link && !this.visitedUrls.has(link)) {
          await this.crawl(link, depth - 1);
        }
      }
    } catch (error) {
      console.error(`Failed to crawl ${startUrl}:`, error);
    }
  }

  private async navigateWithRetry(url: string): Promise<void> {
    if (!this.page) return;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        await this.page.goto(url, { 
          waitUntil: 'networkidle',
          timeout: 5000 
        });
        return;
      } catch (error) {
        if (attempt === this.maxRetries) {
          throw error;
        }
        console.log(`Navigation attempt ${attempt} failed, retrying in ${this.retryDelay}ms...`);
        await new Promise(resolve => setTimeout(resolve, this.retryDelay));
      }
    }
  }

  private async waitForPageLoad() {
    if (!this.page) return;

    // Wait for network to be idle
    await this.page.waitForLoadState('networkidle');

    // Wait for DOM to be ready
    await this.page.waitForLoadState('domcontentloaded');

    // Wait for any dynamic content to load
    await this.page.waitForTimeout(2000);

    // Wait for any lazy-loaded images
    await this.page.evaluate(() => {
      return Promise.all(
        Array.from(document.images)
          .filter(img => !img.complete)
          .map(img => new Promise(resolve => {
            img.onload = img.onerror = resolve;
          }))
      );
    });

    // Wait for any dynamic content to be visible
    await this.page.waitForLoadState('load');
  }

  private async discoverElements(): Promise<ElementData[]> {
    if (!this.page) return [];

    const elements: ElementData[] = [];
    const elementTypes = ['button', 'input', 'textarea', 'a', 'select'];

    for (const type of elementTypes) {
      const selectors = this.getSelectorsForType(type);
      for (const selector of selectors) {
        try {
          // Wait for elements to be visible with retry
          await this.waitForSelectorWithRetry(selector);
          const foundElements = await this.page.$$(selector);
          
          for (const element of foundElements) {
            try {
              const elementData = await this.createElementData(element, type);
              elements.push(elementData);
            } catch (error) {
              console.warn(`Failed to create element data for ${selector}:`, error);
            }
          }
        } catch (error) {
          console.warn(`Failed to find elements for selector ${selector}:`, error);
        }
      }
    }

    return elements;
  }

  private async waitForSelectorWithRetry(selector: string): Promise<void> {
    if (!this.page) return;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        await this.page.waitForSelector(selector, { timeout: 5000 });
        return;
      } catch (error) {
        if (attempt === this.maxRetries) {
          throw error;
        }
        console.log(`Selector ${selector} not found on attempt ${attempt}, retrying in ${this.retryDelay}ms...`);
        await new Promise(resolve => setTimeout(resolve, this.retryDelay));
      }
    }
  }

  private getSelectorsForType(type: string): string[] {
    switch (type) {
      case 'button':
        return [
          'button',
          '[role="button"]',
          'input[type="button"]',
          'input[type="submit"]',
          'input[type="reset"]',
          'button[type="submit"]',
          'button[type="reset"]'
        ];
      case 'input':
        return [
          'input:not([type="button"]):not([type="submit"]):not([type="reset"])',
          'textarea',
          'input[type="text"]',
          'input[type="email"]',
          'input[type="password"]',
          'input[type="number"]',
          'input[type="tel"]',
          'input[type="url"]',
          'input[type="search"]'
        ];
      case 'a':
        return ['a'];
      case 'select':
        return ['select'];
      default:
        return [type];
    }
  }

  private async createElementData(element: ElementHandle, type: string): Promise<ElementData> {
    const attributes = await element.evaluate(el => {
      const elAttributes: Record<string, string> = {};
      for (const attr of (el as HTMLElement).attributes) {
        elAttributes[attr.name] = attr.value;
      }
      // Add text content for elements that might have it
      if (el instanceof HTMLElement) {
        elAttributes['text'] = el.textContent?.trim() || '';
      }
      return elAttributes;
    });

    return {
      selector: this.generateSmartSelector(element, attributes),
      type,
      attributes,
      interactions: ElementActionUtils.detectPossibleInteractions(type),
    };
  }

  private generateSmartSelector(element: ElementHandle, attributes: Record<string, string>): string {
    // AI-powered selector prioritization
    const priorityAttributes = ['data-testid', 'id', 'aria-label', 'name'];
    for (const attr of priorityAttributes) {
      if (attributes[attr]) return `${attr}=${attributes[attr]}`;
    }
    return this.generateXPath(element);
  }

  private generateXPath(element: ElementHandle): string {
    // Generate a basic XPath selector (can be improved)
    return `//${element}`;
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
    }
  }
}

export default SmartCrawler; 