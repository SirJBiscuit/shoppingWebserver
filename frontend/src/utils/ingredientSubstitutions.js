// Common ingredient substitutions — keyed by normalized ingredient name.
// Used by the recipe view to suggest swaps when something is missing.
const SUBSTITUTIONS = {
  'butter': ['margarine', 'coconut oil', 'olive oil (3/4 amount)', 'applesauce (baking, 1/2 amount)'],
  'olive oil': ['vegetable oil', 'canola oil', 'avocado oil'],
  'vegetable oil': ['canola oil', 'olive oil', 'melted butter'],
  'canola oil': ['vegetable oil', 'olive oil'],
  'sesame oil': ['peanut oil + a dash of toasted sesame seeds', 'olive oil (flavor will differ)'],
  'milk': ['almond milk', 'oat milk', 'soy milk', '1 cup water + 3 tbsp butter'],
  'buttermilk': ['1 cup milk + 1 tbsp lemon juice or vinegar (rest 5 min)', 'plain yogurt thinned with milk'],
  'heavy cream': ['3/4 cup milk + 1/4 cup melted butter', 'coconut cream', 'evaporated milk'],
  'sour cream': ['plain greek yogurt', 'creme fraiche', 'cream cheese thinned with milk'],
  'cream cheese': ['ricotta + a little cream', 'greek yogurt (strained)', 'cottage cheese (blended smooth)'],
  'yogurt': ['sour cream', 'buttermilk', 'coconut yogurt (dairy-free)'],
  'greek yogurt': ['plain yogurt (strained)', 'sour cream'],
  'egg': ['1/4 cup applesauce', '1/4 cup mashed banana', '1 tbsp ground flax + 3 tbsp water (rest 5 min)', '1/4 cup yogurt'],
  'eggs': ['1/4 cup applesauce per egg', '1/4 cup mashed banana per egg', '1 tbsp ground flax + 3 tbsp water per egg'],
  'flour': ['all-purpose gluten-free blend', 'whole wheat flour (use 7/8 amount)'],
  'all-purpose flour': ['bread flour', 'whole wheat flour (7/8 amount)', '1:1 gluten-free blend'],
  'bread flour': ['all-purpose flour + 1 tsp vital wheat gluten', 'all-purpose flour (slightly less chewy)'],
  'cornstarch': ['2x all-purpose flour', 'arrowroot powder (same amount)', 'tapioca starch (same amount)'],
  'baking powder': ['1/4 tsp baking soda + 1/2 tsp cream of tartar (per tsp)'],
  'baking soda': ['3x baking powder (flavor may differ)'],
  'sugar': ['honey (3/4 amount, reduce liquid)', 'maple syrup (3/4 amount)', 'brown sugar (same amount)'],
  'brown sugar': ['white sugar + 1 tbsp molasses per cup', 'white sugar + 1 tbsp maple syrup'],
  'honey': ['maple syrup', 'agave nectar', 'sugar + a splash of water'],
  'maple syrup': ['honey', 'agave nectar', 'brown sugar dissolved in a little water'],
  'vanilla extract': ['vanilla bean paste', 'almond extract (1/2 amount)', 'maple syrup (in baking)'],
  'garlic': ['1/8 tsp garlic powder per clove', 'shallot', 'garlic-infused oil'],
  'garlic powder': ['1 fresh clove per 1/8 tsp', 'onion powder + a pinch of salt'],
  'onion': ['1 tbsp onion powder per medium onion', 'shallots', 'leeks', 'green onions'],
  'shallot': ['yellow onion + a clove of garlic', 'red onion (milder, use a bit less)'],
  'green onion': ['chives', 'shallot (white part)', 'leek tops'],
  'lemon juice': ['lime juice', 'white vinegar (1/2 amount)', 'citric acid (1/4 tsp per tbsp)'],
  'lime juice': ['lemon juice', 'white wine vinegar'],
  'vinegar': ['lemon juice (double)', 'lime juice', 'white wine'],
  'soy sauce': ['tamari (gluten-free)', 'coconut aminos', 'worcestershire + pinch of salt'],
  'worcestershire sauce': ['soy sauce + splash of vinegar', 'soy sauce + pinch of sugar'],
  'tomato paste': ['canned tomato sauce (3x, simmer down)', 'ketchup (in a pinch, less sweet recipes)'],
  'tomato sauce': ['tomato paste thinned with water', 'crushed tomatoes (simmered)'],
  'crushed tomatoes': ['canned whole tomatoes (blended)', 'tomato sauce'],
  'chicken broth': ['vegetable broth', '1 bouillon cube + 1 cup water', 'water + soy sauce + herbs'],
  'chicken stock': ['chicken broth', 'vegetable stock', 'bouillon + water'],
  'beef broth': ['mushroom broth', 'chicken broth + soy sauce', 'beef bouillon + water'],
  'vegetable broth': ['chicken broth', 'mushroom broth', 'water + bouillon'],
  'parmesan': ['pecorino romano', 'asiago', 'nutritional yeast (dairy-free)'],
  'mozzarella': ['provolone', 'monterey jack', 'fontina', 'vegan mozzarella shreds'],
  'cheddar': ['colby', 'monterey jack', 'gouda'],
  'feta': ['goat cheese', 'queso fresco', 'cotija'],
  'ricotta': ['cottage cheese (blended smooth)', 'cream cheese thinned with milk'],
  'cottage cheese': ['ricotta', 'greek yogurt (in dips/spreads)'],
  'mayonnaise': ['greek yogurt', 'sour cream', 'mashed avocado (in sandwiches)'],
  'dijon mustard': ['yellow mustard + pinch of horseradish', 'whole grain mustard'],
  'ketchup': ['tomato paste + vinegar + pinch of sugar'],
  'paprika': ['smoked paprika', 'chili powder (1/2 amount)', 'cayenne (tiny pinch)'],
  'cumin': ['chili powder', 'coriander + a pinch of paprika'],
  'oregano': ['italian seasoning', 'marjoram', 'thyme'],
  'basil': ['italian seasoning', 'oregano (dried, 1/2 amount)', 'fresh parsley + pinch of oregano'],
  'thyme': ['oregano', 'rosemary (1/2 amount)', 'herbes de provence'],
  'rosemary': ['thyme', 'sage'],
  'cilantro': ['flat-leaf parsley', 'basil (different flavor)'],
  'parsley': ['cilantro', 'chervil', 'celery leaves'],
  'ginger': ['1/4 tsp ground ginger per tbsp fresh', 'galangal'],
  'cinnamon': ['pumpkin pie spice', 'nutmeg (1/2 amount)', 'allspice (1/2 amount)'],
  'nutmeg': ['mace', 'cinnamon', 'allspice'],
  'vanilla': ['vanilla extract', 'vanilla bean paste', 'almond extract (1/2 amount)'],
  'wine': ['broth + splash of vinegar', 'grape juice + vinegar', 'apple cider + vinegar'],
  'red wine': ['beef broth + red wine vinegar', 'grape juice + vinegar'],
  'white wine': ['chicken broth + white wine vinegar', 'apple juice + vinegar'],
  'rice': ['quinoa', 'couscous', 'cauliflower rice', 'orzo'],
  'pasta': ['zucchini noodles', 'spaghetti squash', 'gluten-free pasta'],
  'bread crumbs': ['crushed crackers', 'rolled oats (pulsed)', 'panko', 'crushed cornflakes'],
  'panko': ['regular bread crumbs', 'crushed crackers', 'crushed cornflakes'],
  'tortilla': ['flatbread', 'pita', 'large lettuce leaves (wraps)'],
  'peanut butter': ['almond butter', 'sunflower seed butter (nut-free)', 'tahini (savory uses)'],
  'almonds': ['walnuts', 'pecans', 'sunflower seeds (nut-free)'],
  'walnuts': ['pecans', 'almonds', 'sunflower seeds'],
  'chocolate chips': ['chopped chocolate bar', 'cocoa nibs', 'chopped dried fruit (different profile)'],
  'cocoa powder': ['melted unsweetened chocolate (adjust fat)', 'carob powder'],
  'heavy whipping cream': ['coconut cream (chilled)', 'evaporated milk + butter'],
  'evaporated milk': ['half-and-half', 'whole milk simmered to reduce'],
  'half and half': ['equal parts milk + heavy cream', 'milk + melted butter'],
  'chicken breast': ['chicken thighs', 'turkey breast', 'firm tofu (vegetarian)'],
  'ground beef': ['ground turkey', 'ground chicken', 'lentils + mushrooms (vegetarian)'],
  'ground turkey': ['ground chicken', 'ground beef', 'crumbled tofu'],
  'bacon': ['pancetta', 'turkey bacon', 'smoked paprika + olive oil (flavor in cooking)'],
  'shrimp': ['scallops', 'firm white fish', 'chicken'],
  'salmon': ['trout', 'arctic char', 'tuna steaks'],
  'tofu': ['tempeh', 'paneer', 'cubed chicken (non-veg)'],
  'mushrooms': ['zucchini', 'eggplant', 'lentils (for texture in sauces)'],
  'bell pepper': ['poblano pepper', 'zucchini', 'celery (for crunch)'],
  'spinach': ['kale (chopped small)', 'swiss chard', 'arugula'],
  'kale': ['spinach (cooks faster)', 'swiss chard', 'collard greens'],
  'broccoli': ['cauliflower', 'green beans', 'brussels sprouts'],
  'cauliflower': ['broccoli', 'romanesco'],
  'potato': ['sweet potato', 'cauliflower (mashed)', 'turnip'],
  'sweet potato': ['butternut squash', 'regular potato', 'carrot'],
  'avocado': ['mashed peas + olive oil', 'hummus (spread)', 'greek yogurt (creaminess)'],
  'salsa': ['diced tomatoes + jalapeno + lime', 'pico de gallo', 'enchilada sauce (cooking)'],
  'tortilla chips': ['crushed crackers', 'torn baked tortillas', 'pita chips'],
  'cream of mushroom soup': ['homemade roux + mushrooms + milk', 'cream of chicken soup'],
};

