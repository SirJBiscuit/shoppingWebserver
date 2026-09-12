const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

// Get price history chart data for an item (like RuneScape Grand Exchange)
router.get('/item/:itemName/chart', async (req, res) => {
  const { itemName } = req.params;
  const { store_name, period = '30d' } = req.query;
  
  try {
    // Determine time range
    let interval;
    switch (period) {
      case '24h':
        interval = '24 hours';
        break;
      case '7d':
        interval = '7 days';
        break;
      case '30d':
        interval = '30 days';
        break;
      case '90d':
        interval = '90 days';
        break;
      case '1y':
        interval = '1 year';
        break;
      default:
        interval = '30 days';
    }
    
    let query = `
      SELECT 
        DATE_TRUNC('day', created_at) as date,
        AVG(price) as avg_price,
        MIN(price) as min_price,
        MAX(price) as max_price,
        COUNT(*) as sample_count
      FROM price_history
      WHERE item_name = $1
        AND created_at >= NOW() - INTERVAL '${interval}'
        AND status = 'active'
    `;
    
    const params = [itemName];
    
    if (store_name) {
      query += ` AND store_name = $2`;
      params.push(store_name);
    }
    
    query += ` GROUP BY DATE_TRUNC('day', created_at) ORDER BY date ASC`;
    
    const result = await db.query(query, params);
    
    // Calculate overall statistics
    const statsQuery = `
      SELECT 
        AVG(price) as overall_avg,
        MIN(price) as overall_min,
        MAX(price) as overall_max,
        STDDEV(price) as price_stddev,
        COUNT(*) as total_entries
      FROM price_history
      WHERE item_name = $1
        AND created_at >= NOW() - INTERVAL '${interval}'
        AND status = 'active'
        ${store_name ? 'AND store_name = $2' : ''}
    `;
    
    const statsResult = await db.query(statsQuery, params);
    
    res.json({
      item_name: itemName,
      store_name: store_name || 'All Stores',
      period,
      chart_data: result.rows,
      statistics: statsResult.rows[0]
    });
  } catch (error) {
    console.error('Error fetching price chart:', error);
    res.status(500).json({ error: 'Failed to fetch price chart' });
  }
});

