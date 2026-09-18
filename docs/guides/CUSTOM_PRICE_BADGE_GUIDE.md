# CustomPriceBadge Component Guide

A beautiful, non-intrusive 3D animated price indicator that shows price trends inline without cluttering the UI with notifications.

## 🎯 Problem Solved

**Before:** Notifications for every price change = annoying, cluttered UI, bad UX  
**After:** Inline 3D badges that show price trends at a glance = clean, informative, great UX

## ✨ Features

- **3D Animated Badge** - Depth, shadows, and smooth animations
- **Trend Indicators** - 📈 Higher, 📉 Lower, ➡️ Normal
- **Color-Coded** - Red (expensive), Green (cheap), Gray (normal)
- **Hover Details** - Full breakdown on hover
- **MDL Integration** - Compares to average prices
- **Compact Mode** - Ultra-small for tight spaces
- **Non-Intrusive** - No popups, no notifications
- **Confidence Meter** - Shows MDL prediction confidence

## 🎨 Visual Design

### Badge States

**Higher Price (Red)**
```
┌─────────────┐
│ 📈 $4.99    │  ← 3D badge with red gradient
│    +15.2%   │  ← Percentage change
└─────────────┘
```

**Lower Price (Green)**
```
┌─────────────┐
│ 📉 $2.99    │  ← 3D badge with green gradient
│    -12.5%   │  ← Percentage change
└─────────────┘
```

**Normal Price (Gray)**
```
┌─────────────┐
│ ➡️ $3.49    │  ← 3D badge with gray gradient
│    +1.2%    │  ← Small change
└─────────────┘
```

### Hover Tooltip

```
        ┌──────────────────┐
        │ Current:  $4.99  │
        │ Average:  $4.29  │
        │ ─────────────── │
        │ Change: +$0.70   │
        │         (+16.3%) │
        │ ─────────────── │
        │ Confidence: 85%  │
        │ ████████░░ 85%   │
        │ ─────────────── │
        │ 📈 Higher than   │
        │    usual         │
        └──────────────────┘
```

## 📦 Installation

```javascript
import CustomPriceBadge from '../components/CustomPriceBadge';
```

## 🚀 Basic Usage

### Simple Price Badge

```javascript
<CustomPriceBadge
  currentPrice={4.99}
  mdlAveragePrice={4.29}
  mdlConfidence={0.85}
/>
```

### With Previous Price

```javascript
<CustomPriceBadge
  currentPrice={3.49}
  previousPrice={3.99}
  showDetails={true}
/>
```

### Compact Mode

```javascript
<CustomPriceBadge
  currentPrice={2.99}
  mdlAveragePrice={3.49}
  compact={true}
/>
```

## 🎯 Real-World Examples

### In ItemList

```javascript
import CustomPriceBadge from '../components/CustomPriceBadge';

function ItemCard({ item }) {
  return (
    <div className="flex items-center justify-between p-4">
      <div className="flex items-center gap-3">
        <span className="text-2xl">{item.icon}</span>
        <div>
          <h3 className="font-medium">{item.item_name}</h3>
          <p className="text-sm text-gray-500">{item.category}</p>
        </div>
      </div>
      
      {/* Price Badge */}
      <CustomPriceBadge
        currentPrice={item.price}
        mdlAveragePrice={item.mdl_average_price}
        mdlConfidence={item.mdl_confidence}
      />
    </div>
  );
}
```

### In Add Item Form

```javascript
function AddItemForm() {
  const [itemName, setItemName] = useState('');
  const [price, setPrice] = useState('');
  const [mdlData, setMdlData] = useState(null);

  // Fetch MDL data when typing
  useEffect(() => {
    if (itemName.length >= 2) {
      fetchMDLPrice(itemName).then(setMdlData);
    }
  }, [itemName]);

  return (
    <div>
      <input
        type="text"
        value={itemName}
        onChange={(e) => setItemName(e.target.value)}
        placeholder="Item name"
      />
      
      <div className="flex items-center gap-2">
        <input
          type="number"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          placeholder="Price"
        />
        
        {/* Show price comparison as user types */}
        {price && mdlData && (
          <CustomPriceBadge
            currentPrice={parseFloat(price)}
            mdlAveragePrice={mdlData.average_price}
            mdlConfidence={mdlData.confidence}
            compact={true}
          />
        )}
      </div>
    </div>
  );
}
```

