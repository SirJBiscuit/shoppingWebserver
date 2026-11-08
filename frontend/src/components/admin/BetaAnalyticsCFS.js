import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Users, Bug, Package, Store, DollarSign, MapPin, TrendingUp, Star,
  Download, FileText, Calendar, Activity, Award, Target, Zap, Globe
} from 'lucide-react';
import api from '../../services/api';

const BetaAnalyticsCFS = ({ config = {}, isEditing = false, onConfigChange }) => {
  const [stats, setStats] = useState(null);
  const [mdlImpact, setMdlImpact] = useState(null);
  const [betaTesters, setBetaTesters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('7d'); // 7d, 30d, 90d, all

  // Default configuration
  const defaultConfig = {
    showOverviewStats: true,
    showMDLImpact: true,
    showBetaTesters: true,
    showGeographic: true,
    showTimeline: true,
    showValuableData: true,
    showPredictions: true,
    showExports: true,
    theme: 'default',
    layout: 'grid',
    ...config
  };

  useEffect(() => {
    if (!isEditing) {
      fetchAnalytics();
    }
  }, [timeRange, isEditing]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const [statsResponse, testersResponse, mdlResponse] = await Promise.all([
        api.get('/beta/admin/stats/overview'),
        api.get('/beta/admin/testers'),
        api.get('/beta/admin/stats/mdl-impact').catch(() => ({ data: null }))
      ]);
      setStats(statsResponse.data);
      setBetaTesters(testersResponse.data);
      setMdlImpact(mdlResponse.data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const downloadFile = (filename, content, mime = 'text/csv') => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    setLastExport(new Date());
  };

  const toCsv = (rows) => {
    if (!rows.length) return '';
    const headers = Object.keys(rows[0]);
    const esc = (v) => {
      const s = v == null ? '' : String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    return [headers.join(','), ...rows.map(r => headers.map(h => esc(r[h])).join(','))].join('\n');
  };

  const exportBetaData = () => {
    downloadFile('beta-testers.csv', toCsv(betaTesters.map(t => ({
      id: t.id, username: t.beta_username, display_name: t.display_name,
      country: t.country, state: t.state, beta_code: t.beta_code,
      items_added: t.items_added, aisles_reported: t.aisles_reported,
      feedback_count: t.feedback_count, suspended: t.suspended,
      registered_at: t.registered_at, last_active: t.last_active
    }))));
  };

  const exportMdlData = () => {
    downloadFile('mdl-impact.json', JSON.stringify(mdlImpact, null, 2), 'application/json');
  };

  const exportFeedbackSummary = async () => {
    try {
      const res = await api.get('/beta/feedback/admin/all');
      downloadFile('beta-feedback.csv', toCsv(res.data.map(f => ({
        id: f.id, type: f.type, title: f.title, severity: f.severity,
        status: f.status, rating: f.rating, username: f.username,
        tester: f.tester_display_name, created_at: f.created_at
      }))));
    } catch (e) {
      console.error('Export feedback failed:', e);
    }
  };

  const [lastExport, setLastExport] = useState(null);

  const calculateDataQuality = (tester) => {
    // Simple quality score calculation
    const itemScore = Math.min(tester.items_added || 0, 100);
    const aisleScore = Math.min((tester.aisles_reported || 0) * 2, 100);
    const feedbackScore = Math.min((tester.feedback_count || 0) * 5, 100);
    const activityScore = tester.last_active ? 100 : 50;
    
    return Math.round((itemScore + aisleScore + feedbackScore + activityScore) / 4);
  };

  const StatCard = ({ icon: Icon, label, value, subtext, color = 'primary' }) => (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className={`bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg border-l-4 border-${color}-500`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{label}</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">{value}</p>
          {subtext && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{subtext}</p>
          )}
        </div>
        <div className={`p-3 bg-${color}-100 dark:bg-${color}-900/30 rounded-lg`}>
          <Icon className={`w-8 h-8 text-${color}-600 dark:text-${color}-400`} />
        </div>
      </div>
    </motion.div>
  );

  const ProgressBar = ({ label, current, total, accuracy, color = 'purple' }) => {
    const percentage = Math.round((current / total) * 100);
    
    return (
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</span>
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {current} / {total} {accuracy && `• ${accuracy}% accuracy`}
          </span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
          <div
            className={`bg-${color}-600 h-3 rounded-full transition-all duration-500`}
            style={{ width: `${percentage}%` }}
          />
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{percentage}% coverage</p>
      </div>
    );
  };

  if (isEditing) {
    return (
      <div className="p-8 bg-gradient-to-br from-purple-50 to-blue-50 dark:from-gray-800 dark:to-gray-900 rounded-2xl border-2 border-dashed border-purple-300 dark:border-purple-700">
        <div className="text-center">
          <Activity className="w-16 h-16 text-purple-600 dark:text-purple-400 mx-auto mb-4" />
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Beta Analytics Dashboard
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Comprehensive analytics for beta tester data and MDL system impact
          </p>
          <div className="flex flex-wrap gap-2 justify-center">
            <span className="px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full text-sm">
              Overview Stats
            </span>
            <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-sm">
              MDL Impact
            </span>
            <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full text-sm">
              Beta Testers
            </span>
            <span className="px-3 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 rounded-full text-sm">
              Data Quality
            </span>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 bg-gray-50 dark:bg-gray-900 rounded-2xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <Activity className="w-8 h-8 text-purple-600" />
            Beta Analytics Dashboard
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Real-time insights into beta tester contributions and MDL system impact
          </p>
        </div>
        
        {/* Time Range Selector */}
        <div className="flex gap-2">
          {['7d', '30d', '90d', 'all'].map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                timeRange === range
                  ? 'bg-purple-600 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              {range === 'all' ? 'All Time' : range.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Overview Stats */}
      {defaultConfig.showOverviewStats && stats && (
        <div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Overview</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              icon={Users}
              label="Beta Testers"
              value={stats.total_testers || 0}
              subtext={`${stats.active_last_week || 0} active this week`}
              color="purple"
            />
            <StatCard
              icon={Bug}
              label="Feedback Received"
              value={stats.total_feedback || 0}
              subtext={`${stats.bug_critical || 0} bugs · ${stats.feature_requests || 0} feature requests`}
              color="red"
            />
            <StatCard
              icon={Package}
              label="Items Tracked"
              value={mdlImpact?.itemsCovered ?? 0}
              subtext="Unique items in MDL"
              color="blue"
            />
            <StatCard
              icon={Store}
              label="Stores Mapped"
              value={mdlImpact?.storesCovered ?? 0}
              subtext="Store locations identified"
              color="green"
            />
            <StatCard
              icon={DollarSign}
              label="Prices Learned"
              value={mdlImpact?.pricePoints ?? 0}
              subtext="Price data points"
              color="yellow"
            />
            <StatCard
              icon={MapPin}
              label="Aisles Reported"
              value={mdlImpact?.aisleReports ?? 0}
              subtext="Aisle mappings"
              color="orange"
            />
            <StatCard
              icon={Star}
              label="Beta Codes"
              value={stats.active_codes || 0}
              subtext={`${stats.total_code_uses || 0} total uses`}
              color="purple"
            />
            <StatCard
              icon={TrendingUp}
              label="Growth"
              value={`${stats.growth_pct >= 0 ? '+' : ''}${stats.growth_pct || 0}%`}
              subtext="New testers this week"
              color="green"
            />
          </div>
        </div>
      )}

      {/* MDL Impact Metrics */}
      {defaultConfig.showMDLImpact && mdlImpact && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
          <div className="flex items-center gap-3 mb-6">
            <Zap className="w-6 h-6 text-purple-600" />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
              MDL System Impact
            </h3>
          </div>
          
          <div className="space-y-4">
            <ProgressBar
              label="Item Name Learning"
              current={mdlImpact.itemsCovered}
              total={mdlImpact.itemsTotal}
              color="purple"
            />
            <ProgressBar
              label="Price Predictions"
              current={mdlImpact.pricesCovered}
              total={mdlImpact.pricesTotal}
              accuracy={mdlImpact.priceAccuracy}
              color="blue"
            />
            <ProgressBar
              label="Aisle Predictions"
              current={mdlImpact.aislesCovered}
              total={mdlImpact.aislesTotal}
              accuracy={mdlImpact.aisleAccuracy}
              color="green"
            />
            <ProgressBar
              label="Store Locations"
              current={mdlImpact.storesCovered}
              total={mdlImpact.storesTotal}
              color="orange"
            />
          </div>
        </div>
      )}

      {/* Beta Tester Contributions */}
      {defaultConfig.showBetaTesters && betaTesters.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
          <div className="flex items-center gap-3 mb-6">
            <Award className="w-6 h-6 text-purple-600" />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
              Beta Tester Contributions
            </h3>
          </div>
          
          <div className="space-y-4">
            {betaTesters.slice(0, 5).map((tester) => {
              const qualityScore = calculateDataQuality(tester);
              const stars = Math.round(qualityScore / 20);
              
              return (
                <div
                  key={tester.id}
                  className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="font-semibold text-gray-900 dark:text-white">
                        {tester.display_name || tester.beta_username}
                      </h4>
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        ({tester.state})
                      </span>
                      <div className="flex">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`w-4 h-4 ${
                              i < stars
                                ? 'text-yellow-500 fill-yellow-500'
                                : 'text-gray-300 dark:text-gray-600'
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-sm font-medium text-purple-600 dark:text-purple-400">
                        {qualityScore}% Quality
                      </span>
                    </div>
                    <div className="flex gap-4 text-sm text-gray-600 dark:text-gray-400">
                      <span>📦 {tester.items_added || 0} items</span>
                      <span>🗺️ {tester.aisles_reported || 0} aisles</span>
                      <span>💬 {tester.feedback_count || 0} feedback</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Geographic Distribution */}
      {defaultConfig.showGeographic && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
          <div className="flex items-center gap-3 mb-6">
            <Globe className="w-6 h-6 text-purple-600" />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
              Geographic Distribution
            </h3>
          </div>
          
          {(!stats?.topLocations || stats.topLocations.length === 0) && (
            <p className="text-sm text-gray-500 dark:text-gray-400">No tester locations yet.</p>
          )}
          <div className="grid grid-cols-2 gap-4">
            {stats?.topLocations?.map((location, index) => (
              <div
                key={index}
                className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-gray-900 dark:text-white">
                    {location.state}, {location.country}
                  </span>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {location.count} testers
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Predictive Insights — computed from real coverage numbers */}
      {defaultConfig.showPredictions && mdlImpact && (
        <div className="bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-xl p-6 border border-purple-200 dark:border-purple-800">
          <div className="flex items-center gap-3 mb-6">
            <Target className="w-6 h-6 text-purple-600" />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
              Coverage Insights
            </h3>
          </div>
          
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                With Current Data:
              </h4>
              <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  {mdlImpact.itemsCovered} items learned in MDL
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  Price data for {mdlImpact.pricesCovered} items ({mdlImpact.priceAccuracy}% coverage)
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  Aisle data for {mdlImpact.aislesCovered} items ({mdlImpact.aisleAccuracy}% coverage)
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  {mdlImpact.storesCovered} store locations mapped
                </li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                Needed for 90% Coverage:
              </h4>
              <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                <li>• {Math.max(0, Math.ceil(mdlImpact.itemsTotal * 0.9) - mdlImpact.pricesCovered)} more price data points</li>
                <li>• {Math.max(0, Math.ceil(mdlImpact.itemsTotal * 0.9) - mdlImpact.aislesCovered)} more aisle reports</li>
                <li>• {stats?.total_testers || 0} testers currently contributing</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Export Options */}
      {defaultConfig.showExports && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
          <div className="flex items-center gap-3 mb-6">
            <Download className="w-6 h-6 text-purple-600" />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
              Export Options
            </h3>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <button
              onClick={exportBetaData}
              className="flex items-center gap-2 px-4 py-3 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-lg hover:bg-purple-200 dark:hover:bg-purple-900/50 transition-colors"
            >
              <FileText className="w-5 h-5" />
              Export Beta Testers (CSV)
            </button>
            <button
              onClick={exportMdlData}
              className="flex items-center gap-2 px-4 py-3 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
            >
              <FileText className="w-5 h-5" />
              Export MDL Impact (JSON)
            </button>
            <button
              onClick={exportFeedbackSummary}
              className="flex items-center gap-2 px-4 py-3 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 rounded-lg hover:bg-orange-200 dark:hover:bg-orange-900/50 transition-colors"
            >
              <FileText className="w-5 h-5" />
              Export Feedback (CSV)
            </button>
          </div>
          
          {lastExport && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-4 text-center">
              Last Export: {lastExport.toLocaleString()}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default BetaAnalyticsCFS;
