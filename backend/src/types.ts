export type UsageEvent = {
  id: string;

  platform: "openai";
  model: string;

  userEmail: string;
  matterId: string;
  taskType: string;

  prompt: string;
  responseText: string;

  openaiResponseId: string | null;
  openaiCreatedAt: number | null;

  inputTokens: number;
  outputTokens: number;
  totalTokens: number;

  processingTimeMs: number;
  estimatedCost: number;

  status: "success" | "failed";
  errorMessage?: string;

  createdAt: string;
};

export type UsageSummary = {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalTokens: number;
  totalEstimatedCost: number;
};
