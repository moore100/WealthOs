# Changelog

## v1.0.0 — Initial Release (2026-05-21)

**WealthOS** is a personal AI financial manager and advisor desktop app for Windows, macOS, and Linux.

### Highlights

- **AI Financial Assistant** — Chat with your money. Powered by OpenAI or local Ollama models.
- **Multi-provider LLM support** — Switch between OpenAI (cloud) and Ollama (local, private) at any time.
- **Net Worth tracking** — Real-time view of assets, liabilities, and historical trends.
- **Budgeting & Expenses** — Smart categorization, recurring detection, and anomaly alerts.
- **Investment & Trading** — Live crypto (Binance) and forex (Frankfurter) tickers with AI trade signals.
- **Goals & Savings** — Sinking funds, savings intentions, and goal tracking.
- **Document Vault** — Secure local storage for receipts, statements, and tax docs.
- **AI Insights** — Morning briefings, year-end reports, and habit analysis.
- **Plugins & Widgets** — Extensible dashboard with custom widget support.

### Platform Downloads

- **Windows** — `WealthOS-Setup-1.0.0.exe` (NSIS installer)
- **macOS** — `WealthOS-1.0.0.dmg` (Apple Silicon + Intel)
- **Linux** — `WealthOS-1.0.0.AppImage`

### Installation Notes

> These builds are **unsigned** for the v1.0.0 release. You may see security warnings on first launch:
>
> - **Windows**: SmartScreen → click "More info" → "Run anyway"
> - **macOS**: Gatekeeper → right-click the app → "Open", or run `xattr -cr /Applications/WealthOS.app`
> - **Linux**: AppImage runs out of the box. Make executable with `chmod +x WealthOS-1.0.0.AppImage`.

### Privacy

- All financial data is stored **locally** in an encrypted SQLite database.
- Use **Ollama** as your AI provider for fully offline, private inference.
- No telemetry, no cloud sync (unless you opt in via Vault Sync).
