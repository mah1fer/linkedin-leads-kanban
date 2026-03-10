// popup.js — Status display + app URL configurator

const DEFAULT_KANBAN_URL = "https://linkedin-leads-kanban.vercel.app";

// ─── Load saved URL and populate input ───────────────────────────────────────
chrome.storage.local.get("kanbanUrl", (data) => {
    const savedUrl = data.kanbanUrl || DEFAULT_KANBAN_URL;
    document.getElementById('url-input').value = savedUrl;
});

// ─── Save URL on button click ─────────────────────────────────────────────────
document.getElementById('save-btn').addEventListener('click', () => {
    const raw = document.getElementById('url-input').value.trim();
    if (!raw) return;

    // Normalize: ensure no trailing slash
    const url = raw.replace(/\/$/, "");
    chrome.storage.local.set({ kanbanUrl: url }, () => {
        const fb = document.getElementById('save-feedback');
        fb.style.display = 'block';
        setTimeout(() => { fb.style.display = 'none'; }, 2000);
    });
});

// ─── Status card based on current tab ────────────────────────────────────────
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tab = tabs[0];
    const url = tab?.url || "";
    const icon = document.getElementById('status-icon');
    const label = document.getElementById('status-label');
    const desc = document.getElementById('status-desc');

    chrome.storage.local.get("kanbanUrl", (data) => {
        const appUrl = data.kanbanUrl || DEFAULT_KANBAN_URL;

        if (url.includes('linkedin.com/in/')) {
            icon.textContent = '✅';
            label.textContent = 'Perfil LinkedIn detectado';
            desc.textContent = 'O painel Kanban Bridge está ativo nesta página. Procure o painel roxo no canto direito.';
        } else if (url.includes('linkedin.com')) {
            icon.textContent = '🔗';
            label.textContent = 'LinkedIn aberto';
            desc.textContent = 'Navegue até um perfil (/in/nome) para ativar o painel de captura.';
        } else if (isKanbanApp(url, appUrl)) {
            icon.textContent = '🟢';
            label.textContent = 'App Kanban detectado';
            desc.textContent = 'O app está aberto e conectado. Abra um perfil no LinkedIn para capturar leads.';
        } else {
            icon.textContent = '💤';
            label.textContent = 'Aguardando...';
            desc.textContent = `Abra o app (${shortUrl(appUrl)}) ou um perfil no LinkedIn.`;
        }
    });
});

function isKanbanApp(currentUrl, appUrl) {
    if (currentUrl.includes('localhost') || currentUrl.includes('127.0.0.1')) return true;
    try {
        const appHost = new URL(appUrl).host;
        const curHost = new URL(currentUrl).host;
        return curHost === appHost;
    } catch (_) {
        return false;
    }
}

function shortUrl(url) {
    try { return new URL(url).host; } catch (_) { return url; }
}
