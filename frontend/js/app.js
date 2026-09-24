// Shared local icons: decorative SVGs inherit the surrounding text color.
const UI_ICON_PATHS = {
  "leaf": "<path d=\"M20 4c-8-1-15 2-15 8a7 7 0 0 0 7 7c6 0 9-7 8-15Z\"/><path d=\"M4 21 15 10\"/>",
  "pin": "<path d=\"M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z\"/><circle cx=\"12\" cy=\"10\" r=\"2\"/>",
  "tree": "<path d=\"m12 3-7 8h3l-4 6h16l-4-6h3L12 3Z\"/><path d=\"M12 17v4\"/>",
  "vote": "<path d=\"m8 6 4-3 5 6-4 3-5-6Z\"/><path d=\"M6 11H4l-1 9h18l-1-9h-2M9 15h6\"/>",
  "home": "<path d=\"m3 10 9-7 9 7M5 9v12h14V9M9 21v-8h6v8\"/>",
  "plus": "<path d=\"M12 5v14M5 12h14\"/>",
  "user": "<circle cx=\"12\" cy=\"8\" r=\"4\"/><path d=\"M4 21v-2a8 8 0 0 1 16 0v2\"/>",
  "chart": "<path d=\"M4 3v18h17M8 16v-4M13 16V8M18 16V5\"/>",
  "camera": "<path d=\"M3 7h5l2-3h4l2 3h5v13H3V7Z\"/><circle cx=\"12\" cy=\"13\" r=\"4\"/>",
  "award": "<circle cx=\"12\" cy=\"8\" r=\"5\"/><path d=\"m8 12-2 9 6-3 6 3-2-9\"/>",
  "check": "<path d=\"m5 12 4 4L19 6\"/>",
  "info": "<circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"M12 11v6M12 7h.01\"/>",
  "down": "<path d=\"M12 4v16m-6-6 6 6 6-6\"/>",
  "up": "<path d=\"M12 20V4m-6 6 6-6 6 6\"/>",
  "temperature": "<path d=\"M9 14V5a3 3 0 0 1 6 0v9a5 5 0 1 1-6 0ZM12 8v10\"/>",
  "building": "<path d=\"m3 7 9-4 9 4H3Zm2 3v8m7-8v8m7-8v8M3 21h18\"/>"
};
function uiIcon(name) {
  return '<svg class="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (UI_ICON_PATHS[name] || UI_ICON_PATHS.leaf) + '</svg>';
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[c]));
}

function photoUrl(value) {
  if (/^\/uploads\/[a-f0-9-]+\.png$/.test(value || '')) return API_URL + value;
  return '';
}

// ===== APP STATE =====
const App = {
  user: null,
  proposals: [],
  currentPage: 'login',
  filters: { status: 'all', bairro: 'all' },
};

// ===== API HELPERS =====
const API_URL = window.INOVA_API_URL || '/api';
async function apiFetch(endpoint, options = {}) {
  const token = localStorage.getItem('inova_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
  
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: { ...headers, ...options.headers }
  });
  
  if (response.status === 401 && token) {
    logout();
    throw new Error('Sua sessão expirou. Entre novamente.');
  }
  if (response.status === 204) return null;
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Erro na requisição');
  }
  
  return response.json();
}

// ===== TOAST NOTIFICATIONS =====
function showToast(message, type = 'success', icon = 'check') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.setAttribute('role', type === 'error' ? 'alert' : 'status');
  toast.innerHTML = `<span>${uiIcon(type === 'error' || type === 'warning' ? 'info' : icon)}</span><span>${escapeHtml(message)}</span>`;
  container.appendChild(toast);
  setTimeout(() => { toast.style.opacity = '0'; toast.style.transition = 'opacity 0.3s'; setTimeout(() => toast.remove(), 300); }, 3500);
}

