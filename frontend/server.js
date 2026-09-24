const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const SECRET_KEY = process.env.SECRET_KEY || 'super_secret_inova_key';

// Demo user — funciona mesmo quando o SQLite é resetado no Render
const DEMO_USER = {
  id: 1,
  name: 'João Demo',
  email: 'joao@serra.es.br',
  password: '123456', // comparação direta, sem hash
  initials: 'J',
  bairro: 'Serra Centro',
  cidade: 'Serra, ES',
};

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static('.'));
if (!fs.existsSync(path.join(__dirname, 'uploads'))) {
  fs.mkdirSync(path.join(__dirname, 'uploads'));
}
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

let db;

async function initDb() {
  db = await open({
    filename: './database.sqlite',
    driver: sqlite3.Database
  });

  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      email TEXT UNIQUE,
      password TEXT,
      bairro TEXT,
      cidade TEXT
    );

    CREATE TABLE IF NOT EXISTS proposals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT,
      desc TEXT,
      bairro TEXT,
      tipo TEXT,
      location TEXT,
      tags TEXT,
      status TEXT,
      author_id INTEGER,
      author_name TEXT,
      author_initials TEXT,
      ia TEXT,
      emoji TEXT,
      created_at TEXT,
      photo TEXT
    );

    CREATE TABLE IF NOT EXISTS user_votes (
      user_id INTEGER,
      proposal_id INTEGER,
      direction TEXT,
      PRIMARY KEY (user_id, proposal_id)
    );
  `);

  try {
    await db.run('ALTER TABLE proposals ADD COLUMN photo TEXT');
  } catch (e) {
    // Column might already exist
  }

  const count = await db.get('SELECT COUNT(*) as c FROM proposals');
  if (count.c === 0) {
    const mockProposals = [
      { title: 'Arborização da Av. Central', desc: 'A Avenida Central está completamente exposta ao sol. A temperatura chega a 42°C no asfalto durante o verão. Propomos plantio de 18 ipês-amarelos ao longo da calçada.', location: 'Av. Central, 1500 – Serra/ES', bairro: 'Centro', tags: ['Ipê-amarelo', 'Calçada', 'Alta prioridade'], votes: 247, status: 'votacao', author_name: 'Maria Silva', author_initials: 'MS', ia: { cost: 'R$ 12.400', trees: 18, cooling: '3,2°C', time: '24 meses', species: 'Ipê-amarelo (Handroanthus albus)' }, emoji: '🌳', created_at: '2 dias atrás', photo: 'https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?w=600&q=80' },
      { title: 'Praça da Esperança – Revitalização', desc: 'A praça perdeu todas as árvores velhas e agora é uma ilha de calor. Queremos replantar com espécies nativas do ES para trazer de volta pássaros e sombra.', location: 'Praça da Esperança – Carapina', bairro: 'Carapina', tags: ['Espécies nativas', 'Praça', 'Biodiversidade'], votes: 189, status: 'aprovada', author_name: 'João Pereira', author_initials: 'JP', ia: { cost: 'R$ 34.800', trees: 42, cooling: '5,1°C', time: '36 meses', species: 'Jequitibá-rosa, Pau-brasil, Mutamba' }, emoji: '🌿', created_at: '5 dias atrás', photo: 'https://images.unsplash.com/photo-1542273917363-3b1817f69a2d?w=600&q=80' },
      { title: 'Escola Estadual Sem Sombra', desc: 'Os alunos sofrem no recreio com o calor intenso. A escola não tem uma única árvore no pátio. Precisamos de árvores de crescimento rápido.', location: 'R. das Flores, 220 – Nova Almeida', bairro: 'Nova Almeida', tags: ['Escola', 'Crescimento rápido', 'Urgente'], votes: 312, status: 'votacao', author_name: 'Ana Costa', author_initials: 'AC', ia: { cost: 'R$ 8.600', trees: 12, cooling: '2,8°C', time: '18 meses', species: 'Nim indiano, Tipuana, Sibipirunas' }, emoji: '🏫', created_at: '1 dia atrás', photo: 'https://images.unsplash.com/photo-1588880331179-bc9b93a8cb65?w=600&q=80' },
      { title: 'Corredor Verde – Rua dos Pinheiros', desc: 'Rua residencial com alto fluxo de pedestres e nenhuma arborização. Temperatura 6°C acima das ruas arborizadas vizinhas. Proposta de corredor verde contínuo.', location: 'R. dos Pinheiros – Jardim Carapina', bairro: 'Jardim Carapina', tags: ['Corredor verde', 'Pedestre', 'Clima urbano'], votes: 156, status: 'analise', author_name: 'Carlos Ramos', author_initials: 'CR', ia: { cost: 'R$ 21.200', trees: 28, cooling: '4,6°C', time: '30 meses', species: 'Amendoeira, Oiti, Quaresmeira' }, emoji: '🌲', created_at: '1 semana atrás', photo: 'https://images.unsplash.com/photo-1597848212624-a19eb35e2651?w=600&q=80' },
      { title: 'Estacionamento do Supermercado Sem Sombra', desc: 'O estacionamento do supermercado central é uma chapa de metal no verão. Carros ficam a 65°C internamente. Precisamos de ilhas de vegetação.', location: 'Av. Talma Rodrigues Ribeiro – Serra', bairro: 'Centro', tags: ['Comércio', 'Ilha verde', 'Temperatura'], votes: 98, status: 'votacao', author_name: 'Lucia Ferreira', author_initials: 'LF', ia: { cost: 'R$ 15.800', trees: 22, cooling: '3,9°C', time: '20 meses', species: 'Paineira, Ficus, Pata-de-vaca' }, emoji: '🌴', created_at: '3 dias atrás', photo: 'https://images.unsplash.com/photo-1460532814880-86c2b43b6dc4?w=600&q=80' },
      { title: 'Marginal do Rio Jacaraípe', desc: 'A marginal do rio está degradada. Replantio de mata ciliar vai proteger o rio, reduzir erosão e criar um parque linear de lazer para a comunidade.', location: 'Marginal Rio Jacaraípe – Jacaraípe', bairro: 'Jacaraípe', tags: ['Mata ciliar', 'Rio', 'Parque linear'], votes: 421, status: 'aprovada', author_name: 'Roberto Souza', author_initials: 'RS', ia: { cost: 'R$ 87.500', trees: 150, cooling: '6,8°C', time: '48 meses', species: 'Caliandra, Ingá, Embaúba, Mutamba' }, emoji: '🏞️', created_at: '2 semanas atrás', photo: 'https://images.unsplash.com/photo-1523731407965-2430cd12f5e4?w=600&q=80' }
    ];

    for (const p of mockProposals) {
      const result = await db.run(
        `INSERT INTO proposals (title, desc, bairro, tipo, location, tags, status, author_id, author_name, author_initials, ia, emoji, created_at, photo)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [p.title, p.desc, p.bairro, 'calcada', p.location, JSON.stringify(p.tags), p.status, 1, p.author_name, p.author_initials, JSON.stringify(p.ia), p.emoji, p.created_at, p.photo]
      );
      const votesToAdd = Math.floor(p.votes / 2);
      for (let i = 0; i < votesToAdd; i++) {
        await db.run('INSERT OR IGNORE INTO user_votes (user_id, proposal_id, direction) VALUES (?, ?, ?)', [i + 100, result.lastID, 'up']);
      }
    }
  }
}

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.sendStatus(401);

  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
}

function optionalAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (token) {
    jwt.verify(token, SECRET_KEY, (err, user) => {
      if (!err) req.user = user;
      next();
    });
  } else {
    next();
  }
}

// ----- AUTH ENDPOINTS -----

app.post('/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const initials = name ? name[0].toUpperCase() : 'U';

    const result = await db.run(
      'INSERT INTO users (name, email, password, bairro, cidade) VALUES (?, ?, ?, ?, ?)',
      [name, email, hashedPassword, 'Serra Centro', 'Serra, ES']
    );

    const token = jwt.sign({ id: result.lastID, name, email, initials, bairro: 'Serra Centro', cidade: 'Serra, ES' }, SECRET_KEY);
    res.json({ token, user: { id: result.lastID, name, email, initials, bairro: 'Serra Centro', cidade: 'Serra, ES' } });
  } catch (error) {
    if (error.message.includes('UNIQUE')) {
      return res.status(400).json({ error: 'Email já cadastrado' });
    }
    res.status(500).json({ error: error.message });
  }
});

app.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // ── Demo user: funciona mesmo quando o SQLite é resetado no Render ──
    if (email === DEMO_USER.email && password === DEMO_USER.password) {
      const { password: _, ...safeUser } = DEMO_USER;
      const token = jwt.sign(safeUser, SECRET_KEY);
      return res.json({ token, user: safeUser });
    }

    const user = await db.get('SELECT * FROM users WHERE email = ?', [email]);
    if (!user) return res.status(400).json({ error: 'Usuário não encontrado' });

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) return res.status(400).json({ error: 'Senha incorreta' });

    const initials = user.name ? user.name[0].toUpperCase() : 'U';
    const token = jwt.sign({ id: user.id, name: user.name, email: user.email, initials, bairro: user.bairro, cidade: user.cidade }, SECRET_KEY);
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, initials, bairro: user.bairro, cidade: user.cidade } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/auth/location', authenticateToken, async (req, res) => {
  try {
    const { bairro, cidade } = req.body;

    // Demo user: atualiza apenas o token, sem tocar no banco
    if (req.user.id === DEMO_USER.id) {
      const updatedUser = { ...req.user, bairro, cidade };
      const token = jwt.sign(updatedUser, SECRET_KEY);
      return res.json({ token, user: updatedUser });
    }

    await db.run('UPDATE users SET bairro = ?, cidade = ? WHERE id = ?', [bairro, cidade, req.user.id]);
    const user = await db.get('SELECT * FROM users WHERE id = ?', [req.user.id]);
    const initials = user.name ? user.name[0].toUpperCase() : 'U';
    const token = jwt.sign({ id: user.id, name: user.name, email: user.email, initials, bairro: user.bairro, cidade: user.cidade }, SECRET_KEY);
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, initials, bairro: user.bairro, cidade: user.cidade } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ----- PROPOSALS ENDPOINTS -----