### In Shopping List

```javascript
function ShoppingList({ items }) {
  return (
    <div className="space-y-2">
      {items.map(item => (
        <div key={item.id} className="flex items-center justify-between p-3 bg-white rounded-lg">
          <div className="flex items-center gap-3">
            <input type="checkbox" />
            <span>{item.item_name}</span>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Quantity */}
            <span className="text-sm text-gray-500">
              {item.quantity} {item.unit}
            </span>
            
            {/* Price Badge */}
            <CustomPriceBadge
              currentPrice={item.price}
              mdlAveragePrice={item.mdl_average_price}
              mdlConfidence={item.mdl_confidence}
              compact={true}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
```

### In Autocomplete Suggestions

```javascript
function AutocompleteSuggestion({ suggestion }) {
  return (
    <div className="flex items-center justify-between p-2 hover:bg-gray-100">
      <div className="flex items-center gap-2">
        <span className="text-xl">{suggestion.icon}</span>
        <div>
          <div className="font-medium">{suggestion.name}</div>
          <div className="text-xs text-gray-500">{suggestion.category}</div>
        </div>
      </div>
      
      {/* Show predicted price */}
      <CustomPriceBadge
        currentPrice={suggestion.predicted_price}
        mdlAveragePrice={suggestion.average_price}
        mdlConfidence={suggestion.confidence}
        compact={true}
        showDetails={false}
      />
    </div>
  );
}
```

## 🎨 Customization

### Custom Colors

```javascript
// The badge automatically uses customTheme colors
// Red for higher, Green for lower, Gray for normal
```

### Animation Control

```javascript
// Disable animations
<CustomPriceBadge
  currentPrice={4.99}
  mdlAveragePrice={4.29}
  animated={false}
/>

// Animations include:
// - Pulse for significant changes (>15%)
// - Icon rotation on hover
// - Smooth price transitions
// - 3D depth effects
```

### Size Variants

```javascript
// Normal (default)
<CustomPriceBadge currentPrice={4.99} />

// Compact
<CustomPriceBadge currentPrice={4.99} compact={true} />

// Custom sizing with className
<CustomPriceBadge 
  currentPrice={4.99} 
  className="scale-125"
/>
```

## 📊 Props Reference

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `currentPrice` | number | 0 | Current item price |
| `previousPrice` | number | null | Last recorded price |
| `mdlAveragePrice` | number | null | MDL average price |
| `mdlConfidence` | number | 0 | MDL confidence (0-1) |
| `showDetails` | boolean | true | Show hover tooltip |
| `compact` | boolean | false | Ultra-compact mode |
| `animated` | boolean | true | Enable animations |
| `className` | string | '' | Additional CSS classes |

## 🎯 Trend Logic

### Price Change Calculation

```javascript
// Compare to MDL average (preferred) or previous price
const comparePrice = mdlAveragePrice || previousPrice;
const change = currentPrice - comparePrice;
const percentChange = (change / comparePrice) * 100;

// Determine trend
if (Math.abs(percentChange) < 2%) {
  trend = 'neutral'; // ±2% = normal
} else if (change > 0) {
  trend = 'up';      // Higher than usual
} else {
  trend = 'down';    // Lower than usual
}
```

### Trend Indicators

| Trend | Icon | Color | Meaning |
|-------|------|-------|---------|
| Up | 📈 TrendingUp | Red | Price is higher than usual |
| Down | 📉 TrendingDown | Green | Price is lower than usual |
| Neutral | ➡️ Minus | Gray | Price is normal (±2%) |

## 🔄 MDL Integration

### Fetch MDL Data

