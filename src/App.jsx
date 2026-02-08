import { useMemo, useState } from 'react';
import { evaluateExpiry, loadLog } from './scriptableExpiry';
import './styles.css';

function App() {
  const [input, setInput] = useState('');
  const [result, setResult] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const expiredLog = useMemo(() => loadLog(), [refreshKey]);

  const onSubmit = (event) => {
    event.preventDefault();
    const evaluation = evaluateExpiry(input);
    setResult(evaluation);
    setRefreshKey((k) => k + 1);
  };

  return (
    <main className="app-shell">
      <section className="card">
        <h1>Expiry Checker</h1>
        <p className="subtitle">React conversion of the Scriptable Siri-safe expiry flow.</p>

        <form onSubmit={onSubmit}>
          <label htmlFor="codeInput">Product + Code (example: cigar F5, dip A6, or B4)</label>
          <div className="row">
            <input
              id="codeInput"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Enter spoken/code input"
            />
            <button type="submit">Check</button>
          </div>
        </form>

        {result && (
          <div className={`result ${result.status}`}>
            <strong>Status:</strong> {result.status.toUpperCase()}
            <p>{result.spoken}</p>
          </div>
        )}
      </section>

      <section className="card">
        <h2>Expired Log</h2>
        {expiredLog.length === 0 ? (
          <p>No expired items logged yet.</p>
        ) : (
          <ul>
            {expiredLog.map((entry, idx) => (
              <li key={`${entry.checkedAt}-${idx}`}>
                <strong>{entry.product}</strong> ({entry.code}) — expired {entry.expiredOn}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

export default App;
