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
    const CACHE_KEYS = {
        diligencias: 'de_cache_diligencias',
        processos: 'de_cache_processos',
        reportHistory: 'de_cache_report_history',
    };
    let municipioCoordinates = {};

    const chipContainer = document.getElementById('regionChips');
    const processTableBody = document.getElementById('processTableBody');
    const alvaraTableBody = document.getElementById('alvaraTableBody');
    const reportHistoryBody = document.getElementById('reportHistoryBody');
    const recalculateAlvarasBtn = document.getElementById('recalculateAlvarasBtn');
    const searchInput = document.getElementById('searchInput');
    const statusFilter = document.getElementById('statusFilter');
    const mapPrimary = document.getElementById('mapPrimary');
    const topMunicipiosList = document.getElementById('topMunicipiosList');
    const alvaraTotalValue = document.getElementById('alvaraTotalValue');
    const alvaraFilledCount = document.getElementById('alvaraFilledCount');
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
    const formValorAlvara = document.getElementById('formValorAlvara');
    const formSummary = document.getElementById('formSummary');
    const formMessage = document.getElementById('formMessage');
    const formResetBtn = document.getElementById('formResetBtn');
    const operationForm = document.getElementById('operacaoForm');
    const operationProcessSelect = document.getElementById('operationProcessSelect');
    const operationOrigin = document.getElementById('operationOrigin');
    const operationDestino = document.getElementById('operationDestino');
    const operationModalidadeDiligencia = document.getElementById('operationModalidadeDiligencia');
    const operationValorCausa = document.getElementById('operationValorCausa');
    const operationPrecoGasolina = document.getElementById('operationPrecoGasolina');
    const operationPrecoAluguelCarro = document.getElementById('operationPrecoAluguelCarro');
    const operationDistanciaRoteiro = document.getElementById('operationDistanciaRoteiro');
    const operationTempoEstimadoMinutos = document.getElementById('operationTempoEstimadoMinutos');
    const operationRoteiroEstrategico = document.getElementById('operationRoteiroEstrategico');
    const operationModusOperandi = document.getElementById('operationModusOperandi');
    const operationMessage = document.getElementById('operationMessage');
    const calculateRouteBtn = document.getElementById('calculateRouteBtn');
    const saveOperationBtn = document.getElementById('saveOperationBtn');
    const openGoogleMapsBtn = document.getElementById('openGoogleMapsBtn');
    const openWazeBtn = document.getElementById('openWazeBtn');
    const operationSummaryDestino = document.getElementById('operationSummaryDestino');
    const operationSummaryComarca = document.getElementById('operationSummaryComarca');
    const operationDistanceValue = document.getElementById('operationDistanceValue');
    const operationDurationValue = document.getElementById('operationDurationValue');
    const operationCostValue = document.getElementById('operationCostValue');
    const operationRoutingHint = document.getElementById('operationRoutingHint');
    const temperatureLabel = document.getElementById('temperatureLabel');
    const temperatureFill = document.getElementById('temperatureFill');
    const temperatureMeta = document.getElementById('temperatureMeta');
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
    let currentOperationEstimate = null;
    const markerGroup = L.layerGroup().addTo(map);
    const OPERATION_ORIGIN = {
        label: 'Carioca, Centro - Rio de Janeiro',
        lat: -22.90716,
        lng: -43.17665,
    };

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

    function parseOptionalDecimal(value) {
        if (value === null || value === undefined || value === '') {
            return null;
        }

        const parsed = Number(String(value).replace(',', '.'));
        if (!Number.isFinite(parsed) || parsed < 0) {
            return null;
        }

        return Number(parsed.toFixed(2));
    }

    function formatDistance(value) {
        if (value === null || value === undefined || Number.isNaN(Number(value))) {
            return '-';
        }

        return `${Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} km`;
    }

    function formatDuration(minutes) {
        if (minutes === null || minutes === undefined || Number.isNaN(Number(minutes))) {
            return '-';
        }

        const totalMinutes = Math.round(Number(minutes));
        const hours = Math.floor(totalMinutes / 60);
        const remainingMinutes = totalMinutes % 60;

        if (!hours) {
            return `${remainingMinutes} min`;
        }

        if (!remainingMinutes) {
            return `${hours}h`;
        }

        return `${hours}h ${remainingMinutes}min`;
    }

    function parseOptionalMinutes(value) {
        if (value === null || value === undefined || value === '') {
            return null;
        }

        const parsed = Number(value);
        if (!Number.isFinite(parsed) || parsed < 0) {
            return null;
        }

        return Math.round(parsed);
    }

    function getOperationManualEstimate() {
        return {
            distanceKm: parseOptionalDecimal(operationDistanciaRoteiro.value),
            durationMinutes: parseOptionalMinutes(operationTempoEstimadoMinutos.value),
        };
    }

    function buildOperationalSummary(item) {
        const parts = [];

        if (item.modalidade_diligencia && item.modalidade_diligencia !== 'Não informado') {
            parts.push(`Modalidade: ${item.modalidade_diligencia}`);
        }
        if (item.distancia_roteiro !== null && item.distancia_roteiro !== undefined) {
            parts.push(`Distância: ${formatDistance(item.distancia_roteiro)}`);
        }
        if (item.valor_causa !== null && item.valor_causa !== undefined) {
            parts.push(`Causa: ${formatCurrency(item.valor_causa)}`);
        }
        if (item.preco_gasolina !== null && item.preco_gasolina !== undefined) {
            parts.push(`Gasolina: ${formatCurrency(item.preco_gasolina)}`);
        }
        if (item.preco_aluguel_carro !== null && item.preco_aluguel_carro !== undefined) {
            parts.push(`Aluguel: ${formatCurrency(item.preco_aluguel_carro)}`);
        }

        return parts.join(' | ');
    }

    function showOperationMessage(message, isError = false) {
        operationMessage.textContent = message;
        operationMessage.style.color = isError ? '#ef4444' : '#10b981';
    }

    function getSelectedOperationProcess() {
        const selectedId = Number(operationProcessSelect.value);
        return processos.find((item) => item.id === selectedId) || null;
    }

    function buildDestinationLabel(processo) {
        return [processo.municipio || '', processo.comarca || ''].filter(Boolean).join(' • ') || 'Destino não informado';
    }

    function buildGoogleMapsUrl(processo) {
        const [lat, lng] = getCoordinatesForMunicipio(processo.municipio);
        const travelMode = operationModalidadeDiligencia.value === 'Ônibus' ? 'transit' : 'driving';
        return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(`${OPERATION_ORIGIN.lat},${OPERATION_ORIGIN.lng}`)}&destination=${encodeURIComponent(`${lat},${lng}`)}&travelmode=${travelMode}`;
    }

    function buildWazeUrl(processo) {
        const [lat, lng] = getCoordinatesForMunicipio(processo.municipio);
        return `https://www.waze.com/ul?ll=${lat}%2C${lng}&navigate=yes`;
    }

    function buildPopupStatus(status) {
        const color = statusColors[status] || '#64748b';
        return `<span class="map-popup-status" style="background:${color};">${status}</span>`;
    }

    function getConsumptionByModalidade(modalidade) {
        if (modalidade === 'Moto') {
            return 30;
        }
        if (modalidade === 'Carro') {
            return 10;
        }
        return null;
    }

    function calculateEstimatedCost(distanceKm, modalidade, gasolina, aluguelCarro) {
        if (distanceKm === null || distanceKm === undefined) {
            return null;
        }

        const roundTripDistance = Number(distanceKm) * 2;
        const consumption = getConsumptionByModalidade(modalidade);
        let total = null;

        if (consumption && gasolina !== null && gasolina !== undefined) {
            total = (roundTripDistance / consumption) * Number(gasolina);
        }

        if (modalidade === 'Carro' && aluguelCarro !== null && aluguelCarro !== undefined) {
            total = (total ?? 0) + Number(aluguelCarro);
        }

        return total === null ? null : Number(total.toFixed(2));
    }

    function calculateAutomaticAlvara(processo) {
        if (processo.valor_causa !== null && processo.valor_causa !== undefined) {
            return Number(Number(processo.valor_causa).toFixed(2));
        }

        if (processo.valor_alvara !== null && processo.valor_alvara !== undefined) {
            return Number(Number(processo.valor_alvara).toFixed(2));
        }

        return null;
    }

    function buildAlvaraBasisLabel(processo, valorCalculado) {
        if (processo.valor_causa !== null && processo.valor_causa !== undefined) {
            return `Calculado pelo valor da causa: ${formatCurrency(valorCalculado)}`;
        }

        if (processo.valor_alvara !== null && processo.valor_alvara !== undefined) {
            return 'Valor manual mantido por não haver valor da causa informado.';
        }

        return 'Aguardando valor da causa para cálculo automático.';
    }

    function haversineDistanceKm(origin, destination) {
        const toRadians = (degrees) => (degrees * Math.PI) / 180;
        const radius = 6371;
        const deltaLat = toRadians(destination.lat - origin.lat);
        const deltaLng = toRadians(destination.lng - origin.lng);
        const lat1 = toRadians(origin.lat);
        const lat2 = toRadians(destination.lat);
        const a = Math.sin(deltaLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) ** 2;
        return radius * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
    }

    async function fetchRouteEstimate(processo) {
        const [destLat, destLng] = getCoordinatesForMunicipio(processo.municipio);
        const fallbackDistance = Number(haversineDistanceKm(OPERATION_ORIGIN, { lat: destLat, lng: destLng }).toFixed(2));

        try {
            const response = await fetch(`https://router.project-osrm.org/route/v1/driving/${OPERATION_ORIGIN.lng},${OPERATION_ORIGIN.lat};${destLng},${destLat}?overview=false&alternatives=false&steps=false`);
            if (!response.ok) {
                throw new Error('Falha ao consultar rota externa.');
            }

            const data = await response.json();
            const route = data.routes && data.routes[0];
            if (!route) {
                throw new Error('Rota indisponível.');
            }

            return {
                distanceKm: Number((route.distance / 1000).toFixed(2)),
                durationMinutes: Math.max(1, Math.round((route.duration / 60) * 1.15)),
                source: 'osrm',
            };
        } catch (error) {
            return {
                distanceKm: fallbackDistance,
                durationMinutes: Math.max(1, Number(((fallbackDistance / 35) * 60).toFixed(0))),
                source: 'fallback',
            };
        }
    }

    function renderOperationSummary(processo) {
        if (!processo) {
            operationSummaryDestino.textContent = 'Selecione um processo';
            operationSummaryComarca.textContent = 'A comarca e o município do processo serão usados como base da rota.';
            operationDistanceValue.textContent = '-';
            operationDurationValue.textContent = '-';
            operationCostValue.textContent = '-';
            operationRoutingHint.textContent = 'Para ônibus, o atalho abre o Maps em modo trânsito. A estimativa automática usa a malha viária como referência.';
            return;
        }

        const modalidade = operationModalidadeDiligencia.value;
        const manualEstimate = getOperationManualEstimate();
        const distanceValue = manualEstimate.distanceKm;
        const durationValue = manualEstimate.durationMinutes;
        const estimatedCost = calculateEstimatedCost(
            distanceValue,
            modalidade,
            parseOptionalCurrency(operationPrecoGasolina.value),
            parseOptionalCurrency(operationPrecoAluguelCarro.value),
        );

        operationSummaryDestino.textContent = buildDestinationLabel(processo);
        operationSummaryComarca.textContent = `Processo ${processo.numero} • ${processo.responsavel || 'Sem responsável'}`;
        operationDistanceValue.textContent = formatDistance(distanceValue);
        operationDurationValue.textContent = formatDuration(durationValue);
        operationCostValue.textContent = formatCurrency(estimatedCost);
        operationRoutingHint.textContent = modalidade === 'Ônibus'
            ? 'Para ônibus, o atalho abre o Maps em modo trânsito. A distância automática continua viária para referência.'
            : 'A estimativa considera saída da Carioca e ajuda a montar a diligência antes do deslocamento.';
    }

    function syncOperationFormFromProcess(processo) {
        if (!processo) {
            operationDestino.value = '';
            operationValorCausa.value = '';
            operationModalidadeDiligencia.value = 'Carro';
            operationPrecoGasolina.value = '';
            operationPrecoAluguelCarro.value = '';
            operationDistanciaRoteiro.value = '';
            operationTempoEstimadoMinutos.value = '';
            operationRoteiroEstrategico.value = '';
            operationModusOperandi.value = '';
            currentOperationEstimate = null;
            renderOperationSummary(null);
            return;
        }

        operationOrigin.value = OPERATION_ORIGIN.label;
        operationDestino.value = buildDestinationLabel(processo);
        operationValorCausa.value = processo.valor_causa ?? '';
        operationModalidadeDiligencia.value = processo.modalidade_diligencia && processo.modalidade_diligencia !== 'Não informado'
            ? processo.modalidade_diligencia
            : 'Carro';
        operationPrecoGasolina.value = processo.preco_gasolina ?? '';
        operationPrecoAluguelCarro.value = processo.preco_aluguel_carro ?? '';
        operationDistanciaRoteiro.value = processo.distancia_roteiro ?? '';
        operationTempoEstimadoMinutos.value = processo.tempo_estimado_minutos ?? '';
        operationRoteiroEstrategico.value = processo.roteiro_estrategico || '';
        operationModusOperandi.value = processo.modus_operandi || '';
        currentOperationEstimate = processo.distancia_roteiro !== null && processo.distancia_roteiro !== undefined
            ? { distanceKm: processo.distancia_roteiro, durationMinutes: processo.tempo_estimado_minutos ?? null, source: 'saved' }
            : null;
        renderOperationSummary(processo);
    }

    function populateOperationProcessOptions(preferredProcessId = null) {
        const fallbackOption = '<option value="">Selecione um processo</option>';
        if (!processos.length) {
            operationProcessSelect.innerHTML = fallbackOption;
            syncOperationFormFromProcess(null);
            return;
        }

        operationProcessSelect.innerHTML = fallbackOption + processos.map((processo) => (
            `<option value="${processo.id}">${processo.numero} • ${processo.municipio || 'Sem município'}</option>`
        )).join('');

        const selectedId = preferredProcessId ?? Number(operationProcessSelect.dataset.selectedId || operationProcessSelect.value);
        const targetProcess = processos.find((item) => item.id === selectedId) || processos[0];
        operationProcessSelect.value = targetProcess ? String(targetProcess.id) : '';
        operationProcessSelect.dataset.selectedId = targetProcess ? String(targetProcess.id) : '';
        syncOperationFormFromProcess(targetProcess || null);
        if (targetProcess && (targetProcess.tempo_estimado_minutos === null || targetProcess.tempo_estimado_minutos === undefined)) {
            refreshOperationPlanner();
        }
    }

    async function refreshOperationPlanner(showSuccessMessage = false) {
        const processo = getSelectedOperationProcess();
        if (!processo) {
            showOperationMessage('Selecione um processo para calcular a rota.', true);
            renderOperationSummary(null);
            return;
        }

        showOperationMessage('Calculando rota a partir da Carioca...');
        const estimate = await fetchRouteEstimate(processo);
        currentOperationEstimate = estimate;
        operationDistanciaRoteiro.value = estimate.distanceKm;
        operationTempoEstimadoMinutos.value = estimate.durationMinutes;
        renderOperationSummary(processo);
        showOperationMessage(
            showSuccessMessage
                ? 'Prospecção carregada. Revise km e tempo, ajuste se necessário e salve a operação.'
                : estimate.source === 'osrm'
                    ? 'Rota calculada com referência viária. Você pode editar km e tempo manualmente.'
                    : 'Rota calculada com estimativa de contingência.',
        );
    }

    async function submitOperationPlan(event) {
        event.preventDefault();

        const processo = getSelectedOperationProcess();
        if (!processo) {
            showOperationMessage('Selecione um processo antes de salvar.', true);
            return;
        }

        const payload = {
            process_number: processo.numero,
            responsavel: processo.responsavel,
            region: processo.region,
            municipio: processo.municipio,
            comarca: processo.comarca,
            status: processo.status,
            summary: processo.resumo,
            valor_alvara: processo.valor_alvara,
            valor_causa: parseOptionalCurrency(operationValorCausa.value),
            modalidade_diligencia: operationModalidadeDiligencia.value,
            distancia_roteiro: getOperationManualEstimate().distanceKm,
            tempo_estimado_minutos: getOperationManualEstimate().durationMinutes,
            preco_gasolina: parseOptionalCurrency(operationPrecoGasolina.value),
            preco_aluguel_carro: parseOptionalCurrency(operationPrecoAluguelCarro.value),
            roteiro_estrategico: operationRoteiroEstrategico.value.trim(),
            modus_operandi: operationModusOperandi.value.trim(),
        };

        try {
            const response = await fetch(`/api/processos/${processo.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                throw new Error('Falha ao salvar operação.');
            }

            const updatedProcess = await response.json();
            processos = processos.map((item) => (item.id === processo.id ? updatedProcess : item));
            writeCache(CACHE_KEYS.processos, processos);
            operationProcessSelect.dataset.selectedId = String(updatedProcess.id);
            await loadDiligencias();
            populateOperationProcessOptions(updatedProcess.id);
            renderProcessTable();
            showOperationMessage('Prospecção operacional salva com sucesso.');
        } catch (error) {
            console.error(error);
            showOperationMessage('Não foi possível salvar a prospecção.', true);
        }
    }

    function readCache(key) {
        try {
            const raw = localStorage.getItem(key);
            if (!raw) {
                return [];
            }
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed : [];
        } catch (error) {
            console.error('Erro ao ler cache local:', error);
            return [];
        }
    }

    function writeCache(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(Array.isArray(value) ? value : []));
        } catch (error) {
            console.error('Erro ao salvar cache local:', error);
        }
    }

    function hydrateFromCacheIfNeeded() {
        if (!diligencias.length) {
            diligencias = readCache(CACHE_KEYS.diligencias);
        }

        if (!processos.length) {
            processos = readCache(CACHE_KEYS.processos);
        }

        if (!reportHistory.length) {
            reportHistory = readCache(CACHE_KEYS.reportHistory);
        }
    }

    function deriveProcessosFromDiligencias() {
        const byNumero = new Map();
        diligencias.forEach((item, index) => {
            const numero = item.process_number;
            if (!numero) {
                return;
            }
            byNumero.set(numero, {
                id: index + 1,
                numero,
                status: item.status || 'Pendente',
                region: item.region || 'Metropolitana',
                municipio: item.municipio || '',
                comarca: item.comarca || '',
                responsavel: item.responsavel || '',
                urgencia: item.status || 'Pendente',
                resumo: item.resumo || '',
                valor_alvara: item.valor_alvara ?? null,
                valor_total: item.valor_total ?? item.valor_alvara ?? null,
                valor_causa: item.valor_causa ?? null,
                roteiro_estrategico: item.roteiro_estrategico || '',
                modalidade_diligencia: item.modalidade_diligencia || 'Não informado',
                distancia_roteiro: item.distancia_roteiro ?? null,
                tempo_estimado_minutos: item.tempo_estimado_minutos ?? null,
                preco_gasolina: item.preco_gasolina ?? null,
                preco_aluguel_carro: item.preco_aluguel_carro ?? null,
                modus_operandi: item.modus_operandi || '',
            });
        });
        return Array.from(byNumero.values());
    }

    function resetForm() {
        diligenciaForm.reset();
        formMunicipio.value = 'Rio de Janeiro';
        formValorAlvara.value = '';
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

    function updateTemperatureWidget(dataset) {
        const urgentCount = dataset.filter((item) => item.status === 'Urgente').length;
        const total = dataset.length;
        const intensity = total
            ? Math.min(100, Math.round(((urgentCount / total) * 70) + (Math.min(urgentCount, 5) * 6)))
            : 0;

        let label = 'Frio';
        if (intensity >= 85) {
            label = 'Crítico';
        } else if (intensity >= 60) {
            label = 'Quente';
        } else if (intensity >= 30) {
            label = 'Morno';
        }

        temperatureLabel.textContent = label;
        temperatureFill.style.width = `${intensity}%`;
        temperatureMeta.textContent = total
            ? `${urgentCount} urgentes em ${total} processos no recorte atual.`
            : 'Sem processos urgentes no recorte atual.';
    }

    function renderMarkers() {
        markerGroup.clearLayers();
        const filtered = diligencias.filter((item) => activeRegion === 'Todas' || item.region === activeRegion);

        if (filtered.length === 0) {
            mapPrimary.innerText = 'Aguardando atualização';
            updateTemperatureWidget([]);
            map.setView([-22.9068, -43.1729], 9);
            return;
        }

        updateTemperatureWidget(filtered);

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
                <div class="map-popup-card">
                    <div>
                        <strong class="map-popup-title">${diligencia.name}</strong>
                        <div class="map-popup-subtitle">${diligencia.municipio || 'Município não informado'} • ${diligencia.comarca || 'Comarca não informada'}</div>
                    </div>
                    ${buildPopupStatus(diligencia.status)}
                    <div class="map-popup-grid">
                        <div class="map-popup-metric">
                            <span>Região</span>
                            <strong>${diligencia.region || '-'}</strong>
                        </div>
                        <div class="map-popup-metric">
                            <span>Responsável</span>
                            <strong>${diligencia.responsavel || '-'}</strong>
                        </div>
                        <div class="map-popup-metric">
                            <span>Distância</span>
                            <strong>${formatDistance(diligencia.distancia_roteiro)}</strong>
                        </div>
                        <div class="map-popup-metric">
                            <span>Tempo</span>
                            <strong>${formatDuration(diligencia.tempo_estimado_minutos)}</strong>
                        </div>
                    </div>
                    <div class="map-popup-text">${diligencia.resumo || 'Resumo operacional ainda não informado.'}</div>
                    <div class="map-popup-text">${buildOperationalSummary(diligencia) || 'Dados operacionais ainda não informados.'}</div>
                    <div class="map-popup-actions">
                        <button type="button" class="map-popup-button primary" onclick="window.openAIResumo('${diligencia.name}')">Resumo de IA</button>
                        <a class="map-popup-button" href="${buildGoogleMapsUrl({ municipio: diligencia.municipio })}" target="_blank" rel="noopener">Abrir rota</a>
                    </div>
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
            if (!Array.isArray(diligencias)) {
                diligencias = [];
            }
            diligencias = diligencias.map((item) => {
                const [lat, lng] = getCoordinatesForMunicipio(item.municipio);
                const normalizedRegion = legacyRegionMap[item.region] || item.region;
                return { ...item, region: normalizedRegion, lat, lng };
            });
            writeCache(CACHE_KEYS.diligencias, diligencias);
            renderChips();
            renderMarkers();
            updateKpis();
            updateSummary();
        } catch (error) {
            console.error('Erro ao carregar diligências:', error);
            diligencias = readCache(CACHE_KEYS.diligencias);
            renderChips();
            renderMarkers();
            updateKpis();
            updateSummary();
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
            writeCache(CACHE_KEYS.processos, processos);
            await loadDiligencias();
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
            valor_alvara: parseOptionalCurrency(formValorAlvara.value),
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
            diligencias = diligencias.filter((item) => item.process_number !== newDiligencia.process_number);
            diligencias.push(newDiligencia);
            writeCache(CACHE_KEYS.diligencias, diligencias);
            renderChips();
            renderMarkers();
            await loadProcessos();
            const createdProcess = processos.find((item) => item.numero === payload.process_number);

            updateQuickLists();
            showFormMessage('Diligência salva com sucesso.');
            resetForm();
            if (createdProcess) {
                setActiveView('operacao');
                populateOperationProcessOptions(createdProcess.id);
                await refreshOperationPlanner(true);
                views.operacao.scrollIntoView({ behavior: 'smooth' });
            } else {
                document.getElementById('cadastroView').scrollIntoView({ behavior: 'smooth' });
            }
        } catch (error) {
            console.error(error);
            showFormMessage('Erro ao salvar a diligência. Tente novamente.', true);
        }
    }

    function renderProcessTable() {
        const searchValue = searchInput.value.toLowerCase();
        const filterValue = statusFilter.value;

        const filtered = processos.filter((processo) => {
            const matchesSearch = [
                processo.numero,
                processo.status,
                processo.municipio,
                processo.comarca,
                processo.responsavel,
                processo.modalidade_diligencia,
                processo.roteiro_estrategico,
                processo.modus_operandi,
            ]
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
                <td title="${[processo.resumo, processo.roteiro_estrategico, processo.modus_operandi].filter(Boolean).join(' | ')}">
                    <div>${processo.resumo || '-'}</div>
                    <small>${buildOperationalSummary(processo) || 'Dados operacionais pendentes'}</small>
                </td>
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
            alvaraTotalValue.textContent = formatCurrency(0);
            alvaraFilledCount.textContent = '0';
            return;
        }

        const filledCount = processos.filter((processo) => calculateAutomaticAlvara(processo) !== null).length;
        const totalAlvaras = processos.reduce((sum, processo) => sum + (calculateAutomaticAlvara(processo) ?? 0), 0);
        alvaraTotalValue.textContent = formatCurrency(totalAlvaras);
        alvaraFilledCount.textContent = String(filledCount);

        alvaraTableBody.innerHTML = processos.map((processo) => `
            <tr>
                <td>${processo.numero}</td>
                <td>${processo.responsavel || '-'}</td>
                <td>${processo.comarca || '-'}</td>
                <td>
                    <div class="alvara-value">${formatCurrency(calculateAutomaticAlvara(processo))}</div>
                </td>
                <td>
                    <span class="alvara-meta">${buildAlvaraBasisLabel(processo, calculateAutomaticAlvara(processo))}</span>
                </td>
            </tr>
        `).join('');
    }

    async function syncAutomaticAlvaraValues(showFeedback = false) {
        const updates = processos
            .map((processo) => ({
                processo,
                valorCalculado: calculateAutomaticAlvara(processo),
            }))
            .filter(({ processo, valorCalculado }) => valorCalculado !== null && Number(processo.valor_alvara ?? -1) !== Number(valorCalculado));

        if (!updates.length) {
            if (showFeedback) {
                alert('Os alvarás já estão atualizados automaticamente.');
            }
            renderAlvaraTable();
            return;
        }

        try {
            for (const { processo, valorCalculado } of updates) {
                const payload = {
                    process_number: processo.numero,
                    responsavel: processo.responsavel,
                    region: processo.region,
                    municipio: processo.municipio,
                    comarca: processo.comarca,
                    status: processo.status,
                    summary: processo.resumo,
                    valor_alvara: valorCalculado,
                    valor_causa: processo.valor_causa,
                    modalidade_diligencia: processo.modalidade_diligencia,
                    distancia_roteiro: processo.distancia_roteiro,
                    tempo_estimado_minutos: processo.tempo_estimado_minutos,
                    preco_gasolina: processo.preco_gasolina,
                    preco_aluguel_carro: processo.preco_aluguel_carro,
                    roteiro_estrategico: processo.roteiro_estrategico,
                    modus_operandi: processo.modus_operandi,
                };

                const response = await fetch(`/api/processos/${processo.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                });

                if (!response.ok) {
                    throw new Error('Falha ao atualizar alvarás automaticamente.');
                }

                const updated = await response.json();
                processos = processos.map((item) => (item.id === processo.id ? updated : item));
            }

            writeCache(CACHE_KEYS.processos, processos);
            renderProcessTable();
            renderAlvaraTable();
            if (showFeedback) {
                alert('Alvarás recalculados e salvos automaticamente.');
            }
        } catch (error) {
            console.error(error);
            if (showFeedback) {
                alert('Não foi possível atualizar todos os alvarás automaticamente.');
            }
        }
    }

    async function deleteProcess(id, fromModal = false) {
        const confirmed = confirm('Deseja realmente excluir este processo?');
        if (!confirmed) {
            return;
        }

        try {
            const processItem = processos.find((item) => item.id === id);
            let response = await fetch(`/api/processos/${id}`, {
                method: 'DELETE',
            });
            let treatAsDeleted = false;

            if (response.status === 404 && processItem?.numero) {
                await loadProcessos();
                const freshProcess = processos.find((item) => item.numero === processItem.numero);
                if (freshProcess) {
                    response = await fetch(`/api/processos/${freshProcess.id}`, {
                        method: 'DELETE',
                    });
                } else {
                    treatAsDeleted = true;
                }
            }

            if (!response.ok && !treatAsDeleted) {
                throw new Error('Falha ao excluir processo.');
            }

            processos = processos.filter((item) => item.id !== id);
            if (processItem?.numero) {
                diligencias = diligencias.filter((item) => item.process_number !== processItem.numero);
            }
            writeCache(CACHE_KEYS.diligencias, diligencias);
            writeCache(CACHE_KEYS.processos, processos);
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
            if (!Array.isArray(processos)) {
                processos = [];
            }
            writeCache(CACHE_KEYS.processos, processos);
            populateOperationProcessOptions();
            renderProcessTable();
            renderAlvaraTable();
            updateKpis();
            updateSummary();
        } catch (error) {
            console.error('Erro ao carregar processos:', error);
            processos = readCache(CACHE_KEYS.processos);
            if (!processos.length && diligencias.length) {
                processos = deriveProcessosFromDiligencias();
            }
            populateOperationProcessOptions();
            renderProcessTable();
            renderAlvaraTable();
            updateKpis();
            updateSummary();
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
            reportHistoryBody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 28px 0; color: #6b7280;">Nenhum relatório gerado.</td></tr>';
            return;
        }

        reportHistoryBody.innerHTML = reportHistory.map((item) => `
            <tr>
                <td>${item.generated_at}</td>
                <td>${item.filename}</td>
                <td>${item.collaborators || 'Equipe operacional'}</td>
                <td>${item.total_processos}</td>
                <td>
                    <div class="report-actions">
                        <a class="button-secondary button-small" href="${window.buildWhatsAppShareUrl(item)}" target="_blank" rel="noopener">WhatsApp</a>
                        <a class="button-secondary button-small" href="${window.buildEmailShareUrl(item)}">E-mail</a>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    async function loadReportHistory() {
        try {
            const response = await fetch('/api/relatorios/historico');
            reportHistory = await response.json();
            if (!Array.isArray(reportHistory)) {
                reportHistory = [];
            }
            writeCache(CACHE_KEYS.reportHistory, reportHistory);
            renderReportHistory();
        } catch (error) {
            console.error('Erro ao carregar histórico:', error);
            reportHistory = readCache(CACHE_KEYS.reportHistory);
            renderReportHistory();
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

    window.buildWhatsAppShareUrl = (item) => {
        const message = `Segue o relatório ${item.filename}, gerado em ${item.generated_at}, com ${item.total_processos} processos. Colaboradores: ${item.collaborators || 'Equipe operacional'}. Anexe o arquivo DOCX baixado ao enviar.`;
        return `https://wa.me/?text=${encodeURIComponent(message)}`;
    };

    window.buildEmailShareUrl = (item) => {
        const subject = `Relatório gerencial ${item.filename}`;
        const body = `Olá,%0D%0A%0D%0ASegue o relatório ${item.filename}, gerado em ${item.generated_at}, com ${item.total_processos} processos.%0D%0AColaboradores: ${item.collaborators || 'Equipe operacional'}.%0D%0A%0D%0AAnexe o arquivo DOCX baixado antes de enviar.%0D%0A`;
        return `mailto:?subject=${encodeURIComponent(subject)}&body=${body}`;
    };

    const viewTabs = document.querySelectorAll('.tab-button');
    const sidebarTabs = document.querySelectorAll('.sidebar-nav a[data-view]');
    const views = {
        overview: document.getElementById('overviewView'),
        processos: document.getElementById('processosView'),
        cadastro: document.getElementById('cadastroView'),
        operacao: document.getElementById('operacaoView'),
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
    operationForm.addEventListener('submit', submitOperationPlan);
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
    recalculateAlvarasBtn.addEventListener('click', async () => syncAutomaticAlvaraValues(true));
    document.getElementById('zoomInBtn').addEventListener('click', handleZoomIn);
    document.getElementById('zoomOutBtn').addEventListener('click', handleZoomOut);
    document.getElementById('refreshMapBtn').addEventListener('click', handleRefreshMap);
    searchInput.addEventListener('input', renderProcessTable);
    statusFilter.addEventListener('change', renderProcessTable);
    operationProcessSelect.addEventListener('change', async () => {
        operationProcessSelect.dataset.selectedId = operationProcessSelect.value;
        syncOperationFormFromProcess(getSelectedOperationProcess());
        if (operationProcessSelect.value) {
            await refreshOperationPlanner();
        }
    });
    operationModalidadeDiligencia.addEventListener('change', () => renderOperationSummary(getSelectedOperationProcess()));
    operationPrecoGasolina.addEventListener('input', () => renderOperationSummary(getSelectedOperationProcess()));
    operationPrecoAluguelCarro.addEventListener('input', () => renderOperationSummary(getSelectedOperationProcess()));
    operationValorCausa.addEventListener('input', () => renderOperationSummary(getSelectedOperationProcess()));
    operationDistanciaRoteiro.addEventListener('input', () => renderOperationSummary(getSelectedOperationProcess()));
    operationTempoEstimadoMinutos.addEventListener('input', () => renderOperationSummary(getSelectedOperationProcess()));
    calculateRouteBtn.addEventListener('click', async () => refreshOperationPlanner());
    openGoogleMapsBtn.addEventListener('click', () => {
        const processo = getSelectedOperationProcess();
        if (!processo) {
            showOperationMessage('Selecione um processo para abrir o Maps.', true);
            return;
        }
        window.open(buildGoogleMapsUrl(processo), '_blank', 'noopener');
    });
    openWazeBtn.addEventListener('click', () => {
        const processo = getSelectedOperationProcess();
        if (!processo) {
            showOperationMessage('Selecione um processo para abrir o Waze.', true);
            return;
        }
        window.open(buildWazeUrl(processo), '_blank', 'noopener');
    });

    window.openEditProcess = openEditProcess;
    window.deleteProcess = deleteProcess;

    async function bootstrap() {
        hydrateFromCacheIfNeeded();
        await loadMunicipioCoordinates();
        await Promise.all([loadDiligencias(), loadProcessos(), loadReportHistory()]);
        await syncAutomaticAlvaraValues();
    }

    bootstrap();
});
