#!/usr/bin/env ts-node
import SmartCrawler from './agent/crawler/SmartCrawler';
import PageObjectGenerator from './agent/page-objects/PageObjectGenerator';
import TestGenerator from './agent/TestGenerator';

// Get URL from CLI
const url = process.argv[2];
if (!url) {
  console.error('Please provide a URL as a parameter.');
  process.exit(1);
}

(async () => {
  try {
    // Step 1: Crawl the website
    const crawler = new SmartCrawler();
    await crawler.initialize();
    console.log(`Crawling ${url}...`);
    await crawler.crawl(url);
    await crawler.close();
    console.log('Crawling completed.');

    // Step 2: Generate Page Objects
    const pageObjectGenerator = new PageObjectGenerator();
    for (const [pageUrl, elements] of crawler.elementInventory) {
      pageObjectGenerator.generate(pageUrl, elements);
    }
    console.log('Page Objects generated.');

    // Step 3: Generate Tests
    const testGenerator = new TestGenerator();
    testGenerator.generateTests(crawler.elementInventory);
    console.log('Tests generated.');

    console.log('Setup completed successfully!');
  } catch (error) {
    console.error('Error during setup:', error);
    process.exit(1);
  }
})();