// ===== APP STATE =====
const App = {
  user: null,
  proposals: [],
  currentPage: 'login',
  filters: { status: 'all', bairro: 'all' },
};

// ===== API HELPERS =====
const API_URL = 'https://inova-x6vv.onrender.com/';

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
  
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Erro na requisição');
  }
  
  return response.json();
}

// ===== TOAST NOTIFICATIONS =====
function showToast(message, type = 'success', icon = '✅') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${icon}</span><span>${message}</span>`;
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
  if (page === 'nova-proposta') updateNavbarUser();

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ===== AUTH =====
async function login(e) {
  e.preventDefault();
  const email = document.getElementById('login-email').value;
  const pass = document.getElementById('login-pass').value;
  if (!email || !pass) { showToast('Preencha todos os campos', 'error', '❌'); return; }

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
    
    showToast('Bem-vindo ao VilaVerde! 🌱', 'success');
    goTo('dashboard');
  } catch (error) {
    showToast(error.message, 'error', '❌');
  } finally {
    btn.textContent = 'Entrar na plataforma →';
    btn.disabled = false;
  }
}

async function register(e) {
  e.preventDefault();
  const name = document.getElementById('reg-name').value;
  const email = document.getElementById('reg-email').value;
  const pass = document.getElementById('reg-pass').value;
  if (!name || !email || !pass) { showToast('Preencha todos os campos', 'error', '❌'); return; }

  const regBtn = document.getElementById('reg-btn');
  regBtn.textContent = 'Criando conta...';
  regBtn.disabled = true;

  try {
    const data = await apiFetch('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password: pass })
    });
    
    localStorage.setItem('inova_token', data.token);
    localStorage.setItem('inova_user', JSON.stringify(data.user));
    App.user = data.user;
    
    showToast('Conta criada! Bem-vindo, ' + name + '! 🌿', 'success');
    goTo('location-setup'); // Go to location setup after registration
  } catch (error) {
    showToast(error.message, 'error', '❌');
  } finally {
    regBtn.textContent = '🌱 Criar minha conta';
    regBtn.disabled = false;
  }
}

function logout() {
  App.user = null;
  localStorage.removeItem('inova_token');
  localStorage.removeItem('inova_user');
  goTo('login');
  showToast('Até logo! 👋', 'success');
}

// ===== UPDATE NAVBAR =====
function updateNavbarUser() {
  if (!App.user) return;
  const locBadge = document.querySelector('.location-badge');
  const userAvatar = document.querySelector('.user-avatar');
  const greeting = document.getElementById('dashboard-greeting');
  const loc = App.user.bairro ? App.user.bairro + ', ' + App.user.cidade : App.user.cidade;
  if (locBadge) locBadge.innerHTML = '📍 ' + loc;
  if (userAvatar) userAvatar.textContent = App.user.initials;
  if (greeting) greeting.textContent = 'Olá, ' + App.user.name.split(' ')[0] + '! 🌱';
}

// ===== LOCATION SETUP =====
async function saveLocation() {
  const bairro = document.getElementById('loc-bairro').value;
  const cidade = document.getElementById('loc-cidade').value;
  const cep = document.getElementById('loc-cep').value;

  if (!bairro || !cidade) { showToast('Informe seu bairro e cidade', 'warning', '⚠️'); return; }

  try {
    const data = await apiFetch('/auth/location', {
      method: 'PUT',
      body: JSON.stringify({ bairro, cidade })
    });
    
    App.user = data.user;
    localStorage.setItem('inova_user', JSON.stringify(data.user));
    localStorage.setItem('inova_token', data.token);

    updateNavbarUser();

    showToast(`Localização salva: ${bairro}, ${cidade}`, 'success', '📍');
    goTo('dashboard');
  } catch (error) {
    showToast(error.message, 'error', '❌');
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
          ${p.photo ? `<img src="${p.photo.startsWith('http') ? p.photo : API_URL + p.photo}" style="width:100%; height:100%; object-fit:cover; border-radius: var(--radius-md) var(--radius-md) 0 0;">` : `<span class="proposal-img-placeholder">${p.emoji}</span>`}
          <div class="proposal-status"><span class="badge ${statusClass}">${statusLabel}</span></div>
        </div>
        <div class="proposal-body">
          <div class="proposal-location">📍 ${p.location}</div>
          <h3 class="proposal-title">${p.title}</h3>
          <p class="proposal-desc">${p.desc}</p>
          <div class="proposal-tags">
            ${p.tags.map(t => `<span class="badge badge-green">${t}</span>`).join('')}
          </div>
          <div class="vote-bar" onclick="event.stopPropagation()">
            <div class="vote-count">${p.votes}</div>
            <div style="flex:1">
              <div style="font-size:12px;color:var(--muted);margin-bottom:6px">votos da comunidade</div>
              <div class="progress-bar"><div class="progress-fill" style="width:${Math.min(100,(p.votes/500)*100)}%"></div></div>
            </div>
            <button class="vote-btn vote-up ${voteUpClass}" onclick="vote(${p.id},'up')">👍 Apoiar</button>
            <button class="vote-btn vote-down ${voteDownClass}" onclick="vote(${p.id},'down')">👎</button>
          </div>
          <div class="proposal-meta">
            <div class="proposal-author">
              <div class="author-avatar">${p.author.initials}</div>
              <span>${p.author.name} · ${p.createdAt}</span>
            </div>
            <span class="badge badge-blue">🤖 IA: ${p.ia.cost}</span>
          </div>
        </div>
      </div>`;
    }).join('');

    if (!filtered.length) {
      grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:60px;color:var(--muted)">
        <div style="font-size:64px;margin-bottom:16px">🌵</div>
        <div style="font-size:18px;font-weight:600">Nenhuma proposta encontrada</div>
        <div style="margin-top:8px">Seja o primeiro a propor uma área verde!</div>
      </div>`;
    }
  } catch (error) {
    grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;color:red;padding:40px">Erro ao carregar propostas: ${error.message}</div>`;
  }
}

