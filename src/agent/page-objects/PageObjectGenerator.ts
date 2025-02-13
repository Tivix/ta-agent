import fs from 'fs';

class PageObjectGenerator {
  generate(pageUrl: string, elements: ElementData[]) {
    const className = this.urlToClassName(pageUrl);
    const code = `
      import { Page, expect } from '@playwright/test';

      export class ${className}Page {
        constructor(private readonly page: Page) {}

        ${elements.map(e => `
        // ${e.attributes.placeholder || e.attributes['aria-label'] || 'Element'}
        get ${this.toCamelCase(e.selector)}() {
          return this.page.locator('${e.selector}');
        }`).join('\n')}

        ${elements.map(e => this.generateActions(e)).join('\n')}
      }
    `;

    fs.writeFileSync(`src/page-objects/${className}.ts`, code);
  }

  private generateActions(element: ElementData): string {
    return element.interactions.map(action => `
      async ${action}${element.type}() {
        await this.${this.toCamelCase(element.selector)}.${action}();
      }
    `).join('\n');
  }
}