const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const path = require('path');
const mysql = require('mysql2/promise');

const app = express();
const PORT = 3000;

// --- ⚠️ 1. Configuração do Banco de Dados (ATUALIZE AQUI) ⚠️ ---
const dbConfig = {
    host: 'localhost',
    user: 'root', // Seu usuário MySQL
    // 👇👇👇 VOCÊ PRECISA TROCAR ESTA STRING PELA SUA SENHA REAL DO MYSQL! 👇👇👇
    password: '', 
    database: 'lopes',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};

let pool;
async function connectDB() {
    try {
        pool = mysql.createPool(dbConfig);
        console.log('✅ Conexão com o banco de dados MySQL estabelecida.');
    } catch (error) {
        console.error('❌ ERRO ao conectar ao banco de dados. Verifique suas credenciais:', error.message);
        process.exit(1);
    }
}
connectDB();

// --- 2. Middlewares ---
app.use(session({
    secret: 'sua_chave_secreta_e_forte',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 60 * 60 * 1000 }
}));

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());


// --- 3. Middleware de Autenticação ---
function checkAuth(req, res, next) {
    if (req.session.isLoggedIn) {
        next();
    } else {
        res.redirect('/login');
    }
}

// --- 4. Rotas Públicas (Login e Cadastro com DB) ---

// CORREÇÃO DE CAMINHO: Usando '..' para subir um diretório
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'login.html'));
});

// CORREÇÃO DE CAMINHO: Usando '..' para subir um diretório
app.get('/cadastro', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'index.html'));
});

// Lógica de LOGIN: Consulta no banco de dados
app.post('/login', async (req, res) => {
    const { email, senha } = req.body;

    if (!email || !senha) {
        return res.send('Falha no login. Verifique email e senha.');
    }

    try {
        const [rows] = await pool.execute(
            'SELECT id, senha FROM usuarios WHERE email = ?',
            [email]
        );

        if (rows.length === 0) {
            return res.send('Email ou senha inválidos.');
        }

        const user = rows[0];
        
        // ⚠️ SEGURANÇA: Na vida real, use bcrypt.compare(senha, user.senha)
        if (senha === user.senha) { 
            req.session.isLoggedIn = true;
            req.session.userId = user.id;
            res.redirect('/main');
        } else {
            res.send('Email ou senha inválidos.');
        }

    } catch (error) {
        console.error('Erro ao realizar login:', error);
        res.status(500).send('Erro interno no servidor ao logar. Verifique o console do servidor.');
    }
});

// Lógica de CADASTRO: Insere no banco de dados
app.post('/cadastro', async (req, res) => {
    const { nome, email, senha } = req.body;

    if (!nome || !email || !senha) {
        // CORRIGIDO: Esta verificação usa as variáveis desestruturadas corretamente
        return res.send('Falha no cadastro. Preencha todos os campos.');
    }

    // ⚠️ SEGURANÇA: Na vida real, use bcrypt para hash de senhas!
    try {
        const [result] = await pool.execute(
            'INSERT INTO usuarios (nome, email, senha) VALUES (?, ?, ?)',
            [nome, email, senha]
        );

        // Sucesso no cadastro, logar o usuário
        req.session.isLoggedIn = true;
        req.session.userId = result.insertId;
        res.redirect('/main');

    } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
            return res.send('Erro: O email já está cadastrado.');
        }
        
        console.error('Erro ao cadastrar usuário:', error);
        // 🚨 DEBUG TEMPORÁRIO: Envia o erro do DB para o cliente. REMOVA EM PRODUÇÃO!
        res.status(500).send(`Erro interno ao cadastrar. Detalhe do DB: ${error.message}`);
    }
});

// --- 5. Rotas Protegidas (Main, Produto e Pedido) ---

// CORREÇÃO DE CAMINHO: Usando '..' para subir um diretório
app.get(['/', '/main'], checkAuth, (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'main.html'));
});

// Rota para adicionar produto (Protegida)
app.post('/produto/adicionar', checkAuth, async (req, res) => {
    // Note que o campo 'preco' foi adicionado no main.html, mas não está sendo usado no INSERT aqui.
    // Vamos adicionar o 'preco' no insert SQL para a tabela produtos.
    const { nome, quantidade, sku, preco } = req.body;
    
    if (!nome || !quantidade || !sku || !preco) {
        return res.status(400).json({ message: "Dados do produto incompletos." });
    }
    
    try {
        // Assumindo que a tabela 'produtos' TEM uma coluna 'preco' (boa prática)
        // Se sua tabela não tem, remova ', preco' do SQL e do array de valores
        const [result] = await pool.execute(
            'INSERT INTO produtos (nome, quantidade, sku, preco) VALUES (?, ?, ?, ?)',
            [nome, quantidade, sku, preco]
        );

        res.status(200).json({ id: result.insertId, nome: nome, message: 'Produto adicionado com sucesso!' });
    } catch (error) {
        console.error('Erro ao adicionar produto:', error);
        res.status(500).json({ message: `Erro interno ao adicionar produto. Detalhe do DB: ${error.message}` });
    }
});

// Rota para criar pedido (Protegida)
app.post('/pedido/criar', checkAuth, async (req, res) => {
    // Note: O script do main.html envia 'usuario_id', 'produto_id' e 'quantidade' para simplificar o teste.
    const { usuario_id, produto_id, quantidade } = req.body;
    
    if (!usuario_id || !produto_id || !quantidade) {
        return res.status(400).json({ message: "Dados do pedido incompletos." });
    }

    let connection;
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction(); // Inicia uma transação

        // 1. Obter o preço do produto no momento da compra
        const [productRows] = await connection.execute(
            'SELECT preco FROM produtos WHERE id = ?',
            [produto_id]
        );

        if (productRows.length === 0) {
            await connection.rollback();
            return res.status(404).json({ message: 'Produto não encontrado.' });
        }
        
        const preco_unitario = productRows[0].preco;
        const valor_total = quantidade * preco_unitario;


        // 2. Inserir na tabela pedidos
        const [pedidoResult] = await connection.execute(
            'INSERT INTO pedidos (usuario_id, valor_total) VALUES (?, ?)',
            [usuario_id, valor_total]
        );
        const pedidoId = pedidoResult.insertId;

        // 3. Inserir na tabela itens_pedido
        await connection.execute(
            'INSERT INTO itens_pedido (pedido_id, produto_id, quantidade, preco_unitario) VALUES (?, ?, ?, ?)',
            [pedidoId, produto_id, quantidade, preco_unitario]
        );

        // 4. Comprometimento da transação
        await connection.commit();

        res.status(200).json({ 
            id: pedidoId, 
            valor_total: valor_total, 
            message: 'Pedido criado com sucesso!' 
        });
    } catch (error) {
        if (connection) await connection.rollback(); // Desfaz a transação em caso de erro
        console.error('Erro ao criar pedido:', error);
        res.status(500).json({ message: `Erro interno ao criar pedido. Detalhe do DB: ${error.message}` });
    } finally {
        if (connection) connection.release(); // Libera a conexão
    }
});


// Rota de Logout
app.post('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.send('Erro ao finalizar a sessão.');
        }
        res.redirect('/login'); 
    });     
});

app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
    console.log('Rotas protegidas: / e /main');
});
