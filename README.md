📦 CRUD Básico Senai (Node.js + Express + MySQL)

Este projeto é um boilerplate de aplicação web utilizando Node.js, focado em demonstrar um sistema básico de Login, Cadastro, e operações CRUD (Create, Read, Update, Delete - com ênfase no C-Create, neste caso) de produtos e pedidos, utilizando o banco de dados MySQL com a biblioteca mysql2/promise.

Ele serve como base para o aprendizado de autenticação via sessão (express-session) e manipulação de transações com MySQL.

📁 Estrutura do Projeto (Assumida)

Este guia assume que a estrutura de diretórios é a seguinte, com o servidor rodando a partir da pasta backend:

crud_basico_senai/
├── backend/
│   └── index.js   <-- O servidor Node.js
├── login.html
├── cadastro.html
└── README.md


✨ Funcionalidades

Autenticação: Login e Cadastro de usuários no banco de dados.

Sessões Seguras: Uso de express-session para proteger rotas.

Gestão de Produtos: Rota protegida para adicionar novos produtos.

Gestão de Pedidos: Rota protegida para criar pedidos, utilizando transações MySQL para garantir a integridade dos dados (inserção em pedidos e itens_pedido).

🛠️ Requisitos de Instalação

Para rodar este projeto localmente, você precisará ter instalado:

Node.js e npm: Recomendado usar a versão LTS.

MySQL Server: O servidor de banco de dados deve estar rodando (você pode usar o MySQL Workbench, XAMPP, WAMP ou Docker).

🚀 Configuração e Instalação

1. Clonar o Repositório

git clone [https://github.com/lopessjv07/crud_basico_senai.git](https://github.com/lopessjv07/crud_basico_senai.git)
cd crud_basico_senai/backend


2. Instalar Dependências

Execute este comando na pasta do servidor (backend/) para instalar as bibliotecas Node.js necessárias:

npm install express express-session body-parser path mysql2


3. Configurar o Banco de Dados (MySQL)

A. Criar o Banco de Dados:

Crie um banco de dados chamado lopes (ou altere o nome no index.js).

CREATE DATABASE lopes;
USE lopes;


B. Estrutura das Tabelas:

Execute o seguinte script SQL para criar as tabelas necessárias:

-- Tabela de Usuários (para Login/Cadastro)
CREATE TABLE usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    senha VARCHAR(255) NOT NULL, -- Lembre-se de usar HASH em produção (bcrypt)
    data_cadastro TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Produtos
CREATE TABLE produtos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    quantidade INT NOT NULL,
    preco DECIMAL(10, 2) NOT NULL,
    sku VARCHAR(50) UNIQUE NOT NULL
);

-- Tabela de Pedidos
CREATE TABLE pedidos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT,
    valor_total DECIMAL(10, 2) NOT NULL,
    data_pedido TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);

-- Tabela de Itens do Pedido (Muitos para Muitos)
CREATE TABLE itens_pedido (
    id INT AUTO_INCREMENT PRIMARY KEY,
    pedido_id INT,
    produto_id INT,
    quantidade INT NOT NULL,
    preco_unitario DECIMAL(10, 2) NOT NULL,
    FOREIGN KEY (pedido_id) REFERENCES pedidos(id) ON DELETE CASCADE,
    FOREIGN KEY (produto_id) REFERENCES produtos(id)
);


4. Atualizar as Credenciais do Servidor

Abra o arquivo index.js (localizado em backend/index.js) e altere a seção de configuração do banco de dados com suas credenciais reais do MySQL.

index.js (Linhas 11-18):

const dbConfig = {
    host: 'localhost',
    user: 'root', // Seu usuário MySQL
    // 🛑 ATENÇÃO: SUBSTITUA PELA SUA SENHA REAL DO MYSQL 🛑
    password: 'SUA_SENHA_REAL_DO_MYSQL_AQUI', 
    database: 'lopes',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};


▶️ Como Executar

Execute o comando na pasta do servidor (backend/) para iniciar a aplicação:

node index.js
# Ou use o modo de observação (se disponível):
# node --watch index.js


Se a conexão com o banco de dados for bem-sucedida, você verá:

✅ Conexão com o banco de dados MySQL estabelecida.
Servidor rodando em http://localhost:3000
Rotas protegidas: / e /main


Agora, acesse o link no seu navegador para começar:

Página de Cadastro: http://localhost:3000/cadastro

Página de Login: http://localhost:3000/login