```javascript
const fetchMDLPrice = async (itemName) => {
  const response = await fetch(`/api/mdl/price/${encodeURIComponent(itemName)}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const data = await response.json();
  
  return {
    average_price: data.price,
    confidence: data.confidence,
    sample_size: data.sample_size
  };
};
```

### Use in Component

```javascript
function ItemWithMDL({ item }) {
  const [mdlData, setMdlData] = useState(null);

  useEffect(() => {
    fetchMDLPrice(item.item_name).then(setMdlData);
  }, [item.item_name]);

  return (
    <CustomPriceBadge
      currentPrice={item.price}
      mdlAveragePrice={mdlData?.average_price}
      mdlConfidence={mdlData?.confidence}
    />
  );
}
```

## 🎨 Visual States

### Significant Change (>15%)

When price change is significant, the badge pulses:

```javascript
// Automatic pulse animation for changes > 15%
{Math.abs(priceChange?.percent) > 15 && (
  <motion.div
    className="absolute inset-0 rounded-xl bg-white/20"
    animate={{ scale: [1, 1.5], opacity: [0.5, 0] }}
    transition={{ duration: 1, repeat: Infinity }}
  />
)}
```

### Hover State

- Badge scales up 10%
- Shadow increases
- Tooltip appears with full details
- Icon animates

### 3D Effect

```javascript
// 3D depth layer
style={{
  transformStyle: 'preserve-3d',
  transform: isHovered ? 'translateZ(10px)' : 'translateZ(0px)'
}}
```

## 💡 Best Practices

### 1. Always Provide MDL Data When Available

```javascript
// ✅ Good - Uses MDL average
<CustomPriceBadge
  currentPrice={item.price}
  mdlAveragePrice={item.mdl_average_price}
  mdlConfidence={item.mdl_confidence}
/>

// ❌ Less useful - No comparison
<CustomPriceBadge
  currentPrice={item.price}
/>
```

### 2. Use Compact Mode in Tight Spaces

```javascript
// ✅ Good - Compact in list view
<CustomPriceBadge currentPrice={4.99} compact={true} />

// ❌ Too large for list
<CustomPriceBadge currentPrice={4.99} />
```

### 3. Show Details Where Useful

```javascript
// ✅ Good - Details in item cards
<CustomPriceBadge showDetails={true} />

// ✅ Good - No details in autocomplete
<CustomPriceBadge showDetails={false} />
```

### 4. Combine with Other Indicators

```javascript
<div className="flex items-center gap-2">
  {/* Aisle badge */}
  <span className="px-2 py-1 bg-purple-500 text-white rounded">
    Aisle {item.aisle}
  </span>
  
  {/* Price badge */}
  <CustomPriceBadge
    currentPrice={item.price}
    mdlAveragePrice={item.mdl_average_price}
    compact={true}
  />
</div>
```

## 🚀 Performance

- **Lightweight** - Only renders when price > 0
- **Optimized Animations** - Uses GPU-accelerated transforms
- **Conditional Rendering** - Tooltip only renders on hover
- **Memoization** - Calculations cached with useEffect

## 🎯 UX Benefits

### vs. Notifications

| Feature | Notifications | CustomPriceBadge |
|---------|--------------|------------------|
| Intrusive | ❌ Yes | ✅ No |
| Persistent | ❌ No | ✅ Yes |
| Contextual | ❌ No | ✅ Yes |
| Detailed | ⚠️ Limited | ✅ On hover |
| Annoying | ❌ Yes | ✅ No |
| Scalable | ❌ No | ✅ Yes |

### User Experience

- **At a Glance** - See price trends instantly
- **No Interruption** - Doesn't block workflow
- **Always Visible** - Badge stays with the item
- **Details on Demand** - Hover for full breakdown
- **Visual Hierarchy** - Color-coded for quick scanning

## 🔮 Future Enhancements

- **Price History Graph** - Show trend over time in tooltip
- **Multiple Comparisons** - Compare to multiple stores
- **Custom Thresholds** - User-defined "expensive" levels
- **Animated Transitions** - Smooth price updates
- **Sound Effects** - Optional audio cues (if optimization mode off)

## 📝 Migration from Notifications

### Before (Annoying)

```javascript
// Every price check = notification
if (item.price > mdlAverage * 1.2) {
  showNotification('Price is 20% higher!');
}
```

### After (Clean)

```javascript
// Just render the badge
<CustomPriceBadge
  currentPrice={item.price}
  mdlAveragePrice={mdlAverage}
/>
```

## ✅ Ready to Use!

The CustomPriceBadge is production-ready and integrates seamlessly with:
- ✅ ItemList
- ✅ Add Item Form
- ✅ Autocomplete
- ✅ Shopping List
- ✅ MDL System
- ✅ customTheme

**No more annoying price notifications - just beautiful, informative badges!** 🎉
