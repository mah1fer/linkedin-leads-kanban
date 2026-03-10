// background.js — Service worker for Kanban Bridge extension
//
// The Kanban app URL is configurable via the popup (stored in chrome.storage.local).
// Default: the Vercel production URL.
const DEFAULT_KANBAN_URL = "https://linkedin-leads-kanban.vercel.app";

function getKanbanUrl() {
    return new Promise((resolve) => {
        chrome.storage.local.get("kanbanUrl", (data) => {
            resolve(data.kanbanUrl || DEFAULT_KANBAN_URL);
        });
    });
}

// Build URL match patterns for chrome.tabs.query from the configured app URL.
// Always includes localhost and 127.0.0.1 for development.
function buildTabPatterns(appUrl) {
    const patterns = ["*://localhost/*", "*://127.0.0.1/*"];
    try {
        const u = new URL(appUrl);
        patterns.push(`${u.protocol}//${u.host}/*`);
    } catch (_) { /* invalid URL */ }
    return patterns;
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log("[Kanban SW] Message received:", request.action);

    // ── Active Panel: push lead directly from LinkedIn page ──────────────────
    if (request.action === "PUSH_LEAD_TO_KANBAN") {
        console.log("[Kanban SW] PUSH_LEAD_TO_KANBAN:", request.lead);

        getKanbanUrl().then((appUrl) => {
            const patterns = buildTabPatterns(appUrl);
            chrome.tabs.query({ url: patterns }, (tabs) => {
                if (!tabs || tabs.length === 0) {
                    console.warn("[Kanban SW] No Kanban tab found. URL configured:", appUrl);
                    sendResponse({ status: "error", message: "Kanban not open" });
                    return;
                }
                tabs.forEach(tab => {
                    chrome.tabs.sendMessage(tab.id, {
                        type: "KANBAN_EXT_PUSH",
                        lead: request.lead
                    });
                });
                sendResponse({ status: "ok" });
            });
        });

        return true; // async
    }

    // ── Passive: search from Kanban app ───────────────────────────────────────
    if (request.action === "SEARCH_LINKEDIN") {
        const searchUrl = `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(request.query)}`;
        chrome.storage.local.set({
            activeTask: { action: "EXTRACT_SEARCH", requestId: request.requestId, kanbanTabId: sender.tab?.id }
        }, () => {
            chrome.tabs.create({ url: searchUrl, active: true });
        });
        sendResponse({ status: "started" });
        return true;
    }

    // ── Passive: import by link from Kanban app ───────────────────────────────
    if (request.action === "IMPORT_BY_LINK") {
        console.log("[Kanban SW] IMPORT_BY_LINK:", request.url);
        chrome.storage.local.set({
            activeTask: {
                action: "STEP1_PROFILE",
                requestId: request.requestId,
                targetUrl: request.url,
                kanbanTabId: sender.tab?.id,
                startedAt: Date.now()
            }
        }, () => {
            chrome.tabs.create({ url: request.url, active: true });
        });
        sendResponse({ status: "started" });
        return true;
    }

    // ── Results coming back from LinkedIn content script ──────────────────────
    if (request.action === "LINKEDIN_RESULTS") {
        console.log("[Kanban SW] Forwarding LINKEDIN_RESULTS to app...");

        getKanbanUrl().then((appUrl) => {
            const patterns = buildTabPatterns(appUrl);
            chrome.tabs.query({ url: patterns }, (tabs) => {
                if (!tabs || tabs.length === 0) {
                    console.warn("[Kanban SW] No Kanban tab found to send results. URL configured:", appUrl);
                    return;
                }
                tabs.forEach(tab => {
                    chrome.tabs.sendMessage(tab.id, {
                        type: "KANBAN_EXT_RESPONSE",
                        id: request.requestId,
                        payload: request.data
                    });
                });
            });
        });

        chrome.storage.local.remove("activeTask");

        if (sender.tab) {
            console.log("[Kanban SW] Closing extraction tab:", sender.tab.id);
            chrome.tabs.remove(sender.tab.id);
        }
    }
});
