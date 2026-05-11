# VilaVerde - Inova

Plataforma colaborativa para mapear, propor e votar em projetos de arborização urbana.

## Como rodar o projeto

Este projeto utiliza Node.js e um banco de dados SQLite local.

### 1. Instalar as dependências (Primeira vez)
Se você acabou de clonar o projeto ou é a primeira vez rodando em um novo computador, instale os pacotes necessários:
```bash
npm install
```

### 2. Iniciar o servidor
Abra o terminal na pasta do projeto e rode o comando:
```bash
node server.js
```
*Você deverá ver a mensagem: `Server running on http://localhost:3000`*

### 3. Acessar a aplicação
Abra o seu navegador e acesse a URL:
[http://localhost:3000](http://localhost:3000)

---
**Nota:** O banco de dados (`database.sqlite`) será criado automaticamente na primeira vez que você rodar o servidor. As imagens enviadas nas propostas serão salvas localmente na pasta `/uploads`.
