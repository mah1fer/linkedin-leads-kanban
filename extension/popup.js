// popup.js — Shows current tab status in the popup

chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tab = tabs[0];
    const url = tab?.url || "";
    const icon = document.getElementById('status-icon');
    const label = document.getElementById('status-label');
    const desc = document.getElementById('status-desc');

    if (url.includes('linkedin.com/in/')) {
        icon.textContent = '✅';
        label.textContent = 'Perfil LinkedIn detectado';
        desc.textContent = 'O painel Kanban Bridge está ativo nesta página. Procure o painel roxo no canto direito.';
    } else if (url.includes('linkedin.com')) {
        icon.textContent = '🔗';
        label.textContent = 'LinkedIn aberto';
        desc.textContent = 'Navegue até um perfil (/in/nome) para ativar o painel de captura.';
    } else if (url.includes('localhost') || url.includes('127.0.0.1')) {
        icon.textContent = '🟢';
        label.textContent = 'Kanban App detectado';
        desc.textContent = 'O app Kanban está aberto. Abra um perfil no LinkedIn para capturar leads.';
    } else {
        icon.textContent = '💤';
        label.textContent = 'Aguardando...';
        desc.textContent = 'Abra um perfil no LinkedIn para ativar o painel de captura automática.';
    }
});
