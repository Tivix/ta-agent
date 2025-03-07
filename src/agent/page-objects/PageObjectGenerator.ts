import fs from 'fs';
import path from 'path';
import { ElementData } from '../../types/interfaces';
import { StringUtils } from '../../utils/StringUtils';
import { ElementActionUtils } from '../../utils/ElementActionUtils';

class PageObjectGenerator {
  // Generate a Page Object class for a given URL and its elements
  public generate(pageUrl: string, elements: ElementData[]) {
    const className = StringUtils.urlToClassName(pageUrl);
    const code = this.generatePageObjectCode(className, elements);

    // Ensure the directory exists
    const dir = path.join(__dirname, '..', '..', 'generated', 'page-objects');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Write the generated code to a file
    const filePath = path.join(dir, `${className}.ts`);
    fs.writeFileSync(filePath, code);
    console.log(`Generated page object: ${filePath}`);
  }

  // Generate the TypeScript code for a Page Object class
  private generatePageObjectCode(className: string, elements: ElementData[]): string {
    // Track unique elements by their selectors to avoid duplicates
    const uniqueElements = new Map<string, ElementData>();
    const processedTypes = new Set<string>();
    let elementGetters = '';
    let elementActions = '';
    
    // First, deduplicate elements based on their selectors
    for (const element of elements) {
      const cleanSelector = StringUtils.cleanSelector(element.selector);
      if (!uniqueElements.has(cleanSelector)) {
        uniqueElements.set(cleanSelector, element);
      }
    }
    
    // Generate getters for unique elements
    for (const [selector, element] of uniqueElements) {
      const elementId = StringUtils.generateElementId(selector, element.type, element.attributes);
      elementGetters += ElementActionUtils.generateElementGetter(elementId, element);
    }

    // Generate action methods for each unique element type
    for (const element of uniqueElements.values()) {
      if (!processedTypes.has(element.type)) {
        processedTypes.add(element.type);
        const elementId = StringUtils.generateElementId(element.selector, element.type, element.attributes);
        elementActions += ElementActionUtils.generateElementActions(elementId, element);
      }
    }

    return `
import { Page, expect } from '@playwright/test';

export class ${className}Page {
  constructor(private readonly page: Page) {}

  // Generic element getters
  ${ElementActionUtils.generateGetElementMethod()}
  ${ElementActionUtils.generateGetElementByTextMethod()}
  ${ElementActionUtils.generateGetElementByRoleMethod()}

  // Page-specific element getters
${elementGetters}

  // Element actions
${elementActions}
}
`;
  }
}

export default PageObjectGenerator; 