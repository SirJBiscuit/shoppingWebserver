import React, { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import PickerSearchBar from './PickerSearchBar';
import { Portal } from '../utils/autoPlacement';
import AnimatedScrollbar3D from './3DAnimatedScrollbar';

// Comprehensive icon library with keywords for search
const ICON_DATA = [
  // Fruits
  { icon: '🍎', keywords: ['apple', 'fruit', 'red', 'fresh'] },
  { icon: '🍊', keywords: ['orange', 'fruit', 'citrus', 'fresh'] },
  { icon: '🍋', keywords: ['lemon', 'fruit', 'citrus', 'yellow', 'fresh'] },
  { icon: '🍌', keywords: ['banana', 'fruit', 'yellow', 'fresh'] },
  { icon: '🍉', keywords: ['watermelon', 'fruit', 'melon', 'fresh'] },
  { icon: '🍇', keywords: ['grapes', 'fruit', 'purple', 'fresh'] },
  { icon: '🍓', keywords: ['strawberry', 'berry', 'fruit', 'red', 'fresh'] },
  { icon: '🫐', keywords: ['blueberry', 'berry', 'fruit', 'blue', 'fresh'] },
  { icon: '🍈', keywords: ['melon', 'fruit', 'cantaloupe', 'fresh'] },
  { icon: '🍒', keywords: ['cherry', 'fruit', 'red', 'fresh'] },
  { icon: '🍑', keywords: ['peach', 'fruit', 'fresh'] },
  { icon: '🥭', keywords: ['mango', 'fruit', 'tropical', 'fresh'] },
  { icon: '🍍', keywords: ['pineapple', 'fruit', 'tropical', 'fresh'] },
  { icon: '🥥', keywords: ['coconut', 'fruit', 'tropical', 'fresh'] },
  { icon: '🥝', keywords: ['kiwi', 'fruit', 'green', 'fresh'] },
  { icon: '🍅', keywords: ['tomato', 'vegetable', 'red', 'fresh', 'produce'] },
  { icon: '🥑', keywords: ['avocado', 'fruit', 'green', 'fresh'] },
  
  // Vegetables
  { icon: '🥬', keywords: ['lettuce', 'vegetable', 'green', 'leafy', 'salad', 'fresh', 'produce'] },
  { icon: '🥦', keywords: ['broccoli', 'vegetable', 'green', 'fresh', 'produce'] },
  { icon: '🥒', keywords: ['cucumber', 'vegetable', 'green', 'fresh', 'produce'] },
  { icon: '🌶️', keywords: ['pepper', 'chili', 'hot', 'spicy', 'vegetable', 'fresh'] },
  { icon: '🫑', keywords: ['bell pepper', 'pepper', 'vegetable', 'fresh', 'produce'] },
  { icon: '🌽', keywords: ['corn', 'vegetable', 'yellow', 'fresh', 'produce'] },
  { icon: '🥕', keywords: ['carrot', 'vegetable', 'orange', 'fresh', 'produce'] },
  { icon: '🫛', keywords: ['peas', 'vegetable', 'green', 'fresh', 'produce'] },
  { icon: '🧄', keywords: ['garlic', 'vegetable', 'seasoning', 'fresh'] },
  { icon: '🧅', keywords: ['onion', 'vegetable', 'fresh', 'produce'] },
  { icon: '🥔', keywords: ['potato', 'vegetable', 'fresh', 'produce'] },
  { icon: '🍠', keywords: ['sweet potato', 'yam', 'vegetable', 'fresh', 'produce'] },
  { icon: '🫚', keywords: ['ginger', 'root', 'spice', 'fresh'] },
  { icon: '🥗', keywords: ['salad', 'fresh', 'healthy', 'vegetable'] },
  { icon: '🍄', keywords: ['mushroom', 'vegetable', 'fresh', 'produce'] },
  
  // Meat & Seafood
  { icon: '🥩', keywords: ['meat', 'steak', 'beef', 'red meat', 'protein'] },
  { icon: '🍗', keywords: ['chicken', 'poultry', 'meat', 'drumstick', 'protein'] },
  { icon: '🍖', keywords: ['meat', 'bone', 'ribs', 'protein'] },
  { icon: '🥓', keywords: ['bacon', 'pork', 'meat', 'breakfast', 'protein'] },
  { icon: '🍤', keywords: ['shrimp', 'seafood', 'protein'] },
  { icon: '🦐', keywords: ['shrimp', 'seafood', 'protein'] },
  { icon: '🦞', keywords: ['lobster', 'seafood', 'protein'] },
  { icon: '🦀', keywords: ['crab', 'seafood', 'protein'] },
  { icon: '🐟', keywords: ['fish', 'seafood', 'protein'] },
  { icon: '🐠', keywords: ['fish', 'seafood', 'protein'] },
  { icon: '🦑', keywords: ['squid', 'seafood', 'protein'] },
  { icon: '🍣', keywords: ['sushi', 'fish', 'seafood', 'japanese'] },
  { icon: '🌭', keywords: ['hot dog', 'sausage', 'meat'] },
  { icon: '🍔', keywords: ['burger', 'hamburger', 'meat', 'beef'] },
  
  // Dairy & Eggs
  { icon: '🥛', keywords: ['milk', 'dairy', 'beverage', 'drink'] },
  { icon: '🧈', keywords: ['butter', 'dairy', 'spread'] },
  { icon: '🧀', keywords: ['cheese', 'dairy'] },
  { icon: '🥚', keywords: ['egg', 'protein', 'breakfast'] },
  { icon: '🍳', keywords: ['egg', 'fried', 'breakfast', 'cooking'] },
  
  // Bread & Bakery
  { icon: '🍞', keywords: ['bread', 'bakery', 'loaf'] },
  { icon: '🥖', keywords: ['baguette', 'bread', 'french', 'bakery'] },
  { icon: '🥯', keywords: ['bagel', 'bread', 'bakery', 'breakfast'] },
  { icon: '🥐', keywords: ['croissant', 'bread', 'bakery', 'french', 'breakfast'] },
  { icon: '🧇', keywords: ['waffle', 'breakfast', 'bakery'] },
  { icon: '🥞', keywords: ['pancake', 'breakfast', 'bakery'] },
  { icon: '🍰', keywords: ['cake', 'dessert', 'bakery', 'sweet'] },
  { icon: '🎂', keywords: ['cake', 'birthday', 'dessert', 'bakery', 'sweet'] },
  { icon: '🧁', keywords: ['cupcake', 'dessert', 'bakery', 'sweet'] },
  { icon: '🥧', keywords: ['pie', 'dessert', 'bakery', 'sweet'] },
  { icon: '🍪', keywords: ['cookie', 'dessert', 'bakery', 'sweet', 'snack'] },
  { icon: '🍩', keywords: ['donut', 'doughnut', 'dessert', 'bakery', 'sweet'] },
  { icon: '🥨', keywords: ['pretzel', 'snack', 'bakery'] },
  
  // Grains, Pasta & Dry Goods
  { icon: '🍚', keywords: ['rice', 'grain', 'dry goods', 'pantry'] },
  { icon: '🍝', keywords: ['pasta', 'spaghetti', 'noodles', 'dry goods', 'pantry'] },
  { icon: '🍜', keywords: ['noodles', 'ramen', 'soup', 'asian'] },
  { icon: '🍲', keywords: ['stew', 'soup', 'pot', 'cooking'] },
  { icon: '🥘', keywords: ['paella', 'rice', 'dish', 'cooking'] },
  { icon: '🫓', keywords: ['flatbread', 'bread', 'tortilla'] },
  { icon: '🌮', keywords: ['taco', 'mexican', 'tortilla'] },
  { icon: '🌯', keywords: ['burrito', 'wrap', 'mexican', 'tortilla'] },
  { icon: '🥙', keywords: ['pita', 'wrap', 'sandwich'] },
  { icon: '🧆', keywords: ['falafel', 'vegetarian'] },
  { icon: '🍕', keywords: ['pizza', 'italian', 'cheese'] },
  { icon: '🥗', keywords: ['salad', 'healthy', 'fresh'] },
  
  // Snacks & Sweets
  { icon: '🍿', keywords: ['popcorn', 'snack'] },
  { icon: '🥜', keywords: ['peanuts', 'nuts', 'snack', 'protein'] },
  { icon: '🌰', keywords: ['chestnut', 'nuts', 'snack'] },
  { icon: '🍫', keywords: ['chocolate', 'candy', 'sweet', 'snack'] },
  { icon: '🍬', keywords: ['candy', 'sweet', 'snack'] },
  { icon: '🍭', keywords: ['lollipop', 'candy', 'sweet', 'snack'] },
  { icon: '🍮', keywords: ['pudding', 'custard', 'dessert', 'sweet'] },
  { icon: '🍯', keywords: ['honey', 'sweet', 'condiment'] },
  { icon: '🍦', keywords: ['ice cream', 'dessert', 'frozen', 'sweet'] },
  { icon: '🍨', keywords: ['ice cream', 'dessert', 'frozen', 'sweet'] },
  { icon: '🍧', keywords: ['shaved ice', 'dessert', 'frozen', 'sweet'] },
  
  // Beverages
  { icon: '☕', keywords: ['coffee', 'beverage', 'drink', 'hot', 'caffeine'] },
  { icon: '🍵', keywords: ['tea', 'beverage', 'drink', 'hot'] },
  { icon: '🧃', keywords: ['juice box', 'juice', 'beverage', 'drink'] },
  { icon: '🥤', keywords: ['soda', 'drink', 'beverage', 'cup'] },
  { icon: '🧋', keywords: ['bubble tea', 'boba', 'drink', 'beverage'] },
  { icon: '🍶', keywords: ['sake', 'alcohol', 'beverage', 'drink'] },
  { icon: '🍾', keywords: ['champagne', 'wine', 'alcohol', 'beverage'] },
  { icon: '🍷', keywords: ['wine', 'alcohol', 'beverage', 'drink'] },
  { icon: '🍺', keywords: ['beer', 'alcohol', 'beverage', 'drink'] },
  { icon: '🍻', keywords: ['beer', 'cheers', 'alcohol', 'beverage'] },
  { icon: '🥂', keywords: ['champagne', 'cheers', 'alcohol', 'beverage'] },
  { icon: '🧉', keywords: ['mate', 'tea', 'beverage', 'drink'] },
  { icon: '💧', keywords: ['water', 'drink', 'beverage', 'hydration'] },
  { icon: '🥛', keywords: ['milk', 'dairy', 'beverage', 'drink'] },
  
  // Condiments & Canned Goods
  { icon: '🧂', keywords: ['salt', 'seasoning', 'condiment', 'spice'] },
  { icon: '🫗', keywords: ['pour', 'liquid', 'oil', 'sauce'] },
  { icon: '🍯', keywords: ['honey', 'sweet', 'condiment', 'spread'] },
  { icon: '🥫', keywords: ['can', 'canned', 'soup', 'food', 'pantry'] },
  { icon: '🫙', keywords: ['jar', 'container', 'storage', 'pantry'] },
  
  // Frozen Foods
  { icon: '🧊', keywords: ['ice', 'frozen', 'cold'] },
  { icon: '🍦', keywords: ['ice cream', 'frozen', 'dessert', 'sweet'] },
  { icon: '🍨', keywords: ['ice cream', 'frozen', 'dessert', 'sweet'] },
  { icon: '❄️', keywords: ['frozen', 'cold', 'ice', 'freeze'] },
  
  // Cleaning Supplies
  { icon: '🧹', keywords: ['broom', 'cleaning', 'sweep', 'household'] },
  { icon: '🧺', keywords: ['basket', 'laundry', 'cleaning', 'household'] },
  { icon: '🧼', keywords: ['soap', 'cleaning', 'wash', 'hygiene'] },
  { icon: '🧽', keywords: ['sponge', 'cleaning', 'wash', 'dishes'] },
  { icon: '🧴', keywords: ['bottle', 'soap', 'lotion', 'cleaning', 'personal care'] },
  { icon: '🪣', keywords: ['bucket', 'cleaning', 'household'] },
  { icon: '🧻', keywords: ['toilet paper', 'paper', 'bathroom', 'household'] },
  { icon: '🗑️', keywords: ['trash', 'garbage', 'bin', 'waste'] },
  
  // Kitchen Items
  { icon: '🍴', keywords: ['fork', 'knife', 'utensils', 'kitchen', 'cutlery'] },
  { icon: '🥄', keywords: ['spoon', 'utensil', 'kitchen', 'cutlery'] },
  { icon: '🔪', keywords: ['knife', 'kitchen', 'cooking', 'cutlery'] },
  { icon: '🥢', keywords: ['chopsticks', 'utensils', 'kitchen', 'asian'] },
  { icon: '🍽️', keywords: ['plate', 'dish', 'kitchen', 'dining'] },
  { icon: '🥣', keywords: ['bowl', 'dish', 'kitchen', 'dining'] },
  { icon: '🥡', keywords: ['takeout', 'box', 'container', 'food'] },
  { icon: '🫙', keywords: ['jar', 'container', 'storage', 'kitchen'] },
  { icon: '🍳', keywords: ['pan', 'cooking', 'kitchen', 'frying'] },
  
  // Personal Care
  { icon: '🧴', keywords: ['lotion', 'soap', 'shampoo', 'personal care', 'hygiene'] },
  { icon: '🧻', keywords: ['toilet paper', 'tissue', 'paper', 'bathroom'] },
  { icon: '🪒', keywords: ['razor', 'shaving', 'personal care', 'grooming'] },
  { icon: '🪥', keywords: ['toothbrush', 'dental', 'hygiene', 'personal care'] },
  { icon: '🧽', keywords: ['sponge', 'bath', 'cleaning', 'personal care'] },
  { icon: '🧼', keywords: ['soap', 'hand soap', 'hygiene', 'personal care'] },
  { icon: '🪮', keywords: ['comb', 'hair', 'grooming', 'personal care'] },
  
  // Temperature Indicators
  { icon: '🔥', keywords: ['hot', 'fire', 'heat', 'spicy', 'warm'] },
  { icon: '♨️', keywords: ['hot', 'steam', 'heat', 'warm'] },
  { icon: '❄️', keywords: ['cold', 'frozen', 'ice', 'freeze'] },
  { icon: '🧊', keywords: ['ice', 'cold', 'frozen', 'freeze'] },
  { icon: '🥶', keywords: ['cold', 'frozen', 'freeze'] },
  
  // General & Other
  { icon: '📦', keywords: ['box', 'package', 'delivery', 'storage'] },
  { icon: '🛒', keywords: ['cart', 'shopping', 'store', 'grocery'] },
  { icon: '🏪', keywords: ['store', 'shop', 'convenience', 'market'] },
  { icon: '🎁', keywords: ['gift', 'present', 'box', 'wrapped'] },
  { icon: '📋', keywords: ['list', 'clipboard', 'notes', 'checklist'] },
  { icon: '✨', keywords: ['sparkle', 'clean', 'new', 'special'] },
  { icon: '⭐', keywords: ['star', 'favorite', 'special', 'important'] },
  { icon: '💚', keywords: ['heart', 'green', 'love', 'favorite'] },
  { icon: '💙', keywords: ['heart', 'blue', 'love', 'favorite'] },
  { icon: '❤️', keywords: ['heart', 'red', 'love', 'favorite'] },
  { icon: '🏠', keywords: ['home', 'house', 'household'] },
  { icon: '🌿', keywords: ['herb', 'plant', 'fresh', 'organic', 'green'] },
  { icon: '🥄', keywords: ['spoon', 'utensil', 'kitchen'] },
  { icon: '🍶', keywords: ['bottle', 'container', 'drink'] },
  { icon: '🧃', keywords: ['juice', 'drink', 'box', 'beverage'] },

  // Extra Produce
  { icon: '🍆', keywords: ['eggplant', 'aubergine', 'vegetable', 'produce', 'fresh'] },
  { icon: '🫒', keywords: ['olive', 'olives', 'produce', 'salad', 'mediterranean'] },
  { icon: '🫜', keywords: ['turnip', 'radish', 'root', 'vegetable', 'produce'] },
  { icon: '🌱', keywords: ['sprouts', 'seedling', 'herbs', 'microgreens', 'produce', 'fresh'] },
  { icon: '🥒', keywords: ['pickles', 'pickle', 'cucumber', 'jar'] },
  { icon: '🍈', keywords: ['honeydew', 'melon', 'fruit', 'produce'] },
  { icon: '🫐', keywords: ['berries', 'blueberries', 'fruit', 'produce'] },

  // Pantry Staples & Ingredients
  { icon: '🌾', keywords: ['flour', 'wheat', 'grain', 'oats', 'baking', 'pantry', 'ingredient'] },
  { icon: '🫘', keywords: ['beans', 'black beans', 'kidney beans', 'legumes', 'lentils', 'pantry', 'protein'] },
  { icon: '🧋', keywords: ['powder', 'protein powder', 'mix'] },
  { icon: '🥣', keywords: ['cereal', 'oatmeal', 'granola', 'breakfast', 'bowl'] },
  { icon: '🍙', keywords: ['rice ball', 'onigiri', 'rice', 'asian'] },
  { icon: '🍘', keywords: ['rice cracker', 'cracker', 'snack', 'asian'] },
  { icon: '🥠', keywords: ['fortune cookie', 'cookie', 'snack', 'asian'] },
  { icon: '🥟', keywords: ['dumpling', 'pierogi', 'ravioli', 'frozen', 'asian'] },
  { icon: '🍥', keywords: ['fish cake', 'ramen topping', 'asian'] },
  { icon: '🍢', keywords: ['skewer', 'kabob', 'kebab', 'grill', 'meat'] },
  { icon: '🍡', keywords: ['dango', 'skewer', 'sweet', 'asian'] },
  { icon: '🫔', keywords: ['tamale', 'mexican', 'wrap'] },
  { icon: '🥪', keywords: ['sandwich', 'deli', 'sub', 'lunch', 'bread'] },
  { icon: '🍟', keywords: ['fries', 'chips', 'french fries', 'snack', 'potato'] },
  { icon: '🫓', keywords: ['tortilla', 'wrap', 'pita', 'bread', 'mexican'] },
  { icon: '🧇', keywords: ['waffle', 'breakfast', 'frozen'] },
  { icon: '🫕', keywords: ['fondue', 'pot', 'cooking', 'dish'] },
  { icon: '🍛', keywords: ['curry', 'rice', 'dish', 'asian', 'indian'] },
  { icon: '🍱', keywords: ['bento', 'lunch box', 'asian', 'meal'] },
  { icon: '🥮', keywords: ['mooncake', 'pastry', 'asian', 'dessert'] },
  { icon: '🍡', keywords: ['candy', 'sweets', 'snack'] },

  // Condiments & Sauces
  { icon: '🍶', keywords: ['vinegar', 'soy sauce', 'sauce', 'condiment', 'bottle'] },
  { icon: '🫙', keywords: ['peanut butter', 'jam', 'jelly', 'spread', 'mayo', 'mayonnaise', 'jar', 'condiment'] },
  { icon: '🫗', keywords: ['olive oil', 'oil', 'dressing', 'syrup', 'condiment', 'pour'] },
  { icon: '🧂', keywords: ['pepper', 'spice', 'seasoning', 'salt', 'ingredient'] },
  { icon: '🌶️', keywords: ['hot sauce', 'salsa', 'sriracha', 'spice', 'condiment'] },
  { icon: '🍯', keywords: ['syrup', 'honey', 'maple', 'sweet', 'condiment', 'spread'] },

  // Dairy & Refrigerated Extras
  { icon: '🥛', keywords: ['cream', 'half and half', 'milk', 'dairy', 'refrigerated'] },
  { icon: '🧀', keywords: ['cream cheese', 'shredded cheese', 'dairy', 'refrigerated'] },
  { icon: '🥣', keywords: ['yogurt', 'sour cream', 'dip', 'dairy', 'refrigerated'] },
  { icon: '🧈', keywords: ['margarine', 'butter', 'dairy', 'spread', 'refrigerated'] },
  { icon: '🍮', keywords: ['flan', 'custard', 'yogurt cup', 'dairy', 'dessert'] },
  { icon: '🧊', keywords: ['ice pack', 'frozen', 'cold', 'freezer'] },
  { icon: '🥦', keywords: ['cauliflower', 'vegetable', 'frozen vegetables', 'produce'] },
  { icon: '🍞', keywords: ['rolls', 'buns', 'bread', 'bakery'] },
  { icon: '🥖', keywords: ['sub roll', 'baguette', 'bread', 'bakery'] },

  // Meat & Deli Extras
  { icon: '🍗', keywords: ['turkey', 'rotisserie', 'chicken', 'poultry', 'deli'] },
  { icon: '🥩', keywords: ['ground beef', 'roast', 'steak', 'meat', 'deli'] },
  { icon: '🥓', keywords: ['sausage', 'ham', 'deli meat', 'bacon', 'meat'] },
  { icon: '🍖', keywords: ['pork chops', 'ribs', 'ham', 'meat'] },
  { icon: '🦃', keywords: ['turkey', 'thanksgiving', 'poultry', 'meat'] },
  { icon: '🐔', keywords: ['chicken', 'whole chicken', 'poultry', 'meat'] },
  { icon: '🐷', keywords: ['pork', 'ham', 'meat'] },
  { icon: '🐄', keywords: ['beef', 'cow', 'meat', 'dairy'] },
  { icon: '🐟', keywords: ['salmon', 'tuna', 'tilapia', 'fish', 'seafood'] },
  { icon: '🦪', keywords: ['oyster', 'shellfish', 'seafood'] },
  { icon: '🥚', keywords: ['egg whites', 'eggs', 'dairy', 'breakfast'] },

  // Beverages Extras
  { icon: '🫖', keywords: ['tea kettle', 'tea', 'teapot', 'beverage', 'hot'] },
  { icon: '🍹', keywords: ['juice', 'cocktail', 'tropical drink', 'beverage'] },
  { icon: '🥤', keywords: ['energy drink', 'soda', 'seltzer', 'beverage', 'drink'] },
  { icon: '🧃', keywords: ['capri sun', 'juice pouch', 'kids drink', 'beverage'] },
  { icon: '🥥', keywords: ['coconut water', 'coconut milk', 'beverage', 'ingredient'] },

  // Baking & Cooking Ingredients
  { icon: '🍫', keywords: ['chocolate chips', 'cocoa', 'baking chocolate', 'baking', 'ingredient'] },
  { icon: '🥜', keywords: ['peanut butter', 'nuts', 'almonds', 'walnuts', 'trail mix', 'ingredient'] },
  { icon: '🧁', keywords: ['frosting', 'icing', 'baking', 'dessert'] },
  { icon: '🍬', keywords: ['sugar', 'sprinkles', 'candy', 'baking', 'ingredient'] },
  { icon: '🥄', keywords: ['baking soda', 'baking powder', 'vanilla', 'ingredient', 'teaspoon'] },

  // Cleaning & Household Supplies
  { icon: '🧽', keywords: ['dish soap', 'dish soap sponge', 'cleaning', 'kitchen'] },
  { icon: '🧴', keywords: ['dish soap', 'hand soap', 'sanitizer', 'cleaning', 'household'] },
  { icon: '🧹', keywords: ['mop', 'broom', 'duster', 'cleaning', 'household'] },
  { icon: '🪣', keywords: ['mop bucket', 'cleaning', 'household'] },
  { icon: '🧺', keywords: ['laundry', 'detergent', 'fabric softener', 'household'] },
  { icon: '🧻', keywords: ['paper towels', 'toilet paper', 'napkins', 'tissues', 'household'] },
  { icon: '🗑️', keywords: ['trash bags', 'garbage bags', 'waste', 'household'] },
  { icon: '🕯️', keywords: ['candle', 'air freshener', 'scent', 'household'] },
  { icon: '🔌', keywords: ['extension cord', 'charger', 'electrical', 'household'] },
  { icon: '💡', keywords: ['light bulb', 'bulbs', 'household'] },
  { icon: '🔋', keywords: ['batteries', 'battery', 'household'] },
  { icon: '🔦', keywords: ['flashlight', 'emergency', 'household'] },
  { icon: '🧯', keywords: ['fire extinguisher', 'safety', 'household'] },
  { icon: '🧷', keywords: ['safety pins', 'diaper pins', 'sewing', 'household'] },
  { icon: '🧵', keywords: ['thread', 'sewing', 'craft', 'household'] },
  { icon: '🪡', keywords: ['needle', 'sewing', 'craft', 'household'] },
  { icon: '🧰', keywords: ['toolbox', 'tools', 'hardware', 'household'] },
  { icon: '🔨', keywords: ['hammer', 'tools', 'hardware', 'repair'] },
  { icon: '🪛', keywords: ['screwdriver', 'tools', 'hardware', 'repair'] },
  { icon: '🪚', keywords: ['saw', 'tools', 'hardware', 'wood'] },
  { icon: '🪠', keywords: ['plunger', 'plumbing', 'bathroom', 'household'] },
  { icon: '🪞', keywords: ['mirror', 'bathroom', 'household'] },
  { icon: '🪟', keywords: ['window', 'glass cleaner', 'household'] },
  { icon: '🛏️', keywords: ['bedding', 'sheets', 'pillow', 'household'] },
  { icon: '🧸', keywords: ['stuffed animal', 'toy', 'kids', 'household'] },
  { icon: '🪴', keywords: ['houseplant', 'plant', 'garden', 'household'] },
  { icon: '🌷', keywords: ['flowers', 'bouquet', 'garden', 'produce'] },
  { icon: '🗞️', keywords: ['newspaper', 'mail', 'paper goods', 'household'] },
  { icon: '✉️', keywords: ['envelopes', 'stamps', 'mail', 'office'] },
  { icon: '📎', keywords: ['paper clips', 'office supplies', 'tape', 'household'] },
  { icon: '🖍️', keywords: ['crayons', 'markers', 'school supplies', 'kids'] },
  { icon: '✏️', keywords: ['pencils', 'school supplies', 'office', 'kids'] },
  { icon: '📓', keywords: ['notebook', 'school supplies', 'office', 'paper'] },
  { icon: '🎒', keywords: ['backpack', 'school supplies', 'kids'] },

  // Health & Pharmacy
  { icon: '💊', keywords: ['medicine', 'vitamins', 'pills', 'pharmacy', 'health'] },
  { icon: '🩹', keywords: ['bandage', 'band aid', 'first aid', 'health', 'pharmacy'] },
  { icon: '🩺', keywords: ['doctor', 'medical', 'health', 'pharmacy'] },
  { icon: '🧬', keywords: ['supplements', 'health', 'vitamins'] },
  { icon: '🌡️', keywords: ['thermometer', 'fever', 'health', 'pharmacy'] },
  { icon: '😷', keywords: ['face mask', 'sick', 'health', 'pharmacy'] },
  { icon: '🧠', keywords: ['brain health', 'supplements', 'health'] },

  // Baby Supplies
  { icon: '🍼', keywords: ['baby bottle', 'formula', 'baby', 'infant'] },
  { icon: '👶', keywords: ['baby', 'diapers', 'wipes', 'infant', 'baby supplies'] },
  { icon: '🧷', keywords: ['diaper pins', 'baby', 'infant'] },
  { icon: '🧸', keywords: ['baby toy', 'teddy bear', 'kids', 'baby'] },
  { icon: '👶', keywords: ['baby food', 'baby formula', 'infant'] },

  // Pet Supplies
  { icon: '🐾', keywords: ['pet', 'pet supplies', 'paw', 'animal'] },
  { icon: '🦴', keywords: ['dog treats', 'bone', 'pet', 'dog'] },
  { icon: '🐕', keywords: ['dog', 'dog food', 'pet', 'pet supplies'] },
  { icon: '🐈', keywords: ['cat', 'cat food', 'litter', 'pet', 'pet supplies'] },
  { icon: '🐠', keywords: ['fish food', 'aquarium', 'pet', 'pet supplies'] },
  { icon: '🐦', keywords: ['bird seed', 'bird food', 'pet', 'pet supplies'] },
  { icon: '🐹', keywords: ['hamster', 'small pet', 'pet supplies'] },
  { icon: '🐇', keywords: ['rabbit', 'bunny', 'pet supplies'] },

  // Personal Care Extras
  { icon: '🪥', keywords: ['toothpaste', 'toothbrush', 'dental', 'hygiene', 'personal care'] },
  { icon: '🪒', keywords: ['razor blades', 'shaving cream', 'personal care', 'hygiene'] },
  { icon: '🧼', keywords: ['body wash', 'bar soap', 'hand soap', 'hygiene', 'personal care'] },
  { icon: '🧴', keywords: ['shampoo', 'conditioner', 'lotion', 'deodorant', 'personal care', 'hygiene'] },
  { icon: '🪮', keywords: ['hair brush', 'comb', 'hair care', 'personal care'] },
  { icon: '💅', keywords: ['nail polish', 'nail care', 'personal care'] },
  { icon: '💄', keywords: ['makeup', 'cosmetics', 'lipstick', 'personal care'] },
  { icon: '🧖', keywords: ['face mask', 'skincare', 'spa', 'personal care'] },
  { icon: '🩲', keywords: ['underwear', 'socks', 'clothing', 'personal care'] },
  { icon: '👕', keywords: ['shirt', 'clothing', 'laundry'] },
  { icon: '🧦', keywords: ['socks', 'clothing', 'laundry'] }
];

// Organize icons by category for browsing
const ICON_LIBRARY = {
  'All': ICON_DATA.map(item => item.icon),
  'Fruits': ICON_DATA.filter(item => item.keywords.includes('fruit')).map(item => item.icon),
  'Vegetables': ICON_DATA.filter(item => item.keywords.includes('vegetable') || item.keywords.includes('produce')).map(item => item.icon),
  'Meat & Seafood': ICON_DATA.filter(item => item.keywords.includes('meat') || item.keywords.includes('seafood') || item.keywords.includes('protein')).map(item => item.icon),
  'Dairy & Eggs': ICON_DATA.filter(item => item.keywords.includes('dairy') || item.keywords.includes('egg')).map(item => item.icon),
  'Bread & Bakery': ICON_DATA.filter(item => item.keywords.includes('bread') || item.keywords.includes('bakery')).map(item => item.icon),
  'Grains & Pasta': ICON_DATA.filter(item => item.keywords.includes('grain') || item.keywords.includes('pasta') || item.keywords.includes('rice') || item.keywords.includes('noodles')).map(item => item.icon),
  'Snacks & Sweets': ICON_DATA.filter(item => item.keywords.includes('snack') || item.keywords.includes('sweet') || item.keywords.includes('candy') || item.keywords.includes('dessert')).map(item => item.icon),
  'Beverages': ICON_DATA.filter(item => item.keywords.includes('beverage') || item.keywords.includes('drink')).map(item => item.icon),
  'Condiments': ICON_DATA.filter(item => item.keywords.includes('condiment') || item.keywords.includes('sauce') || item.keywords.includes('seasoning')).map(item => item.icon),
  'Frozen': ICON_DATA.filter(item => item.keywords.includes('frozen')).map(item => item.icon),
  'Cleaning': ICON_DATA.filter(item => item.keywords.includes('cleaning')).map(item => item.icon),
  'Kitchen': ICON_DATA.filter(item => item.keywords.includes('kitchen') || item.keywords.includes('utensil') || item.keywords.includes('cooking')).map(item => item.icon),
  'Pantry & Ingredients': ICON_DATA.filter(item => item.keywords.includes('pantry') || item.keywords.includes('ingredient')).map(item => item.icon),
  'Health & Pharmacy': ICON_DATA.filter(item => item.keywords.includes('health') || item.keywords.includes('pharmacy') || item.keywords.includes('medical')).map(item => item.icon),
  'Baby': ICON_DATA.filter(item => item.keywords.includes('baby') || item.keywords.includes('infant')).map(item => item.icon),
  'Pet Supplies': ICON_DATA.filter(item => item.keywords.includes('pet') || item.keywords.includes('pet supplies')).map(item => item.icon),
  'Tools & Repair': ICON_DATA.filter(item => item.keywords.includes('tools') || item.keywords.includes('hardware') || item.keywords.includes('repair')).map(item => item.icon),
  'Office & School': ICON_DATA.filter(item => item.keywords.includes('office') || item.keywords.includes('school supplies') || item.keywords.includes('mail')).map(item => item.icon),
  'Personal Care': ICON_DATA.filter(item => item.keywords.includes('personal care') || item.keywords.includes('hygiene')).map(item => item.icon),
  'Household': ICON_DATA.filter(item => item.keywords.includes('household')).map(item => item.icon)
};

// Broad tags for categorization
const ITEM_TAGS = [
  { name: 'Food', icon: '🍽️', color: 'bg-green-100 text-green-800' },
  { name: 'Cold', icon: '❄️', color: 'bg-blue-100 text-blue-800' },
  { name: 'Hot', icon: '🔥', color: 'bg-red-100 text-red-800' },
  { name: 'Frozen', icon: '🧊', color: 'bg-cyan-100 text-cyan-800' },
  { name: 'Fresh', icon: '🌿', color: 'bg-green-100 text-green-800' },
  { name: 'Cleaning', icon: '🧹', color: 'bg-purple-100 text-purple-800' },
  { name: 'Kitchen', icon: '🍴', color: 'bg-orange-100 text-orange-800' },
  { name: 'Personal Care', icon: '🧴', color: 'bg-pink-100 text-pink-800' },
  { name: 'Household', icon: '🏠', color: 'bg-gray-100 text-gray-800' },
  { name: 'Beverage', icon: '🥤', color: 'bg-blue-100 text-blue-800' },
  { name: 'Snack', icon: '🍿', color: 'bg-yellow-100 text-yellow-800' },
  { name: 'Meat', icon: '🥩', color: 'bg-red-100 text-red-800' },
  { name: 'Produce', icon: '🥬', color: 'bg-green-100 text-green-800' },
  { name: 'Dairy', icon: '🥛', color: 'bg-blue-100 text-blue-800' },
  { name: 'Bakery', icon: '🍞', color: 'bg-amber-100 text-amber-800' }
];

const IconPicker = ({ currentIcon, currentTags = [], onSelect, onClose, itemName = '' }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedTags, setSelectedTags] = useState(currentTags);
  const [size, setSize] = useState(null); // {w,h} px — set once user drags the resize grip
  const [showAllIcons, setShowAllIcons] = useState(false); // grid is capped until user expands
  const ICON_LIMIT = 60;

  // Custom uploaded icons live under image_type 'item_icon' (128×128 PNGs)
  const [customIcons, setCustomIcons] = useState([]);
  const [uploadingIcon, setUploadingIcon] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/images?image_type=item_icon', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        if (res.ok) setCustomIcons(await res.json());
      } catch {
        // non-critical — custom section just stays empty
      }
    })();
  }, []);

  const handleIconUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingIcon(true);
    try {
      const fd = new FormData();
      fd.append('image', file);
      fd.append('image_type', 'item_icon');
      const res = await fetch('/api/images/upload', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: fd
      });
      if (res.ok) {
        const img = await res.json();
        setCustomIcons(prev => [img, ...prev]);
        handleIconSelect(img.image_url);
      }
    } catch (err) {
      console.error('Icon upload failed:', err);
    } finally {
      setUploadingIcon(false);
      e.target.value = '';
    }
  };

  const startResize = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const el = e.currentTarget.closest('[data-icon-modal]');
    const r = el.getBoundingClientRect();
    const sx = e.clientX, sy = e.clientY;
    const mv = (ev) => setSize({
      w: Math.max(420, Math.min(window.innerWidth * 0.96, r.width + ev.clientX - sx)),
      h: Math.max(360, Math.min(window.innerHeight * 0.96, r.height + ev.clientY - sy)),
    });
    const up = () => { window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', up); };
    window.addEventListener('pointermove', mv);
    window.addEventListener('pointerup', up);
  };

  const categories = ['All', ...Object.keys(ICON_LIBRARY)];

  // Get smart suggestions based on item name
  const getSuggestedIcons = () => {
    if (!itemName) return [];
    
    const nameLower = itemName.toLowerCase();
    const nameWords = nameLower.split(/\s+/);
    
    const suggestions = ICON_DATA
      .filter(item => {
        // Check if any keyword matches any word in the item name
        return item.keywords.some(keyword => 
          nameWords.some(word => 
            keyword.includes(word) || word.includes(keyword)
          )
        );
      })
      .map(item => item.icon)
      .slice(0, 6); // Top 6 suggestions
    
    return suggestions;
  };

  const suggestedIcons = getSuggestedIcons();

  const getFilteredIcons = () => {
    let icons = [];
    
    // Get icons from selected category
    if (selectedCategory === 'All') {
      icons = ICON_DATA.map(item => item.icon);
    } else {
      icons = ICON_LIBRARY[selectedCategory] || [];
    }
    
    // Filter by search term
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase();
      const matchedIcons = ICON_DATA
        .filter(item => 
          item.keywords.some(keyword => keyword.includes(search)) ||
          item.icon.includes(searchTerm)
        )
        .map(item => item.icon);
      
      // Return intersection of category and search results
      if (selectedCategory === 'All') {
        return [...new Set(matchedIcons)];
      }
      return [...new Set(icons.filter(icon => matchedIcons.includes(icon)))];
    }
    
    return [...new Set(icons)];
  };

  const handleIconSelect = (icon) => {
    onSelect(icon);
    onClose();
  };

  const toggleTag = (tagName) => {
    setSelectedTags(prev => 
      prev.includes(tagName) 
        ? prev.filter(t => t !== tagName)
        : [...prev, tagName]
    );
  };

  return (
    <Portal>
    <div className="fixed inset-0 flex items-center justify-center z-50 p-2 sm:p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div
        data-icon-modal
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-[95vw] sm:max-w-2xl max-h-[95vh] sm:max-h-[85vh] overflow-hidden flex flex-col relative"
        style={size ? { width: size.w, height: size.h, maxWidth: '95vw', maxHeight: '95vh' } : undefined}
      >
        {/* resize grip — bottom-right corner (desktop) */}
        <div
          onPointerDown={startResize}
          className="hidden sm:block absolute bottom-1.5 right-1.5 w-5 h-5 cursor-nwse-resize z-20 opacity-40 hover:opacity-90 transition-opacity"
          title="Drag to resize"
        >
          <svg viewBox="0 0 20 20" className="w-full h-full text-gray-500 dark:text-gray-300" fill="currentColor">
            <path d="M20 8 L8 20 H5 L20 5 Z M20 14 L14 20 H11 L20 11 Z" />
          </svg>
        </div>
        {/* Header */}
        <div className="p-3 sm:p-4 lg:p-6 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div className="flex justify-between items-center mb-3 sm:mb-4">
            <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 dark:text-white">Choose Icon</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1">
              <X className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
          </div>

          {/* Search — shared picker search bar (icons + glyphs use the same one) */}
          <PickerSearchBar
            value={searchTerm}
            onChange={(v) => { setSearchTerm(v); setShowAllIcons(false); }}
            placeholder="Search icons & glyphs…"
            autoFocus
            className="mb-3 py-2"
          />

          {/* Suggested Icons */}
          {suggestedIcons.length > 0 && !searchTerm && (
            <div className="mt-3">
              <h3 className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                💡 Suggested for "{itemName}"
              </h3>
              <div className="flex flex-wrap gap-2">
                {suggestedIcons.map((icon, index) => (
                  <button
                    key={index}
                    onClick={() => handleIconSelect(icon)}
                    className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center text-2xl sm:text-3xl rounded-lg bg-primary-100 dark:bg-primary-900 hover:bg-primary-200 dark:hover:bg-primary-800 transition-all hover:scale-110 ring-2 ring-primary-400"
                    title="Suggested"
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Custom Icons — uploaded images (128×128) selectable like emojis */}
        <div className="px-3 sm:px-4 lg:px-6 py-3 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300">Custom Icons</h3>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingIcon}
              className="text-xs font-medium px-2 py-1 rounded-lg bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300 hover:bg-primary-200 dark:hover:bg-primary-800/60 transition-colors disabled:opacity-50"
            >
              {uploadingIcon ? 'Uploading…' : '+ Upload'}
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleIconUpload} />
          </div>
          {customIcons.length > 0 ? (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {customIcons.map((img) => (
                <button
                  key={img.id}
                  onClick={() => handleIconSelect(img.image_url)}
                  className={`w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 ring-2 transition-all hover:scale-110 ${
                    currentIcon === img.image_url ? 'ring-primary-500' : 'ring-transparent'
                  }`}
                >
                  <img src={img.image_url} alt="custom icon" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-400 dark:text-gray-500">No custom icons yet — uploads are resized to 128×128.</p>
          )}
        </div>

        {/* Category Tabs */}
        <div className="px-3 sm:px-4 lg:px-6 pt-3 sm:pt-4 border-b border-gray-200 dark:border-gray-700 overflow-x-auto bg-gray-50 dark:bg-gray-900 flex-shrink-0">
          <h3 className="text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 sm:mb-3">Categories</h3>
          <div className="flex space-x-1 sm:space-x-2 min-w-max pb-2">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => { setSelectedCategory(category); setShowAllIcons(false); }}
                className={`px-2 sm:px-3 lg:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
                  selectedCategory === category
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        {/* Icon Grid */}
        <AnimatedScrollbar3D className="flex-1 min-h-0" height="100%" autoHide={false} thumbColor="bg-gradient-to-b from-primary-400 to-primary-600" glowColor="primary">
          <div className="p-3 sm:p-4 lg:p-6">
          <div className="grid grid-cols-6 xs:grid-cols-7 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 gap-1.5 sm:gap-2">
            {getFilteredIcons().slice(0, showAllIcons ? undefined : ICON_LIMIT).map((icon, index) => (
              <button
                key={index}
                onClick={() => handleIconSelect(icon)}
                className={`w-10 h-10 sm:w-11 sm:h-11 lg:w-12 lg:h-12 flex items-center justify-center text-2xl sm:text-2xl lg:text-3xl rounded-lg transition-all hover:bg-primary-100 dark:hover:bg-primary-900 hover:scale-110 active:scale-95 ${
                  currentIcon === icon ? 'bg-primary-200 dark:bg-primary-800 ring-2 ring-primary-500' : 'bg-gray-100 dark:bg-gray-700'
                }`}
                title={icon}
              >
                {icon}
              </button>
            ))}
          </div>
          {!showAllIcons && getFilteredIcons().length > ICON_LIMIT && (
            <div className="text-center pt-3 pb-1">
              <button
                onClick={() => setShowAllIcons(true)}
                className="px-4 py-2 rounded-lg bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300 text-sm font-medium hover:bg-primary-200 dark:hover:bg-primary-800/60 transition-colors"
              >
                Show all {getFilteredIcons().length} icons
              </button>
            </div>
          )}
          {getFilteredIcons().length === 0 && (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <p className="text-sm sm:text-base">No icons found</p>
              <p className="text-xs sm:text-sm mt-1">Try a different search term</p>
            </div>
          )}
        </div>
        </AnimatedScrollbar3D>

        {/* Footer */}
        <div className="p-3 sm:p-4 lg:p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex-shrink-0">
          <div className="flex justify-between items-center text-xs sm:text-sm">
            <span className="text-gray-600 dark:text-gray-400">
              {showAllIcons ? getFilteredIcons().length : Math.min(ICON_LIMIT, getFilteredIcons().length)} of {getFilteredIcons().length} icons
            </span>
            <button onClick={onClose} className="btn-secondary text-sm sm:text-base px-3 sm:px-4 py-1.5 sm:py-2">
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
    </Portal>
  );
};

export default IconPicker;
export { ICON_LIBRARY, ITEM_TAGS, ICON_DATA };
