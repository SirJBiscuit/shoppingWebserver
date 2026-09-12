import React, { useState, useEffect } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const PriceChart = ({ itemName, storeName = null, showControls = true }) => {
  const [period, setPeriod] = useState('30d');
  const [chartData, setChartData] = useState(null);
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchChartData();
  }, [itemName, storeName, period]);

  const fetchChartData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const storeParam = storeName ? `&store_name=${encodeURIComponent(storeName)}` : '';
      const response = await fetch(
        `/api/price-trends/item/${encodeURIComponent(itemName)}/chart?period=${period}${storeParam}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );

      if (!response.ok) throw new Error('Failed to fetch chart data');

      const data = await response.json();
      
      if (data.chart_data.length === 0) {
        setError('No price data available for this period');
        setLoading(false);
        return;
      }

      setStatistics(data.statistics);
      
      const labels = data.chart_data.map(d => {
        const date = new Date(d.date);
        if (period === '24h') {
          return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
        } else if (period === '1y') {
          return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        } else {
          return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        }
      });

      const avgPrices = data.chart_data.map(d => parseFloat(d.avg_price));
      const minPrices = data.chart_data.map(d => parseFloat(d.min_price));
      const maxPrices = data.chart_data.map(d => parseFloat(d.max_price));

      setChartData({
        labels,
        datasets: [
          {
            label: 'Average Price',
            data: avgPrices,
            borderColor: 'rgb(59, 130, 246)',
            backgroundColor: 'rgba(59, 130, 246, 0.1)',
            fill: true,
            tension: 0.4,
            pointRadius: 3,
            pointHoverRadius: 6,
          },
          {
            label: 'Min Price',
            data: minPrices,
            borderColor: 'rgb(34, 197, 94)',
            backgroundColor: 'rgba(34, 197, 94, 0.05)',
            borderDash: [5, 5],
            fill: false,
            tension: 0.4,
            pointRadius: 2,
            pointHoverRadius: 5,
          },
          {
            label: 'Max Price',
            data: maxPrices,
            borderColor: 'rgb(239, 68, 68)',
            backgroundColor: 'rgba(239, 68, 68, 0.05)',
            borderDash: [5, 5],
            fill: false,
            tension: 0.4,
            pointRadius: 2,
            pointHoverRadius: 5,
          }
        ]
      });

      setLoading(false);
    } catch (err) {
      console.error('Error fetching chart data:', err);
      setError(err.message);
      setLoading(false);
    }
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          usePointStyle: true,
          padding: 15,
          font: {
            size: 12
          }
        }
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        callbacks: {
          label: function(context) {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            label += '$' + parseFloat(context.parsed.y).toFixed(2);
            return label;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: false,
        ticks: {
          callback: function(value) {
            return '$' + value.toFixed(2);
          }
        }
      }
    },
    interaction: {
      mode: 'nearest',
      axis: 'x',
      intersect: false
    }
  };

  const getTrendIcon = () => {
    if (!statistics) return null;
    
    const current = parseFloat(statistics.overall_avg);
    const min = parseFloat(statistics.overall_min);
    const max = parseFloat(statistics.overall_max);
    const range = max - min;
    
    if (range === 0) return <Minus className="w-5 h-5 text-gray-500" />;
    
    const position = (current - min) / range;
    
    if (position > 0.6) {
      return <TrendingUp className="w-5 h-5 text-red-500" />;
    } else if (position < 0.4) {
      return <TrendingDown className="w-5 h-5 text-green-500" />;
    } else {
      return <Minus className="w-5 h-5 text-yellow-500" />;
    }
  };

  const periodOptions = [
    { value: '24h', label: '24 Hours' },
    { value: '7d', label: '7 Days' },
    { value: '30d', label: '30 Days' },
    { value: '90d', label: '90 Days' },
    { value: '1y', label: '1 Year' }
  ];

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="text-center text-gray-500">
          <p className="text-lg font-semibold mb-2">No Price Data</p>
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            {getTrendIcon()}
            {itemName}
          </h3>
          {storeName && (
            <p className="text-sm text-gray-500 mt-1">at {storeName}</p>
          )}
        </div>
        
        {showControls && (
          <div className="flex gap-2">
            {periodOptions.map(opt => (
              <button
                key={opt.value}
                onClick={() => setPeriod(opt.value)}
                className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                  period === opt.value
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {statistics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-blue-50 rounded-lg p-3">
            <p className="text-xs text-gray-600 mb-1">Average</p>
            <p className="text-2xl font-bold text-blue-600">
              ${parseFloat(statistics.overall_avg).toFixed(2)}
            </p>
          </div>
          <div className="bg-green-50 rounded-lg p-3">
            <p className="text-xs text-gray-600 mb-1">Lowest</p>
            <p className="text-2xl font-bold text-green-600">
              ${parseFloat(statistics.overall_min).toFixed(2)}
            </p>
          </div>
          <div className="bg-red-50 rounded-lg p-3">
            <p className="text-xs text-gray-600 mb-1">Highest</p>
            <p className="text-2xl font-bold text-red-600">
              ${parseFloat(statistics.overall_max).toFixed(2)}
            </p>
          </div>
          <div className="bg-purple-50 rounded-lg p-3">
            <p className="text-xs text-gray-600 mb-1">Data Points</p>
            <p className="text-2xl font-bold text-purple-600">
              {statistics.total_entries}
            </p>
          </div>
        </div>
      )}

      <div style={{ height: '300px' }}>
        {chartData && <Line data={chartData} options={options} />}
      </div>
    </div>
  );
};

export default PriceChart;
