import { test, expect } from '@playwright/test';
import { LearningEngine } from './learning';

class TestGenerator {
  constructor(private learningEngine = new LearningEngine()) {}

  generateTests(pageObjects: Map<string, ElementData[]>) {
    for (const [pageUrl, elements] of pageObjects) {
      const testCase = `
        import { test } from '@playwright/test';
        import { ${this.urlToClassName(pageUrl)}Page } from '../page-objects/${this.urlToClassName(pageUrl)}';

        test.describe.parallel('${pageUrl} Tests', () => {
          test.beforeEach(async ({ page }) => {
            await page.goto('${pageUrl}');
          });

          ${elements.map(e => `
          test('${e.type} interaction: ${e.selector}', async ({ page }) => {
            const po = new ${this.urlToClassName(pageUrl)}Page(page);
            ${this.generateActionChain(e)}
          });`).join('\n')}
        });
      `;

      fs.writeFileSync(`src/tests/${this.urlToClassName(pageUrl)}.spec.ts`, testCase);
    }
  }

  private generateActionChain(element: ElementData): string {
    const actions = this.learningEngine.getOptimalActionFlow(element);
    return actions.map(action => {
      switch(action.type) {
        case 'click': return `await po.${action.element}.click();`;
        case 'validate': return `await expect(po.${action.element}).toBeVisible();`;
        // Add more action types
      }
    }).join('\n');
  }
}