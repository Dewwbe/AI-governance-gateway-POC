import "dotenv/config";
import express from "express";
import cors from "cors";
import OpenAI from "openai";
import { performance } from "node:perf_hooks";
import { v4 as uuidv4 } from "uuid";
import { z } from "zod";
import { addEvent, clearEvents, getSummary, readEvents } from "./store.js";
import { UsageEvent } from "./types.js";

const app = express();

const PORT = Number(process.env.PORT || 4000);
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";
const DEFAULT_MODEL = process.env.OPENAI_MODEL || "gpt-4.1-mini";

const inputCostPer1M = Number(process.env.INPUT_COST_PER_1M || 0);
const outputCostPer1M = Number(process.env.OUTPUT_COST_PER_1M || 0);

if (!process.env.OPENAI_API_KEY) {
  throw new Error("Missing OPENAI_API_KEY in backend/.env");
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

app.use(
  cors({
    origin: FRONTEND_URL
  })
);

app.use(express.json({ limit: "1mb" }));

const chatSchema = z.object({
  userEmail: z.string().email(),
  matterId: z.string().min(1, "Matter ID is required"),
  taskType: z.string().min(1, "Task type is required"),
  prompt: z.string().min(1, "Prompt is required").max(10000),
  model: z.string().optional()
});

function calculateEstimatedCost(inputTokens: number, outputTokens: number): number {
  const inputCost = (inputTokens / 1_000_000) * inputCostPer1M;
  const outputCost = (outputTokens / 1_000_000) * outputCostPer1M;

  return Number((inputCost + outputCost).toFixed(8));
}

function buildFailedEvent(params: {
  userEmail: string;
  matterId: string;
  taskType: string;
  prompt: string;
  model: string;
  processingTimeMs: number;
  errorMessage: string;
}): UsageEvent {
  return {
    id: uuidv4(),
    platform: "openai",
    model: params.model,
    userEmail: params.userEmail,
    matterId: params.matterId,
    taskType: params.taskType,
    prompt: params.prompt,
    responseText: "",
    openaiResponseId: null,
    openaiCreatedAt: null,
    inputTokens: 0,
    outputTokens: 0,
    totalTokens: 0,
    processingTimeMs: params.processingTimeMs,
    estimatedCost: 0,
    status: "failed",
    errorMessage: params.errorMessage,
    createdAt: new Date().toISOString()
  };
}

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "openai-governance-gateway"
  });
});

app.post("/api/chat", async (req, res) => {
  const parsed = chatSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      error: "Invalid request",
      details: parsed.error.flatten()
    });
  }

  const { userEmail, matterId, taskType, prompt } = parsed.data;
  const model = parsed.data.model || DEFAULT_MODEL;

  const startedAt = performance.now();

  try {
    const response = await openai.responses.create({
      model,
      input: [
        {
          role: "system",
          content:
            "You are assisting with an AI governance gateway POC. Keep the answer clear and concise."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      metadata: {
        user_email: userEmail,
        matter_id: matterId,
        task_type: taskType
      }
    });

    const endedAt = performance.now();
    const processingTimeMs = Math.round(endedAt - startedAt);

    const usage = response.usage as
      | {
          input_tokens?: number;
          output_tokens?: number;
          total_tokens?: number;
        }
      | undefined;

    const inputTokens = usage?.input_tokens ?? 0;
    const outputTokens = usage?.output_tokens ?? 0;
    const totalTokens = usage?.total_tokens ?? inputTokens + outputTokens;

    const event: UsageEvent = {
      id: uuidv4(),
      platform: "openai",
      model,
      userEmail,
      matterId,
      taskType,
      prompt,
      responseText: response.output_text ?? "",
      openaiResponseId: response.id ?? null,
      openaiCreatedAt: response.created_at ?? null,
      inputTokens,
      outputTokens,
      totalTokens,
      processingTimeMs,
      estimatedCost: calculateEstimatedCost(inputTokens, outputTokens),
      status: "success",
      createdAt: new Date().toISOString()
    };

    await addEvent(event);

    return res.json({
      answer: event.responseText,
      event
    });
  } catch (error) {
    const endedAt = performance.now();
    const processingTimeMs = Math.round(endedAt - startedAt);

    const errorMessage =
      error instanceof Error ? error.message : "Unknown OpenAI API error";

    const failedEvent = buildFailedEvent({
      userEmail,
      matterId,
      taskType,
      prompt,
      model,
      processingTimeMs,
      errorMessage
    });

    await addEvent(failedEvent);

    return res.status(500).json({
      error: "OpenAI request failed",
      message: errorMessage,
      event: failedEvent
    });
  }
});

app.get("/api/events", async (_req, res) => {
  const events = await readEvents();
  res.json(events);
});

app.delete("/api/events", async (_req, res) => {
  await clearEvents();
  res.json({ success: true });
});

app.get("/api/summary", async (_req, res) => {
  const summary = await getSummary();
  res.json(summary);
});

app.listen(PORT, () => {
  console.log(`Gateway running on http://localhost:${PORT}`);
});
