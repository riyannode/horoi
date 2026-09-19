import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { api, type InspectResult, type Report, type ReportListItem } from "./api";

type Screen = "run" | "result" | "reports";

const ZERO = "0x0000000000000000000000000000000000000000";

function short(v?: string, n = 10) {
  if (!v) return "-";
  if (v.length <= n * 2 + 2) return v;
  return `${v.slice(0, n)}…${v.slice(-6)}`;
}

function looksLikeAddress(value: string): boolean {
  return /^0x[0-9a-fA-F]{40}$/.test(value);
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`badge ${status}`} title={status}>
      {status === "PASS" ? "PASS ✓" : status === "FAIL" ? "FAIL ✗" : status}
    </span>
  );
}

function Copy({ value }: { value: string }) {
  return (
    <button
      className="ghost"
      type="button"
      onClick={() => navigator.clipboard.writeText(value)}
      title="Copy"
    >
      copy
    </button>
  );
}

export function App() {
  const [screen, setScreen] = useState<Screen>("run");
  const [asset, setAsset] = useState("");
  const [target, setTarget] = useState("");
  const [profile, setProfile] = useState("erc4626");
  const [block, setBlock] = useState("");
  const [holder, setHolder] = useState("");
  const [updater, setUpdater] = useState("");
  const [progress, setProgress] = useState<string>("");
  const [inspect, setInspect] = useState<InspectResult | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<Report | null>(null);
  const [runId, setRunId] = useState<string | null>(null);
  const [items, setItems] = useState<ReportListItem[]>([]);
  const [health, setHealth] = useState<string>("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [publishInfo, setPublishInfo] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    api
      .health()
      .then((h) => setHealth(`${h.suite} v${h.version} · chain ${h.chainId}`))
      .catch(() => setHealth("API offline"));
  }, []);

  const loadReports = async () => {
    try {
      const res = await api.listReports();
      setItems(res.items);
    } catch (e) {
      setError(String(e));
    }
  };

  useEffect(() => {
    if (screen === "reports") void loadReports();
  }, [screen]);

  const bscScan = useMemo(() => {
    if (!report) return null;
    return {
      asset: `https://bscscan.com/address/${report.asset}`,
      target:
        report.target && report.target !== ZERO
          ? `https://bscscan.com/address/${report.target}`
          : null,
      tx: publishInfo?.txHash
        ? `https://bscscan.com/tx/${String(publishInfo.txHash)}`
        : null,
      contract: publishInfo?.registry
        ? `https://bscscan.com/address/${String(publishInfo.registry)}`
        : null,
    };
  }, [report, publishInfo]);

  const onInspect = async () => {
    setError(null);
    try {
      let resolved = asset.trim();
      if (!looksLikeAddress(resolved)) {
        const search = await api.search(resolved);
        const match = search.items.find((item) => item.binanceChainId === "56" && item.tokenContractAddress);
        if (!match?.tokenContractAddress) throw new Error("RWA_ASSET_NOT_FOUND: Binance Web3 returned no BSC bStock match");
        resolved = match.tokenContractAddress;
        setAsset(resolved);
      }
      setInspect(await api.inspect(resolved));
    } catch (e) {
      setInspect(null);
      setError(String(e));
    }
  };

  const onRun = async () => {
    setError(null);
    setRunning(true);
    setPublishInfo(null);
    try {
      let resolvedAsset = asset.trim();
      if (!looksLikeAddress(resolvedAsset)) {
        const search = await api.search(resolvedAsset);
        const match = search.items.find((item) => item.binanceChainId === "56" && item.tokenContractAddress);
        if (!match?.tokenContractAddress) throw new Error("RWA_ASSET_NOT_FOUND: Binance Web3 returned no BSC bStock match");
        resolvedAsset = match.tokenContractAddress;
        setAsset(resolvedAsset);
      }
      setInspect(await api.inspect(resolvedAsset));
      const started = await api.startRun({
        asset: resolvedAsset,
        target: target.trim() ? target.trim() : null,
        profile,
        blockNumber: block.trim() ? Number(block) : null,
        holder: holder.trim() ? holder.trim() : null,
        updater: updater.trim() ? updater.trim() : null,
      });
      setRunId(started.runId);
      for (;;) {
        const run = await api.getRun(started.runId);
        if (run.progress) setProgress(`${run.progress.completed}/${run.progress.total}`);
        if (["PASS", "FAIL", "INCOMPLETE", "ERROR"].includes(run.status)) {
          if (run.report) {
            setReport(run.report);
            setScreen("result");
            break;
          }
          if (run.status === "ERROR") throw new Error(run.errorCode ?? "run failed");
          setReport(await api.getReport(started.runId));
          setScreen("result");
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 800));
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl p-4 md:p-6">
      <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Horoi</h1>
          <p className="text-sm" style={{ color: "var(--muted)" }}>
            Tokenized-stock DeFi conformance · {health || "…"}
          </p>
        </div>
        <nav className="flex gap-2">
          {(["run", "result", "reports"] as Screen[]).map((s) => (
            <button
              key={s}
              className="ghost"
              type="button"
              onClick={() => setScreen(s)}
              style={{
                borderColor: screen === s ? "var(--accent)" : undefined,
                color: screen === s ? "var(--accent)" : undefined,
              }}
            >
              {s === "run" ? "Run" : s === "result" ? "Result" : "Reports"}
            </button>
          ))}
        </nav>
      </header>

      {error && (
        <div className="panel mb-4" style={{ borderColor: "var(--fail)" }}>
          <div className="text-sm font-semibold" style={{ color: "var(--fail)" }}>
            Error
          </div>
          <div className="mono text-sm break-all">{error}</div>
        </div>
      )}

      {screen === "run" && (
        <section className="grid gap-4">
          <div className="panel grid gap-1 text-sm">
            <strong>BSC MAINNET STATE</strong>
            <span style={{ color: "var(--muted)" }}>Inspection reads the selected asset at a pinned BSC block. Corporate-action writes never reach mainnet.</span>
          </div>
          <section className="panel grid gap-4 md:grid-cols-2">
          <div className="grid gap-3">
            <label className="grid gap-1 text-sm">
              bStock address
              <input
                className="mono"
                placeholder="0x…"
                value={asset}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setAsset(e.target.value)}
              />
            </label>
            <label className="grid gap-1 text-sm">
              Target protocol (optional for token-only)
              <input
                className="mono"
                placeholder="0x… or empty"
                value={target}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setTarget(e.target.value)}
              />
            </label>
            <label className="grid gap-1 text-sm">
              Known funded bStock holder (optional fallback)
              <input
                className="mono"
                placeholder="0x… optional"
                value={holder}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setHolder(e.target.value)}
              />
            </label>
            <label className="grid gap-1 text-sm">
              Known multiplier updater (optional fallback)
              <input
                className="mono"
                placeholder="0x… optional"
                value={updater}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setUpdater(e.target.value)}
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="grid gap-1 text-sm">
                Profile
                <select value={profile} onChange={(e: ChangeEvent<HTMLSelectElement>) => setProfile(e.target.value)}>
                  <option value="custody">custody</option>
                  <option value="erc4626">erc4626</option>
                </select>
              </label>
              <label className="grid gap-1 text-sm">
                Block (latest if empty)
                <input
                  className="mono"
                  placeholder="latest"
                  value={block}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setBlock(e.target.value)}
                />
              </label>
            </div>
            <div className="flex flex-wrap gap-2">
              <button className="primary" type="button" onClick={onRun} disabled={running || !asset.trim()}>
                {running ? `Running ${progress || "…"}` : "Run test"}
              </button>
              <button className="ghost" type="button" onClick={onInspect} disabled={!asset.trim()}>
                Inspect only
              </button>
            </div>
          </div>
          <div className="grid gap-2 text-sm">
            <div className="font-semibold">Detected</div>
            {inspect ? (
              <div className="grid gap-1 mono">
                <div>asset {inspect.asset}</div>
                <div>
                  {inspect.symbol ?? "-"} / {inspect.name ?? "-"}
                </div>
                <div>chain {inspect.chainId}</div>
                <div>uiMultiplier {inspect.uiMultiplier}</div>
                <div>newUIMultiplier {inspect.newUIMultiplier}</div>
                <div>effectiveAt {inspect.effectiveAt}</div>
                <div>block {inspect.blockNumber}</div>
                <div className="break-all">
                  interfaces {inspect.supportedInterfaces.join(", ") || "-"}
                </div>
              </div>
            ) : (
              <div style={{ color: "var(--muted)" }}>Paste a bStock and inspect or run.</div>
            )}
          </div>
          </section>
        </section>
      )}

      {screen === "result" && (
        <section className="grid gap-4">
          {!report ? (
            <div className="panel" style={{ color: "var(--muted)" }}>
              No result yet. Run a test first.
            </div>
          ) : (
            <>
              <div className="panel flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-3">
                    <StatusBadge status={report.status} />
                    <span className="text-sm" style={{ color: "var(--muted)" }}>
                      run {report.runId}
                    </span>
                  </div>
                  <div className="mt-2 grid gap-1 text-sm mono">
                    <div>asset {report.asset}</div>
                    <div>target {report.target}</div>
                    <div>
                      BSC MAINNET STATE · block {report.blockNumber} · profile {report.profile}
                    </div>
                    <div>LOCAL BSC FORK EXECUTION · corporate-action scenarios are isolated and never mainnet writes</div>
                    <div>
                      suite {report.suiteId}@{report.suiteVersion}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      resultHash {short(report.resultHash, 12)} <Copy value={report.resultHash} />
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      contextHash {short(report.binanceWeb3?.contextHash, 12)} {report.binanceWeb3?.contextHash && <Copy value={report.binanceWeb3.contextHash} />}
                    </div>
                  </div>
                </div>
                <div className="grid gap-2 text-sm">
                  {bscScan?.asset && (
                    <a className="ghost" href={bscScan.asset} target="_blank" rel="noreferrer">
                      Asset on BscScan
                    </a>
                  )}
                  {bscScan?.target && (
                    <a className="ghost" href={bscScan.target} target="_blank" rel="noreferrer">
                      Target on BscScan
                    </a>
                  )}
                  <button
                    className="ghost"
                    type="button"
                    onClick={async () => {
                      if (!runId) return;
                      try {
                        const payload = await api.publishPayload(runId);
                        setPublishInfo(payload);
                      } catch (e) {
                        setError(String(e));
                      }
                    }}
                  >
                    Load publish payload
                  </button>
                  {bscScan?.tx && (
                    <a className="ghost" href={bscScan.tx} target="_blank" rel="noreferrer">
                      Registry tx
                    </a>
                  )}
                </div>
              </div>

              {report.binanceWeb3 && (
                <div className="panel grid gap-2 text-sm">
                  <div className="font-semibold">BINANCE WEB3 CONTEXT</div>
                  <div>Context only. It does not determine Horoi conformance status.</div>
                  <div className="mono">configured {String(report.binanceWeb3.configured)} · observed {new Date(report.binanceWeb3.capturedAt).toISOString()}</div>
                  <div className="mono">platform {String(report.binanceWeb3.selectedAsset?.platformId ?? "-")} · ticker {String(report.binanceWeb3.selectedAsset?.ticker ?? report.binanceWeb3.selectedAsset?.underlyingTicker ?? "-")}</div>
                  <div className="mono">token price {report.binanceWeb3.tokenPrice ?? "-"} · reference price {report.binanceWeb3.referencePrice ?? "-"}</div>
                  <div className="mono break-all">contextHash {report.binanceWeb3.contextHash}</div>
                  <div className="grid gap-1">
                    {report.binanceWeb3.calls.map((call) => (
                      <div key={`${call.module}-${call.operation}-${call.endpointId}`} className="mono text-xs">
                        {call.success ? "OK" : "NOT VERIFIED"} {call.module}/{call.operation} · {call.latencyMs}ms {call.errorCode ?? ""}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {report.economics && (
                <div className="panel grid gap-3 md:grid-cols-2">
                  <div>
                    <div className="mb-1 font-semibold">Before</div>
                    <div className="mono text-sm">
                      raw {report.economics.before?.rawClaim ?? "-"} · mult{" "}
                      {report.economics.before?.multiplier ?? "-"} · effective{" "}
                      {report.economics.before?.effectiveClaim ?? "-"}
                    </div>
                  </div>
                  <div>
                    <div className="mb-1 font-semibold">After</div>
                    <div className="mono text-sm">
                      raw {report.economics.after?.rawClaim ?? "-"} · mult{" "}
                      {report.economics.after?.multiplier ?? "-"} · effective{" "}
                      {report.economics.after?.effectiveClaim ?? "-"}
                    </div>
                  </div>
                </div>
              )}

              <div className="panel overflow-x-auto">
                <table>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Test</th>
                      <th>Required</th>
                      <th>Status</th>
                      <th>Evidence</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.checks.map((c) => (
                      <tr key={c.id}>
                        <td className="mono">{c.id}</td>
                        <td>{c.name}</td>
                        <td>{c.required ? "yes" : "no"}</td>
                        <td>
                          <StatusBadge status={c.status} />
                        </td>
                        <td>
                          <button
                            className="ghost"
                            type="button"
                            onClick={() => setExpanded(expanded === c.id ? null : c.id)}
                          >
                            {expanded === c.id ? "hide" : "show"}
                          </button>
                          {expanded === c.id && (
                            <pre className="mono mt-2 whitespace-pre-wrap text-xs">
                              {JSON.stringify(
                                {
                                  expected: c.expected,
                                  observed: c.observed,
                                  evidence: c.evidence,
                                  errorCode: c.errorCode,
                                },
                                null,
                                2,
                              )}
                            </pre>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>
      )}

      {screen === "reports" && (
        <section className="panel overflow-x-auto">
          <table>
            <thead>
              <tr>
                <th>Status</th>
                <th>Run</th>
                <th>Asset</th>
                <th>Target</th>
                <th>Profile</th>
                <th>Block</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <tr key={it.runId}>
                  <td>
                    <StatusBadge status={it.status} />
                  </td>
                  <td className="mono">
                    <button
                      className="ghost"
                      type="button"
                      onClick={async () => {
                        const rep = await api.getReport(it.runId);
                        setReport(rep);
                        setRunId(it.runId);
                        setScreen("result");
                      }}
                    >
                      {short(it.runId, 8)}
                    </button>
                  </td>
                  <td className="mono">{short(it.asset)}</td>
                  <td className="mono">{it.target ? short(it.target) : "-"}</td>
                  <td>{it.profile}</td>
                  <td className="mono">{it.blockNumber}</td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ color: "var(--muted)" }}>
                    No reports yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </section>
      )}

      <footer className="mt-6 text-xs" style={{ color: "var(--muted)" }}>
        Horoi is a conformance tool, not a security audit, legal opinion, financial advice, or
        permanent certification. Reports are valid only for the recorded suite, asset, target,
        chain state, and block context. Fork tests are local and never mainnet writes.
      </footer>
    </div>
  );
}
