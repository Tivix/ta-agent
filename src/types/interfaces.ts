// Define shared interfaces for the project

export interface TestResult {
  success: boolean;
  elementSelector: string;
  action: string;
  errorMessage?: string;
  screenshot?: string; // Base64 encoded screenshot
  timestamp: number;
}

export interface DefectPattern {
  elementSelector: string;
  commonErrors: string[];
  frequency: number;
}

export interface ElementData {
  selector: string;
  type: string;
  attributes: Record<string, string>;
  interactions: string[];
}

export interface TestAction {
  type: string;
  element: string;
}