// ===== NAVIGATION =====
function goTo(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const el = document.getElementById('page-' + page);
  if (el) el.classList.add('active');
  App.currentPage = page;

  // Show/hide navbar
  const navbar = document.getElementById('main-navbar');
  if (navbar) {
    const publicPages = ['login', 'location-setup'];
    navbar.classList.toggle('hidden', publicPages.includes(page));
  }

  // Update nav buttons
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.page === page);
  });

  if (page === 'dashboard') { updateNavbarUser(); renderProposals(); }
  if (page === 'votacao') renderVotacao();
  if (page === 'perfil') renderPerfil();
  if (page === 'nova-proposta') { updateNavbarUser(); initProposalMap(); }

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ===== AUTH =====
async function login(e) {
  e.preventDefault();
  const email = document.getElementById('login-email').value;
  const pass = document.getElementById('login-pass').value;
  if (!email || !pass) { showToast('Preencha todos os campos', 'error', 'info'); return; }

  const btn = document.getElementById('login-btn');
  btn.textContent = 'Entrando...';
  btn.disabled = true;

  try {
    const data = await apiFetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password: pass })
    });
    
    localStorage.setItem('inova_token', data.token);
    localStorage.setItem('inova_user', JSON.stringify(data.user));
    App.user = data.user;
    
    showToast('Bem-vindo ao VilaVerde! ', 'success');
    goTo('dashboard');
  } catch (error) {
    showToast(error.message, 'error', 'info');
  } finally {
    btn.textContent = 'Entrar na plataforma →';
    btn.disabled = false;
  }
}

async function register(e) {
  e.preventDefault();
  const name = document.getElementById('reg-name').value;
  const email = document.getElementById('reg-email').value;
  const password = document.getElementById('reg-pass').value;
  if (!name || !email || !password) { showToast('Preencha todos os campos', 'error', 'info'); return; }

  const regBtn = document.getElementById('reg-btn');
  regBtn.textContent = 'Criando conta...';
  regBtn.disabled = true;

  try {
    const data = await apiFetch('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password })
    });
    
    localStorage.setItem('inova_token', data.token);
    localStorage.setItem('inova_user', JSON.stringify(data.user));
    App.user = data.user;
    
    showToast('Conta criada! Bem-vindo, ' + name + '! ', 'success');
    goTo('location-setup'); // Go to location setup after registration
  } catch (error) {
    showToast(error.message, 'error', 'info');
  } finally {
    regBtn.textContent = 'Criar minha conta';
    regBtn.disabled = false;
  }
}

function logout() {
  App.user = null;
  localStorage.removeItem('inova_token');
  localStorage.removeItem('inova_user');
  goTo('login');
  showToast('Até logo! ', 'success');
}

// ===== UPDATE NAVBAR =====
function updateNavbarUser() {
  if (!App.user) return;
  const locBadge = document.querySelector('.location-badge');
  const userAvatar = document.querySelector('.user-avatar');
  const greeting = document.getElementById('dashboard-greeting');
  const loc = App.user.bairro ? App.user.bairro + ', ' + App.user.cidade : App.user.cidade;
  if (locBadge) locBadge.textContent = loc;
  if (userAvatar) userAvatar.textContent = App.user.initials;
  if (greeting) greeting.textContent = 'Olá, ' + App.user.name.split(' ')[0] + '! ';
}

// ===== LOCATION SETUP =====
async function saveLocation() {
  const bairro = document.getElementById('loc-bairro').value;
  const cidade = document.getElementById('loc-cidade').value;
  const cep = document.getElementById('loc-cep').value;

  if (!bairro || !cidade) { showToast('Informe seu bairro e cidade', 'warning', 'info'); return; }

  try {
    const data = await apiFetch('/auth/location', {
      method: 'PUT',
      body: JSON.stringify({ bairro, cidade })
    });
    
    App.user = data.user;
    localStorage.setItem('inova_user', JSON.stringify(data.user));
    localStorage.setItem('inova_token', data.token);

    updateNavbarUser();

    showToast(`Localização salva: ${bairro}, ${cidade}`, 'success', 'pin');
    goTo('dashboard');
  } catch (error) {
    showToast(error.message, 'error', 'info');
  }
}

