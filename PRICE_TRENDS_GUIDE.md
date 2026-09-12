# Price Trends & Analytics - Grand Exchange Style

## Overview
This system tracks price changes over time, similar to RuneScape's Grand Exchange, helping users save money by shopping on the best days and at the best stores.

## Features

### 📊 Price Charts
- View price history over 24 hours, 7 days, 30 days, 90 days, or 1 year
- See daily average, min, and max prices
- Track price trends and volatility

### 📈 Trend Analysis
- **Best Day to Buy**: Identifies which day of the week has the lowest prices
- **Price Changes**: Tracks if prices are increasing, decreasing, or stable
- **Volatility**: Shows how much prices fluctuate
- **Store Comparison**: Compare prices across different stores

### 💰 Smart Recommendations
- Automatically suggests best days to shop
- Calculates potential savings
- Alerts when prices drop
- Recommends which store to visit

---

## API Endpoints

### 1. Get Price Chart
```bash
GET /api/price-trends/item/:itemName/chart?period=30d&store_name=Walmart
```

**Parameters:**
- `period`: `24h`, `7d`, `30d`, `90d`, `1y` (default: `30d`)
- `store_name`: Optional - filter by specific store

**Response:**
```json
{
  "item_name": "Milk 1 Gallon",
  "store_name": "Walmart",
  "period": "30d",
  "chart_data": [
    {
      "date": "2026-09-01T00:00:00.000Z",
      "avg_price": "3.99",
      "min_price": "3.79",
      "max_price": "4.19",
      "sample_count": 12
    }
  ],
  "statistics": {
    "overall_avg": "3.95",
    "overall_min": "3.49",
    "overall_max": "4.49",
    "price_stddev": "0.25",
    "total_entries": 156
  }
}
```

### 2. Get Price Trends & Best Days
```bash
GET /api/price-trends/item/:itemName/trends?store_name=Walmart
```

**Response:**
```json
{
  "item_name": "Milk 1 Gallon",
  "store_name": "Walmart",
  "day_of_week_trends": [
    {
      "day_of_week": 2,
      "day_name": "Tuesday",
      "avg_price": "3.79",
      "min_price": "3.49",
      "max_price": "3.99",
      "sample_count": 25
    }
  ],
  "recent_trend": {
    "last_7d_avg": "3.89",
    "prev_7d_avg": "3.95",
    "change": -0.06,
    "change_percent": -1.52,
    "direction": "stable"
  },
  "recommendations": {
    "best_day_to_buy": {
      "day": "Tuesday",
      "avg_price": 3.79,
      "sample_count": 25
    },
    "worst_day_to_buy": {
      "day": "Saturday",
      "avg_price": 4.15
    },
    "potential_savings_per_item": 0.36,
    "confidence": "high"
  }
}
```

### 3. Get Shopping Recommendations
```bash
GET /api/price-trends/recommendations
```

Analyzes your frequently bought items and suggests best days to shop.

**Response:**
```json
{
  "recommendations": [
    {
      "item_name": "Milk 1 Gallon",
      "current_avg_price": 3.95,
      "best_day": "Tuesday",
      "best_day_price": 3.79,
      "potential_savings": 0.16,
      "confidence": "high"
    },
    {
      "item_name": "Bread",
      "current_avg_price": 2.50,
      "best_day": "Wednesday",
      "best_day_price": 2.29,
      "potential_savings": 0.21,
      "confidence": "high"
    }
  ],
  "total_potential_savings": 0.37,
  "summary": {
    "items_analyzed": 15,
    "items_with_savings": 8,
    "avg_savings_per_item": 0.046
  }
}
```

### 4. Store Comparison
```bash
GET /api/price-trends/item/:itemName/store-comparison
```

Compare prices across all stores.

**Response:**
```json
{
  "item_name": "Milk 1 Gallon",
  "stores": [
    {
      "store_name": "Walmart",
      "avg_price": 3.79,
      "min_price": 3.49,
      "max_price": 4.19,
      "sample_count": 45
    },
    {
      "store_name": "Target",
      "avg_price": 3.99,
      "min_price": 3.79,
      "max_price": 4.29,
      "sample_count": 32
    }
  ],
  "comparison": {
    "cheapest_store": "Walmart",
    "cheapest_price": 3.79,
    "most_expensive_store": "Whole Foods",
    "most_expensive_price": 5.49,
    "max_savings": 1.70,
    "savings_percent": 30.96
  }
}
```