// Get price trend analysis (increase/decrease patterns)
router.get('/item/:itemName/trends', async (req, res) => {
  const { itemName } = req.params;
  const { store_name } = req.query;
  
  try {
    const params = [itemName];
    let storeCondition = '';
    
    if (store_name) {
      storeCondition = 'AND store_name = $2';
      params.push(store_name);
    }
    
    // Get trends by day of week
    const dayTrendsQuery = `
      SELECT 
        day_of_week,
        CASE day_of_week
          WHEN 0 THEN 'Sunday'
          WHEN 1 THEN 'Monday'
          WHEN 2 THEN 'Tuesday'
          WHEN 3 THEN 'Wednesday'
          WHEN 4 THEN 'Thursday'
          WHEN 5 THEN 'Friday'
          WHEN 6 THEN 'Saturday'
        END as day_name,
        AVG(price) as avg_price,
        MIN(price) as min_price,
        MAX(price) as max_price,
        COUNT(*) as sample_count,
        STDDEV(price) as price_stddev
      FROM price_history
      WHERE item_name = $1 ${storeCondition}
        AND status = 'active'
        AND created_at >= NOW() - INTERVAL '90 days'
      GROUP BY day_of_week
      ORDER BY avg_price ASC
    `;
    
    const dayTrends = await db.query(dayTrendsQuery, params);
    
    // Get trends by week of month
    const weekTrendsQuery = `
      SELECT 
        EXTRACT(WEEK FROM created_at) - EXTRACT(WEEK FROM DATE_TRUNC('month', created_at)) + 1 as week_of_month,
        AVG(price) as avg_price,
        COUNT(*) as sample_count
      FROM price_history
      WHERE item_name = $1 ${storeCondition}
        AND status = 'active'
        AND created_at >= NOW() - INTERVAL '90 days'
      GROUP BY week_of_month
      ORDER BY avg_price ASC
    `;
    
    const weekTrends = await db.query(weekTrendsQuery, params);
    
    // Get recent trend (last 7 days vs previous 7 days)
    const recentTrendQuery = `
      SELECT 
        (SELECT AVG(price) FROM price_history 
         WHERE item_name = $1 ${storeCondition}
         AND created_at >= NOW() - INTERVAL '7 days'
         AND status = 'active') as last_7d_avg,
        (SELECT AVG(price) FROM price_history 
         WHERE item_name = $1 ${storeCondition}
         AND created_at >= NOW() - INTERVAL '14 days'
         AND created_at < NOW() - INTERVAL '7 days'
         AND status = 'active') as prev_7d_avg
    `;
    
    const recentTrend = await db.query(recentTrendQuery, params);
    
    const last7d = parseFloat(recentTrend.rows[0].last_7d_avg) || 0;
    const prev7d = parseFloat(recentTrend.rows[0].prev_7d_avg) || 0;
    const change = last7d - prev7d;
    const changePercent = prev7d > 0 ? (change / prev7d) * 100 : 0;
    
    // Determine best day and potential savings
    const bestDay = dayTrends.rows[0];
    const worstDay = dayTrends.rows[dayTrends.rows.length - 1];
    const potentialSavings = worstDay ? parseFloat(worstDay.avg_price) - parseFloat(bestDay.avg_price) : 0;
    
    res.json({
      item_name: itemName,
      store_name: store_name || 'All Stores',
      day_of_week_trends: dayTrends.rows,
      week_of_month_trends: weekTrends.rows,
      recent_trend: {
        last_7d_avg: last7d,
        prev_7d_avg: prev7d,
        change: change,
        change_percent: changePercent,
        direction: changePercent > 2 ? 'increasing' : changePercent < -2 ? 'decreasing' : 'stable'
      },
      recommendations: {
        best_day_to_buy: bestDay ? {
          day: bestDay.day_name,
          avg_price: parseFloat(bestDay.avg_price),
          sample_count: bestDay.sample_count
        } : null,
        worst_day_to_buy: worstDay ? {
          day: worstDay.day_name,
          avg_price: parseFloat(worstDay.avg_price)
        } : null,
        potential_savings_per_item: potentialSavings,
        confidence: bestDay && bestDay.sample_count >= 5 ? 'high' : 'low'
      }
    });
  } catch (error) {
    console.error('Error fetching price trends:', error);
    res.status(500).json({ error: 'Failed to fetch price trends' });
  }
});

