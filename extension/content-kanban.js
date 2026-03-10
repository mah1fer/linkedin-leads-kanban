// content-kanban.js — Bridge between Chrome extension and React Kanban App

// ─── Safe messaging helper ──────────────────────────────────────────────────────
function isExtensionAlive() {
    try {
        return !!chrome.runtime?.id;
    } catch {
        return false;
    }
}

function safeSendMessage(message) {
    return new Promise((resolve) => {
        if (!isExtensionAlive()) {
            console.warn("[Kanban Bridge] Extension context invalidated. Reload the extension.");
            resolve({ error: "CONTEXT_INVALIDATED" });
            return;
        }
        try {
            chrome.runtime.sendMessage(message, (response) => {
                if (chrome.runtime.lastError) {
                    console.warn("[Kanban Bridge] sendMessage error:", chrome.runtime.lastError.message);
                    resolve({ error: chrome.runtime.lastError.message });
                    return;
                }
                resolve(response || { status: "ok" });
            });
        } catch (err) {
            console.warn("[Kanban Bridge] sendMessage exception:", err.message);
            resolve({ error: err.message });
        }
    });
}

// ─── Listen for messages from the React Kanban App (window.postMessage) ─────────
window.addEventListener("message", async (event) => {
    if (event.source !== window) return;

    if (event.data?.type === "KANBAN_EXT_REQUEST") {
        console.log("[Kanban Bridge] Forwarding request to background:", event.data);

        const result = await safeSendMessage({
            ...event.data.payload,
            requestId: event.data.id
        });

        // If we got an error, send it back to the React app so it can show UI feedback
        if (result?.error) {
            window.postMessage({
                type: "KANBAN_EXT_ERROR",
                id: event.data.id,
                error: result.error
            }, "*");
        }
    }

    if (event.data?.type === "KANBAN_EXT_PING") {
        if (isExtensionAlive()) {
            console.log("[Kanban Bridge] PING received, extension alive, sending READY");
            window.postMessage({ type: "KANBAN_EXT_READY" }, "*");
        } else {
            console.warn("[Kanban Bridge] PING received but extension context is dead");
            window.postMessage({ type: "KANBAN_EXT_DEAD" }, "*");
        }
    }
});

// ─── Listen for messages coming from background.js ──────────────────────────────
try {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        // Search/import results
        if (request.type === "KANBAN_EXT_RESPONSE") {
            window.postMessage({
                type: "KANBAN_EXT_RESPONSE",
                id: request.id,
                payload: request.payload
            }, "*");
        }

        // Direct lead push from LinkedIn panel
        if (request.type === "KANBAN_EXT_PUSH") {
            console.log("[Kanban Bridge] Direct lead push received:", request.lead);
            window.postMessage({
                type: "KANBAN_EXT_PUSH",
                lead: request.lead
            }, "*");
            sendResponse({ status: "ok" });
        }

        // Bulk push from company page
        if (request.type === "KANBAN_EXT_BULK_PUSH") {
            console.log("[Kanban Bridge] Bulk push received:", request.leads?.length, "leads");
            window.postMessage({
                type: "KANBAN_EXT_BULK_PUSH",
                leads: request.leads,
                enrich: request.enrich,
            }, "*");
            sendResponse({ status: "ok" });
        }
    });
} catch (err) {
    console.warn("[Kanban Bridge] Failed to add onMessage listener:", err.message);
}

// ─── Announce extension presence ────────────────────────────────────────────────
if (isExtensionAlive()) {
    window.postMessage({ type: "KANBAN_EXT_READY" }, "*");
    console.log("[Kanban Bridge] Content script injected and ready.");
} else {
    window.postMessage({ type: "KANBAN_EXT_DEAD" }, "*");
    console.warn("[Kanban Bridge] Content script injected but extension context is dead.");
}
