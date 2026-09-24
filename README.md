# Inova / VilaVerde

Plataforma de propostas de arborização. Front-end HTML/CSS/JavaScript, API Java 21 / Spring Boot 4.1.1, JPA, JWT, BCrypt, MySQL 8.4 e Flyway.

## Rodar somente com Docker

Requisitos: Docker com Compose (Docker Desktop no Windows/macOS), motor de containers Linux iniciado e internet na primeira construção. Não precisa instalar Java, Maven, Node, Python ou MySQL no computador. Execute na pasta extraída/clonada do projeto:

```sh
docker compose -f Docker-compose.yml up -d --build --wait
```

Abra **http://localhost:8088**. O build da API executa os testes antes de gerar a imagem.

### Popular o banco com dados de demonstração

Depois que os containers estiverem em execução, você pode popular o MySQL com usuários, propostas, tags, análises e votos de demonstração. O seed é opcional e não roda automaticamente em produção.

PowerShell (Windows):

```powershell
.\scripts\seed.ps1
```

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\seed.ps1
```

Linux/macOS/Git Bash:

```sh
./scripts/seed.sh
```

O comando é idempotente: se os dados demo já existirem, não cria duplicatas. Para apagar **somente os mocks** e recriá-los:

```powershell
.\scripts\seed.ps1 -Reset
```

```sh
./scripts/seed.sh --reset
```

Conta pronta para testar a interface:

- E-mail: `demo@demo.inova.local`
- Senha: `Demo@123`

Também é possível executar diretamente dentro do container:

```sh
docker compose -f Docker-compose.yml exec -T inova-api java -jar /app/app.jar --spring.main.web-application-type=none --app.seed.enabled=true
```

O `.env` é opcional em desenvolvimento; os padrões do Compose permitem iniciar diretamente. Para personalizar, copie `.env.example` para `.env`. JWT_SECRET precisa de pelo menos 32 bytes. Os valores padrão de senha e JWT são apenas para desenvolvimento; substitua-os antes de disponibilizar a instalação a terceiros. Alterar a senha no `.env` não altera usuários de um volume MySQL já inicializado.

| Componente | Acesso |
| --- | --- |
| Interface e proxy | http://localhost:8088 |
| API pelo proxy | http://localhost:8088/api/health |
| API e MySQL | Rede interna do Compose, sem portas públicas |

O navegador chama `/api`; Nginx encaminha para `inova-api:8080`. Funciona também acessando a interface por IP do computador na rede, se o firewall permitir a porta 8088. Não há `localhost` da API fixado no navegador.

```sh
# Estado e logs
docker compose -f Docker-compose.yml ps
docker compose -f Docker-compose.yml logs -f inova-api

# Parar sem apagar banco ou imagens
docker compose -f Docker-compose.yml down

