import { useEffect, useState } from "react";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";

type UsageEvent = {
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

type UsageSummary = {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalTokens: number;
  totalEstimatedCost: number;
};

function App() {
  const [userEmail, setUserEmail] = useState("lawyer@example.com");
  const [matterId, setMatterId] = useState("MATTER-001");
  const [taskType, setTaskType] = useState("contract_summary");
  const [model, setModel] = useState("");
  const [prompt, setPrompt] = useState("Summarise the key risks in a simple NDA.");

  const [answer, setAnswer] = useState("");
  const [events, setEvents] = useState<UsageEvent[]>([]);
  const [summary, setSummary] = useState<UsageSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [clearing, setClearing] = useState(false);

  async function loadEvents() {
    const [eventsResponse, summaryResponse] = await Promise.all([
      fetch(`${API_BASE_URL}/api/events`),
      fetch(`${API_BASE_URL}/api/summary`)
    ]);

    setEvents(await eventsResponse.json());
    setSummary(await summaryResponse.json());
  }

  useEffect(() => {
    loadEvents().catch(console.error);
  }, []);

  async function sendPrompt() {
    setLoading(true);
    setAnswer("");

    try {
      const response = await fetch(`${API_BASE_URL}/api/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          userEmail,
          matterId,
          taskType,
          prompt,
          model: model.trim() || undefined
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || "Request failed");
      }

      setAnswer(data.answer);
      await loadEvents();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      alert(message);
      await loadEvents();
    } finally {
      setLoading(false);
    }
  }

  async function clearUsageEvents() {
    const confirmed = window.confirm("Clear all captured demo usage events?");
    if (!confirmed) return;

    setClearing(true);
    try {
      await fetch(`${API_BASE_URL}/api/events`, {
        method: "DELETE"
      });
      await loadEvents();
      setAnswer("");
    } finally {
      setClearing(false);
    }
  }

  return (
    <main className="page">
      <section className="card hero">
        <div>
          <p className="eyebrow">OpenAI API Gateway</p>
          <h1>AI Governance Gateway POC</h1>
          <p>
            This demo sends prompts through your own backend gateway, then logs
            usage details such as user, matter, model, tokens, latency and cost.
          </p>
        </div>
      </section>

      <section className="grid">
        <div className="card">
          <h2>Send AI Request</h2>

          <label>User Email</label>
          <input value={userEmail} onChange={(e) => setUserEmail(e.target.value)} />

          <label>Matter ID</label>
          <input value={matterId} onChange={(e) => setMatterId(e.target.value)} />

          <label>Task Type</label>
          <select value={taskType} onChange={(e) => setTaskType(e.target.value)}>
            <option value="contract_summary">Contract Summary</option>
            <option value="legal_research">Legal Research</option>
            <option value="drafting">Drafting</option>
            <option value="risk_review">Risk Review</option>
            <option value="general_question">General Question</option>
          </select>

          <label>Model Optional</label>
          <input
            value={model}
            onChange={(e) => setModel(e.target.value)}
            placeholder="Leave blank to use backend default"
          />

          <label>Prompt</label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={8}
          />

          <button onClick={sendPrompt} disabled={loading}>
            {loading ? "Sending..." : "Send through Gateway"}
          </button>
        </div>

        <div className="card">
          <h2>AI Response</h2>
          {answer ? <pre className="answer">{answer}</pre> : <p>No response yet.</p>}
        </div>
      </section>

      <section className="card">
        <div className="sectionHeader">
          <h2>Usage Summary</h2>
          <button className="secondary" onClick={clearUsageEvents} disabled={clearing}>
            {clearing ? "Clearing..." : "Clear Demo Events"}
          </button>
        </div>

        {summary ? (
          <div className="summary">
            <div>
              <strong>{summary.totalRequests}</strong>
              <span>Total Requests</span>
            </div>
            <div>
              <strong>{summary.successfulRequests}</strong>
              <span>Successful</span>
            </div>
            <div>
              <strong>{summary.totalInputTokens}</strong>
              <span>Input Tokens</span>
            </div>
            <div>
              <strong>{summary.totalOutputTokens}</strong>
              <span>Output Tokens</span>
            </div>
            <div>
              <strong>{summary.totalTokens}</strong>
              <span>Total Tokens</span>
            </div>
            <div>
              <strong>${summary.totalEstimatedCost.toFixed(6)}</strong>
              <span>Estimated Cost</span>
            </div>
          </div>
        ) : (
          <p>Loading summary...</p>
        )}
      </section>

      <section className="card">
        <h2>Captured Usage Events</h2>

        <div className="tableWrap">
          <table>
            <thead>
              <tr>
                <th>Time</th>
                <th>User</th>
                <th>Matter</th>
                <th>Task</th>
                <th>Model</th>
                <th>Response ID</th>
                <th>Input</th>
                <th>Output</th>
                <th>Total</th>
                <th>Latency</th>
                <th>Cost</th>
                <th>Status</th>
              </tr>
            </thead>

            <tbody>
              {events.length === 0 ? (
                <tr>
                  <td colSpan={12}>No usage events captured yet.</td>
                </tr>
              ) : (
                events.map((event) => (
                  <tr key={event.id}>
                    <td>{new Date(event.createdAt).toLocaleString()}</td>
                    <td>{event.userEmail}</td>
                    <td>{event.matterId}</td>
                    <td>{event.taskType}</td>
                    <td>{event.model}</td>
                    <td className="mono">{event.openaiResponseId || "-"}</td>
                    <td>{event.inputTokens}</td>
                    <td>{event.outputTokens}</td>
                    <td>{event.totalTokens}</td>
                    <td>{event.processingTimeMs} ms</td>
                    <td>${event.estimatedCost.toFixed(6)}</td>
                    <td>{event.status}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

export default App;
