// content-linkedin.js — Lusha-like active panel on LinkedIn profiles

const PANEL_ID = 'kanban-lusha-panel';

// ─── Utility ───────────────────────────────────────────────────────────────────
function waitForElement(selector, timeout = 10000) {
    return new Promise((resolve) => {
        const el = document.querySelector(selector);
        if (el) return resolve(el);
        const observer = new MutationObserver(() => {
            const el = document.querySelector(selector);
            if (el) { observer.disconnect(); resolve(el); }
        });
        observer.observe(document.body, { childList: true, subtree: true });
        setTimeout(() => { observer.disconnect(); resolve(null); }, timeout);
    });
}

function getInitials(name) {
    if (!name) return '?';
    return name.split(' ').filter(Boolean).slice(0, 2).map(n => n[0]).join('').toUpperCase();
}

// ─── Extractors ────────────────────────────────────────────────────────────────
function extractBasicInfo() {
    const name = (
        document.querySelector('h1.text-heading-xlarge')?.innerText ||
        document.querySelector('h1')?.innerText || ""
    ).trim().split('\n')[0];

    const role = (
        document.querySelector('.text-body-medium.break-words')?.innerText || ""
    ).trim().split('\n')[0];

    let company = "";
    const expBtn = document.querySelector('button[aria-label*="rganização"]') ||
                   document.querySelector('button[aria-label*="Empresa"]') ||
                   document.querySelector('button[aria-label*="xperiência"]');
    if (expBtn) {
        company = (expBtn.getAttribute('aria-label') || "")
            .replace(/experiência atual:?/i, '').replace(/empresa atual:?/i, '').trim();
    }
    if (!company) {
        const expSection = document.querySelector('#experience ~ .pvs-list, section[data-view-name*="experience"] .pvs-list');
        const firstCompany = expSection?.querySelector('.t-14.t-black--light.t-normal span[aria-hidden="true"]');
        company = firstCompany?.innerText?.trim() || "";
    }
    if (!company) {
        company = document.querySelector('.pv-text-details__right-panel .text-body-small')?.innerText?.trim() || "";
    }

    const linkedInUrl = window.location.href.split('/overlay/')[0].split('?')[0];
    return { name, role, company, linkedInUrl };
}

function extractContacts() {
    const details = { email: "", phones: [], links: [] };
    const contactItems = document.querySelectorAll([
        '.pv-contact-info__contact-type',
        '.artdeco-list__item',
    ].join(', '));

    contactItems.forEach(item => {
        const emailLink = item.querySelector('a[href^="mailto:"]');
        if (emailLink) {
            details.email = emailLink.innerText.trim() || emailLink.href.replace('mailto:', '');
        }
        const headerText = (
            item.querySelector('.pv-contact-info__header, h3, .t-bold')?.innerText || ""
        ).toLowerCase();
        if (headerText.includes('fone') || headerText.includes('phone') || headerText.includes('tel')) {
            item.querySelectorAll('span.t-14, li').forEach(el => {
                const phone = el.innerText?.trim();
                if (phone && phone.length > 4 && !details.phones.includes(phone)) {
                    details.phones.push(phone);
                }
            });
        }
        if (headerText.includes('site') || headerText.includes('profile') || headerText.includes('perfil')) {
            item.querySelectorAll('a[href]').forEach(a => {
                if (a.href && !a.href.includes('linkedin.com') && !details.links.includes(a.href)) {
                    details.links.push(a.href);
                }
            });
        }
    });
    return details;
}

function extractSearchResults() {
    const profiles = [];
    const resultItems = document.querySelectorAll([
        '.reusable-search__result-container',
        '.search-result__wrapper',
        '[data-chameleon-result-urn]'
    ].join(', '));

    resultItems.forEach(row => {
        const nameEl = row.querySelector('.entity-result__title-text a span[aria-hidden="true"], .entity-result__title-text a, a.app-aware-link span[aria-hidden="true"]');
        const linkEl = row.querySelector('.entity-result__title-text a, a.app-aware-link');
        const subtitleEl = row.querySelector('.entity-result__primary-subtitle');

        if (nameEl && linkEl) {
            let name = nameEl.innerText?.trim().split('\n')[0] || "";
            let url = linkEl.href?.split('?')[0] || "";
            if (url.includes('/in/') && name) {
                profiles.push({ name, url, role: subtitleEl?.innerText?.trim() || "" });
            }
        }
    });
    return profiles;
}

