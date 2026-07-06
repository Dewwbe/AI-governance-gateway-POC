import fs from "node:fs/promises";
import path from "node:path";
import { UsageEvent, UsageSummary } from "./types.js";

const DATA_DIR = path.resolve(process.cwd(), "data");
const EVENTS_FILE = path.join(DATA_DIR, "usage-events.json");

async function ensureStoreExists(): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });

  try {
    await fs.access(EVENTS_FILE);
  } catch {
    await fs.writeFile(EVENTS_FILE, JSON.stringify([], null, 2), "utf-8");
  }
}

export async function readEvents(): Promise<UsageEvent[]> {
  await ensureStoreExists();

  const raw = await fs.readFile(EVENTS_FILE, "utf-8");

  try {
    return JSON.parse(raw) as UsageEvent[];
  } catch {
    return [];
  }
}

export async function addEvent(event: UsageEvent): Promise<void> {
  const events = await readEvents();
  events.unshift(event);

  await fs.writeFile(EVENTS_FILE, JSON.stringify(events, null, 2), "utf-8");
}

export async function clearEvents(): Promise<void> {
  await ensureStoreExists();
  await fs.writeFile(EVENTS_FILE, JSON.stringify([], null, 2), "utf-8");
}

export async function getSummary(): Promise<UsageSummary> {
  const events = await readEvents();

  return events.reduce<UsageSummary>(
    (summary, event) => {
      summary.totalRequests += 1;

      if (event.status === "success") {
        summary.successfulRequests += 1;
      } else {
        summary.failedRequests += 1;
      }

      summary.totalInputTokens += event.inputTokens;
      summary.totalOutputTokens += event.outputTokens;
      summary.totalTokens += event.totalTokens;
      summary.totalEstimatedCost += event.estimatedCost;

      return summary;
    },
    {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      totalInputTokens: 0,
      totalOutputTokens: 0,
      totalTokens: 0,
      totalEstimatedCost: 0
    }
  );
}