### 5. Price Volatility
```bash
GET /api/price-trends/item/:itemName/volatility?store_name=Walmart
```

Shows how stable or volatile prices are.

**Response:**
```json
{
  "item_name": "Milk 1 Gallon",
  "store_name": "Walmart",
  "volatility": {
    "level": "stable",
    "coefficient_of_variation": 6.32,
    "avg_price": 3.95,
    "price_stddev": 0.25,
    "min_price": 3.49,
    "max_price": 4.49,
    "price_range": 1.00,
    "sample_count": 156
  },
  "recommendation": "Price is fairly stable. Minor savings possible by timing purchase."
}
```

### 6. Grand Exchange Dashboard
```bash
GET /api/price-trends/dashboard
```

Shows trending items (biggest price changes).

**Response:**
```json
{
  "trending_items": [
    {
      "item_name": "Strawberries",
      "current_price": 4.99,
      "previous_price": 3.49,
      "change": 1.50,
      "change_percent": 42.98,
      "trend": "up"
    },
    {
      "item_name": "Ground Beef",
      "current_price": 4.99,
      "previous_price": 5.99,
      "change": -1.00,
      "change_percent": -16.69,
      "trend": "down"
    }
  ],
  "summary": {
    "items_tracked": 245,
    "price_increases": 3,
    "price_decreases": 7
  }
}
```

---

## How It Works

### Data Collection
1. **Automatic**: Prices are saved when users:
   - Set a price and wait 3 seconds (auto-save)
   - Click "Save Price" button
   - Check off an item with a price

2. **Manual**: Admins can add price entries via training system

### Analysis
The system analyzes:
- **Day of Week**: Which days have lowest/highest prices
- **Week of Month**: First week vs last week pricing
- **Store Patterns**: Which stores are cheapest
- **Seasonal Trends**: Price changes over months
- **Volatility**: How much prices fluctuate

### Recommendations
Based on 90 days of data, the system:
- Identifies best day to shop (minimum 3 samples per day)
- Calculates potential savings
- Assigns confidence level (high/medium/low)
- Suggests alternative stores

---

## Frontend Integration

### Display Price Chart
```javascript
import { Line } from 'react-chartjs-2';

const PriceChart = ({ itemName }) => {
  const [chartData, setChartData] = useState(null);
  
  useEffect(() => {
    fetch(`/api/price-trends/item/${itemName}/chart?period=30d`)
      .then(res => res.json())
      .then(data => {
        setChartData({
          labels: data.chart_data.map(d => new Date(d.date).toLocaleDateString()),
          datasets: [{
            label: 'Average Price',
            data: data.chart_data.map(d => d.avg_price),
            borderColor: 'rgb(75, 192, 192)',
            tension: 0.1
          }]
        });
      });
  }, [itemName]);
  
  return chartData ? <Line data={chartData} /> : <div>Loading...</div>;
};
```

### Show Best Day Badge
```javascript
const BestDayBadge = ({ itemName }) => {
  const [bestDay, setBestDay] = useState(null);
  
  useEffect(() => {
    fetch(`/api/price-trends/item/${itemName}/trends`)
      .then(res => res.json())
      .then(data => setBestDay(data.recommendations.best_day_to_buy));
  }, [itemName]);
  
  if (!bestDay) return null;
  
  return (
    <div className="bg-green-100 px-3 py-1 rounded-full">
      💰 Best day: {bestDay.day} (${bestDay.avg_price})
      <span className="text-xs ml-2">
        Save ${(currentPrice - bestDay.avg_price).toFixed(2)}
      </span>
    </div>
  );
};
```

