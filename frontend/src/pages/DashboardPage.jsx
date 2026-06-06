import React, { useState, useEffect } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line, Doughnut } from 'react-chartjs-2';
import { Download } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, ArcElement, Tooltip, Legend);

const DashboardPage = ({ user }) => {
  const { isDark } = useTheme();
  const [salesReport, setSalesReport] = useState(null);
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [period, setPeriod] = useState('monthly');

  const userId = user?.email || 'demo@user.com';

  useEffect(() => {
    fetch(`/api/reports/sales?period=${period}&user_id=${userId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then(setSalesReport)
      .catch(() => setSalesReport(null));
  }, [period, userId]);

  useEffect(() => {
    fetch(`/api/orders?user_id=${userId}`)
      .then((r) => (r.ok ? r.json() : []))
      .then(setOrders)
      .catch(() => setOrders([]));
  }, [userId]);

  useEffect(() => {
    fetch(`/api/products?user_id=${userId}`)
      .then((r) => (r.ok ? r.json() : []))
      .then(setProducts)
      .catch(() => setProducts([]));
  }, [userId]);

  const totalInventory = products.reduce((s, p) => s + (p.stock || 0), 0);
  const pendingCount = orders.filter((o) => o.status === 'pending').length;
  const completedCount = orders.filter((o) => o.status === 'completed').length;

  const lineData = {
    labels: salesReport?.records?.slice(0, 7).map((r) => new Date(r.created_at).toLocaleDateString('en-US', { weekday: 'short' })) || ['-'],
    datasets: [{
      label: 'Sales (₹)',
      data: salesReport?.records?.slice(0, 7).map((r) => r.amount) || [0],
      borderColor: 'rgba(139, 92, 246, 1)',
      backgroundColor: 'rgba(139, 92, 246, 0.1)',
      fill: true,
      tension: 0.4,
      pointBackgroundColor: 'rgba(139, 92, 246, 1)',
    }],
  };

  const doughnutData = {
    labels: ['Completed', 'Shipped', 'Pending', 'Rejected'],
    datasets: [{
      data: [
        completedCount,
        orders.filter((o) => o.status === 'shipped').length,
        pendingCount,
        orders.filter((o) => o.status === 'rejected').length,
      ],
      backgroundColor: ['rgba(72, 187, 120, 0.8)', 'rgba(99, 102, 241, 0.8)', 'rgba(245, 158, 11, 0.8)', 'rgba(239, 68, 68, 0.8)'],
      borderColor: 'rgba(255,255,255,0.5)',
      borderWidth: 2,
      hoverOffset: 10,
    }],
  };

  const chartTextColor = 'rgba(45, 27, 78, 0.9)';
  const chartTextColorDark = 'rgba(232, 224, 245, 0.95)';
  const chartOptions = {
    responsive: true,
    plugins: {
      legend: { labels: { color: chartTextColor, font: { size: 12 } } },
    },
    scales: {
      x: {
        ticks: { color: chartTextColor, font: { size: 11 } },
        grid: { color: 'rgba(0,0,0,0.06)' },
      },
      y: {
        ticks: { color: chartTextColor, font: { size: 11 } },
        grid: { color: 'rgba(0,0,0,0.06)' },
      },
    },
  };
  const chartOptionsDark = {
    ...chartOptions,
    plugins: { legend: { labels: { color: chartTextColorDark } } },
    scales: {
      x: { ticks: { color: chartTextColorDark }, grid: { color: 'rgba(255,255,255,0.08)' } },
      y: { ticks: { color: chartTextColorDark }, grid: { color: 'rgba(255,255,255,0.08)' } },
    },
  };

  const handleDownload = () => {
    window.open(`/api/reports/sales/download?period=${period}&user_id=${userId}`, '_blank');
  };

  return (
    <div className="p-8 space-y-8">
      <div className="flex justify-between items-start flex-wrap gap-4">
        <div>
          <h1 className="text-4xl font-extrabold mb-2" style={{ color: 'var(--highlight)' }}>Dashboard</h1>
          <p className="opacity-80">Overview of your business performance</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="px-4 py-2 glass-input rounded-lg"
          >
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
          </select>
          <button
            onClick={handleDownload}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-white ${isDark ? 'bg-violet-950 hover:bg-violet-900 border border-violet-800' : ''}`}
            style={isDark ? {} : { background: 'var(--highlight)' }}
          >
            <Download size={18} /> Download Report
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="glass-panel p-6 rounded-xl text-center">
          <h3 className="text-sm font-bold mb-1 opacity-80">Total Sales ({period})</h3>
          <p className="text-3xl font-extrabold" style={{ color: 'var(--highlight)' }}>
            ₹{salesReport?.total_sales?.toFixed(2) || '0.00'}
          </p>
        </div>
        <div className="glass-panel p-6 rounded-xl text-center">
          <h3 className="text-sm font-bold mb-1 opacity-80">Pending Orders</h3>
          <p className="text-3xl font-extrabold text-amber-500">{pendingCount}</p>
        </div>
        <div className="glass-panel p-6 rounded-xl text-center">
          <h3 className="text-sm font-bold mb-1 opacity-80">Total Inventory</h3>
          <p className="text-3xl font-extrabold" style={{ color: totalInventory < 20 ? '#dc2626' : 'var(--highlight)' }}>
            {totalInventory}
          </p>
        </div>
        <div className="glass-panel p-6 rounded-xl text-center">
          <h3 className="text-sm font-bold mb-1 opacity-80">Completed Orders</h3>
          <p className="text-3xl font-extrabold text-green-500">{completedCount}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="glass-panel p-6 rounded-xl">
          <h3 className="text-lg font-bold mb-4" style={{ color: 'var(--highlight)' }}>Sales Trend</h3>
          <Line data={lineData} options={isDark ? chartOptionsDark : chartOptions} />
        </div>
        <div className="glass-panel p-6 rounded-xl flex justify-center">
          <div className="w-full max-w-md">
            <h3 className="text-lg font-bold mb-4 text-center" style={{ color: 'var(--highlight)' }}>Order Status</h3>
            <Doughnut
              data={doughnutData}
              options={{
                cutout: '70%',
                responsive: true,
                plugins: { legend: { labels: { color: isDark ? chartTextColorDark : chartTextColor } } },
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