# Iniciar novamente
docker compose -f Docker-compose.yml up -d --wait
```

Banco e fotos persistem nos volumes `inova_mysql_data` e `inova_uploads` do projeto Compose. Não use `down -v` para uma parada normal: essa opção apaga os volumes. Não altere migrations já aplicadas; crie a próxima versão.

Porta ocupada: configure `FRONTEND_PORT` no `.env` e execute `up` novamente. JWT inválido/curto: corrija `JWT_SECRET`. Falha no motor: abra Docker Desktop e espere ficar pronto. Falha ao baixar dependências/imagens: verifique a conexão e repita o build. Os comandos usam `-f` porque o arquivo tem nome `Docker-compose.yml` com D maiúsculo.

## Desenvolvimento fora do Docker

Com JDK 21 e Node instalados, suba somente o banco:

```sh
docker compose -f Docker-compose.yml -f compose.dev.yml up -d mysql
```

PowerShell, na raiz (não execute a API Docker e local na mesma porta):

```powershell
$env:DB_USERNAME = 'inova'
$env:DB_PASSWORD = 'inova_pass'
$env:DB_PORT = '3307'
$env:JWT_SECRET = 'inova-local-development-only-secret-change-before-deploy'
.\mvnw.cmd spring-boot:run
```

Em outro terminal:

```sh
node frontend/dev-server.cjs
```

Abra http://localhost:5500. O servidor local encaminha `/api` para a API, sem instalar pacotes npm. Spring não carrega `.env` automaticamente no modo local. No Linux/macOS use `sh mvnw spring-boot:run` e variáveis de ambiente equivalentes. O arquivo opcional `compose.dev.yml` publica MySQL em `127.0.0.1:3307` (`MYSQL_HOST_PORT`) e a API Docker em `127.0.0.1:8080` (`SERVER_PORT`) se iniciada com ele.

## Funcionalidades concluídas

- Cadastro/login, sessão JWT, validação da sessão ao reabrir a página e atualização de localização.
- Criação, listagem, consulta individual, ranking, edição de título/descrição/bairro e exclusão pelo autor.
- Edição de perfil (nome, e-mail, bairro, cidade) pelo próprio usuário, com verificação de e-mail duplicado.
- Votos positivos/negativos: repetir remove, trocar direção altera; uma linha por usuário/proposta.
- Foto PNG/JPEG de até 5 MB e 20 megapixels, decodificada e regravada no servidor, com nome aleatório e volume persistente. A interface aceita uma foto por proposta.
- Mapa real (Leaflet + tiles OpenStreetMap, sem chave de API) para marcar o local da proposta, com geocodificação reversa via Nominatim preenchendo endereço/bairro automaticamente; latitude/longitude são validadas e persistidas.
- Conquistas e indicadores de atividade (propostas criadas, votos dados, árvores estimadas) calculados a partir de dados reais do usuário, não mais fixos na interface.
- DTOs, validação de categorias e campos, erros JSON, proteção de rotas e escape de conteúdo na interface.
- Consulta agregada de votos nas listagens e ranking, evitando contagens por item durante a ordenação.
- Endpoints versionados preservando as rotas antigas; Docker completo e CI de testes.

## API

Use `Authorization: Bearer <token>` nas rotas protegidas. Pela porta 8088, acrescente `/api` às rotas antigas abaixo. As rotas versionadas `/api/v1/...` funcionam sem modificação tanto no proxy quanto diretamente na API.

| Método | Rota | Corpo/comportamento |
| --- | --- | --- |
| POST | /auth/register | `name`, `email`, `password`; retorna `token` e `user` |
| POST | /auth/login | `email`, `password` |
| GET | /auth/me | Usuário autenticado |
| PUT | /auth/location | `bairro`, `cidade`; retorna usuário e novo token |
| GET | /proposals | Array; filtro opcional `?status=votacao` |
| GET | /proposals/ranking | Array por saldo de votos, desempate por ID decrescente |
| GET | /proposals/{id} | Proposta individual |
| POST | /proposals | `title`, `desc`, `bairro`, `tipo`, `address` opcional, `photo` opcional em data URL PNG/JPEG; retorna ID e HTTP 201 |
| PUT | /proposals/{id} | `title`, `desc`, `bairro`; apenas autor |
| DELETE | /proposals/{id} | Apenas autor; remove proposta/votos; HTTP 204 |
| POST | /proposals/{id}/vote | `direction`: `up` ou `down`; maiúsculas também aceitas |
| POST | /proposals/{id}/votes | Alias da votação |
| DELETE | /proposals/{id}/votes | Remove voto do usuário; idempotente |
| GET | /api/v1/users/me | Usuário autenticado |
| PUT | /api/v1/users/me | Edita perfil: `name`, `email`, `bairro`, `cidade`; retorna usuário e novo token |
| PUT | /api/v1/users/me/location | Atualiza `bairro`, `cidade` |
| GET | /api/v1/users/me/activity | Propostas criadas, votos dados, árvores estimadas e progresso das conquistas do usuário |
| GET | /api/v1/stats | Indicadores agregados da plataforma (propostas, votos, propostas mapeadas, árvores estimadas, saldo da líder) |
| GET | /health | Sinal de processo HTTP ativo |

Categorias: `calcada`, `praca`, `escola`, `via`, `rio`. A análise retornada usa `ia.estimatedCost`, `treesRequired`, `temperatureReduction`, `implementationTime`, `species`. `POST /proposals` aceita `latitude`/`longitude` opcionais (ambas juntas ou nenhuma). Fotos são servidas por `/uploads/{arquivo}` (pelo proxy, `/api/uploads/{arquivo}`). Login e cadastro são públicos; todas as operações de usuário/proposta exigem JWT. Erros esperados usam `error` e, na validação, `details`; 401 indica sessão ausente/inválida, 403 falta de permissão, 404 recurso inexistente.

O mapa da tela "Nova Proposta" carrega tiles de `tile.openstreetmap.org` e a geocodificação reversa usa `nominatim.openstreetmap.org` — ambos gratuitos e sem chave, mas exigem acesso à internet no navegador do usuário; sem internet o mapa não carrega e o endereço precisa ser digitado manualmente.

## Testes

```powershell
.\mvnw.cmd test
node frontend/tests/app.test.cjs
```

Os testes Java iniciam a API HTTP e usam H2 em modo MySQL, aplicando as migrations reais. Cobrem autenticação, validação, propostas, votos, ranking, autorização, exclusão e imagens. Os testes JavaScript verificam renderização/escape de HTML, contrato de análise, estado do ranking e sessão expirada. H2 não substitui a validação com MySQL real.

Com a stack Docker iniciada e Python disponível opcionalmente:

```sh
python scripts/smoke.py
```

O smoke passa pelo Nginx até MySQL, cria uma conta de teste com email único e remove a proposta que criou. A conta de teste permanece no banco. O workflow `.github/workflows/verify.yml` executa os testes do front, build Docker e smoke em uma instalação limpa.

## Limites e próximos incrementos

A estimativa de custo/árvores/espécies por categoria ainda é uma tabela fixa por `tipo`, sem integração com IA. Não existe envio automático à prefeitura. Login social, notificações, painel administrativo e relatórios são incrementos de produto separados.

Ainda ficam para evolução: paginação no banco, Swagger interativo, rate limiting, auditoria, monitoramento, renovação/revogação de tokens, gerenciamento/limpeza de fotos sem referência e migração de dados legados. O `frontend/server.js` é o legado Node/SQLite e não entra na imagem do site. Nenhum banco SQLite de produção foi fornecido, portanto seus dados não foram migrados. Não rode esse servidor para usar a versão Spring Boot.