// ===== PROPOSALS =====
async function renderProposals() {
  const grid = document.getElementById('proposals-grid');
  if (!grid) return;

  try {
    grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:40px">Carregando propostas...</div>';
    
    const params = new URLSearchParams();
    if (App.filters.status !== 'all') params.append('status', App.filters.status);
    
    const proposals = await apiFetch(`/proposals?${params.toString()}`);
    App.proposals = proposals; // Save to state for modal usage
    
    let filtered = proposals;
    if (App.filters.bairro !== 'all' && App.user?.bairro) {
      filtered = filtered.filter(p => p.bairro === App.user.bairro || App.filters.bairro === 'all');
    }

    const statusLabels = { votacao: ['Em Votação', 'badge-blue'], aprovada: ['Aprovada ✓', 'badge-green'], analise: ['Em Análise', 'badge-yellow'] };

    grid.innerHTML = filtered.map(p => {
      const [statusLabel, statusClass] = statusLabels[p.status] || ['Pendente', 'badge-yellow'];
      const voteUpClass = p.userVote === 'up' ? 'voted' : '';
      const voteDownClass = p.userVote === 'down' ? 'voted' : '';
      return `
      <div class="proposal-card" onclick="openProposal(${p.id})">
        <div class="proposal-img">
          ${p.photo ? `<img src="${escapeHtml(photoUrl(p.photo))}" style="width:100%; height:100%; object-fit:cover; border-radius: var(--radius-md) var(--radius-md) 0 0;">` : `<span class="proposal-img-placeholder">${uiIcon("tree")}<span>Local proposto · sem foto</span></span>`}
          <div class="proposal-status"><span class="badge ${statusClass}">${statusLabel}</span></div>
        </div>
        <div class="proposal-body">
          <div class="proposal-location"> ${escapeHtml(p.location)}</div>
          <h3 class="proposal-title">${escapeHtml(p.title)}</h3>
          <p class="proposal-desc">${escapeHtml(p.desc)}</p>
          <div class="proposal-tags">
            ${p.tags.map(t => `<span class="badge badge-green">${escapeHtml(t)}</span>`).join('')}
          </div>
          <div class="vote-bar" onclick="event.stopPropagation()">
            <div class="vote-count">${p.votes}</div>
            <div style="flex:1">
              <div style="font-size:12px;color:var(--muted);margin-bottom:6px">votos da comunidade</div>
              <div class="progress-bar"><div class="progress-fill" style="width:${Math.max(0, Math.min(100,(p.votes/500)*100))}%"></div></div>
            </div>
            <button class="vote-btn vote-up ${voteUpClass}" onclick="vote(${p.id},'up')"> Apoiar</button>
            <button class="vote-btn vote-down ${voteDownClass}" onclick="vote(${p.id},'down')">Contra</button>
          </div>
          <div class="proposal-meta">
            <div class="proposal-author">
              <div class="author-avatar">${escapeHtml(p.author.initials)}</div>
              <span>${escapeHtml(p.author.name)} · ${escapeHtml(p.createdAt)}</span>
            </div>
            <span class="badge badge-blue">Estimativa: ${escapeHtml(p.ia.estimatedCost)}</span>
          </div>
        </div>
      </div>`;
    }).join('');

    if (!filtered.length) {
      grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:60px;color:var(--muted)">
        
        <div style="font-size:18px;font-weight:600">Nenhuma proposta encontrada</div>
        <div style="margin-top:8px">Seja o primeiro a propor uma área verde!</div>
      </div>`;
    }
  } catch (error) {
    grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;color:red;padding:40px">Erro ao carregar propostas: ${escapeHtml(error.message)}</div>`;
  }
}

async function vote(id, dir) {
  try {
    const result = await apiFetch(`/proposals/${id}/vote`, {
      method: 'POST',
      body: JSON.stringify({ direction: dir })
    });
    
    // Refresh UI
    if (App.currentPage === 'dashboard') {
      renderProposals();
    } else if (App.currentPage === 'votacao') {
      renderVotacao();
      // Need to re-fetch full proposals for the modal if it's open, but let's just fetch dashboard state too
      apiFetch('/proposals').then(data => App.proposals = data);
    }
    
    const msg = result.message === 'Vote removed' ? 'Voto removido' : result.message === 'Vote updated' ? 'Voto alterado' : 'Voto registrado';
    showToast(msg, 'success', dir === 'up' ? 'up' : 'down');
  } catch (error) {
    showToast(error.message, 'error', 'info');
  }
}

function setFilter(type, val) {
  App.filters[type] = val;
  document.querySelectorAll(`[data-filter="${type}"]`).forEach(b => {
    b.classList.toggle('active', b.dataset.value === val);
  });
  renderProposals();
}

// ===== OPEN PROPOSAL MODAL =====
function openProposal(id) {
  const p = App.proposals.find(x => x.id === id);
  if (!p) return;

  document.getElementById('modal-overlay').classList.remove('hidden');
  document.getElementById('proposal-modal').innerHTML = `
    <div class="modal-header">
      <h2 class="modal-title">${escapeHtml(p.title)}</h2>
      <button class="modal-close" onclick="closeModal()">✕</button>
    </div>
    <div class="modal-body">
      ${p.author.id === App.user?.id ? `<div style="display:flex;gap:8px;margin-bottom:16px"><button class="btn btn-outline" onclick="editProposal(${p.id})">Editar proposta</button><button class="btn btn-outline" onclick="deleteProposal(${p.id})">Excluir proposta</button></div>` : ''}
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px">
        ${p.tags.map(t => `<span class="badge badge-green">${escapeHtml(t)}</span>`).join('')}
      </div>
      <p style="color:var(--muted);margin-bottom:8px"> ${escapeHtml(p.location)}</p>
      <p style="line-height:1.7;margin-bottom:24px;color:var(--dark)">${escapeHtml(p.desc)}</p>

      <div class="ia-panel" style="margin-bottom:24px">
        <div class="ia-panel-title"> Estimativa demonstrativa</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px">
          <div class="ia-metric"><div class="ia-metric-label">Custo estimado</div><div class="ia-metric-value">${escapeHtml(p.ia.estimatedCost)}</div><div class="ia-metric-sub">investimento público</div></div>
          <div class="ia-metric"><div class="ia-metric-label">Árvores necessárias</div><div class="ia-metric-value">${p.ia.treesRequired}</div><div class="ia-metric-sub">espécimes adultos</div></div>
          <div class="ia-metric"><div class="ia-metric-label">Redução de temperatura</div><div class="ia-metric-value">-${escapeHtml(p.ia.temperatureReduction)}</div><div class="ia-metric-sub">na área circundante</div></div>
          <div class="ia-metric"><div class="ia-metric-label">Prazo de execução</div><div class="ia-metric-value">${escapeHtml(p.ia.implementationTime)}</div><div class="ia-metric-sub">até sombreamento pleno</div></div>
        </div>
        <div class="ia-recommendations">
          <div class="ia-rec-item"><span><strong>Espécies recomendadas:</strong> ${escapeHtml(p.ia.species)}</span></div>
          <div class="ia-rec-item"><span>Sistema de irrigação subsuperficial nos primeiros 18 meses para garantir pegamento das mudas</span></div>
          <div class="ia-rec-item"><span>Necessário estudo de compatibilidade com fiação elétrica e redes de esgoto no trecho</span></div>
          <div class="ia-rec-item"><span>Benefício estimado de CO₂ absorvido: ${p.ia.treesRequired * 22}kg/ano após maturidade plena</span></div>
        </div>
      </div>

      <div class="vote-bar" style="margin-bottom:20px">
        <div class="vote-count">${p.votes}</div>
        <div style="flex:1">
          <div style="font-size:13px;color:var(--muted);margin-bottom:8px">votos da comunidade de ${escapeHtml(p.bairro)}</div>
          <div class="progress-bar"><div class="progress-fill" style="width:${Math.max(0, Math.min(100,(p.votes/500)*100))}%"></div></div>
          <div style="font-size:12px;color:var(--muted);margin-top:4px">${Math.max(0,Math.round((p.votes/500)*100))}% da meta de mobilização</div>
        </div>
        <div style="display:flex;flex-direction:column;gap:8px">
          <button class="vote-btn vote-up ${p.userVote==='up'?'voted':''}" onclick="vote(${p.id},'up');closeModal()" style="padding:12px 20px"> Apoiar Proposta</button>
          <button class="vote-btn vote-down ${p.userVote==='down'?'voted':''}" onclick="vote(${p.id},'down');closeModal()"> Sou Contra</button>
        </div>
      </div>

      <div style="background:var(--sky);border-radius:var(--radius-sm);padding:14px 16px;font-size:13px;color:var(--muted)">
        <strong> Como funciona?</strong> A meta de 500 votos é uma referência de mobilização. O envio à prefeitura ainda não está disponível.
      </div>
    </div>
  `;
}

function closeModal() {
  document.getElementById('modal-overlay').classList.add('hidden');
}

// ===== VOTAÇÃO RANKING =====
async function renderVotacao() {
  const list = document.getElementById('ranking-list');
  if (!list) return;
  
  try {
    list.innerHTML = '<div style="text-align:center;padding:40px">Carregando ranking...</div>';
    
    const sorted = await apiFetch('/proposals/ranking');
    App.proposals = sorted;
    const positions = ['gold', 'silver', 'bronze'];

    list.innerHTML = sorted.map((p, i) => `
      <div class="ranking-item" onclick="openProposal(${p.id})" style="cursor:pointer">
        <div class="ranking-position ${positions[i] || ''}">${i + 1}</div>
        <div class="ranking-info">
          <div class="ranking-title">${escapeHtml(p.title)}</div>
          <div class="ranking-location"> ${escapeHtml(p.location)}</div>
          <div class="ranking-progress">
            <div class="progress-bar"><div class="progress-fill" style="width:${Math.max(0, Math.min(100,(p.votes/500)*100))}%"></div></div>
          </div>
          <div class="ranking-meta">Meta: 500 votos · ${Math.round((p.votes/500)*100)}% concluído · ${escapeHtml(p.bairro)}</div>
        </div>
        <div class="ranking-votes">
          <div class="votes-big">${p.votes}</div>
          <div class="votes-label">votos</div>
          <button class="btn btn-primary btn-sm" onclick="event.stopPropagation();vote(${p.id},'up')" style="margin-top:8px">
            ${p.userVote === 'up' ? ' Votado' : ' Votar'}
          </button>
        </div>
      </div>
    `).join('');
  } catch (error) {
    list.innerHTML = `<div style="color:red;padding:20px;text-align:center">Erro ao carregar ranking: ${escapeHtml(error.message)}</div>`;
  }
}

// ===== PERFIL =====
const achievementMeta = {
  first_vote: { icon: 'leaf' },
  defender: { icon: 'tree' },
  proposer: { icon: 'plus' },
  influencer: { icon: 'award' },
};

function renderAchievements(achievements) {
  const container = document.getElementById('perfil-achievements');
  if (!container) return;
  container.innerHTML = achievements.map(a => {
    const meta = achievementMeta[a.code] || { icon: 'award' };
    return `
      <div class="achievement" style="${a.unlocked ? '' : 'opacity:0.4'}">
        <div class="achievement-icon">${uiIcon(meta.icon)}</div>
        <div class="achievement-info">
          <div class="achievement-name">${escapeHtml(a.name)}</div>
          <div class="achievement-desc">${escapeHtml(a.description)}</div>
        </div>
        <div class="achievement-date" style="${a.unlocked ? '' : 'color:var(--muted)'}">
          ${a.unlocked ? '✓ Conquistado' : ` ${a.progress}/${a.target}`}
        </div>
      </div>`;
  }).join('');
}

async function renderPerfil() {
  if (!App.user) return;
  document.getElementById('perfil-name').textContent = App.user.name;
  document.getElementById('perfil-email').textContent = App.user.email;
  document.getElementById('perfil-location').textContent = App.user.bairro ? ` ${App.user.bairro}, ${App.user.cidade}` : ' Serra, ES';
  document.getElementById('perfil-initials').textContent = App.user.initials;

  try {
    const activity = await apiFetch('/v1/users/me/activity');

    document.getElementById('perfil-votes').textContent = activity.votes;
    document.getElementById('perfil-votes-bar').textContent = activity.votes;
    document.getElementById('perfil-created-count').textContent = activity.proposals;
    document.getElementById('perfil-trees-count').textContent = activity.estimatedTrees;

    document.getElementById('perfil-created-bar').style.width = Math.min(100, activity.proposals * 20) + '%';
    document.getElementById('perfil-votes-fill').style.width = Math.min(100, activity.votes * 10) + '%';
    document.getElementById('perfil-trees-bar').style.width = Math.min(100, activity.estimatedTrees * 5) + '%';

    renderAchievements(activity.achievements);
  } catch (error) {
    showToast(error.message, 'error', 'info');
  }
}

// ===== EDITAR PERFIL =====
function openEditProfile() {
  if (!App.user) return;
  const modal = document.getElementById('proposal-modal');
  modal.innerHTML = `
    <div class="modal-header">
      <div class="modal-title"> Editar Perfil</div>
      <button class="modal-close" onclick="closeModal()">✕</button>
    </div>
    <div class="modal-body">
      <form id="edit-profile-form">
        <div class="form-group">
          <label>Nome completo</label>
          <input id="edit-profile-name" required maxlength="255" value="${escapeHtml(App.user.name)}" />
        </div>
        <div class="form-group">
          <label>E-mail</label>
          <input id="edit-profile-email" type="email" required maxlength="255" value="${escapeHtml(App.user.email)}" />
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
          <div class="form-group">
            <label>Bairro</label>
            <input id="edit-profile-bairro" required maxlength="255" value="${escapeHtml(App.user.bairro || '')}" />
          </div>
          <div class="form-group">
            <label>Cidade</label>
            <input id="edit-profile-cidade" required maxlength="255" value="${escapeHtml(App.user.cidade || '')}" />
          </div>
        </div>
        <button class="btn btn-primary" type="submit" style="width:100%">Salvar alterações</button>
      </form>
    </div>`;
  document.getElementById('modal-overlay').classList.remove('hidden');
  document.getElementById('edit-profile-form').onsubmit = saveProfile;
}

async function saveProfile(e) {
  e.preventDefault();
  const name = document.getElementById('edit-profile-name').value.trim();
  const email = document.getElementById('edit-profile-email').value.trim();
  const bairro = document.getElementById('edit-profile-bairro').value.trim();
  const cidade = document.getElementById('edit-profile-cidade').value.trim();

  try {
    const data = await apiFetch('/v1/users/me', {
      method: 'PUT',
      body: JSON.stringify({ name, email, bairro, cidade })
    });

    App.user = data.user;
    localStorage.setItem('inova_user', JSON.stringify(data.user));
    localStorage.setItem('inova_token', data.token);

    closeModal();
    updateNavbarUser();
    renderPerfil();
    showToast('Perfil atualizado! ', 'success');
  } catch (error) {
    showToast(error.message, 'error', 'info');
  }
}

// ===== NOVA PROPOSTA =====
let uploadedPhotos = [];

function handlePhotoUpload(files) {
  Array.from(files).slice(0, 1).forEach(file => {
    if (!['image/png', 'image/jpeg'].includes(file.type) || file.size > 5 * 1024 * 1024) {
      showToast('Use PNG ou JPEG de até 5 MB', 'error'); return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      uploadedPhotos = [e.target.result];
      renderPhotoPreview();
    };
    reader.readAsDataURL(file);
  });
}

function renderPhotoPreview() {
  const preview = document.getElementById('photos-preview');
  preview.innerHTML = uploadedPhotos.map((src, i) => `
    <div class="photo-thumb">
      <img src="${src}" alt="Foto ${i+1}">
      <button class="photo-remove" onclick="removePhoto(${i})">✕</button>
    </div>
  `).join('');
}

function removePhoto(i) {
  uploadedPhotos.splice(i, 1);
  renderPhotoPreview();
}

// ===== MAP (Leaflet + OpenStreetMap, sem API key) =====
let proposalMap = null;
let proposalMarker = null;
let mapCoords = null; // { lat, lng }

function initProposalMap() {
  const container = document.getElementById('leaflet-map');
  if (!container || typeof L === 'undefined') return;

  if (!proposalMap) {
    const startCenter = [-20.3297, -40.2925]; // Grande Vitória, ES
    proposalMap = L.map(container).setView(startCenter, 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(proposalMap);
    proposalMap.on('click', onProposalMapClick);
  }

  // Garante que o mapa renderize corretamente ao trocar de página
  setTimeout(() => proposalMap.invalidateSize(), 150);
}

function onProposalMapClick(e) {
  const { lat, lng } = e.latlng;
  setProposalMarker(lat, lng);
  reverseGeocode(lat, lng);
}

function setProposalMarker(lat, lng) {
  mapCoords = { lat, lng };
  if (proposalMarker) {
    proposalMarker.setLatLng([lat, lng]);
  } else {
    proposalMarker = L.marker([lat, lng]).addTo(proposalMap);
  }
  const label = document.getElementById('map-coords-label');
  if (label) label.textContent = ` ${lat.toFixed(5)}, ${lng.toFixed(5)}`;
}

function resetProposalMap() {
  mapCoords = null;
  if (proposalMarker && proposalMap) {
    proposalMap.removeLayer(proposalMarker);
    proposalMarker = null;
  }
  const label = document.getElementById('map-coords-label');
  if (label) label.textContent = '';
}

// Geocodificação reversa gratuita via Nominatim (OpenStreetMap)
async function reverseGeocode(lat, lng) {
  const addressInput = document.getElementById('prop-address');
  const bairroInput = document.getElementById('prop-bairro');
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`, {
      headers: { 'Accept-Language': 'pt-BR' }
    });
    if (!res.ok) return;
    const data = await res.json();
    const addr = data.address || {};
    if (addressInput && !addressInput.value) {
      addressInput.value = data.display_name || '';
    }
    if (bairroInput && !bairroInput.value) {
      bairroInput.value = addr.suburb || addr.neighbourhood || addr.city_district || '';
    }
  } catch {
    // Falha silenciosa: geocodificação é só uma conveniência, não bloqueia o uso do mapa
  }
}

function runIaAnalysis() {
  const panel = document.getElementById('ia-analysis-panel');
  panel.style.display = 'block';
  panel.innerHTML = '<div class="ia-panel"><h3>Estimativa demonstrativa</h3><p>Ao salvar, a proposta recebe valores de referência por categoria. Eles não são uma análise técnica ou previsão de IA. Custos e espécies precisam de avaliação profissional.</p></div>';
}

async function submitProposal(e) {
  e.preventDefault();
  const title = document.getElementById('prop-title').value;
  const desc = document.getElementById('prop-desc').value;
  const bairro = document.getElementById('prop-bairro').value;
  const tipo = document.getElementById('prop-tipo').value;

  if (!title || !desc || !bairro) { showToast('Preencha todos os campos obrigatórios', 'error', 'info'); return; }

  try {
    await apiFetch('/proposals', {
      method: 'POST',
      body: JSON.stringify({
        title, desc, bairro, tipo,
        address: document.getElementById('prop-address').value,
        photo: uploadedPhotos[0] || null,
        latitude: mapCoords ? mapCoords.lat : null,
        longitude: mapCoords ? mapCoords.lng : null
      })
    });

    document.getElementById('prop-form').reset();
    uploadedPhotos = [];
    renderPhotoPreview();
    resetProposalMap();
    document.getElementById('ia-analysis-panel').style.display = 'none';

    showToast('Proposta enviada com sucesso! ', 'success', 'check');
    goTo('dashboard');
  } catch (error) {
    showToast(error.message, 'error', 'info');
  }
}

// ===== LOCATION AUTO-FILL =====
function autofillCEP() {
  const cep = document.getElementById('loc-cep').value.replace(/\D/g, '');
  if (cep.length === 8) {
    fetch(`https://viacep.com.br/ws/${cep}/json/`)
      .then(r => r.json())
      .then(d => {
        if (!d.erro) {
          document.getElementById('loc-bairro').value = d.bairro || '';
          document.getElementById('loc-cidade').value = d.localidade || '';
          showToast('Endereço encontrado! ', 'success');
        }
      }).catch(() => {});
  }
}

// ===== INIT =====
document.addEventListener('DOMContentLoaded', async () => {
  // Check auth
  const savedUser = localStorage.getItem('inova_user');
  const token = localStorage.getItem('inova_token');
  
  if (savedUser && token) {
    try {
      App.user = await apiFetch('/auth/me');
      localStorage.setItem('inova_user', JSON.stringify(App.user));
      goTo('dashboard');
    } catch { logout(); }
  } else {
    goTo('login');
  }

  // Filter chips
  document.querySelectorAll('[data-filter]').forEach(btn => {
    btn.addEventListener('click', () => setFilter(btn.dataset.filter, btn.dataset.value));
  });

  // Close modal on overlay click
  document.getElementById('modal-overlay').addEventListener('click', function(e) {
    if (e.target === this) closeModal();
  });

  // Tab switching
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.form-panel').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(`panel-${tab}`).classList.add('active');
    });
  });

  // Photo upload drag & drop
  const uploadArea = document.getElementById('upload-area');
  if (uploadArea) {
    uploadArea.addEventListener('dragover', e => { e.preventDefault(); uploadArea.style.borderColor = 'var(--green-bright)'; });
    uploadArea.addEventListener('dragleave', () => { uploadArea.style.borderColor = ''; });
    uploadArea.addEventListener('drop', e => { e.preventDefault(); uploadArea.style.borderColor = ''; handlePhotoUpload(e.dataTransfer.files); });
  }

  // CEP auto-fill
  const cepInput = document.getElementById('loc-cep');
  if (cepInput) cepInput.addEventListener('blur', autofillCEP);

  // Password toggle
  document.querySelectorAll('.toggle-eye').forEach(btn => {
    btn.addEventListener('click', () => {
      const input = btn.previousElementSibling;
      input.type = input.type === 'password' ? 'text' : 'password';
      btn.textContent = input.type === 'password' ? 'Mostrar' : 'Ocultar';
      btn.setAttribute('aria-label', input.type === 'password' ? 'Mostrar senha' : 'Ocultar senha');
      btn.setAttribute('aria-pressed', String(input.type !== 'password'));
    });
  });

  // Stats counter animation
  function animateCounters() {
    document.querySelectorAll('.stat-number[data-target]').forEach(el => {
      const target = parseInt(el.dataset.target);
      let current = 0;
      const step = target / 40;
      const timer = setInterval(() => {
        current = Math.min(current + step, target);
        el.textContent = Math.round(current).toLocaleString('pt-BR');
        if (current >= target) clearInterval(timer);
      }, 30);
    });
  }
  setTimeout(animateCounters, 500);
});


