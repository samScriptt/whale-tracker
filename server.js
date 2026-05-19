// Importa o dotenv para ler o nosso arquivo .env
require('dotenv').config();

// Importa o Express (nosso micro-framework de rotas)
const express = require('express');

// Importa o Client do Elasticsearch (como se fosse o PDO do PHP)
const { Client } = require('@elastic/elasticsearch');

const app = express();
const port = process.env.PORT || 3000;

// Configurando a conexão com o banco Elasticsearch
const client = new Client({
  node: 'https://localhost:9200',
  auth: {
    username: 'elastic', // O usuário padrão é sempre 'elastic'
    password: process.env.ELASTIC_PASSWORD
  },
  tls: {
    // As versões novas do ES usam HTTPS por padrão. 
    // Isso ignora o aviso de certificado SSL inválido na nossa máquina local.
    rejectUnauthorized: false 
  }
});

// Criando uma rota GET de teste (Equivalente ao Route::get no Laravel)
app.get('/', async (req, res) => {
  try {
    // Dá um "ping" no banco para ver se ele está vivo
    const info = await client.info();
    
    // Retorna um JSON para o navegador (O Express já converte automaticamente)
    res.json({ 
      mensagem: 'Servidor Node rodando com sucesso!', 
      banco_conectado: true,
      elasticsearch_versao: info.version.number
    });

  } catch (error) {
    console.error("Erro no banco:", error.message);
    res.status(500).json({ erro: 'Falha ao conectar com o Elasticsearch' });
  }
});

// Ligando o servidor na porta 3000
app.listen(port, () => {
  console.log(`Servidor rodando em http://localhost:${port}`);
});