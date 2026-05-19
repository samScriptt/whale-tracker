import { useState, useEffect } from 'react';
// Importando os pedaços que constroem o gráfico
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

function App() {
  const [baleias, setBaleias] = useState([]);

  useEffect(() => {
    const buscarDados = async () => {
      try {
        const resposta = await fetch('http://localhost:3000/api/baleias');
        const dados = await resposta.json();
        setBaleias(dados);
      } catch (erro) {
        console.error("Erro ao buscar dados:", erro);
      }
    };

    buscarDados();
    const intervalo = setInterval(buscarDados, 5000);
    return () => clearInterval(intervalo);
  }, []);

  // PREPARANDO OS DADOS PARA O GRÁFICO
  // O backend manda da baleia mais NOVA para a mais VELHA.
  // Para o gráfico fazer sentido (linha do tempo), precisamos inverter o array (reverse).
  // Também criamos um campo "hora" mais curto para ficar bonito no eixo X.
  const dadosGrafico = [...baleias].reverse().map(baleia => ({
    hora: new Date(baleia.data_hora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    valor: baleia.valor_btc
  }));

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif', backgroundColor: '#1e1e2f', color: '#fff', minHeight: '100vh' }}>
      <h2>🐋 Whale Tracker - Painel de Baleias ao vivo</h2>
      <p>Últimas movimentações acima de 5 BTC capturadas pelo Elasticsearch.</p>

      {/* ================= ÁREA DO GRÁFICO ================= */}
      <div style={{ width: '100%', height: 300, backgroundColor: '#2a2a40', padding: '20px', borderRadius: '8px', marginBottom: '30px' }}>
        <h3 style={{ marginTop: 0, color: '#aaa', fontSize: '16px' }}>Volume (BTC) por Transação</h3>
        
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={dadosGrafico}>
            <XAxis dataKey="hora" stroke="#8884d8" />
            <YAxis stroke="#8884d8" />
            {/* O Tooltip faz aparecer um balãozinho quando passamos o mouse por cima da barra */}
            <Tooltip 
              contentStyle={{ backgroundColor: '#1e1e2f', borderColor: '#444' }} 
              itemStyle={{ color: '#00ff88' }}
            />
            <Bar dataKey="valor" fill="#00ff88" radius={10} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      {/* =================================================== */}

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
              <td style={{ padding: '10px' }}>
                {new Date(baleia.data_hora).toLocaleString('pt-BR')}
              </td>
              <td style={{ padding: '10px', color: '#00ff88', fontWeight: 'bold' }}>
                {baleia.valor_btc.toFixed(2)} ₿
              </td>
              <td style={{ padding: '10px', fontSize: '0.8em', color: '#aaa' }}>
                {baleia.hash}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default App;