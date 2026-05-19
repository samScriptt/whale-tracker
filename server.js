require('dotenv').config();
const express = require('express');
const { Client } = require('@elastic/elasticsearch');
const WebSocket = require('ws'); // Importando a biblioteca de WebSockets

const app = express();

const cors = require('cors'); // Importa a biblioteca
app.use(cors());              // Libera o acesso para qualquer frontend

const port = process.env.PORT || 3000;

const client = new Client({
  node: 'https://localhost:9200',
  auth: {
    username: 'elastic',
    password: process.env.ELASTIC_PASSWORD
  },
  tls: { rejectUnauthorized: false }
});

// Nossa rota de teste continua aqui
app.get('/', async (req, res) => {
  res.json({ mensagem: 'Backend rodando e ouvindo baleias!' });
});

// Rota para listar as últimas baleias (Nosso "SELECT *")
app.get('/api/baleias', async (req, res) => {
  try {
    // Fazendo a busca no Elasticsearch
    const resultado = await client.search({
      index: 'baleias',
      // Ordena pelas mais recentes
      sort: [{ data_hora: { order: 'desc' } }], 
      // Traz os últimos 50 registros
      size: 50 
    });

    // O Elasticsearch devolve muitos metadados. 
    // Os nossos dados reais ficam sempre dentro de "hits.hits" no atributo "_source".
    // Vamos mapear (limpar) esse array para devolver só o que importa.
    const baleias = resultado.hits.hits.map(hit => hit._source);

    res.json(baleias);

  } catch (erro) {
    console.error("Erro ao buscar no ES:", erro.message);
    // Se der erro porque o índice ainda não existe (nenhuma baleia salva), retornamos array vazio
    if (erro.message.includes('index_not_found_exception')) {
      return res.json([]);
    }
    res.status(500).json({ erro: 'Erro ao buscar as baleias' });
  }
});


// Rota de Agregação: Volume total em 24h
app.get('/api/baleias/stats', async (req, res) => {
    try {
    const resultado = await client.search({
        index: 'baleias',
        size: 0, // Não queremos a lista de baleias, SÓ queremos o resultado da conta!
        query: {
        range: {
            data_hora: {
            gte: 'now-24h' // Matemática de data nativa do Elasticsearch (Maior ou igual a agora menos 24h)
            }
        }
        },
        aggs: {
        volume_total_btc: {
            sum: { field: 'valor_btc' } // A mágica acontece aqui (Equivalente ao SUM do SQL)
        }
        }
    });

    // Extrai apenas o número da resposta gigante do ES
    const totalBtc = resultado.aggregations.volume_total_btc.value;
    res.json({ total_btc: totalBtc });

    } catch (erro) {
    console.error("Erro na agregação:", erro.message);
    res.json({ total_btc: 0 });
    }
});

// Rota de Busca: Filtrar baleias por pedaço do Hash
app.get('/api/baleias/buscar', async (req, res) => {
    try {
    // Pegamos o que o usuário digitou na barra (ex: ?q=1A1z)
    const termo = req.query.q; 

    const resultado = await client.search({
        index: 'baleias',
        query: {
        wildcard: {
            // O ".keyword" é um superpoder do ES para buscas exatas em pedaços de texto
            "hash.keyword": `*${termo}*` 
        }
        },
        sort: [{ data_hora: { order: 'desc' } }],
        size: 50
    });

    const baleias = resultado.hits.hits.map(hit => hit._source);
    res.json(baleias);

    } catch (erro) {
    console.error("Erro na busca:", erro.message);
    res.json([]);
    }
});


// ==========================================
// LÓGICA DO WEBSOCKET (A CAÇA ÀS BALEIAS)
// ==========================================

// Conecta na API pública e gratuita da Blockchain.com
const ws = new WebSocket('wss://ws.blockchain.info/inv');

// Quando a conexão abrir, enviamos uma mensagem pedindo para assinar transações não confirmadas
ws.on('open', () => {
  console.log('Conectado à blockchain do Bitcoin! Ouvindo transações...');
  ws.send(JSON.stringify({ op: 'unconfirmed_sub' }));
});

// Sempre que a blockchain enviar uma mensagem pra gente, este evento é disparado
ws.on('message', async (data) => {
  const transacao = JSON.parse(data);

  // Garantimos que é uma transação do tipo 'utx' (unconfirmed transaction)
  if (transacao.op === 'utx') {
    const info = transacao.x;
    
    // O Bitcoin divide cada moeda em 100 milhões de "centavos" chamados Satoshis.
    // Vamos somar todas as saídas dessa transação para descobrir o valor total enviado.
    let valorSatoshi = 0;
    info.out.forEach(saida => {
      valorSatoshi += saida.value;
    });

    const valorBtc = valorSatoshi / 100000000;

    // DEFININDO A BALEIA: Vamos filtrar transações maiores que 5 BTC
    // (Pode parecer pouco, mas usamos 5 para testar e ver os dados chegando rápido)
    if (valorBtc > 5) {
      console.log(`🚨 BALEIA DETECTADA! Valor: ${valorBtc.toFixed(2)} BTC | Hash: ${info.hash}`);

      // Salvando no Elasticsearch (Equivalente ao Model::create() no Laravel)
      try {
        await client.index({
          index: 'baleias', // 'index' no ES é o equivalente a 'tabela' no SQL
          document: {
            hash: info.hash,
            valor_btc: valorBtc,
            data_hora: new Date(info.time * 1000).toISOString()
          }
        });
      } catch (erro) {
        console.error("Erro ao salvar no Elasticsearch:", erro.message);
      }
    }
  }
});

app.listen(port, () => {
  console.log(`Servidor rodando em http://localhost:${port}`);
});