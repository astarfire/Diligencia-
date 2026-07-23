document.addEventListener('DOMContentLoaded', () => {
    const map = L.map('map', { zoomControl: false }).setView([-22.9068, -43.1729], 9);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; CartoDB &copy; OpenStreetMap contributors',
        subdomains: 'abcd',
        maxZoom: 19,
    }).addTo(map);

    L.control.zoom({ position: 'topright' }).addTo(map);

    const statusColors = {
        Urgente: '#ef4444',
        Pendente: '#f59e0b',
        Concluído: '#10b981',
        'Não Informado': '#64748b',
    };

    const officialRegions = [
        'Metropolitana',
        'Noroeste Fluminense',
        'Norte Fluminense',
        'Serrana',
        'Baixadas Litorâneas',
        'Médio Paraíba',
        'Centro-Sul Fluminense',
        'Costa Verde',
    ];
    const legacyRegionMap = {
        Lagos: 'Baixadas Litorâneas',
        Norte: 'Norte Fluminense',
        Baixada: 'Metropolitana',
    };
    let municipioCoordinates = {};

    const chipContainer = document.getElementById('regionChips');
    const processTableBody = document.getElementById('processTableBody');
    const alvaraTableBody = document.getElementById('alvaraTableBody');
    const reportHistoryBody = document.getElementById('reportHistoryBody');
    const searchInput = document.getElementById('searchInput');
    const statusFilter = document.getElementById('statusFilter');
    const mapPrimary = document.getElementById('mapPrimary');
    const topMunicipiosList = document.getElementById('topMunicipiosList');
    const newDiligenciaBtn = document.getElementById('newDiligenciaBtn');
    const generateReportBtn = document.getElementById('generateReportBtn');
    const diligenciaForm = document.getElementById('diligenciaForm');
    const formName = document.getElementById('formName');
    const formProcessNumber = document.getElementById('formProcessNumber');
    const formResponsavel = document.getElementById('formResponsavel');
    const formRegion = document.getElementById('formRegion');
    const formMunicipio = document.getElementById('formMunicipio');
    const formComarca = document.getElementById('formComarca');
    const formStatus = document.getElementById('formStatus');
    const formSummary = document.getElementById('formSummary');
    const formMessage = document.getElementById('formMessage');
    const formResetBtn = document.getElementById('formResetBtn');
    const editModal = document.getElementById('editModal');
    const editProcessForm = document.getElementById('editProcessForm');
    const editFormProcessNumber = document.getElementById('editFormProcessNumber');
    const editFormResponsavel = document.getElementById('editFormResponsavel');
    const editFormRegion = document.getElementById('editFormRegion');
    const editFormMunicipio = document.getElementById('editFormMunicipio');
    const editFormComarca = document.getElementById('editFormComarca');
    const editFormStatus = document.getElementById('editFormStatus');
    const editFormSummary = document.getElementById('editFormSummary');
    const editFormMessage = document.getElementById('editFormMessage');
    const editFormCancel = document.getElementById('editFormCancel');
    const editFormDelete = document.getElementById('editFormDelete');
    const editModalClose = document.getElementById('editModalClose');

    let diligencias = [];
    let processos = [];
    let reportHistory = [];
    let editProcessId = null;
    let activeRegion = 'Todas';
    const markerGroup = L.layerGroup().addTo(map);

    async function loadMunicipioCoordinates() {
        try {
            const response = await fetch('/api/municipios-coords');
            if (!response.ok) {
                throw new Error('Falha ao carregar coordenadas de municípios.');
            }

            const data = await response.json();
            municipioCoordinates = Object.entries(data).reduce((acc, [municipio, coords]) => {
                acc[municipio] = [coords.lat, coords.lng];
                return acc;
            }, {});
        } catch (error) {
            console.error('Erro ao carregar coordenadas de municípios:', error);
        }
    }

    function showFormMessage(message, isError = false) {
        formMessage.textContent = message;
        formMessage.style.color = isError ? '#ef4444' : '#10b981';
    }

    function parseOptionalCurrency(value) {
        if (value === null || value === undefined || value === '') {
            return null;
        }

        const parsed = Number(String(value).replace(',', '.'));
        if (!Number.isFinite(parsed) || parsed < 0) {
            return null;
        }

        return Number(parsed.toFixed(2));
    }

    function formatCurrency(value) {
        if (value === null || value === undefined || Number.isNaN(Number(value))) {
            return '-';
        }

        return Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    }

    function resetForm() {
        diligenciaForm.reset();
        formMunicipio.value = 'Rio de Janeiro';
        showFormMessage('');
    }

    function renderChips() {
        chipContainer.innerHTML = '';
        const datasetRegions = [...new Set(diligencias.map((item) => item.region).filter(Boolean))];
        const regionChips = ['Todas', ...officialRegions, ...datasetRegions.filter((region) => !officialRegions.includes(region))];
        regionChips.forEach((region) => {
            const chip = document.createElement('button');
            chip.className = 'filter-pill' + (activeRegion === region ? ' active' : '');
            chip.type = 'button';
            chip.innerText = region;
            chip.addEventListener('click', () => {
                activeRegion = region;
                renderChips();
                renderMarkers();
            });
            chipContainer.appendChild(chip);
        });
    }

    function formatStatusBadge(status) {
        const color = statusColors[status] || '#64748b';
        return `<span class="status-pill" style="background:${color};">${status}</span>`;
    }

    function renderMarkers() {
        markerGroup.clearLayers();
        const filtered = diligencias.filter((item) => activeRegion === 'Todas' || item.region === activeRegion);

        if (filtered.length === 0) {
            mapPrimary.innerText = 'Aguardando atualização';
            map.setView([-22.9068, -43.1729], 9);
            return;
        }

        filtered.forEach((diligencia, index) => {
            const marker = L.circleMarker([diligencia.lat, diligencia.lng], {
                radius: 14,
                fillColor: statusColors[diligencia.status] || '#64748b',
                color: '#ffffff',
                weight: 3,
                fillOpacity: 0.95,
                opacity: 0.9,
            });

            marker.bindPopup(`
                <div style="font-family: 'Inter', sans-serif; max-width: 240px; line-height: 1.6; color:#1f2937;">
                    <strong style="font-size: 1rem; display:block; margin-bottom: 8px;">${diligencia.name}</strong>
                    <span style="color: #475569; display:block; margin-bottom: 6px;">Região: ${diligencia.region}</span>
                    <span style="display:inline-flex; align-items:center; gap:8px; margin-bottom: 10px; font-weight:600; color:#111827;">
                        <span style="width:10px; height:10px; border-radius:50%; background:${statusColors[diligencia.status]}; display:inline-block;"></span>
                        ${diligencia.status}
                    </span>
                    <p style="font-size:0.95rem; color:#475569; margin-bottom: 12px;">${diligencia.resumo}</p>
                    <button type="button" style="width:100%; padding: 10px 12px; border: none; border-radius: 12px; background: #2563eb; color: white; cursor: pointer;" onclick="window.openAIResumo('${diligencia.name}')">Resumo de IA</button>
                </div>
            `);

            markerGroup.addLayer(marker);
            setTimeout(() => marker.setStyle({ opacity: 1 }), index * 100);
        });

        const first = filtered[0];
        mapPrimary.innerText = first.name;
        map.flyTo([first.lat, first.lng], 10, { duration: 1.2 });
    }

    async function loadDiligencias() {
        try {
            const response = await fetch('/api/diligencias');
            diligencias = await response.json();
            diligencias = diligencias.map((item) => {
                const [lat, lng] = getCoordinatesForMunicipio(item.municipio);
                const normalizedRegion = legacyRegionMap[item.region] || item.region;
                return { ...item, region: normalizedRegion, lat, lng };
            });
            renderChips();
            renderMarkers();
            updateKpis();
            updateSummary();
        } catch (error) {
            console.error('Erro ao carregar diligências:', error);
        }
    }

    function getCoordinatesForMunicipio(municipio) {
        return municipioCoordinates[municipio] || [-22.9068, -43.1729];
    }

    function openEditModal() {
        editModal.classList.remove('hidden');
        editFormMessage.textContent = '';
    }

    function closeEditModal() {
        editModal.classList.add('hidden');
        editProcessId = null;
        editProcessForm.reset();
    }

    function openEditProcess(id) {
        const processo = processos.find((item) => item.id === id);
        if (!processo) return;
        editProcessId = id;
        editFormProcessNumber.value = processo.numero;
        editFormResponsavel.value = processo.responsavel;
        editFormRegion.value = processo.region || 'Metropolitana';
        editFormMunicipio.value = processo.municipio || 'Rio de Janeiro';
        editFormComarca.value = processo.comarca;
        editFormStatus.value = processo.status;
        editFormSummary.value = processo.resumo;
        openEditModal();
    }

    async function submitEditProcess(event) {
        event.preventDefault();
        if (!editProcessId) {
            editFormMessage.textContent = 'Erro interno: processo não encontrado.';
            return;
        }

        const payload = {
            process_number: editFormProcessNumber.value.trim(),
            responsavel: editFormResponsavel.value.trim(),
            region: editFormRegion.value,
            municipio: editFormMunicipio.value,
            comarca: editFormComarca.value.trim(),
            status: editFormStatus.value,
            summary: editFormSummary.value.trim(),
        };

        try {
            const response = await fetch(`/api/processos/${editProcessId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                throw new Error('Falha ao salvar as alterações.');
            }

            const updatedProcess = await response.json();
            const index = processos.findIndex((item) => item.id === editProcessId);
            if (index >= 0) {
                processos[index] = updatedProcess;
            }
            renderProcessTable();
            updateKpis();
            updateSummary();
            closeEditModal();
        } catch (error) {
            console.error(error);
            editFormMessage.textContent = 'Não foi possível atualizar o processo.';
        }
    }

    async function submitDiligencia(event) {
        event.preventDefault();

        const payload = {
            name: formName.value.trim(),
            process_number: formProcessNumber.value.trim(),
            responsavel: formResponsavel.value.trim(),
            region: formRegion.value,
            municipio: formMunicipio.value,
            comarca: formComarca.value.trim(),
            status: formStatus.value,
            summary: formSummary.value.trim(),
        };

        if (!payload.name || !payload.process_number || !payload.responsavel) {
            showFormMessage('Preencha nome, processo e responsável.', true);
            return;
        }

        const [lat, lng] = getCoordinatesForMunicipio(payload.municipio);
        const diligenciaPayload = {
            ...payload,
            lat,
            lng,
            processos: 1,
        };

        try {
            const responseDiligencia = await fetch('/api/diligencias', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(diligenciaPayload),
            });

            if (!responseDiligencia.ok) {
                throw new Error('Falha ao salvar diligência para o mapa.');
            }

            const newDiligencia = await responseDiligencia.json();
            diligencias.push(newDiligencia);
            renderChips();
            renderMarkers();
            updateKpis();
            updateSummary();

            const responseProcess = await fetch('/api/processos', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (responseProcess.ok) {
                const newProcess = await responseProcess.json();
                processos.push(newProcess);
                renderProcessTable();
            }

            updateQuickLists();
            showFormMessage('Diligência salva com sucesso.');
            resetForm();
            document.getElementById('cadastroView').scrollIntoView({ behavior: 'smooth' });
        } catch (error) {
            console.error(error);
            showFormMessage('Erro ao salvar a diligência. Tente novamente.', true);
        }
    }

    function renderProcessTable() {
        const searchValue = searchInput.value.toLowerCase();
        const filterValue = statusFilter.value;

        const filtered = processos.filter((processo) => {
            const matchesSearch = [processo.numero, processo.status, processo.municipio, processo.comarca, processo.responsavel]
                .join(' ')
                .toLowerCase()
                .includes(searchValue);

            const matchesStatus = !filterValue || processo.urgencia === filterValue || processo.status === filterValue;
            return matchesSearch && matchesStatus;
        });

        if (filtered.length === 0) {
            processTableBody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding: 28px 0; color: #6b7280;">Nenhum processo disponível</td></tr>';
            return;
        }

        processTableBody.innerHTML = filtered.map((processo) => `
            <tr>
                <td>${processo.numero}</td>
                <td>${processo.responsavel}</td>
                <td>${formatStatusBadge(processo.status)}</td>
                <td>${processo.municipio}</td>
                <td>${processo.comarca}</td>
                <td title="${processo.resumo}">${processo.resumo}</td>
                <td>${formatCurrency(processo.valor_alvara)}</td>
                <td>
                    <div class="action-buttons">
                        <button type="button" class="button-secondary button-small" onclick="window.openEditProcess(${processo.id})">Editar</button>
                        <button type="button" class="button-danger button-small" onclick="window.deleteProcess(${processo.id})">Excluir</button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    function renderAlvaraTable() {
        if (!processos.length) {
            alvaraTableBody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 28px 0; color: #6b7280;">Nenhum processo disponível</td></tr>';
            return;
        }

        alvaraTableBody.innerHTML = processos.map((processo) => `
            <tr>
                <td>${processo.numero}</td>
                <td>${processo.responsavel || '-'}</td>
                <td>${processo.comarca || '-'}</td>
                <td>
                    <input class="alvara-input" id="alvara_${processo.id}" type="number" step="0.01" min="0" value="${processo.valor_alvara ?? ''}" placeholder="0,00" />
                </td>
                <td>
                    <button type="button" class="button-primary button-small" onclick="window.saveAlvara(${processo.id})">Salvar</button>
                </td>
            </tr>
        `).join('');
    }

    async function deleteProcess(id, fromModal = false) {
        const confirmed = confirm('Deseja realmente excluir este processo?');
        if (!confirmed) {
            return;
        }

        try {
            const response = await fetch(`/api/processos/${id}`, {
                method: 'DELETE',
            });

            if (!response.ok) {
                throw new Error('Falha ao excluir processo.');
            }

            processos = processos.filter((item) => item.id !== id);
            await loadDiligencias();
            renderProcessTable();
            renderAlvaraTable();
            updateKpis();
            updateSummary();

            if (fromModal) {
                closeEditModal();
            }
        } catch (error) {
            console.error(error);
            alert('Não foi possível excluir o processo.');
        }
    }

    async function loadProcessos() {
        try {
            const response = await fetch('/api/processos');
            processos = await response.json();
            renderProcessTable();
            renderAlvaraTable();
            updateKpis();
            updateSummary();
        } catch (error) {
            console.error('Erro ao carregar processos:', error);
        }
    }

    async function saveAlvara(processId) {
        const process = processos.find((item) => item.id === processId);
        if (!process) {
            return;
        }

        const input = document.getElementById(`alvara_${processId}`);
        const valorAlvara = parseOptionalCurrency(input.value);
        const payload = {
            process_number: process.numero,
            responsavel: process.responsavel,
            region: process.region,
            municipio: process.municipio,
            comarca: process.comarca,
            status: process.status,
            summary: process.resumo,
            valor_alvara: valorAlvara,
        };

        try {
            const response = await fetch(`/api/processos/${processId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                throw new Error('Falha ao salvar valor de alvará.');
            }

            const updated = await response.json();
            processos = processos.map((item) => (item.id === processId ? updated : item));
            renderProcessTable();
            renderAlvaraTable();
        } catch (error) {
            console.error(error);
            alert('Não foi possível salvar o valor de alvará.');
        }
    }

    function updateKpis() {
        const dataset = processos.length ? processos : diligencias;
        const totalProcessos = processos.length || diligencias.reduce((sum, item) => sum + (item.processos || 0), 0);
        const municipiosAtivos = new Set(dataset.map((item) => item.municipio || item.region)).size;
        const pendentes = dataset.filter((item) => item.status === 'Pendente').length;
        const arquivados = dataset.filter((item) => item.status === 'Concluído').length;

        document.getElementById('kpiTotal').innerText = totalProcessos;
        document.getElementById('kpiMunicipios').innerText = municipiosAtivos;
        document.getElementById('kpiPendentes').innerText = pendentes;
        document.getElementById('kpiArquivados').innerText = arquivados;
    }

    function updateSummary() {
        const dataset = processos.length ? processos : diligencias;
        document.getElementById('statusUrgente').innerText = dataset.filter((item) => item.status === 'Urgente').length;
        document.getElementById('statusPendente').innerText = dataset.filter((item) => item.status === 'Pendente').length;
        document.getElementById('statusConcluido').innerText = dataset.filter((item) => item.status === 'Concluído').length;
        document.getElementById('statusRevisao').innerText = dataset.filter((item) => item.status === 'Em revisão').length;
        updateQuickLists();
    }

    function updateQuickLists() {
        const dataset = processos.length ? processos : diligencias;
        const municipioCounts = dataset.reduce((acc, item) => {
            const municipio = item.municipio || item.region || 'Não informado';
            acc[municipio] = (acc[municipio] || 0) + 1;
            return acc;
        }, {});

        const top = Object.entries(municipioCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5);

        topMunicipiosList.innerHTML = top.length
            ? top.map((entry) => `<li>${entry[0]} <strong>${entry[1]}</strong></li>`).join('')
            : '<li>Nenhum município ainda.</li>';
    }

    function renderReportHistory() {
        if (!reportHistory.length) {
            reportHistoryBody.innerHTML = '<tr><td colspan="3" style="text-align:center; padding: 28px 0; color: #6b7280;">Nenhum relatório gerado.</td></tr>';
            return;
        }

        reportHistoryBody.innerHTML = reportHistory.map((item) => `
            <tr>
                <td>${item.generated_at}</td>
                <td>${item.filename}</td>
                <td>${item.total_processos}</td>
            </tr>
        `).join('');
    }

    async function loadReportHistory() {
        try {
            const response = await fetch('/api/relatorios/historico');
            reportHistory = await response.json();
            renderReportHistory();
        } catch (error) {
            console.error('Erro ao carregar histórico:', error);
        }
    }

    async function exportReport() {
        if (processos.length === 0) {
            alert('Não há processos para exportar.');
            return;
        }

        try {
            const response = await fetch('/api/processos/relatorio-docx');
            if (!response.ok) {
                throw new Error('Falha ao gerar relatório.');
            }

            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `relatorio_diligencias_${new Date().toISOString().slice(0, 10)}.docx`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            await loadReportHistory();
        } catch (error) {
            console.error(error);
            alert('Não foi possível exportar o relatório DOCX.');
        }
    }

    function handleZoomIn() {
        map.zoomIn();
    }

    function handleZoomOut() {
        map.zoomOut();
    }

    function handleRefreshMap() {
        loadDiligencias();
    }

    window.openAIResumo = (name) => {
        alert(`Resumo de IA para ${name} será exibido em breve.`);
    };

    const viewTabs = document.querySelectorAll('.tab-button');
    const sidebarTabs = document.querySelectorAll('.sidebar-nav a[data-view]');
    const views = {
        overview: document.getElementById('overviewView'),
        processos: document.getElementById('processosView'),
        cadastro: document.getElementById('cadastroView'),
        alvara: document.getElementById('alvaraView'),
        relatorios: document.getElementById('relatoriosView'),
        perfil: document.getElementById('perfilView'),
    };

    function setActiveView(view) {
        Object.entries(views).forEach(([viewName, element]) => {
            element.classList.toggle('hidden', viewName !== view);
        });

        viewTabs.forEach((button) => {
            button.classList.toggle('active', button.dataset.view === view);
        });

        sidebarTabs.forEach((link) => {
            link.classList.toggle('active', link.dataset.view === view);
        });

        if (view === 'relatorios') {
            loadReportHistory();
        }
    }

    function handleNewDiligencia() {
        setActiveView('cadastro');
        views.cadastro.scrollIntoView({ behavior: 'smooth' });
    }

    viewTabs.forEach((button) => {
        button.addEventListener('click', () => setActiveView(button.dataset.view));
    });

    sidebarTabs.forEach((link) => {
        link.addEventListener('click', (event) => {
            event.preventDefault();
            setActiveView(link.dataset.view);
        });
    });

    diligenciaForm.addEventListener('submit', submitDiligencia);
    formResetBtn.addEventListener('click', resetForm);
    editProcessForm.addEventListener('submit', submitEditProcess);
    editFormCancel.addEventListener('click', closeEditModal);
    editFormDelete.addEventListener('click', () => {
        if (editProcessId) {
            deleteProcess(editProcessId, true);
        }
    });
    editModalClose.addEventListener('click', closeEditModal);
    editModal.addEventListener('click', (event) => {
        if (event.target === editModal) {
            closeEditModal();
        }
    });
    document.getElementById('newDiligenciaBtn').addEventListener('click', handleNewDiligencia);
    document.getElementById('exportReportBtn').addEventListener('click', exportReport);
    generateReportBtn.addEventListener('click', exportReport);
    document.getElementById('zoomInBtn').addEventListener('click', handleZoomIn);
    document.getElementById('zoomOutBtn').addEventListener('click', handleZoomOut);
    document.getElementById('refreshMapBtn').addEventListener('click', handleRefreshMap);
    searchInput.addEventListener('input', renderProcessTable);
    statusFilter.addEventListener('change', renderProcessTable);

    window.openEditProcess = openEditProcess;
    window.deleteProcess = deleteProcess;
    window.saveAlvara = saveAlvara;

    async function bootstrap() {
        await loadMunicipioCoordinates();
        await Promise.all([loadDiligencias(), loadProcessos(), loadReportHistory()]);
    }

    bootstrap();
});