function editProposal(id) {
  const p = App.proposals.find(p => p.id === id);
  const modal = document.getElementById('proposal-modal');
  modal.innerHTML = `<div class="modal-body"><h2>Editar proposta</h2><form id="edit-proposal-form"><label>Título<input id="edit-title" required maxlength="255" value="${escapeHtml(p.title)}"></label><label>Descrição<textarea id="edit-desc" required maxlength="5000">${escapeHtml(p.desc)}</textarea></label><label>Bairro<input id="edit-bairro" required maxlength="255" value="${escapeHtml(p.bairro)}"></label><button class="btn btn-primary" type="submit">Salvar</button><button class="btn btn-outline" type="button" onclick="closeModal()">Cancelar</button></form></div>`;
  document.getElementById('edit-proposal-form').onsubmit = async e => {
    e.preventDefault();
    try {
      await apiFetch(`/proposals/${id}`, {method: 'PUT', body: JSON.stringify({title: document.getElementById('edit-title').value, desc: document.getElementById('edit-desc').value, bairro: document.getElementById('edit-bairro').value})});
      closeModal(); goTo('dashboard'); showToast('Proposta atualizada');
    } catch (error) { showToast(error.message, 'error'); }
  };
}

async function deleteProposal(id) {
  if (!confirm('Excluir esta proposta e seus votos? Esta ação não pode ser desfeita.')) return;
  try {
    await apiFetch(`/proposals/${id}`, {method:'DELETE'});
    closeModal(); goTo('dashboard'); showToast('Proposta excluída');
  } catch (error) { showToast(error.message, 'error'); }
}
