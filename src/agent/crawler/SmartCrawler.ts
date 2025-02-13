import { chromium, Browser, Page, ElementHandle } from 'playwright';

class SmartCrawler {
  private browser: Browser;
  private page: Page;
  private visitedUrls = new Set<string>();
  private elementInventory = new Map<string, ElementData[]>();

  async initialize() {
    this.browser = await chromium.launch();
    this.page = await this.browser.newPage();
  }

  async crawl(startUrl: string, depth = 3) {
    if (depth === 0 || this.visitedUrls.has(startUrl)) return;
    
    this.visitedUrls.add(startUrl);
    await this.page.goto(startUrl);

    // Discover interactive elements
    const buttons = await this.findElements('button');
    const inputs = await this.findElements('input,textarea');
    const links = await this.findElements('a');
    
    this.elementInventory.set(startUrl, [
      ...buttons.map(e => this.createElementData(e, 'button')),
      ...inputs.map(e => this.createElementData(e, 'input')),
      ...links.map(e => this.createElementData(e, 'link'))
    ]);

    // Recursive crawling
    const pageLinks = await this.page.$$eval('a', as => as.map(a => a.href));
    for (const link of pageLinks) {
      await this.crawl(link, depth - 1);
    }
  }

  private async findElements(selector: string) {
    return this.page.$$(selector);
  }

  private async createElementData(element: ElementHandle, type: string): Promise<ElementData> {
    const attributes = await element.evaluate(el => 
      Object.fromEntries([...el.attributes].map(attr => [attr.name, attr.value]))
    );
    
    return {
      selector: this.generateSmartSelector(element, attributes),
      type,
      attributes,
      interactions: this.detectPossibleInteractions(type)
    };
  }

  private generateSmartSelector(element: ElementHandle, attributes: any): string {
    // AI-powered selector prioritization
    const priorityAttributes = ['data-testid', 'id', 'aria-label', 'name'];
    for (const attr of priorityAttributes) {
      if (attributes[attr]) return `${attr}=${attributes[attr]}`;
    }
    return this.generateXPath(element);
  }

  private detectPossibleInteractions(type: string): string[] {
    const interactionMap = {
      button: ['click', 'hover', 'doubleClick'],
      input: ['type', 'fill', 'clear'],
      link: ['click', 'verifyNavigation']
    };
    return interactionMap[type] || [];
  }
}