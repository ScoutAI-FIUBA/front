import { useEffect, useState } from "react";
import { API_BASE_URL, fetchHealth } from "./api";
import "./App.css";

type HealthState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "ok"; status: string }
  | { kind: "error"; message: string };

function App() {
  const [health, setHealth] = useState<HealthState>({ kind: "idle" });

  const ping = async () => {
    setHealth({ kind: "loading" });
    try {
      const result = await fetchHealth();
      setHealth({ kind: "ok", status: result.status });
    } catch (err) {
      setHealth({
        kind: "error",
        message: err instanceof Error ? err.message : "Unknown error",
      });
    }
  };

  useEffect(() => {
    void ping();
  }, []);

  return (
    <main className="app">
      <header>
        <h1>ScoutAI</h1>
        <p className="subtitle">Basketball scouting platform</p>
      </header>

      <section className="card">
        <h2>Backend status</h2>
        <p>
          API URL: <code>{API_BASE_URL || "(not configured)"}</code>
        </p>
        <div className={`status status-${health.kind}`}>
          {health.kind === "idle" && <span>Idle</span>}
          {health.kind === "loading" && <span>Checking…</span>}
          {health.kind === "ok" && <span>OK — {health.status}</span>}
          {health.kind === "error" && <span>Error — {health.message}</span>}
        </div>
        <button type="button" onClick={ping} disabled={health.kind === "loading"}>
          Ping /health
        </button>
      </section>
    </main>
  );
}

export default App;