// Normalize an ingredient name to a lookup key: strip qualifiers,
// plurals, and prep phrases so "2 cloves garlic" still hits "garlic".
const normalizeIngredient = (name) => {
  const n = (name || '').toLowerCase()
    .replace(/\([^)]*\)/g, '')                 // drop "(optional)" etc
    .replace(/\b(fresh|frozen|canned|dried|minced|chopped|diced|sliced|crushed|ground|whole|large|small|medium|organic|raw|ripe|unsalted|salted|extra|virgin|low-fat|fat-free|lean|boneless|skinless|powdered|shredded|grated|melted|softened|room temperature|to taste|optional)\b/g, '')
    .replace(/[,;].*$/, '')                    // drop trailing prep notes
    .replace(/\s+/g, ' ')
    .trim();
  return n;
};

// Singular-ish fallback: try progressively shorter suffixes so
// "roma tomatoes" hits "crushed tomatoes"? No — but "cherry tomato" → "tomato".
const lookupSubstitutions = (itemName) => {
  const n = normalizeIngredient(itemName);
  if (!n) return null;
  if (SUBSTITUTIONS[n]) return { key: n, subs: SUBSTITUTIONS[n] };

  // Try without trailing 's' / 'es'
  const singular = n.replace(/(ies|es|s)$/i, (m) => (m.toLowerCase() === 'ies' ? 'y' : ''));
  if (SUBSTITUTIONS[singular]) return { key: singular, subs: SUBSTITUTIONS[singular] };

  // Try tail words: "cherry tomatoes" → "tomatoes" → "tomato"
  const words = n.split(' ');
  while (words.length > 1) {
    words.shift();
    const tail = words.join(' ');
    if (SUBSTITUTIONS[tail]) return { key: tail, subs: SUBSTITUTIONS[tail] };
    const tailSing = tail.replace(/(ies|es|s)$/i, (m) => (m.toLowerCase() === 'ies' ? 'y' : ''));
    if (SUBSTITUTIONS[tailSing]) return { key: tailSing, subs: SUBSTITUTIONS[tailSing] };
  }
  return null;
};

export { SUBSTITUTIONS, lookupSubstitutions };
export default lookupSubstitutions;