// Get shopping recommendations (best days to shop)
router.get('/recommendations', async (req, res) => {
  try {
    // Get user's frequently bought items
    const frequentItemsQuery = `
      SELECT 
        sli.item_name,
        COUNT(*) as purchase_count,
        AVG(sli.price) as avg_price_paid
      FROM shopping_list_items sli
      JOIN shopping_lists sl ON sli.list_id = sl.id
      WHERE sl.user_id = $1
        AND sli.is_checked = true
        AND sl.created_at >= NOW() - INTERVAL '90 days'
      GROUP BY sli.item_name
      HAVING COUNT(*) >= 3
      ORDER BY purchase_count DESC
      LIMIT 20
    `;
    
    const frequentItems = await db.query(frequentItemsQuery, [req.user.id]);
    
    const recommendations = [];
    
    for (const item of frequentItems.rows) {
      // Get best day to buy for this item
      const trendQuery = `
        SELECT 
          day_of_week,
          CASE day_of_week
            WHEN 0 THEN 'Sunday'
            WHEN 1 THEN 'Monday'
            WHEN 2 THEN 'Tuesday'
            WHEN 3 THEN 'Wednesday'
            WHEN 4 THEN 'Thursday'
            WHEN 5 THEN 'Friday'
            WHEN 6 THEN 'Saturday'
          END as day_name,
          AVG(price) as avg_price,
          COUNT(*) as sample_count
        FROM price_history
        WHERE item_name = $1
          AND status = 'active'
          AND created_at >= NOW() - INTERVAL '90 days'
        GROUP BY day_of_week
        HAVING COUNT(*) >= 3
        ORDER BY avg_price ASC
        LIMIT 1
      `;
      
      const trend = await db.query(trendQuery, [item.item_name]);
      
      if (trend.rows.length > 0) {
        const bestDay = trend.rows[0];
        const savings = parseFloat(item.avg_price_paid) - parseFloat(bestDay.avg_price);
        
        if (savings > 0.10) { // At least 10 cents savings
          recommendations.push({
            item_name: item.item_name,
            current_avg_price: parseFloat(item.avg_price_paid),
            best_day: bestDay.day_name,
            best_day_price: parseFloat(bestDay.avg_price),
            potential_savings: savings,
            confidence: bestDay.sample_count >= 5 ? 'high' : 'medium'
          });
        }
      }
    }
    
    // Sort by potential savings
    recommendations.sort((a, b) => b.potential_savings - a.potential_savings);
    
    // Calculate total potential savings
    const totalSavings = recommendations.reduce((sum, rec) => sum + rec.potential_savings, 0);
    
    res.json({
      recommendations,
      total_potential_savings: totalSavings,
      summary: {
        items_analyzed: frequentItems.rows.length,
        items_with_savings: recommendations.length,
        avg_savings_per_item: recommendations.length > 0 ? totalSavings / recommendations.length : 0
      }
    });
  } catch (error) {
    console.error('Error fetching recommendations:', error);
    res.status(500).json({ error: 'Failed to fetch recommendations' });
  }
});

// Get price comparison across stores
router.get('/item/:itemName/store-comparison', async (req, res) => {
  const { itemName } = req.params;
  
  try {
    const query = `
      SELECT 
        store_name,
        AVG(price) as avg_price,
        MIN(price) as min_price,
        MAX(price) as max_price,
        COUNT(*) as sample_count,
        MAX(created_at) as last_updated
      FROM price_history
      WHERE item_name = $1
        AND status = 'active'
        AND created_at >= NOW() - INTERVAL '90 days'
      GROUP BY store_name
      ORDER BY avg_price ASC
    `;
    
    const result = await db.query(query, [itemName]);
    
    if (result.rows.length === 0) {
      return res.json({
        item_name: itemName,
        stores: [],
        message: 'No price data available for this item'
      });
    }
    
    const cheapestStore = result.rows[0];
    const mostExpensiveStore = result.rows[result.rows.length - 1];
    const maxSavings = parseFloat(mostExpensiveStore.avg_price) - parseFloat(cheapestStore.avg_price);
    
    res.json({
      item_name: itemName,
      stores: result.rows.map(row => ({
        store_name: row.store_name,
        avg_price: parseFloat(row.avg_price),
        min_price: parseFloat(row.min_price),
        max_price: parseFloat(row.max_price),
        sample_count: row.sample_count,
        last_updated: row.last_updated
      })),
      comparison: {
        cheapest_store: cheapestStore.store_name,
        cheapest_price: parseFloat(cheapestStore.avg_price),
        most_expensive_store: mostExpensiveStore.store_name,
        most_expensive_price: parseFloat(mostExpensiveStore.avg_price),
        max_savings: maxSavings,
        savings_percent: (maxSavings / parseFloat(mostExpensiveStore.avg_price)) * 100
      }
    });
  } catch (error) {
    console.error('Error fetching store comparison:', error);
    res.status(500).json({ error: 'Failed to fetch store comparison' });
  }
});

