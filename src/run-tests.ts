#!/usr/bin/env ts-node
import { exec } from 'child_process';
import LearningEngine from './agent/learning/LearningEngine';
import { TestResult } from './types/interfaces';

// Run Playwright tests
const runTests = (): Promise<TestResult[]> => {
  return new Promise((resolve, reject) => {
    exec('npx playwright test --reporter=json', (error, stdout, stderr) => {
      if (error) {
        console.error('Error running tests:', stderr);
        reject(error);
      } else {
        const results = JSON.parse(stdout) as TestResult[];
        resolve(results);
      }
    });
  });
};

(async () => {
  try {
    // Step 1: Run Tests
    console.log('Running tests...');
    const testResults = await runTests();
    console.log('Tests completed.');

    // Step 2: Analyze Results
    const learningEngine = new LearningEngine();
    learningEngine.analyzeResults(testResults);
    console.log('Results analyzed.');

    // Step 3: Provide Insights
    const insights = learningEngine.getInsights();
    console.log('Insights:', insights);
  } catch (error) {
    console.error('Error during test execution:', error);
    process.exit(1);
  }
})();