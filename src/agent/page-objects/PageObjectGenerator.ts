import fs from 'fs';
import path from 'path';
import { ElementData } from '../../types/interfaces';

class PageObjectGenerator {
  // Generate a Page Object class for a given URL and its elements
  public generate(pageUrl: string, elements: ElementData[]) {
    const className = this.urlToClassName(pageUrl);
    const code = this.generatePageObjectCode(className, elements);

    // Ensure the directory exists
    const dir = path.join(__dirname, '..', 'page-objects');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Write the generated code to a file
    const filePath = path.join(dir, `${className}.ts`);
    fs.writeFileSync(filePath, code);
  }

  // Generate the TypeScript code for a Page Object class
  private generatePageObjectCode(className: string, elements: ElementData[]): string {
    const elementGetters = elements.map(e => this.generateElementGetter(e)).join('\n');
    const elementActions = elements.map(e => this.generateElementActions(e)).join('\n');

    return `
      import { Page, expect } from '@playwright/test';

      export class ${className}Page {
        constructor(private readonly page: Page) {}

        ${elementGetters}

        ${elementActions}
      }
    `;
  }

  // Generate a getter for an element
  private generateElementGetter(element: ElementData): string {
    const propertyName = this.toCamelCase(element.selector);
    return `
      // ${element.attributes.placeholder || element.attributes['aria-label'] || 'Element'}
      get ${propertyName}() {
        return this.page.locator('${element.selector}');
      }
    `;
  }

  // Generate action methods for an element
  private generateElementActions(element: ElementData): string {
    const propertyName = this.toCamelCase(element.selector);
    return element.interactions.map(action => `
      async ${action}${this.capitalize(element.type)}() {
        await this.${propertyName}.${action}();
      }
    `).join('\n');
  }

  // Convert a URL to a valid class name
  private urlToClassName(url: string): string {
    // Remove protocol and special characters
    let className = url
      .replace(/^https?:\/\//, '') // Remove http:// or https://
      .replace(/[^a-zA-Z0-9]/g, ' ') // Replace special characters with spaces
      .trim();

    // Convert to PascalCase
    className = className.split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join('');

    // Ensure the class name is valid
    if (!className) {
      className = 'DefaultPage';
    }

    return className;
  }

  // Convert a string to camelCase
  private toCamelCase(str: string): string {
    return str
      .replace(/[^a-zA-Z0-9]/g, ' ') // Replace special characters with spaces
      .split(' ')
      .map((word, index) =>
        index === 0
          ? word.toLowerCase()
          : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
      )
      .join('');
  }

  // Capitalize the first letter of a string
  private capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}

export default PageObjectGenerator;