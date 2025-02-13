import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path'; // Import the path module
import { ElementData } from '../types/interfaces';
import LearningEngine from './learning/LearningEngine';

class TestGenerator {
  constructor(private learningEngine = new LearningEngine()) {}

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

  // Generate test suites based on Page Objects
  public generateTests(pageObjects: Map<string, ElementData[]>) {
    for (const [pageUrl, elements] of pageObjects) {
      const className = this.urlToClassName(pageUrl);
      const testCase = this.generateTestCode(className, pageUrl, elements);

      // Ensure the directory exists
      const dir = path.join(__dirname, '..', 'tests');
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // Write the generated code to a file
      const filePath = path.join(dir, `${className}.spec.ts`);
      fs.writeFileSync(filePath, testCase);
    }
  }

  // Generate the test code for a page
  private generateTestCode(className: string, pageUrl: string, elements: ElementData[]): string {
    const testCases = elements.map(e => this.generateTestCase(className, pageUrl, e)).join('\n');

    return `
      import { test, expect } from '@playwright/test';
      import { ${className}Page } from '../page-objects/${className}';

      test.describe.parallel('${pageUrl} Tests', () => {
        test.beforeEach(async ({ page }) => {
          await page.goto('${pageUrl}');
        });

        ${testCases}
      });
    `;
  }

  // Generate a test case for an element
  private generateTestCase(className: string, pageUrl: string, element: ElementData): string {
    const propertyName = this.toCamelCase(element.selector);
    const actions = this.learningEngine.getOptimalActionFlow(element);

    return actions.map(action => `
      test('${element.type} interaction: ${element.selector}', async ({ page }) => {
        const po = new ${className}Page(page);
        ${this.generateActionChain(propertyName, action)}
      });
    `).join('\n');
  }

  // Generate action chain for a test case
  private generateActionChain(propertyName: string, action: { type: string; element: string }): string {
    switch (action.type) {
      case 'click':
        return `await po.${propertyName}.click();`;
      case 'validate':
        return `await expect(po.${propertyName}).toBeVisible();`;
      // Add more action types as needed
      default:
        return `// Unsupported action: ${action.type}`;
    }
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
}

export default TestGenerator;