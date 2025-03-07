import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path'; // Import the path module
import { ElementData } from '../types/interfaces';
import LearningEngine from './learning/LearningEngine';
import { StringUtils } from '../utils/StringUtils';

class TestGenerator {
  constructor(private learningEngine = new LearningEngine()) {}

  // Generate test suites based on Page Objects
  public generateTests(pageObjects: Map<string, ElementData[]>) {
    for (const [pageUrl, elements] of pageObjects) {
      const className = StringUtils.urlToClassName(pageUrl);
      const testCase = this.generateTestCode(className, pageUrl, elements);

      // Ensure the directory exists
      const dir = path.join(__dirname, '..', 'generated', 'tests');
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // Write the generated code to a file
      const filePath = path.join(dir, `${className}.spec.ts`);
      fs.writeFileSync(filePath, testCase);
      console.log(`Generated test: ${filePath}`);
    }
  }

  // Generate the test code for a page
  private generateTestCode(className: string, pageUrl: string, elements: ElementData[]): string {
    // Track unique elements by their selectors to avoid duplicates
    const uniqueElements = new Map<string, ElementData>();
    
    // Deduplicate elements based on their selectors
    for (const element of elements) {
      const cleanSelector = StringUtils.cleanSelector(element.selector);
      if (!uniqueElements.has(cleanSelector)) {
        uniqueElements.set(cleanSelector, element);
      }
    }

    let testCases = '';
    for (const [selector, element] of uniqueElements) {
      const elementId = StringUtils.generateElementId(selector, element.type, element.attributes);
      testCases += this.generateTestCase(className, pageUrl, elementId, element);
    }

    return `
      import { test, expect } from '@playwright/test';
      import { ${className}Page } from '../page-objects/${className}';

      test.describe('${pageUrl} Tests', () => {
        test.beforeEach(async ({ page }) => {
          await page.goto('${pageUrl}');
        });

        ${testCases}
      });
    `;
  }

  // Generate a test case for an element
  private generateTestCase(className: string, pageUrl: string, elementId: string, element: ElementData): string {
    const actions = this.learningEngine.getOptimalActionFlow(element);
    const type = element.type.charAt(0).toUpperCase() + element.type.slice(1);
    const description = element.attributes['aria-label'] || 
                       element.attributes['placeholder'] || 
                       element.attributes['id'] || 
                       element.type;

    return actions.map(action => `
      test('${description} interaction', async ({ page }) => {
        const po = new ${className}Page(page);
        ${this.generateActionChain(elementId, action, type)}
      });
    `).join('\n');
  }

  // Generate action chain for a test case
  private generateActionChain(elementId: string, action: { type: string; element: string }, elementType: string): string {
    switch (action.type) {
      case 'click':
        return `await po.click${elementType}('${elementId}');`;
      case 'validate':
        return `await expect(po.getElement('${elementId}')).toBeVisible();`;
      // Add more action types as needed
      default:
        return `// Unsupported action: ${action.type}`;
    }
  }
}

export default TestGenerator;