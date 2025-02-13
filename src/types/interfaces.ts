interface TestResult {
    success: boolean;
    elementSelector: string;
    action: string;
    errorMessage?: string;
    screenshot?: string;
    timestamp: number;
  }
  
  interface DefectPattern {
    elementSelector: string;
    commonErrors: string[];
    frequency: number;
  }
  
  interface ElementData {
    selector: string;
    type: string;
    attributes: Record<string, string>;
    interactions: string[];
  }
  
  interface TestAction {
    type: string;
    element: string;
  }