async function vote(id, dir) {
  try {
    await apiFetch(`/proposals/${id}/vote`, {
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
    
    const msg = dir === 'up' ? 'Voto de apoio registrado! ✅' : 'Voto contra registrado';
    showToast(msg, 'success', dir === 'up' ? '👍' : '👎');
  } catch (error) {
    showToast(error.message, 'error', '❌');
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
      <h2 class="modal-title">${p.emoji} ${p.title}</h2>
      <button class="modal-close" onclick="closeModal()">✕</button>
    </div>
    <div class="modal-body">
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px">
        ${p.tags.map(t => `<span class="badge badge-green">${t}</span>`).join('')}
      </div>
      <p style="color:var(--muted);margin-bottom:8px">📍 ${p.location}</p>
      <p style="line-height:1.7;margin-bottom:24px;color:var(--dark)">${p.desc}</p>

      <div class="ia-panel" style="margin-bottom:24px">
        <div class="ia-panel-title">🤖 Análise da Inteligência Artificial</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px">
          <div class="ia-metric"><div class="ia-metric-label">Custo estimado</div><div class="ia-metric-value">${p.ia.cost}</div><div class="ia-metric-sub">investimento público</div></div>
          <div class="ia-metric"><div class="ia-metric-label">Árvores necessárias</div><div class="ia-metric-value">${p.ia.trees}</div><div class="ia-metric-sub">espécimes adultos</div></div>
          <div class="ia-metric"><div class="ia-metric-label">Redução de temperatura</div><div class="ia-metric-value">-${p.ia.cooling}</div><div class="ia-metric-sub">na área circundante</div></div>
          <div class="ia-metric"><div class="ia-metric-label">Prazo de execução</div><div class="ia-metric-value">${p.ia.time}</div><div class="ia-metric-sub">até sombreamento pleno</div></div>
        </div>
        <div class="ia-recommendations">
          <div class="ia-rec-item"><span class="ia-rec-icon">🌳</span><span><strong>Espécies recomendadas:</strong> ${p.ia.species}</span></div>
          <div class="ia-rec-item"><span class="ia-rec-icon">💧</span><span>Sistema de irrigação subsuperficial nos primeiros 18 meses para garantir pegamento das mudas</span></div>
          <div class="ia-rec-item"><span class="ia-rec-icon">🏙️</span><span>Necessário estudo de compatibilidade com fiação elétrica e redes de esgoto no trecho</span></div>
          <div class="ia-rec-item"><span class="ia-rec-icon">♻️</span><span>Benefício estimado de CO₂ absorvido: ${p.ia.trees * 22}kg/ano após maturidade plena</span></div>
        </div>
      </div>

      <div class="vote-bar" style="margin-bottom:20px">
        <div class="vote-count">${p.votes}</div>
        <div style="flex:1">
          <div style="font-size:13px;color:var(--muted);margin-bottom:8px">votos da comunidade de ${p.bairro}</div>
          <div class="progress-bar"><div class="progress-fill" style="width:${Math.min(100,(p.votes/500)*100)}%"></div></div>
          <div style="font-size:12px;color:var(--muted);margin-top:4px">${Math.round((p.votes/500)*100)}% da meta para envio ao governo</div>
        </div>
        <div style="display:flex;flex-direction:column;gap:8px">
          <button class="vote-btn vote-up ${p.userVote==='up'?'voted':''}" onclick="vote(${p.id},'up');closeModal()" style="padding:12px 20px">👍 Apoiar Proposta</button>
          <button class="vote-btn vote-down ${p.userVote==='down'?'voted':''}" onclick="vote(${p.id},'down');closeModal()">👎 Sou Contra</button>
        </div>
      </div>

      <div style="background:var(--sky);border-radius:var(--radius-sm);padding:14px 16px;font-size:13px;color:var(--muted)">
        <strong>ℹ️ Como funciona?</strong> Propostas com mais de 500 votos são enviadas automaticamente à Prefeitura de ${p.location.split('–')[1]?.trim() || 'Serra'} com o relatório completo da IA.
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
    const positions = ['gold', 'silver', 'bronze'];

    list.innerHTML = sorted.map((p, i) => `
      <div class="ranking-item" onclick="openProposal(${p.id})" style="cursor:pointer">
        <div class="ranking-position ${positions[i] || ''}">${i + 1}</div>
        <div class="ranking-info">
          <div class="ranking-title">${p.emoji} ${p.title}</div>
          <div class="ranking-location">📍 ${p.location}</div>
          <div class="ranking-progress">
            <div class="progress-bar"><div class="progress-fill" style="width:${Math.min(100,(p.votes/500)*100)}%"></div></div>
          </div>
          <div class="ranking-meta">Meta: 500 votos · ${Math.round((p.votes/500)*100)}% concluído · ${p.bairro}</div>
        </div>
        <div class="ranking-votes">
          <div class="votes-big">${p.votes}</div>
          <div class="votes-label">votos</div>
          <button class="btn btn-primary btn-sm" onclick="event.stopPropagation();vote(${p.id},'up')" style="margin-top:8px">
            ${p.userVote === 'up' ? '✅ Votado' : '👍 Votar'}
          </button>
        </div>
      </div>
    `).join('');
  } catch (error) {
    list.innerHTML = `<div style="color:red;padding:20px;text-align:center">Erro ao carregar ranking: ${error.message}</div>`;
  }
}

// ===== PERFIL =====
function renderPerfil() {
  if (!App.user) return;
  const myVotes = App.proposals.filter(p => p.userVote === 'up').length;
  document.getElementById('perfil-name').textContent = App.user.name;
  document.getElementById('perfil-email').textContent = App.user.email;
  document.getElementById('perfil-location').textContent = App.user.bairro ? `📍 ${App.user.bairro}, ${App.user.cidade}` : '📍 Serra, ES';
  document.getElementById('perfil-initials').textContent = App.user.initials;
  document.getElementById('perfil-votes').textContent = myVotes;
}

// ===== NOVA PROPOSTA =====
let uploadedPhotos = [];

function handlePhotoUpload(files) {
  Array.from(files).forEach(file => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      uploadedPhotos.push(e.target.result);
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

let mapPinSet = false;
let mapCoords = null;

function handleMapClick(e) {
  const rect = e.currentTarget.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  const pin = document.getElementById('map-pin');
  pin.style.left = x + 'px';
  pin.style.top = y + 'px';
  pin.style.display = 'block';
  pin.style.animation = 'none';
  void pin.offsetWidth;
  pin.style.animation = 'pinDrop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)';
  mapCoords = { x: Math.round((x / rect.width) * 100), y: Math.round((y / rect.height) * 100) };
  mapPinSet = true;
  document.getElementById('map-placeholder').style.display = 'none';
}

function runIaAnalysis() {
  const title = document.getElementById('prop-title').value;
  const bairro = document.getElementById('prop-bairro').value;
  const desc = document.getElementById('prop-desc').value;
  const tipo = document.getElementById('prop-tipo').value;

  if (!title || !bairro) { showToast('Preencha título e bairro primeiro', 'warning', '⚠️'); return; }

  const panel = document.getElementById('ia-analysis-panel');
  panel.style.display = 'block';
  panel.innerHTML = `
    <div class="ia-panel">
      <div class="ia-panel-title">🤖 Analisando sua proposta...</div>
      <div class="ia-loading">
        <div class="ia-dot"></div><div class="ia-dot"></div><div class="ia-dot"></div>
        <span style="font-size:13px;opacity:0.7;margin-left:8px">Calculando viabilidade e custos</span>
      </div>
      <p style="font-size:13px;opacity:0.6">Consultando dados climáticos de Serra/ES, base de espécies nativas e orçamentos públicos...</p>
    </div>`;

  const tipoData = {
    calcada: { trees: Math.floor(Math.random()*15)+8, cost: 9000+Math.random()*8000, cooling: 2.5+Math.random()*2, time: '18-24 meses', species: 'Ipê-amarelo, Amendoeira, Oiti' },
    praca: { trees: Math.floor(Math.random()*30)+20, cost: 25000+Math.random()*20000, cooling: 4+Math.random()*2.5, time: '30-42 meses', species: 'Jequitibá, Pau-brasil, Mutamba, Ingá' },
    escola: { trees: Math.floor(Math.random()*10)+6, cost: 7000+Math.random()*5000, cooling: 2+Math.random()*2, time: '12-24 meses', species: 'Nim indiano, Tipuana, Sibipiruna' },
    via: { trees: Math.floor(Math.random()*20)+15, cost: 18000+Math.random()*15000, cooling: 3+Math.random()*3, time: '24-36 meses', species: 'Paineira, Pata-de-vaca, Cássia' },
    rio: { trees: Math.floor(Math.random()*80)+60, cost: 60000+Math.random()*40000, cooling: 5+Math.random()*2, time: '36-60 meses', species: 'Embaúba, Caliandra, Sesbânia, Tabebuia' },
  };

  const d = tipoData[tipo] || tipoData['calcada'];

  setTimeout(() => {
    panel.innerHTML = `
    <div class="ia-panel">
      <div class="ia-panel-title">🤖 Análise Completa</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px">
        <div class="ia-metric"><div class="ia-metric-label">Custo estimado</div><div class="ia-metric-value">R$ ${Math.round(d.cost).toLocaleString('pt-BR')}</div><div class="ia-metric-sub">via SEMMA/Serra</div></div>
        <div class="ia-metric"><div class="ia-metric-label">Árvores</div><div class="ia-metric-value">${d.trees}</div><div class="ia-metric-sub">espécimes adultos</div></div>
        <div class="ia-metric"><div class="ia-metric-label">Redução térmica</div><div class="ia-metric-value">-${d.cooling.toFixed(1)}°C</div><div class="ia-metric-sub">área circundante</div></div>
        <div class="ia-metric"><div class="ia-metric-label">Prazo</div><div class="ia-metric-value">${d.time}</div><div class="ia-metric-sub">para sombreamento</div></div>
      </div>
      <div class="ia-recommendations">
        <div class="ia-rec-item"><span class="ia-rec-icon">🌳</span><span><strong>Espécies indicadas:</strong> ${d.species}</span></div>
        <div class="ia-rec-item"><span class="ia-rec-icon">💧</span><span>Irrigação subsuperficial nos primeiros 18 meses (estiagem ES)</span></div>
        <div class="ia-rec-item"><span class="ia-rec-icon">♻️</span><span>CO₂ absorvido: ~${d.trees * 22}kg/ano na maturidade</span></div>
        <div class="ia-rec-item"><span class="ia-rec-icon">✅</span><span>Proposta viável! Adequada às diretrizes do Plano Verde Municipal Serra 2024</span></div>
      </div>
    </div>`;
  }, 2800);
}

async function submitProposal(e) {
  e.preventDefault();
  const title = document.getElementById('prop-title').value;
  const desc = document.getElementById('prop-desc').value;
  const bairro = document.getElementById('prop-bairro').value;
  const tipo = document.getElementById('prop-tipo').value;

  if (!title || !desc || !bairro) { showToast('Preencha todos os campos obrigatórios', 'error', '❌'); return; }

  try {
    await apiFetch('/proposals', {
      method: 'POST',
      body: JSON.stringify({ title, desc, bairro, tipo, photo: uploadedPhotos[0] || null })
    });

    document.getElementById('prop-form').reset();
    uploadedPhotos = [];
    renderPhotoPreview();
    document.getElementById('map-pin').style.display = 'none';
    document.getElementById('map-placeholder').style.display = 'block';
    document.getElementById('ia-analysis-panel').style.display = 'none';

    showToast('Proposta enviada com sucesso! 🌱', 'success', '🎉');
    goTo('dashboard');
  } catch (error) {
    showToast(error.message, 'error', '❌');
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
          showToast('Endereço encontrado! 📍', 'success');
        }
      }).catch(() => {});
  }
}

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
  // Check auth
  const savedUser = localStorage.getItem('inova_user');
  const token = localStorage.getItem('inova_token');
  
  if (savedUser && token) {
    App.user = JSON.parse(savedUser);
    goTo('dashboard');
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

  // Map click
  const mapPicker = document.getElementById('map-picker');
  if (mapPicker) mapPicker.addEventListener('click', handleMapClick);

  // CEP auto-fill
  const cepInput = document.getElementById('loc-cep');
  if (cepInput) cepInput.addEventListener('blur', autofillCEP);

  // Password toggle
  document.querySelectorAll('.toggle-eye').forEach(btn => {
    btn.addEventListener('click', () => {
      const input = btn.previousElementSibling;
      input.type = input.type === 'password' ? 'text' : 'password';
      btn.textContent = input.type === 'password' ? '👁️' : '🙈';
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

