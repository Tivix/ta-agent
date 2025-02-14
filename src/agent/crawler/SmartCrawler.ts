import { chromium, Browser, Page, ElementHandle } from 'playwright';
import { ElementData } from '../../types/interfaces';

class SmartCrawler {
  private browser: Browser | null = null;
  private page: Page | null = null;
  private visitedUrls = new Set<string>();
  public elementInventory = new Map<string, ElementData[]>();

  async initialize() {
    this.browser = await chromium.launch({ headless: true }); // Run in non-headless mode for debugging
    this.page = await this.browser.newPage();
  }

  async crawl(startUrl: string, depth = 3) {
    if (!this.page) throw new Error('Page not initialized. Call initialize() first.');
    if (depth === 0 || this.visitedUrls.has(startUrl)) return;

    this.visitedUrls.add(startUrl);

    try {
      console.log(`Navigating to ${startUrl}...`);
      await this.page.goto(startUrl, { waitUntil: 'domcontentloaded', timeout: 60000 }); // Wait for DOM content to load
      console.log(`Successfully loaded ${startUrl}.`);

      // Discover interactive elements
      const buttons = await this.findElements('button');
      const inputs = await this.findElements('input,textarea');
      const links = await this.findElements('a');

      // Resolve all promises for element data
      const buttonData = await Promise.all(buttons.map(e => this.createElementData(e, 'button')));
      const inputData = await Promise.all(inputs.map(e => this.createElementData(e, 'input')));
      const linkData = await Promise.all(links.map(e => this.createElementData(e, 'link')));

      this.elementInventory.set(startUrl, [...buttonData, ...inputData, ...linkData]);

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

  private async findElements(selector: string) {
    if (!this.page) throw new Error('Page not initialized. Call initialize() first.');
    return this.page.$$(selector);
  }

  private async createElementData(element: ElementHandle, type: string): Promise<ElementData> {
    const attributes = await element.evaluate(el => {
      const elAttributes: Record<string, string> = {};
      for (const attr of (el as HTMLElement).attributes) {
        elAttributes[attr.name] = attr.value;
      }
      return elAttributes;
    });

    return {
      selector: this.generateSmartSelector(element, attributes),
      type,
      attributes,
      interactions: this.detectPossibleInteractions(type),
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

  private detectPossibleInteractions(type: string): string[] {
    const interactionMap: Record<string, string[]> = {
      button: ['click', 'hover', 'doubleClick'],
      input: ['type', 'fill', 'clear'],
      link: ['click', 'verifyNavigation'],
    };

    return interactionMap[type] || [];
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
    }
  }
}

export default SmartCrawler;