// Get price volatility (how much prices fluctuate)
router.get('/item/:itemName/volatility', async (req, res) => {
  const { itemName } = req.params;
  const { store_name } = req.query;
  
  try {
    const params = [itemName];
    let storeCondition = '';
    
    if (store_name) {
      storeCondition = 'AND store_name = $2';
      params.push(store_name);
    }
    
    const query = `
      SELECT 
        AVG(price) as avg_price,
        STDDEV(price) as price_stddev,
        MIN(price) as min_price,
        MAX(price) as max_price,
        (MAX(price) - MIN(price)) as price_range,
        COUNT(*) as sample_count,
        (STDDEV(price) / AVG(price) * 100) as coefficient_of_variation
      FROM price_history
      WHERE item_name = $1 ${storeCondition}
        AND status = 'active'
        AND created_at >= NOW() - INTERVAL '90 days'
    `;
    
    const result = await db.query(query, params);
    const stats = result.rows[0];
    
    // Determine volatility level
    const cv = parseFloat(stats.coefficient_of_variation) || 0;
    let volatility_level;
    let recommendation;
    
    if (cv < 5) {
      volatility_level = 'very_stable';
      recommendation = 'Price is very stable. Buy anytime.';
    } else if (cv < 10) {
      volatility_level = 'stable';
      recommendation = 'Price is fairly stable. Minor savings possible by timing purchase.';
    } else if (cv < 20) {
      volatility_level = 'moderate';
      recommendation = 'Price varies moderately. Check trends for best day to buy.';
    } else if (cv < 30) {
      volatility_level = 'volatile';
      recommendation = 'Price is quite volatile. Significant savings possible by timing purchase.';
    } else {
      volatility_level = 'highly_volatile';
      recommendation = 'Price is highly volatile. Wait for price drops or check multiple stores.';
    }
    
    res.json({
      item_name: itemName,
      store_name: store_name || 'All Stores',
      volatility: {
        level: volatility_level,
        coefficient_of_variation: cv,
        avg_price: parseFloat(stats.avg_price),
        price_stddev: parseFloat(stats.price_stddev),
        min_price: parseFloat(stats.min_price),
        max_price: parseFloat(stats.max_price),
        price_range: parseFloat(stats.price_range),
        sample_count: stats.sample_count
      },
      recommendation
    });
  } catch (error) {
    console.error('Error fetching volatility:', error);
    res.status(500).json({ error: 'Failed to fetch volatility data' });
  }
});

// Get "Grand Exchange" style summary for dashboard
router.get('/dashboard', async (req, res) => {
  try {
    // Get top trending items (biggest price changes)
    const trendingQuery = `
      SELECT 
        item_name,
        (SELECT AVG(price) FROM price_history ph2 
         WHERE ph2.item_name = ph.item_name 
         AND ph2.created_at >= NOW() - INTERVAL '7 days'
         AND ph2.status = 'active') as current_avg,
        (SELECT AVG(price) FROM price_history ph2 
         WHERE ph2.item_name = ph.item_name 
         AND ph2.created_at >= NOW() - INTERVAL '14 days'
         AND ph2.created_at < NOW() - INTERVAL '7 days'
         AND ph2.status = 'active') as previous_avg
      FROM price_history ph
      WHERE status = 'active'
        AND created_at >= NOW() - INTERVAL '14 days'
      GROUP BY item_name
      HAVING COUNT(*) >= 5
      LIMIT 100
    `;
    
    const trending = await db.query(trendingQuery);
    
    const trendingItems = trending.rows
      .map(row => {
        const current = parseFloat(row.current_avg) || 0;
        const previous = parseFloat(row.previous_avg) || 0;
        const change = current - previous;
        const changePercent = previous > 0 ? (change / previous) * 100 : 0;
        
        return {
          item_name: row.item_name,
          current_price: current,
          previous_price: previous,
          change: change,
          change_percent: changePercent,
          trend: changePercent > 2 ? 'up' : changePercent < -2 ? 'down' : 'stable'
        };
      })
      .filter(item => Math.abs(item.change_percent) > 2)
      .sort((a, b) => Math.abs(b.change_percent) - Math.abs(a.change_percent))
      .slice(0, 10);
    
    res.json({
      trending_items: trendingItems,
      summary: {
        items_tracked: trending.rows.length,
        price_increases: trendingItems.filter(i => i.trend === 'up').length,
        price_decreases: trendingItems.filter(i => i.trend === 'down').length
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

module.exports = router;