### Shopping Recommendations Widget
```javascript
const ShoppingRecommendations = () => {
  const [recs, setRecs] = useState([]);
  
  useEffect(() => {
    fetch('/api/price-trends/recommendations')
      .then(res => res.json())
      .then(data => setRecs(data.recommendations));
  }, []);
  
  return (
    <div className="bg-blue-50 p-4 rounded-lg">
      <h3 className="font-bold mb-2">💡 Smart Shopping Tips</h3>
      {recs.map(rec => (
        <div key={rec.item_name} className="mb-2">
          <span className="font-semibold">{rec.item_name}</span>
          <br />
          <span className="text-sm text-gray-600">
            Shop on {rec.best_day} and save ${rec.potential_savings.toFixed(2)}
          </span>
        </div>
      ))}
    </div>
  );
};
```

---

## Database Schema

### price_history (Enhanced)
```sql
- day_of_week: INTEGER (0-6, Sunday=0)
- week_of_year: INTEGER (1-52)
- month: INTEGER (1-12)
- year: INTEGER
```

### price_trends
```sql
- item_name: VARCHAR(255)
- store_name: VARCHAR(255)
- period_type: VARCHAR(20) -- 'hourly', 'daily', 'weekly', 'monthly'
- period_start: TIMESTAMP
- period_end: TIMESTAMP
- avg_price, min_price, max_price, median_price: DECIMAL
- sample_count: INTEGER
- price_variance, price_stddev: DECIMAL
- price_change, price_change_percent: DECIMAL
- trend_direction: VARCHAR(10) -- 'up', 'down', 'stable'
- best_day_to_buy, best_week_to_buy: INTEGER
```

### price_alerts
```sql
- user_id: INTEGER
- item_name: VARCHAR(255)
- alert_type: VARCHAR(20) -- 'price_drop', 'price_increase', 'threshold'
- threshold_price, threshold_percent: DECIMAL
- is_active: BOOLEAN
```

### shopping_recommendations
```sql
- user_id: INTEGER
- recommendation_type: VARCHAR(50)
- title, description: TEXT
- item_names: TEXT[]
- estimated_savings: DECIMAL
- recommended_date, recommended_day_of_week: DATE/INTEGER
```

---

## Admin Tasks

### Refresh Trends (Run Daily)
```sql
SELECT refresh_price_trends();
```

This function:
1. Refreshes the `item_price_summary` materialized view
2. Generates daily trend data for last 30 days
3. Calculates price changes and directions

### View Trending Items
```sql
SELECT * FROM item_price_summary
WHERE last_updated >= NOW() - INTERVAL '7 days'
ORDER BY (avg_price_last_7d - avg_price_prev_7d) DESC
LIMIT 10;
```

### Check Data Quality
```sql
-- Items with enough data for reliable trends
SELECT 
  item_name,
  total_entries,
  best_day_to_buy,
  CASE best_day_to_buy
    WHEN 0 THEN 'Sunday'
    WHEN 1 THEN 'Monday'
    WHEN 2 THEN 'Tuesday'
    WHEN 3 THEN 'Wednesday'
    WHEN 4 THEN 'Thursday'
    WHEN 5 THEN 'Friday'
    WHEN 6 THEN 'Saturday'
  END as best_day_name
FROM item_price_summary
WHERE total_entries >= 20
ORDER BY total_entries DESC;
```

---

## Use Cases

### 1. Weekly Shopper
"I shop every Saturday. Should I change my day?"
- Check recommendations endpoint
- See if Saturday is the worst day for your items
- Get suggested alternative day with potential savings

### 2. Budget Conscious
"I want to save as much as possible on groceries."
- View store comparison for each item
- Check volatility to see if waiting helps
- Follow best day recommendations

### 3. Seasonal Shopper
"When are strawberries cheapest?"
- View 1-year chart
- Identify seasonal patterns
- Set price alerts for drops

### 4. Store Comparison
"Which store should I shop at?"
- Compare prices across stores
- Factor in distance vs savings
- Check if certain items are always cheaper at specific stores

---

## Future Enhancements

- [ ] Price drop alerts (push notifications)
- [ ] Predictive pricing (ML model)
- [ ] Seasonal forecasting
- [ ] Bulk buying recommendations
- [ ] Coupon integration
- [ ] Recipe cost optimization
- [ ] Budget tracking with trends
- [ ] Social features (share deals)

---

*Last Updated: September 11, 2026*
