// src/App.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Bar } from 'react-chartjs-2';

function App() {
  const [transactions, setTransactions] = useState([]);
  const [search, setSearch] = useState('');
  const [month, setMonth] = useState('2'); // Default March
  const [page, setPage] = useState(1);
  const [stats, setStats] = useState({ totalSale: 0, totalItems: 0, notSold: 0 });
  const [chartData, setChartData] = useState({ labels: [], datasets: [] });

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  useEffect(() => {
    // Fetch Transactions
    axios.get(`/api/transactions?month=${month}&search=${search}&page=${page}`).then(res => {
      setTransactions(res.data.transactions);
    });

    // Fetch Statistics
    axios.get(`/api/statistics?month=${month}`).then(res => {
      setStats(res.data);
    });

    // Fetch Chart Data
    axios.get(`/api/chart-data?month=${month}`).then(res => {
      setChartData({
        labels: ['0-100', '100-200', '200-300', '300-400', '400-500', '500+'],
        datasets: [{
          label: 'Price Range',
          data: res.data.map(d => d.count),
          backgroundColor: 'rgba(75, 192, 192, 0.6)'
        }]
      });
    });
  }, [month, search, page]);

  return (
    <div>
      <h1>Transactions Dashboard</h1>
      
      {/* Month Dropdown */}
      <select value={month} onChange={e => setMonth(e.target.value)}>
        {months.map((m, i) => (
          <option key={i} value={i}>{m}</option>
        ))}
      </select>

      {/* Search Input */}
      <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search transactions..." />

      {/* Transaction Table */}
      <table>
        <thead>
          <tr>
            <th>Title</th>
            <th>Description</th>
            <th>Price</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map(transaction => (
            <tr key={transaction._id}>
              <td>{transaction.title}</td>
              <td>{transaction.description}</td>
              <td>{transaction.price}</td>
              <td>{new Date(transaction.date).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Pagination */}
      <button onClick={() => setPage(page - 1)} disabled={page === 1}>Previous</button>
      <button onClick={() => setPage(page + 1)}>Next</button>

      {/* Statistics */}
      <div>
        <h3>Statistics</h3>
        <p>Total Sale: ${stats.totalSale}</p>
        <p>Total Sold Items: {stats.totalItems}</p>
        <p>Total Not Sold Items: {stats.notSold}</p>
      </div>

      {/* Bar Chart */}
      <div>
        <Bar data={chartData} />
      </div>
    </div>
  );
}

export default App;
