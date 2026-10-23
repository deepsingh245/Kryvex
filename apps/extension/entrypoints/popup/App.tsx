import { useEffect, useState, type FormEvent } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Lock,
  LogOut,
  Moon,
  RefreshCw,
  ShieldCheck,
  Sun,
} from "lucide-react";
import { sendExtensionRequest, type ExtensionStatus } from "../../src/messages";

type Theme = "light" | "dark";

function preferredTheme(): Theme {
  return window.matchMedia("(prefers-color-scheme: light)").matches
    ? "light"
    : "dark";
}

function applyTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
}

export function App() {
  const [status, setStatus] = useState<ExtensionStatus | null>(null);
  const [email, setEmail] = useState("");
  const [masterPassword, setMasterPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [theme, setTheme] = useState<Theme>(preferredTheme);

  async function refreshStatus(): Promise<void> {
    const response = await sendExtensionRequest<ExtensionStatus>({
      type: "GET_STATUS",
    });
    if (response.ok) setStatus(response.data);
    else setError(response.error);
  }

  useEffect(() => {
    void chrome.storage.local.get("kryvex-theme").then((stored) => {
      const next = stored["kryvex-theme"];
      const resolved: Theme =
        next === "light" || next === "dark" ? next : preferredTheme();
      setTheme(resolved);
      applyTheme(resolved);
    });
    void refreshStatus();
  }, []);

  async function toggleTheme(): Promise<void> {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    applyTheme(next);
    await chrome.storage.local.set({ "kryvex-theme": next });
  }

  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const request =
      status?.state === "LOCKED"
        ? { type: "UNLOCK" as const, masterPassword }
        : { type: "SIGN_IN" as const, email, masterPassword };
    const response = await sendExtensionRequest<ExtensionStatus>(request);
    setMasterPassword("");
    if (response.ok) setStatus(response.data);
    else setError(response.error);
    setBusy(false);
  }

  async function run(
    request: { type: "LOCK" } | { type: "SIGN_OUT" } | { type: "SYNC_NOW" },
  ): Promise<void> {
    setBusy(true);
    setError(null);
    const response = await sendExtensionRequest<ExtensionStatus>(request);
    if (response.ok) setStatus(response.data);
    else setError(response.error);
    setBusy(false);
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand" aria-label="Kryvex">
          <img src={chrome.runtime.getURL("brand/kryvex-mark.png")} alt="" />
          <span>KRYVEX</span>
        </div>
        <button
          className="icon-button"
          type="button"
          onClick={() => void toggleTheme()}
          aria-label={`Use ${theme === "dark" ? "light" : "dark"} theme`}
          title={`Use ${theme === "dark" ? "light" : "dark"} theme`}
        >
          {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
        </button>
      </header>

      {!status ? (
        <section className="loading" aria-live="polite">
          <RefreshCw className="spin" size={20} /> Loading your vault…
        </section>
      ) : status.state === "UNLOCKED" ? (
        <UnlockedView
          status={status}
          busy={busy}
          onRun={run}
          onOpenConflicts={() =>
            void sendExtensionRequest({ type: "OPEN_CONFLICTS" })
          }
        />
      ) : (
        <form className="auth-card" onSubmit={(event) => void submit(event)}>
          <div className="security-icon" aria-hidden="true">
            <ShieldCheck size={22} />
          </div>
          <h1>
            {status.state === "LOCKED"
              ? "Unlock your vault"
              : "Sign in to Kryvex"}
          </h1>
          <p className="subtle">
            {status.state === "LOCKED"
              ? `Your account ${status.email ?? ""} is signed in. Enter your master password to decrypt this extension session.`
              : "Use the same email and master password as your Kryvex vault."}
          </p>

          {status.state === "SIGNED_OUT" && (
            <label>
              <span>Email</span>
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                autoFocus
              />
            </label>
          )}
          <label>
            <span>Master password</span>
            <input
              type="password"
              autoComplete="current-password"
              value={masterPassword}
              onChange={(event) => setMasterPassword(event.target.value)}
              required
              autoFocus={status.state === "LOCKED"}
            />
          </label>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <button className="primary-button" type="submit" disabled={busy}>
            {busy
              ? "Working…"
              : status.state === "LOCKED"
                ? "Unlock extension"
                : "Sign in and unlock"}
          </button>
          <p className="privacy-note">
            Your master password stays in this popup and is never sent to Kryvex
            servers.
          </p>
        </form>
      )}
    </main>
  );
}

function UnlockedView({
  status,
  busy,
  onRun,
  onOpenConflicts,
}: {
  status: ExtensionStatus;
  busy: boolean;
  onRun: (
    request: { type: "LOCK" } | { type: "SIGN_OUT" } | { type: "SYNC_NOW" },
  ) => Promise<void>;
  onOpenConflicts: () => void;
}) {
  return (
    <section className="vault-card">
      <div className="state-row">
        <div className="success-icon" aria-hidden="true">
          <CheckCircle2 size={21} />
        </div>
        <div>
          <h1>Vault unlocked</h1>
          <p>{status.email}</p>
        </div>
      </div>

      <div className="instruction">
        <img src={chrome.runtime.getURL("brand/kryvex-mark.png")} alt="" />
        <div>
          <strong>Ready to fill</strong>
          <p>
            Click the Kryvex mark beside a password field. Nothing fills
            automatically.
          </p>
        </div>
      </div>

      {status.conflictCount > 0 && (
        <button className="conflict" type="button" onClick={onOpenConflicts}>
          <AlertTriangle size={18} />
          <span>
            <strong>
              {status.conflictCount} update conflict
              {status.conflictCount === 1 ? "" : "s"}
            </strong>
            <small>Review in the Kryvex web app</small>
          </span>
        </button>
      )}

      <div className="actions">
        <button
          className="secondary-button"
          type="button"
          disabled={busy}
          onClick={() => void onRun({ type: "SYNC_NOW" })}
        >
          <RefreshCw size={16} /> Sync now
        </button>
        <button
          className="secondary-button"
          type="button"
          disabled={busy}
          onClick={() => void onRun({ type: "LOCK" })}
        >
          <Lock size={16} /> Lock
        </button>
      </div>
      <button
        className="ghost-button"
        type="button"
        disabled={busy}
        onClick={() => void onRun({ type: "SIGN_OUT" })}
      >
        <LogOut size={16} /> Sign out of extension
      </button>
    </section>
  );
}
