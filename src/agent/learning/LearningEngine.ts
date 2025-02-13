import * as tf from '@tensorflow/tfjs-node';
import fs from 'fs';
import path from 'path';
import { TestResult, DefectPattern } from '../../types/interfaces';

class LearningEngine {
  private testHistory: TestResult[] = [];
  private defectPatterns: DefectPattern[] = [];
  private model: tf.Sequential | null = null;
  private readonly modelPath = path.join(__dirname, '..', 'ai-models', 'test-optimization-model.json');

  constructor() {
    this.loadModel();
    this.loadDefectPatterns();
  }

  // Analyze test results and update defect patterns
  public analyzeResults(results: TestResult[]) {
    this.testHistory.push(...results);

    // Cluster similar failures
    const failures = results.filter(r => !r.success);
    this.updateDefectPatterns(failures);

    // Train the model with new data
    this.trainModel();

    // Save updated models and patterns
    this.saveModel();
    this.saveDefectPatterns();
  }

  // Get insights based on test results and defect patterns
  public getInsights(): { element: string; successRate: number; suggestions: string[] }[] {
    const insights: { element: string; successRate: number; suggestions: string[] }[] = [];

    // Calculate success rate for each element
    const elementStats = new Map<string, { success: number; total: number }>();
    for (const result of this.testHistory) {
      if (!elementStats.has(result.elementSelector)) {
        elementStats.set(result.elementSelector, { success: 0, total: 0 });
      }
      const stats = elementStats.get(result.elementSelector)!;
      stats.total++;
      if (result.success) {
        stats.success++;
      }
    }

    // Generate insights for each element
    for (const [element, stats] of elementStats.entries()) {
      const successRate = (stats.success / stats.total) * 100;
      const suggestions: string[] = [];

      // Add suggestions based on defect patterns
      const defectPattern = this.defectPatterns.find(p => p.elementSelector === element);
      if (defectPattern) {
        if (defectPattern.frequency > 5) {
          suggestions.push('Update selector or fix element interaction.');
        }
        if (defectPattern.commonErrors.includes('Element not found')) {
          suggestions.push('Add retry logic or improve selector.');
        }
      }

      insights.push({ element, successRate, suggestions });
    }

    return insights;
  }

  // Update defect patterns based on failure analysis
  private updateDefectPatterns(failures: TestResult[]) {
    failures.forEach(failure => {
      const existingPattern = this.defectPatterns.find(
        pattern => pattern.elementSelector === failure.elementSelector
      );

      if (existingPattern) {
        existingPattern.frequency++;
        if (failure.errorMessage && !existingPattern.commonErrors.includes(failure.errorMessage)) {
          existingPattern.commonErrors.push(failure.errorMessage);
        }
      } else {
        this.defectPatterns.push({
          elementSelector: failure.elementSelector,
          commonErrors: failure.errorMessage ? [failure.errorMessage] : [],
          frequency: 1,
        });
      }
    });
  }

  // Train the machine learning model
  private trainModel() {
    const { inputs, labels } = this.prepareTrainingData();

    if (!this.model) {
      this.model = this.createModel();
    }

    this.model.compile({
      optimizer: tf.train.adam(0.001),
      loss: 'categoricalCrossentropy',
      metrics: ['accuracy'],
    });

    this.model.fit(inputs, labels, {
      epochs: 10,
      batchSize: 32,
      validationSplit: 0.2,
    });
  }

  // Prepare training data from test history
  private prepareTrainingData(): { inputs: tf.Tensor, labels: tf.Tensor } {
    const inputs = this.testHistory.map(result => this.encodeTestResult(result));
    const labels = this.testHistory.map(result => (result.success ? 1 : 0));

    return {
      inputs: tf.tensor2d(inputs),
      labels: tf.oneHot(tf.tensor1d(labels, 'int32'), 2),
    };
  }

  // Encode test results into numerical features
  private encodeTestResult(result: TestResult): number[] {
    return [
      result.elementSelector.length, // Example feature: selector length
      result.action === 'click' ? 1 : 0, // Binary feature: action type
      result.errorMessage ? result.errorMessage.length : 0, // Error message length
    ];
  }

  // Create a simple neural network model
  private createModel(): tf.Sequential {
    const model = tf.sequential();
    model.add(tf.layers.dense({ units: 32, activation: 'relu', inputShape: [3] })); // Input shape based on encoded features
    model.add(tf.layers.dense({ units: 16, activation: 'relu' }));
    model.add(tf.layers.dense({ units: 2, activation: 'softmax' })); // Output: success/failure probability
    return model;
  }

  // Save the trained model to a local file
  private saveModel() {
    if (!this.model) return;

    const modelDir = path.dirname(this.modelPath);
    if (!fs.existsSync(modelDir)) {
      fs.mkdirSync(modelDir, { recursive: true });
    }

    this.model.save(`file://${this.modelPath}`);
  }

  // Load the trained model from a local file
  private loadModel() {
    if (fs.existsSync(this.modelPath)) {
      tf.loadLayersModel(`file://${this.modelPath}`).then(model => {
        this.model = model as tf.Sequential;
      });
    }
  }

  // Save defect patterns to a local file
  private saveDefectPatterns() {
    const defectPatternsPath = path.join(__dirname, '..', 'ai-models', 'defect-patterns.json');
    fs.writeFileSync(defectPatternsPath, JSON.stringify(this.defectPatterns, null, 2));
  }

  // Load defect patterns from a local file
  private loadDefectPatterns() {
    const defectPatternsPath = path.join(__dirname, '..', 'ai-models', 'defect-patterns.json');
    if (fs.existsSync(defectPatternsPath)) {
      this.defectPatterns = JSON.parse(fs.readFileSync(defectPatternsPath, 'utf-8'));
    }
  }
}

export default LearningEngine;