app.get('/proposals', optionalAuth, async (req, res) => {
  try {
    const { status } = req.query;
    let query = 'SELECT p.*, (SELECT SUM(CASE WHEN direction = "up" THEN 1 WHEN direction = "down" THEN -1 ELSE 0 END) FROM user_votes WHERE proposal_id = p.id) as votes FROM proposals p';
    const params = [];

    if (status && status !== 'all') {
      query += ' WHERE p.status = ?';
      params.push(status);
    }

    query += ' ORDER BY p.id DESC';

    const proposals = await db.all(query, params);

    const formatted = await Promise.all(proposals.map(async (p) => {
      let userVote = null;
      if (req.user) {
        const vote = await db.get('SELECT direction FROM user_votes WHERE user_id = ? AND proposal_id = ?', [req.user.id, p.id]);
        if (vote) userVote = vote.direction;
      }

      return {
        id: p.id,
        title: p.title,
        desc: p.desc,
        location: p.location,
        bairro: p.bairro,
        tags: JSON.parse(p.tags || '[]'),
        votes: p.votes || 0,
        userVote,
        status: p.status,
        author: { name: p.author_name, initials: p.author_initials },
        ia: JSON.parse(p.ia || '{}'),
        emoji: p.emoji,
        createdAt: p.created_at,
        photo: p.photo || null
      };
    }));

    res.json(formatted);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/proposals/ranking', optionalAuth, async (req, res) => {
  try {
    const query = 'SELECT p.*, (SELECT SUM(CASE WHEN direction = "up" THEN 1 WHEN direction = "down" THEN -1 ELSE 0 END) FROM user_votes WHERE proposal_id = p.id) as votes FROM proposals p ORDER BY votes DESC NULLS LAST';
    const proposals = await db.all(query);

    const formatted = await Promise.all(proposals.map(async (p) => {
      let userVote = null;
      if (req.user) {
        const vote = await db.get('SELECT direction FROM user_votes WHERE user_id = ? AND proposal_id = ?', [req.user.id, p.id]);
        if (vote) userVote = vote.direction;
      }
      return {
        id: p.id,
        title: p.title,
        location: p.location,
        bairro: p.bairro,
        votes: p.votes || 0,
        userVote,
        emoji: p.emoji
      };
    }));

    res.json(formatted);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/proposals', authenticateToken, async (req, res) => {
  try {
    const { title, desc, bairro, tipo } = req.body;

    const tipoEmoji = { calcada: '🌳', praca: '🌿', escola: '🏫', via: '🌲', rio: '🏞️' };
    const emoji = tipoEmoji[tipo] || '🌱';
    const location = `${bairro} - Serra/ES`;
    const tags = JSON.stringify([tipo, 'Nova proposta']);
    const createdAt = new Date().toLocaleDateString('pt-BR');

    let photoPath = null;
    if (req.body.photo) {
      const base64Data = req.body.photo.replace(/^data:image\/\w+;base64,/, "");
      const ext = req.body.photo.split(';')[0].match(/jpeg|png|gif/)[0];
      const filename = `photo_${Date.now()}.${ext}`;
      fs.writeFileSync(path.join(__dirname, 'uploads', filename), base64Data, 'base64');
      photoPath = `/uploads/${filename}`;
    }

    const tipoData = {
      calcada: { trees: 12, cost: 'R$ 13.000', cooling: '2,5°C', time: '18 meses', species: 'Ipê-amarelo' },
      praca:   { trees: 25, cost: 'R$ 35.000', cooling: '4,0°C', time: '36 meses', species: 'Jequitibá' },
      escola:  { trees: 8,  cost: 'R$ 9.500',  cooling: '2,0°C', time: '12 meses', species: 'Nim indiano' },
      via:     { trees: 18, cost: 'R$ 22.000', cooling: '3,0°C', time: '24 meses', species: 'Paineira' },
      rio:     { trees: 70, cost: 'R$ 80.000', cooling: '5,0°C', time: '48 meses', species: 'Embaúba' },
    };
    const ia = JSON.stringify(tipoData[tipo] || tipoData['calcada']);

    const result = await db.run(
      `INSERT INTO proposals (title, desc, bairro, tipo, location, tags, status, author_id, author_name, author_initials, ia, emoji, created_at, photo)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [title, desc, bairro, tipo, location, tags, 'votacao', req.user.id, req.user.name, req.user.initials, ia, emoji, createdAt, photoPath]
    );

    await db.run('INSERT INTO user_votes (user_id, proposal_id, direction) VALUES (?, ?, ?)', [req.user.id, result.lastID, 'up']);

    res.status(201).json({ id: result.lastID });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/proposals/:id/vote', authenticateToken, async (req, res) => {
  try {
    const proposalId = req.params.id;
    const { direction } = req.body;
    const userId = req.user.id;

    const existingVote = await db.get('SELECT direction FROM user_votes WHERE user_id = ? AND proposal_id = ?', [userId, proposalId]);

    if (existingVote) {
      if (existingVote.direction === direction) {
        await db.run('DELETE FROM user_votes WHERE user_id = ? AND proposal_id = ?', [userId, proposalId]);
        res.json({ message: 'Vote removed' });
      } else {
        await db.run('UPDATE user_votes SET direction = ? WHERE user_id = ? AND proposal_id = ?', [direction, userId, proposalId]);
        res.json({ message: 'Vote updated' });
      }
    } else {
      await db.run('INSERT INTO user_votes (user_id, proposal_id, direction) VALUES (?, ?, ?)', [userId, proposalId, direction]);
      res.json({ message: 'Vote recorded' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

initDb().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
});
