(() => {
    'use strict';

    const contextPath = document.body.dataset.contextPath || '/';
    const apiUrl = (path) => `${contextPath.endsWith('/') ? contextPath : `${contextPath}/`}${path.replace(/^\//, '')}`;
    const state = {
        view: 'dashboard', tickets: [], currentPage: 0, totalPages: 1,
        clients: [], categories: [], technicians: [], currentTicket: null,
        ticketSize: 10
    };

    const $ = (id) => document.getElementById(id);
    const modal = (id) => bootstrap.Modal.getOrCreateInstance($(id));
    const STATUS_LABEL = { ABERTO: 'Aberto', EM_ANDAMENTO: 'Em andamento', AGUARDANDO_CLIENTE: 'Aguardando cliente', FECHADO: 'Fechado' };
    const PRIORITY_LABEL = { BAIXA: 'Baixa', MEDIA: 'Média', ALTA: 'Alta', CRITICA: 'Crítica' };
    const VIEW_META = {
        dashboard: ['CENTRAL DE ATENDIMENTO', 'Visão geral', 'Acompanhe o desempenho e os chamados da sua equipe.'],
        chamados: ['ATENDIMENTO', 'Chamados', 'Consulte, filtre e gerencie as solicitações de suporte.'],
        clientes: ['GERENCIAMENTO', 'Clientes', 'Organize os dados dos solicitantes cadastrados.'],
        categorias: ['GERENCIAMENTO', 'Categorias', 'Mantenha as categorias de atendimento atualizadas.'],
        tecnicos: ['GERENCIAMENTO', 'Técnicos', 'Gerencie os profissionais da equipe de suporte.']
    };

    function escapeHtml(value) {
        return String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
    }

    async function api(path, options = {}) {
        const config = { method: options.method || 'GET', headers: { Accept: 'application/json', ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...(options.headers || {}) } };
        if (options.body !== undefined) config.body = JSON.stringify(options.body);
        let response;
        try {
            response = await fetch(apiUrl(path), config);
        } catch (error) {
            throw new Error('Não foi possível conectar ao servidor. Verifique se o Spring Boot está em execução.');
        }
        if (response.status === 204) return null;
        const raw = await response.text();
        let data = null;
        try { data = raw ? JSON.parse(raw) : null; } catch { data = raw; }
        if (!response.ok) {
            const details = Array.isArray(data?.detalhes) ? data.detalhes.join(' • ') : '';
            throw new Error([data?.erro, details].filter(Boolean).join(': ') || data?.message || `Erro ${response.status} ao processar a solicitação.`);
        }
        return data;
    }

    function notify(message, type = 'success') {
        const container = $('toastContainer');
        const item = document.createElement('div');
        item.className = `toast align-items-center ${type === 'success' ? 'text-bg-success' : 'text-bg-danger'}`;
        item.setAttribute('role', 'alert');
        item.innerHTML = `<div class="d-flex"><div class="toast-body"><i class="bi ${type === 'success' ? 'bi-check-circle' : 'bi-exclamation-circle'} me-2"></i>${escapeHtml(message)}</div><button type="button" class="btn-close ${type === 'success' ? 'btn-close-white' : ''} me-2 m-auto" data-bs-dismiss="toast" aria-label="Fechar"></button></div>`;
        container.appendChild(item);
        const toast = new bootstrap.Toast(item, { delay: 3600 });
        toast.show();
        item.addEventListener('hidden.bs.toast', () => item.remove());
    }

    function formatDate(value, includeTime = false) {
        if (!value) return '—';
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return value;
        return new Intl.DateTimeFormat('pt-BR', includeTime ? { dateStyle: 'short', timeStyle: 'short' } : { dateStyle: 'short' }).format(date);
    }

    function statusBadge(status) {
        return `<span class="status-badge status-${escapeHtml(status)}">${STATUS_LABEL[status] || escapeHtml(status)}</span>`;
    }
    function priorityBadge(priority) {
        return `<span class="priority-badge priority-${escapeHtml(priority)}">${PRIORITY_LABEL[priority] || escapeHtml(priority)}</span>`;
    }
    function ticketTitleCell(ticket) {
        return `<div class="ticket-title-cell"><span class="ticket-mark"><i class="bi bi-ticket-perforated"></i></span><span><strong>${escapeHtml(ticket.titulo)}</strong><small>#${ticket.id} · ${formatDate(ticket.dataCriacao)}</small></span></div>`;
    }

    function navigate(view) {
        if (!VIEW_META[view]) view = 'dashboard';
        state.view = view;
        document.querySelectorAll('.page-section').forEach(section => section.classList.toggle('active', section.id === `page-${view}`));
        document.querySelectorAll('.side-nav .nav-link').forEach(link => link.classList.toggle('active', link.dataset.view === view));
        const [eyebrow, title, subtitle] = VIEW_META[view];
        $('pageEyebrow').textContent = eyebrow;
        $('pageTitle').textContent = title;
        $('pageSubtitle').textContent = subtitle;
        $('breadcrumbTitle').textContent = title;
        $('globalCreateButton').classList.toggle('d-none', view !== 'dashboard' && view !== 'chamados');
        $('sidebar').classList.remove('show');
        if (view === 'dashboard') loadDashboard();
        if (view === 'chamados') loadTickets();
        if (view === 'clientes') loadClients();
        if (view === 'categorias') loadCategories();
        if (view === 'tecnicos') loadTechnicians();
    }

    async function loadBaseData() {
        const [clients, categories, technicians] = await Promise.all([
            api('clientes'), api('categorias'), api('tecnicos')
        ]);
        state.clients = clients || [];
        state.categories = categories || [];
        state.technicians = technicians || [];
        populateSelects();
    }

    function categoryName(category) { return category?.titulo ?? category?.nome ?? 'Sem categoria'; }

    function populateSelects() {
        const clientOptions = state.clients.map(c => `<option value="${c.id}">${escapeHtml(c.nome)}</option>`).join('');
        const categoryOptions = state.categories.map(c => `<option value="${c.id}">${escapeHtml(categoryName(c))}</option>`).join('');
        $('ticketClient').innerHTML = `<option value="">Selecione um cliente</option>${clientOptions}`;
        $('ticketCategory').innerHTML = `<option value="">Selecione uma categoria</option>${categoryOptions}`;
        $('filterClient').innerHTML = `<option value="">Todos os clientes</option>${clientOptions}`;
    }

    async function loadDashboard() {
        try {
            const [page, clients, categories, technicians] = await Promise.all([
                api('chamados?size=500&sort=dataCriacao,desc'),
                api('clientes'), api('categorias'), api('tecnicos')
            ]);
            const tickets = page?.content || [];
            const counts = countStatuses(tickets);
            $('statTotal').textContent = page?.totalElements ?? tickets.length;
            $('statOpen').textContent = counts.ABERTO;
            $('statProgress').textContent = counts.EM_ANDAMENTO;
            $('statClosed').textContent = counts.FECHADO;
            $('openNavCount').textContent = counts.ABERTO;
            renderStatusSummary(counts, tickets.length);
            renderRecentTickets(tickets.slice(0, 6));
            state.clients = clients || [];
            state.categories = categories || [];
            state.technicians = technicians || [];
            populateSelects();
        } catch (error) {
            notify(error.message, 'danger');
            $('recentTicketsBody').innerHTML = `<tr><td colspan="5" class="loading-cell">Não foi possível carregar os dados.</td></tr>`;
        }
    }

    function countStatuses(tickets) {
        return tickets.reduce((acc, ticket) => { acc[ticket.status] = (acc[ticket.status] || 0) + 1; return acc; }, { ABERTO: 0, EM_ANDAMENTO: 0, AGUARDANDO_CLIENTE: 0, FECHADO: 0 });
    }

    function renderStatusSummary(counts, total) {
        const entries = [
            ['ABERTO', 'Abertos', 'fill-open'], ['EM_ANDAMENTO', 'Em andamento', 'fill-progress'],
            ['AGUARDANDO_CLIENTE', 'Aguardando cliente', 'fill-waiting'], ['FECHADO', 'Fechados', 'fill-closed']
        ];
        $('statusSummary').innerHTML = entries.map(([key, label, cls]) => {
            const value = counts[key] || 0;
            const percent = total ? Math.round(value / total * 100) : 0;
            return `<div class="summary-row"><span>${label}</span><strong>${value} <small class="text-muted fw-normal">(${percent}%)</small></strong><div class="summary-track"><div class="summary-fill ${cls}" style="width:${percent}%"></div></div></div>`;
        }).join('');
    }

    function renderRecentTickets(tickets) {
        if (!tickets.length) {
            $('recentTicketsBody').innerHTML = `<tr><td colspan="5"><div class="empty-state"><i class="bi bi-inbox"></i><strong>Nenhum chamado por aqui</strong><span>Os chamados criados aparecerão nesta lista.</span></div></td></tr>`;
            return;
        }
        $('recentTicketsBody').innerHTML = tickets.map(ticket => `<tr>
            <td>${ticketTitleCell(ticket)}</td><td><div class="client-cell"><strong>${escapeHtml(ticket.clienteNome)}</strong><small>${escapeHtml(ticket.categoriaNome)}</small></div></td>
            <td>${priorityBadge(ticket.prioridade)}</td><td>${statusBadge(ticket.status)}</td>
            <td><button class="table-action" title="Ver detalhes" data-action="details" data-id="${ticket.id}"><i class="bi bi-arrow-up-right"></i></button></td></tr>`).join('');
    }

    async function loadTickets() {
        const params = new URLSearchParams({ page: String(state.currentPage), size: String(state.ticketSize), sort: 'dataCriacao,desc' });
        if ($('filterStatus').value) params.set('status', $('filterStatus').value);
        if ($('filterPriority').value) params.set('prioridade', $('filterPriority').value);
        if ($('filterClient').value) params.set('clienteId', $('filterClient').value);
        $('ticketsBody').innerHTML = `<tr><td colspan="8" class="loading-cell">Carregando chamados...</td></tr>`;
        try {
            const page = await api(`chamados?${params.toString()}`);
            state.tickets = page?.content || [];
            state.totalPages = Math.max(page?.totalPages || 1, 1);
            renderTickets();
            $('ticketsPaginationInfo').textContent = `${page?.totalElements || 0} chamado(s) encontrado(s)`;
            $('pageNumber').textContent = `${(page?.number || 0) + 1} / ${state.totalPages}`;
            $('prevPage').disabled = !!page?.first;
            $('nextPage').disabled = !!page?.last;
            $('openNavCount').textContent = state.tickets.filter(t => t.status === 'ABERTO').length;
        } catch (error) {
            $('ticketsBody').innerHTML = `<tr><td colspan="8" class="loading-cell">${escapeHtml(error.message)}</td></tr>`;
            notify(error.message, 'danger');
        }
    }

    function renderTickets() {
        const term = $('ticketSearch').value.trim().toLocaleLowerCase('pt-BR');
        const tickets = state.tickets.filter(ticket => !term || [ticket.titulo, ticket.descricao, ticket.clienteNome, ticket.categoriaNome, ticket.tecnicoNome, String(ticket.id)].some(value => String(value || '').toLocaleLowerCase('pt-BR').includes(term)));
        if (!tickets.length) {
            $('ticketsBody').innerHTML = `<tr><td colspan="8"><div class="empty-state"><i class="bi bi-search"></i><strong>Nenhum chamado encontrado</strong><span>Altere os filtros ou tente outro termo de busca.</span></div></td></tr>`;
            return;
        }
        $('ticketsBody').innerHTML = tickets.map(ticket => `<tr>
            <td>${ticketTitleCell(ticket)}</td><td><div class="client-cell"><strong>${escapeHtml(ticket.clienteNome)}</strong><small>${escapeHtml(ticket.clienteId ? `Cliente #${ticket.clienteId}` : '')}</small></div></td>
            <td>${escapeHtml(ticket.categoriaNome || '—')}</td><td>${priorityBadge(ticket.prioridade)}</td><td>${statusBadge(ticket.status)}</td>
            <td>${escapeHtml(ticket.tecnicoNome || 'Não atribuído')}</td><td>${formatDate(ticket.dataCriacao)}</td>
            <td><div class="d-flex"><button class="table-action" title="Detalhes" data-action="details" data-id="${ticket.id}"><i class="bi bi-eye"></i></button><button class="table-action" title="Editar" data-action="edit-ticket" data-id="${ticket.id}"><i class="bi bi-pencil"></i></button><button class="table-action" title="Excluir" data-action="delete-ticket" data-id="${ticket.id}"><i class="bi bi-trash3"></i></button></div></td></tr>`).join('');
    }

    async function loadClients() {
        try {
            state.clients = await api('clientes') || [];
            renderClients(); populateSelects();
        } catch (error) { notify(error.message, 'danger'); }
    }
    function renderClients() {
        $('clientsBody').innerHTML = state.clients.length ? state.clients.map(client => `<tr><td><div class="client-cell"><strong>${escapeHtml(client.nome)}</strong><small>Cliente #${client.id}</small></div></td><td>${escapeHtml(client.email)}</td><td>${escapeHtml(client.telefone || '—')}</td><td><div class="d-flex justify-content-end"><button class="table-action" title="Editar" data-action="edit-entity" data-type="cliente" data-id="${client.id}"><i class="bi bi-pencil"></i></button><button class="table-action" title="Excluir" data-action="delete-entity" data-type="cliente" data-id="${client.id}"><i class="bi bi-trash3"></i></button></div></td></tr>`).join('') : `<tr><td colspan="4"><div class="empty-state"><i class="bi bi-people"></i><strong>Nenhum cliente cadastrado</strong><span>Cadastre clientes para abrir chamados.</span></div></td></tr>`;
    }

    async function loadCategories() {
        try { state.categories = await api('categorias') || []; renderCategories(); populateSelects(); }
        catch (error) { notify(error.message, 'danger'); }
    }
    function renderCategories() {
        $('categoriesBody').innerHTML = state.categories.length ? state.categories.map(category => `<tr><td><div class="client-cell"><strong>${escapeHtml(categoryName(category))}</strong><small>Categoria #${category.id}</small></div></td><td class="text-truncate-cell">${escapeHtml(category.descricao)}</td><td><div class="d-flex justify-content-end"><button class="table-action" title="Editar" data-action="edit-entity" data-type="categoria" data-id="${category.id}"><i class="bi bi-pencil"></i></button><button class="table-action" title="Excluir" data-action="delete-entity" data-type="categoria" data-id="${category.id}"><i class="bi bi-trash3"></i></button></div></td></tr>`).join('') : `<tr><td colspan="3"><div class="empty-state"><i class="bi bi-tags"></i><strong>Nenhuma categoria cadastrada</strong><span>Crie categorias para classificar os chamados.</span></div></td></tr>`;
    }

    async function loadTechnicians() {
        try { state.technicians = await api('tecnicos') || []; renderTechnicians(); populateSelects(); }
        catch (error) { notify(error.message, 'danger'); }
    }
    function renderTechnicians() {
        $('techniciansBody').innerHTML = state.technicians.length ? state.technicians.map(technician => `<tr><td><div class="client-cell"><strong>${escapeHtml(technician.nome)}</strong><small>Técnico #${technician.id}</small></div></td><td>${escapeHtml(technician.email)}</td><td><span class="profile-badge">${technician.perfil === 'ADMIN' ? 'Administrador' : 'Técnico'}</span></td><td><div class="d-flex justify-content-end"><button class="table-action" title="Editar" data-action="edit-entity" data-type="tecnico" data-id="${technician.id}"><i class="bi bi-pencil"></i></button><button class="table-action" title="Excluir" data-action="delete-entity" data-type="tecnico" data-id="${technician.id}"><i class="bi bi-trash3"></i></button></div></td></tr>`).join('') : `<tr><td colspan="4"><div class="empty-state"><i class="bi bi-person-gear"></i><strong>Nenhum técnico cadastrado</strong><span>Cadastre a equipe que atenderá os chamados.</span></div></td></tr>`;
    }

    function openNewTicket() {
        $('ticketForm').reset(); $('ticketId').value = ''; $('ticketModalTitle').textContent = 'Novo chamado';
        $('ticketPriority').value = 'MEDIA';
        modal('ticketModal').show();
    }

    async function openEditTicket(id) {
        try {
            const ticket = await api(`chamados/${id}`);
            $('ticketId').value = ticket.id;
            $('ticketTitle').value = ticket.titulo || '';
            $('ticketDescription').value = ticket.descricao || '';
            $('ticketPriority').value = ticket.prioridade;
            $('ticketClient').value = ticket.clienteId;
            $('ticketCategory').value = ticket.categoriaId;
            $('ticketModalTitle').textContent = `Editar chamado #${ticket.id}`;
            modal('ticketModal').show();
        } catch (error) { notify(error.message, 'danger'); }
    }

    async function saveTicket(event) {
        event.preventDefault();
        const id = $('ticketId').value;
        const body = { titulo: $('ticketTitle').value.trim(), descricao: $('ticketDescription').value.trim(), prioridade: $('ticketPriority').value, clienteId: Number($('ticketClient').value), categoriaId: Number($('ticketCategory').value) };
        if (!body.clienteId || !body.categoriaId) { notify('Selecione um cliente e uma categoria.', 'danger'); return; }
        const button = $('ticketSubmit'); button.disabled = true;
        try {
            await api(id ? `chamados/${id}` : 'chamados', { method: id ? 'PUT' : 'POST', body });
            modal('ticketModal').hide(); notify(id ? 'Chamado atualizado com sucesso.' : 'Chamado criado com sucesso.');
            if (state.view === 'dashboard') loadDashboard(); else { state.currentPage = 0; loadTickets(); }
        } catch (error) { notify(error.message, 'danger'); }
        finally { button.disabled = false; }
    }

    async function openDetails(id) {
        try {
            const ticket = await api(`chamados/${id}`);
            state.currentTicket = ticket;
            renderDetails(ticket);
            modal('detailsModal').show();
        } catch (error) { notify(error.message, 'danger'); }
    }

    function renderDetails(ticket) {
        $('detailCode').textContent = `CHAMADO #${ticket.id} · ABERTO EM ${formatDate(ticket.dataCriacao)}`;
        $('detailTitle').textContent = ticket.titulo;
        const techOptions = state.technicians.map(tech => `<option value="${tech.id}" ${ticket.tecnicoId === tech.id ? 'selected' : ''}>${escapeHtml(tech.nome)}</option>`).join('');
        const comments = ticket.comentarios || [];
        $('detailsContent').innerHTML = `<div class="detail-layout">
            <div class="detail-main">
                <div class="d-flex align-items-center gap-2 mb-3">${statusBadge(ticket.status)} ${priorityBadge(ticket.prioridade)}</div>
                <h3 class="detail-section-title">Descrição da solicitação</h3><div class="detail-description mb-4">${escapeHtml(ticket.descricao)}</div>
                <h3 class="detail-section-title">Comentários <span class="text-muted fw-normal">(${comments.length})</span></h3>
                <div class="comment-list">${comments.length ? comments.map(comment => `<div class="comment-item"><div class="comment-head"><div><strong>${escapeHtml(comment.autor)}</strong> <small>· ${formatDate(comment.dataCriacao, true)}</small></div><div class="comment-actions"><button class="table-action" title="Editar comentário" data-action="edit-comment" data-id="${comment.id}"><i class="bi bi-pencil"></i></button><button class="table-action" title="Excluir comentário" data-action="delete-comment" data-id="${comment.id}"><i class="bi bi-trash3"></i></button></div></div><p>${escapeHtml(comment.texto)}</p></div>`).join('') : `<div class="empty-state"><i class="bi bi-chat-left-text"></i><strong>Nenhum comentário ainda</strong><span>Adicione uma atualização sobre este atendimento.</span></div>`}</div>
                <form class="comment-form" id="commentForm"><label class="form-label" for="commentText">Adicionar comentário</label><textarea class="form-control mb-2" id="commentText" maxlength="100" required placeholder="Escreva uma atualização (máx. 100 caracteres)..."></textarea><div class="d-flex gap-2 align-items-center"><input class="form-control" id="commentAuthor" maxlength="100" required placeholder="Seu nome / equipe" style="max-width:220px"><button type="submit" class="btn btn-primary-soft ms-auto"><i class="bi bi-send"></i> Enviar</button></div></form>
            </div>
            <aside class="detail-side"><h3 class="detail-section-title">Informações</h3><div class="detail-meta mb-3">
                <div class="meta-item"><small>Cliente</small><strong>${escapeHtml(ticket.clienteNome)}</strong></div>
                <div class="meta-item"><small>Categoria</small><strong>${escapeHtml(ticket.categoriaNome)}</strong></div>
                <div class="meta-item"><small>Responsável atual</small><strong>${escapeHtml(ticket.tecnicoNome || 'Não atribuído')}</strong></div>
                <div class="meta-item"><small>Data de abertura</small><strong>${formatDate(ticket.dataCriacao, true)}</strong></div>
                <div class="meta-item"><small>Data de encerramento</small><strong>${formatDate(ticket.dataFechamento, true)}</strong></div>
            </div>
            <h3 class="detail-section-title">Atualizar atendimento</h3><div class="detail-meta">
                <div class="meta-item"><label class="form-label" for="detailStatus">Status</label><select class="form-select detail-select" id="detailStatus" ${ticket.status === 'FECHADO' ? 'disabled' : ''}><option value="ABERTO" ${ticket.status === 'ABERTO' ? 'selected' : ''}>Aberto</option><option value="EM_ANDAMENTO" ${ticket.status === 'EM_ANDAMENTO' ? 'selected' : ''}>Em andamento</option><option value="AGUARDANDO_CLIENTE" ${ticket.status === 'AGUARDANDO_CLIENTE' ? 'selected' : ''}>Aguardando cliente</option></select><button class="btn btn-outline-secondary btn-sm w-100 mt-2" data-action="update-status" data-id="${ticket.id}" ${ticket.status === 'FECHADO' ? 'disabled' : ''}>Atualizar status</button></div>
                <div class="meta-item"><label class="form-label" for="detailTechnician">Atribuir técnico</label><select class="form-select detail-select" id="detailTechnician"><option value="">Selecione um técnico</option>${techOptions}</select><button class="btn btn-outline-secondary btn-sm w-100 mt-2" data-action="assign-tech" data-id="${ticket.id}" ${ticket.status === 'FECHADO' || !state.technicians.length ? 'disabled' : ''}>Atribuir responsável</button></div>
            </div></aside></div>`;
        $('detailsFooter').innerHTML = `<div class="detail-actions me-auto"><button class="btn btn-outline-secondary" data-action="edit-ticket-from-detail" data-id="${ticket.id}"><i class="bi bi-pencil"></i> Editar chamado</button>${ticket.status !== 'FECHADO' ? `<button class="btn btn-outline-success" data-action="close-ticket" data-id="${ticket.id}"><i class="bi bi-check2-circle"></i> Encerrar chamado</button>` : ''}</div><button type="button" class="btn btn-light" data-bs-dismiss="modal">Fechar</button>`;
        $('commentForm').addEventListener('submit', submitComment);
    }

    async function submitComment(event) {
        event.preventDefault();
        const ticket = state.currentTicket;
        const texto = $('commentText').value.trim();
        const autor = $('commentAuthor').value.trim();
        if (!texto || !autor) return;
        try {
            await api('comentarios', { method: 'POST', body: { texto, autor, chamadoId: ticket.id } });
            await openDetails(ticket.id); notify('Comentário adicionado.');
        } catch (error) { notify(error.message, 'danger'); }
    }

    async function updateTicketStatus(id) {
        const status = $('detailStatus').value;
        try { await api(`chamados/${id}/status`, { method: 'PATCH', body: { status } }); await openDetails(id); refreshCurrentView(); notify('Status atualizado.'); }
        catch (error) { notify(error.message, 'danger'); }
    }
    async function assignTechnician(id) {
        const tecnicoId = Number($('detailTechnician').value);
        if (!tecnicoId) { notify('Selecione um técnico para atribuir.', 'danger'); return; }
        try { await api(`chamados/${id}/atribuir`, { method: 'PATCH', body: { tecnicoId } }); await openDetails(id); refreshCurrentView(); notify('Técnico atribuído ao chamado.'); }
        catch (error) { notify(error.message, 'danger'); }
    }
    async function closeTicket(id) {
        if (!window.confirm(`Deseja realmente encerrar o chamado #${id}?`)) return;
        try { await api(`chamados/fechar/${id}`, { method: 'PUT' }); modal('detailsModal').hide(); refreshCurrentView(); notify('Chamado encerrado.'); }
        catch (error) { notify(error.message, 'danger'); }
    }
    async function deleteTicket(id) {
        if (!window.confirm(`Deseja excluir o chamado #${id}? Esta ação não poderá ser desfeita.`)) return;
        try { await api(`chamados/${id}`, { method: 'DELETE' }); refreshCurrentView(); notify('Chamado excluído.'); }
        catch (error) { notify(error.message, 'danger'); }
    }

    function entityCollection(type) {
        return type === 'cliente' ? state.clients : type === 'categoria' ? state.categories : state.technicians;
    }
    function entityEndpoint(type) { return type === 'cliente' ? 'clientes' : type === 'categoria' ? 'categorias' : 'tecnicos'; }
    function openEntityForm(type, id = null) {
        const record = id ? entityCollection(type).find(item => item.id === Number(id)) : null;
        $('entityType').value = type; $('entityId').value = id || '';
        const labels = { cliente: 'cliente', categoria: 'categoria', tecnico: 'técnico' };
        $('entityModalTitle').textContent = `${id ? 'Editar' : 'Novo'} ${labels[type]}`;
        let fields = '';
        if (type === 'cliente') fields = `<div class="mb-3"><label class="form-label" for="entityName">Nome *</label><input class="form-control" id="entityName" maxlength="100" required value="${escapeHtml(record?.nome || '')}"></div><div class="mb-3"><label class="form-label" for="entityEmail">E-mail *</label><input class="form-control" type="email" id="entityEmail" maxlength="120" required value="${escapeHtml(record?.email || '')}"></div><div class="mb-1"><label class="form-label" for="entityPhone">Telefone</label><input class="form-control" id="entityPhone" maxlength="20" value="${escapeHtml(record?.telefone || '')}"></div>`;
        if (type === 'categoria') fields = `<div class="mb-3"><label class="form-label" for="entityName">Nome *</label><input class="form-control" id="entityName" maxlength="100" required value="${escapeHtml(categoryName(record) === 'Sem categoria' ? '' : categoryName(record))}"></div><div class="mb-1"><label class="form-label" for="entityDescription">Descrição *</label><textarea class="form-control" id="entityDescription" rows="3" maxlength="1000" required>${escapeHtml(record?.descricao || '')}</textarea></div>`;
        if (type === 'tecnico') fields = `<div class="mb-3"><label class="form-label" for="entityName">Nome *</label><input class="form-control" id="entityName" maxlength="100" required value="${escapeHtml(record?.nome || '')}"></div><div class="mb-3"><label class="form-label" for="entityEmail">E-mail *</label><input class="form-control" type="email" id="entityEmail" maxlength="100" required value="${escapeHtml(record?.email || '')}"></div><div class="mb-1"><label class="form-label" for="entityProfile">Perfil *</label><select class="form-select" id="entityProfile" required><option value="TECNICO" ${record?.perfil !== 'ADMIN' ? 'selected' : ''}>Técnico</option><option value="ADMIN" ${record?.perfil === 'ADMIN' ? 'selected' : ''}>Administrador</option></select></div>`;
        $('entityFields').innerHTML = fields;
        modal('entityModal').show();
    }

    async function saveEntity(event) {
        event.preventDefault();
        const type = $('entityType').value; const id = $('entityId').value;
        let body;
        if (type === 'cliente') body = { nome: $('entityName').value.trim(), email: $('entityEmail').value.trim(), telefone: $('entityPhone').value.trim() };
        else if (type === 'categoria') body = { nome: $('entityName').value.trim(), descricao: $('entityDescription').value.trim() };
        else body = { nome: $('entityName').value.trim(), email: $('entityEmail').value.trim(), perfil: $('entityProfile').value };
        try {
            await api(`${entityEndpoint(type)}${id ? `/${id}` : ''}`, { method: id ? 'PUT' : 'POST', body });
            modal('entityModal').hide(); notify(`${type[0].toUpperCase()}${type.slice(1)} ${id ? 'atualizado' : 'cadastrado'} com sucesso.`);
            if (type === 'cliente') loadClients(); if (type === 'categoria') loadCategories(); if (type === 'tecnico') loadTechnicians();
        } catch (error) { notify(error.message, 'danger'); }
    }

    async function deleteEntity(type, id) {
        const label = type === 'cliente' ? 'cliente' : type === 'categoria' ? 'categoria' : 'técnico';
        if (!window.confirm(`Deseja excluir este ${label}?`)) return;
        try {
            await api(`${entityEndpoint(type)}/${id}`, { method: 'DELETE' });
            notify(`${label[0].toUpperCase()}${label.slice(1)} excluído com sucesso.`);
            if (type === 'cliente') loadClients(); if (type === 'categoria') loadCategories(); if (type === 'tecnico') loadTechnicians();
        } catch (error) { notify(error.message, 'danger'); }
    }

    async function editComment(id) {
        const ticket = state.currentTicket;
        const comment = (ticket?.comentarios || []).find(item => item.id === Number(id));
        if (!comment) return;
        const texto = window.prompt('Edite o comentário (máx. 100 caracteres):', comment.texto);
        if (texto === null) return;
        if (!texto.trim()) { notify('O comentário não pode ficar vazio.', 'danger'); return; }
        try { await api(`comentarios/${id}`, { method: 'PUT', body: { texto: texto.trim(), autor: comment.autor, chamadoId: ticket.id } }); await openDetails(ticket.id); notify('Comentário atualizado.'); }
        catch (error) { notify(error.message, 'danger'); }
    }
    async function deleteComment(id) {
        const ticket = state.currentTicket;
        if (!window.confirm('Deseja excluir este comentário?')) return;
        try { await api(`comentarios/${id}`, { method: 'DELETE' }); await openDetails(ticket.id); notify('Comentário excluído.'); }
        catch (error) { notify(error.message, 'danger'); }
    }

    function refreshCurrentView() {
        if (state.view === 'dashboard') loadDashboard();
        if (state.view === 'chamados') loadTickets();
    }

    document.addEventListener('click', (event) => {
        const nav = event.target.closest('[data-view]');
        if (nav) { event.preventDefault(); navigate(nav.dataset.view); return; }
        const go = event.target.closest('[data-go]');
        if (go) { navigate(go.dataset.go); return; }
        const createEntity = event.target.closest('[data-create-entity]');
        if (createEntity) { openEntityForm(createEntity.dataset.createEntity); return; }
        const action = event.target.closest('[data-action]');
        if (!action) return;
        const { action: name, id, type } = action.dataset;
        if (name === 'details') openDetails(id);
        if (name === 'edit-ticket') openEditTicket(id);
        if (name === 'delete-ticket') deleteTicket(id);
        if (name === 'edit-ticket-from-detail') { modal('detailsModal').hide(); openEditTicket(id); }
        if (name === 'update-status') updateTicketStatus(id);
        if (name === 'assign-tech') assignTechnician(id);
        if (name === 'close-ticket') closeTicket(id);
        if (name === 'edit-entity') openEntityForm(type, id);
        if (name === 'delete-entity') deleteEntity(type, id);
        if (name === 'edit-comment') editComment(id);
        if (name === 'delete-comment') deleteComment(id);
    });

    $('globalCreateButton').addEventListener('click', openNewTicket);
    $('ticketForm').addEventListener('submit', saveTicket);
    $('entityForm').addEventListener('submit', saveEntity);
    $('ticketSearch').addEventListener('input', renderTickets);
    ['filterStatus', 'filterPriority', 'filterClient'].forEach(id => $(id).addEventListener('change', () => { state.currentPage = 0; loadTickets(); }));
    $('clearFilters').addEventListener('click', () => { $('filterStatus').value = ''; $('filterPriority').value = ''; $('filterClient').value = ''; $('ticketSearch').value = ''; state.currentPage = 0; loadTickets(); });
    $('prevPage').addEventListener('click', () => { if (state.currentPage > 0) { state.currentPage--; loadTickets(); } });
    $('nextPage').addEventListener('click', () => { if (state.currentPage + 1 < state.totalPages) { state.currentPage++; loadTickets(); } });
    $('mobileMenu').addEventListener('click', () => $('sidebar').classList.toggle('show'));

    async function init() {
        try { await loadBaseData(); } catch (error) { notify(error.message, 'danger'); }
        navigate('dashboard');
    }
    init();
})();