// ─── Panel Injection ───────────────────────────────────────────────────────────
function injectPanel(info) {
    if (document.getElementById(PANEL_ID + '-host')) return;

    const host = document.createElement('div');
    host.id = PANEL_ID + '-host';
    host.style.cssText = `position:fixed;top:80px;right:0;z-index:2147483647;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;`;
    document.body.appendChild(host);

    const shadow = host.attachShadow({ mode: 'open' });
    const initials = getInitials(info.name);

    shadow.innerHTML = `
    <style>
        *{box-sizing:border-box;margin:0;padding:0}
        .panel{width:272px;background:#fff;border-radius:14px 0 0 14px;box-shadow:-6px 0 32px rgba(0,0,0,.13);border:1px solid rgba(124,58,237,.12);border-right:none;overflow:hidden;animation:slideIn .3s cubic-bezier(.16,1,.3,1)}
        @keyframes slideIn{from{transform:translateX(100%);opacity:0}to{transform:translateX(0);opacity:1}}
        .panel.collapsed{border-radius:14px 0 0 14px}
        .panel.collapsed .body{display:none}
        .header{background:linear-gradient(135deg,#7c3aed 0%,#4f46e5 100%);padding:11px 14px;display:flex;align-items:center;gap:9px;cursor:pointer;user-select:none}
        .logo{width:26px;height:26px;background:rgba(255,255,255,.18);border-radius:7px;display:flex;align-items:center;justify-content:center;font-size:13px;flex-shrink:0}
        .htitle{color:#fff;font-size:12.5px;font-weight:700;flex:1;letter-spacing:.01em}
        .htoggle{color:rgba(255,255,255,.75);font-size:18px;line-height:1;transition:transform .3s;font-weight:300}
        .panel.collapsed .htoggle{transform:rotate(180deg)}
        .body{padding:14px}
        .avatar-row{display:flex;align-items:flex-start;gap:11px;margin-bottom:13px}
        .avatar{width:42px;height:42px;border-radius:50%;background:linear-gradient(135deg,#7c3aed,#4f46e5);display:flex;align-items:center;justify-content:center;color:#fff;font-weight:800;font-size:15px;flex-shrink:0;letter-spacing:-.5px}
        .info{flex:1;min-width:0}
        .name{font-size:13.5px;font-weight:700;color:#111827;line-height:1.3;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .role{font-size:11px;color:#6b7280;margin-top:2px;line-height:1.4;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
        .company{font-size:11.5px;font-weight:700;color:#7c3aed;margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .section{background:#f9fafb;border-radius:10px;padding:10px 12px;margin-bottom:10px;border:1px solid #f3f4f6}
        .stitle{font-size:10px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:.07em;margin-bottom:7px}
        .citem{display:flex;align-items:center;gap:8px;font-size:12px;color:#374151;padding:3px 0}
        .cicon{font-size:14px;flex-shrink:0;width:18px;text-align:center}
        .cval{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .cval a{color:#374151;text-decoration:none}
        .cval a:hover{color:#7c3aed}
        .no-contacts{font-size:11px;color:#9ca3af;font-style:italic}
        .loading{display:flex;align-items:center;gap:7px;font-size:11px;color:#6b7280}
        .spinner{width:13px;height:13px;border:2px solid #e5e7eb;border-top-color:#7c3aed;border-radius:50%;animation:spin .7s linear infinite;flex-shrink:0}
        @keyframes spin{to{transform:rotate(360deg)}}
        .btn{width:100%;padding:8px 12px;border-radius:9px;font-size:12px;font-weight:700;cursor:pointer;border:none;transition:all .18s;margin-bottom:7px;display:flex;align-items:center;justify-content:center;gap:6px;letter-spacing:.01em}
        .btn:last-child{margin-bottom:0}
        .btn-primary{background:linear-gradient(135deg,#7c3aed,#4f46e5);color:#fff}
        .btn-primary:hover{opacity:.88;transform:translateY(-1px)}
        .btn-secondary{background:#f3f4f6;color:#374151;border:1px solid #e5e7eb}
        .btn-secondary:hover:not(:disabled){background:#ebe9f5;border-color:#c4b5fd;color:#7c3aed}
        .btn-success{background:#d1fae5;color:#065f46;border:1px solid #a7f3d0;cursor:default}
        .btn:disabled{opacity:.55;cursor:not-allowed;transform:none!important}
        .divider{height:1px;background:#f3f4f6;margin:3px 0 10px}
    </style>

    <div class="panel" id="panel">
        <div class="header" id="toggle">
            <div class="logo">🔗</div>
            <div class="htitle">Kanban Bridge</div>
            <div class="htoggle">‹</div>
        </div>
        <div class="body">
            <div class="avatar-row">
                <div class="avatar">${initials}</div>
                <div class="info">
                    <div class="name" title="${info.name || ''}">${info.name || '—'}</div>
                    <div class="role">${info.role || ''}</div>
                    <div class="company">${info.company || ''}</div>
                </div>
            </div>
            <div class="section">
                <div class="stitle">Contatos</div>
                <div id="contacts-content"><div class="no-contacts">Clique em "Ver Contatos" para extrair.</div></div>
            </div>
            <button class="btn btn-secondary" id="contacts-btn">🔍 Ver Contatos</button>
            <div class="divider"></div>
            <button class="btn btn-primary" id="save-btn">💾 Salvar no Kanban</button>
        </div>
    </div>`;

    // Toggle collapse
    let collapsed = false;
    shadow.getElementById('toggle').addEventListener('click', () => {
        collapsed = !collapsed;
        shadow.getElementById('panel').classList.toggle('collapsed', collapsed);
    });

    let contactData = { email: "", phones: [], links: [] };
    let contactsExtracted = false;

    function renderContacts(data) {
        const el = shadow.getElementById('contacts-content');
        const items = [];
        if (data.email) {
            items.push(`<div class="citem"><span class="cicon">✉️</span><span class="cval"><a href="mailto:${data.email}">${data.email}</a></span></div>`);
        }
        (data.phones || []).forEach(p => {
            items.push(`<div class="citem"><span class="cicon">📞</span><span class="cval">${p}</span></div>`);
        });
        (data.links || []).forEach(l => {
            items.push(`<div class="citem"><span class="cicon">🔗</span><span class="cval"><a href="${l}" target="_blank">${l}</a></span></div>`);
        });
        el.innerHTML = items.length > 0 ? items.join('') : '<div class="no-contacts">Nenhum contato público encontrado.</div>';
    }

    // "Ver Contatos" button
    shadow.getElementById('contacts-btn').addEventListener('click', async () => {
        if (contactsExtracted) return;
        const btn = shadow.getElementById('contacts-btn');
        const contentEl = shadow.getElementById('contacts-content');

        btn.disabled = true;
        contentEl.innerHTML = '<div class="loading"><div class="spinner"></div><span>Abrindo contatos...</span></div>';

        // Click LinkedIn's native "Contact info" link (opens modal without navigation)
        const contactLink = document.querySelector('a[href*="overlay/contact-info"], a[id*="contact-info"]');
        if (contactLink) {
            contactLink.click();
            contentEl.innerHTML = '<div class="loading"><div class="spinner"></div><span>Extraindo...</span></div>';

            const modalEl = await waitForElement(
                '.pv-contact-info__contact-type, .artdeco-list__item, [class*="pv-contact-info"]',
                8000
            );

            if (modalEl) {
                await new Promise(r => setTimeout(r, 800));
                contactData = extractContacts();
                renderContacts(contactData);
                contactsExtracted = true;
                btn.textContent = '✅ Contatos Extraídos';
                btn.className = 'btn btn-success';

                // Close the LinkedIn modal
                const closeBtn = document.querySelector('button[data-test-modal-close-btn], button.artdeco-modal__dismiss, button[aria-label*="Fechar"], button[aria-label*="Close"]');
                if (closeBtn) setTimeout(() => closeBtn.click(), 400);
            } else {
                contentEl.innerHTML = '<div class="no-contacts">Modal não encontrado. Abra "Informações de contato" manualmente.</div>';
                btn.disabled = false;
                btn.textContent = '🔍 Tentar Novamente';
            }
        } else {
            contentEl.innerHTML = '<div class="no-contacts">Botão de contato não encontrado nesta página.</div>';
            btn.disabled = false;
        }
    });

    // "Salvar no Kanban" button
    shadow.getElementById('save-btn').addEventListener('click', () => {
        const saveBtn = shadow.getElementById('save-btn');
        saveBtn.disabled = true;
        saveBtn.textContent = '⏳ Salvando...';

        const lead = {
            ...info,
            email: contactData.email || "",
            phones: contactData.phones || [],
            whatsapps: contactData.phones || [],
            links: (contactData.links || []).map(l => ({ id: Date.now().toString(), label: l, url: l })),
            linkedInUrl: info.linkedInUrl || window.location.href.split('/overlay/')[0].split('?')[0],
        };

        chrome.runtime.sendMessage({ action: "PUSH_LEAD_TO_KANBAN", lead }, (resp) => {
            if (chrome.runtime.lastError) {
                console.warn('[Kanban Panel] sendMessage error:', chrome.runtime.lastError.message);
                saveBtn.disabled = false;
                saveBtn.className = 'btn btn-primary';
                saveBtn.innerHTML = '❌ Extensão desconectada — recarregue';
                setTimeout(() => { saveBtn.innerHTML = '💾 Salvar no Kanban'; }, 4000);
                return;
            }
            if (resp?.status === 'error') {
                saveBtn.disabled = false;
                saveBtn.className = 'btn btn-primary';
                saveBtn.innerHTML = '❌ Erro — Kanban aberto?';
                setTimeout(() => { saveBtn.innerHTML = '💾 Salvar no Kanban'; }, 3000);
                return;
            }
            saveBtn.disabled = false;
            saveBtn.className = 'btn btn-success';
            saveBtn.innerHTML = '✅ Salvo no Kanban!';
            setTimeout(() => {
                saveBtn.className = 'btn btn-primary';
                saveBtn.innerHTML = '💾 Salvar no Kanban';
            }, 4000);
        });
    });
}

