import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

function App() {
  const [baleias, setBaleias] = useState([]);
  const [volume24h, setVolume24h] = useState(0);
  
  // Variável que guarda o que o usuário digita na barra de busca
  const [termoBusca, setTermoBusca] = useState('');

  useEffect(() => {
    const buscarDados = async () => {
      try {
        // Se o usuário digitou algo, usa a rota de busca. Se não, usa a rota normal.
        const urlBaleias = termoBusca 
          ? `http://localhost:3000/api/baleias/buscar?q=${termoBusca}`
          : 'http://localhost:3000/api/baleias';

        const respLista = await fetch(urlBaleias);
        const dadosLista = await respLista.json();
        setBaleias(dadosLista);

        const respStats = await fetch('http://localhost:3000/api/baleias/stats');
        const dadosStats = await respStats.json();
        setVolume24h(dadosStats.total_btc);
        
      } catch (erro) {
        console.error("Erro ao buscar dados:", erro);
      }
    };

    buscarDados();
    const intervalo = setInterval(buscarDados, 5000);
    return () => clearInterval(intervalo);
    
  }, [termoBusca]); // O React "escuta" a barra de busca e refaz a requisição quando ela muda

  const dadosGrafico = [...baleias].reverse().map(baleia => ({
    hora: new Date(baleia.data_hora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    valor: baleia.valor_btc
  }));

  const volumeEmDolar = (volume24h * 65000).toLocaleString('en-US', { style: 'currency', currency: 'USD' });

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif', backgroundColor: '#1e1e2f', color: '#fff', minHeight: '100vh' }}>
      <h2>🐋 Whale Tracker - Painel de Baleias ao vivo</h2>
      
      {/* CARD DE VOLUME */}
      <div style={{ backgroundColor: '#00ff88', color: '#000', padding: '20px', borderRadius: '8px', marginBottom: '20px', display: 'inline-block' }}>
        <h3 style={{ margin: 0, fontSize: '14px', textTransform: 'uppercase' }}>Volume Movimentado (Últimas 24h)</h3>
        <p style={{ fontSize: '32px', margin: '5px 0 0 0', fontWeight: 'bold' }}>{volumeEmDolar}</p>
        <small>{volume24h.toFixed(2)} BTC processados e somados em milissegundos.</small>
      </div>

      {/* GRÁFICO */}
      <div style={{ width: '100%', height: 300, backgroundColor: '#2a2a40', padding: '20px', borderRadius: '8px', marginBottom: '30px', boxSizing: 'border-box' }}>
        <h3 style={{ marginTop: 0, color: '#aaa', fontSize: '16px' }}>Volume (BTC) por Transação</h3>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={dadosGrafico}>
            <XAxis dataKey="hora" stroke="#8884d8" />
            <YAxis stroke="#8884d8" />
            <Tooltip contentStyle={{ backgroundColor: '#1e1e2f', borderColor: '#444' }} itemStyle={{ color: '#00ff88' }} />
            <Bar dataKey="valor" fill="#00ff88" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* BARRA DE BUSCA */}
      <div style={{ marginBottom: '20px' }}>
        <input 
          type="text" 
          placeholder="Buscar por pedaço do Hash..." 
          value={termoBusca}
          onChange={(e) => setTermoBusca(e.target.value)}
          style={{
            width: '100%', padding: '15px', borderRadius: '8px', border: 'none',
            backgroundColor: '#2a2a40', color: '#fff', fontSize: '16px', outline: 'none', boxSizing: 'border-box'
          }}
        />
      </div>

      {/* TABELA DE DADOS */}
      <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '2px solid #444' }}>
            <th style={{ padding: '10px' }}>Data/Hora</th>
            <th style={{ padding: '10px' }}>Valor (BTC)</th>
            <th style={{ padding: '10px' }}>Hash da Transação</th>
          </tr>
        </thead>
        <tbody>
          {baleias.map((baleia, index) => (
            <tr key={index} style={{ borderBottom: '1px solid #333' }}>
              <td style={{ padding: '10px' }}>{new Date(baleia.data_hora).toLocaleString('pt-BR')}</td>
              <td style={{ padding: '10px', color: '#00ff88', fontWeight: 'bold' }}>{baleia.valor_btc.toFixed(2)} ₿</td>
              <td style={{ padding: '10px', fontSize: '0.8em', color: '#aaa' }}>{baleia.hash}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default App;