// ─── Main Init ─────────────────────────────────────────────────────────────────
async function init() {
    if (!window.location.href.includes('/in/')) return;

    await waitForElement('h1.text-heading-xlarge, h1', 7000);
    await new Promise(r => setTimeout(r, 1200));

    const info = extractBasicInfo();
    if (!info.name) return;

    injectPanel(info);
}

// Handle LinkedIn SPA navigation
let _lastUrl = location.href;
new MutationObserver(() => {
    if (location.href !== _lastUrl) {
        _lastUrl = location.href;
        const old = document.getElementById(PANEL_ID + '-host');
        if (old) old.remove();
        setTimeout(init, 1200);
    }
}).observe(document, { subtree: true, childList: true });

init();

// ─── Backward-compat: Import-by-Link task runner ───────────────────────────────
function checkTask() {
    chrome.storage.local.get("activeTask", (data) => {
        const task = data.activeTask;
        if (!task || window.kanbanTaskExecuted) return;

        if (task.action === "STEP1_PROFILE") {
            window.kanbanTaskExecuted = true;
            waitForElement('h1.text-heading-xlarge, h1', 8000).then(() => {
                setTimeout(() => {
                    const profileInfo = extractBasicInfo();
                    const contactUrl = task.targetUrl.endsWith('/')
                        ? `${task.targetUrl}overlay/contact-info/`
                        : `${task.targetUrl}/overlay/contact-info/`;
                    chrome.storage.local.set({
                        activeTask: { ...task, action: "STEP2_CONTACTS", partialData: profileInfo }
                    }, () => { window.location.href = contactUrl; });
                }, 3000 + Math.random() * 2000);
            });
        }

        if (task.action === "STEP2_CONTACTS") {
            window.kanbanTaskExecuted = true;
            waitForElement('.pv-contact-info__contact-type, .artdeco-list__item', 8000).then(() => {
                setTimeout(() => {
                    const contactDetails = extractContacts();
                    const finalLead = {
                        ...task.partialData,
                        ...contactDetails,
                        whatsapps: contactDetails.phones || [],
                        linkedInUrl: task.targetUrl || window.location.href.split('/overlay/')[0]
                    };
                    try {
                        chrome.runtime.sendMessage({ action: "LINKEDIN_RESULTS", requestId: task.requestId, data: finalLead });
                    } catch (err) {
                        console.warn('[Kanban LinkedIn] Failed to send results:', err.message);
                    }
                }, 3000 + Math.random() * 1500);
            });
        }

        if (task.action === "EXTRACT_SEARCH") {
            window.kanbanTaskExecuted = true;
            waitForElement('.reusable-search__result-container, [data-chameleon-result-urn]', 10000).then(() => {
                setTimeout(() => {
                    window.scrollTo({ top: document.body.scrollHeight / 2, behavior: 'smooth' });
                    setTimeout(() => {
                        const profiles = extractSearchResults();
                        try {
                            chrome.runtime.sendMessage({ action: "LINKEDIN_RESULTS", requestId: task.requestId, data: profiles });
                        } catch (err) {
                            console.warn('[Kanban LinkedIn] Failed to send search results:', err.message);
                        }
                    }, 1500);
                }, 4000 + Math.random() * 2000);
            });
        }
    });
}

setInterval(checkTask, 2000);
checkTask();
window.addEventListener('load', checkTask);
