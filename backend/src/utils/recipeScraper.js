const axios = require('axios');
const cheerio = require('cheerio');

/**
 * Universal recipe scraper - detects website and uses appropriate scraper
 * @param {string} url - Recipe URL from any supported site
 * @returns {Object} Recipe data with ingredients, instructions, image, etc.
 */
async function scrapeRecipe(url) {
  const hostname = new URL(url).hostname.toLowerCase();
  
  // Detect which site and use appropriate scraper
  if (hostname.includes('foodnetwork.com')) {
    return scrapeFoodNetworkRecipe(url);
  } else if (hostname.includes('allrecipes.com')) {
    return scrapeAllRecipes(url);
  } else if (hostname.includes('tasty.co')) {
    return scrapeTasty(url);
  } else if (hostname.includes('delish.com')) {
    return scrapeDelish(url);
  } else if (hostname.includes('epicurious.com')) {
    return scrapeEpicurious(url);
  } else if (hostname.includes('bonappetit.com')) {
    return scrapeBonAppetit(url);
  } else if (hostname.includes('seriouseats.com')) {
    return scrapeSeriousEats(url);
  } else if (hostname.includes('simplyrecipes.com')) {
    return scrapeSimplyRecipes(url);
  } else {
    // Try generic JSON-LD scraper for any site
    return scrapeGenericRecipe(url);
  }
}

/**
 * Generic recipe scraper using JSON-LD (works for most recipe sites)
 * @param {string} url - Recipe URL
 * @returns {Object} Recipe data
 */
async function scrapeGenericRecipe(url) {
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    const $ = cheerio.load(response.data);
    
    // Try to find JSON-LD structured data (most recipe sites use this)
    const jsonLdScripts = $('script[type="application/ld+json"]');
    
    for (let i = 0; i < jsonLdScripts.length; i++) {
      try {
        const jsonData = JSON.parse($(jsonLdScripts[i]).html());
        const recipe = Array.isArray(jsonData) 
          ? jsonData.find(item => item['@type'] === 'Recipe')
          : jsonData['@type'] === 'Recipe' ? jsonData : null;
        
        if (recipe) {
          return formatRecipeFromJsonLd(recipe, url);
        }
      } catch (e) {
        continue;
      }
    }
    
    throw new Error('No recipe data found on this page');
  } catch (error) {
    console.error('Error scraping recipe:', error);
    throw new Error('Failed to scrape recipe from URL');
  }
}

/**
 * Format recipe data from JSON-LD
 */
function formatRecipeFromJsonLd(recipe, url) {
  return {
    name: recipe.name,
    description: recipe.description || '',
    image_url: recipe.image?.url || recipe.image?.[0] || recipe.image || '',
    servings: parseInt(recipe.recipeYield) || 4,
    prep_time: parseDuration(recipe.prepTime),
    cook_time: parseDuration(recipe.cookTime),
    total_time: parseDuration(recipe.totalTime),
    instructions: Array.isArray(recipe.recipeInstructions)
      ? recipe.recipeInstructions.map(step => 
          typeof step === 'string' ? step : step.text
        ).join('\n\n')
      : recipe.recipeInstructions || '',
    ingredients: Array.isArray(recipe.recipeIngredient)
      ? recipe.recipeIngredient.map((ing, index) => parseIngredient(ing, index))
      : [],
    category: recipe.recipeCategory || 'Main Dish',
    cuisine: recipe.recipeCuisine || '',
    author: recipe.author?.name || new URL(url).hostname,
    source_url: url
  };
}

/**
 * Scrape recipe from Food Network
 */
async function scrapeFoodNetworkRecipe(url) {
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    const $ = cheerio.load(response.data);
    
    // Extract recipe data from JSON-LD structured data
    const jsonLdScript = $('script[type="application/ld+json"]').first().html();
    let recipeData = {};
    
    if (jsonLdScript) {
      try {
        const jsonData = JSON.parse(jsonLdScript);
        // Handle array of JSON-LD objects
        const recipe = Array.isArray(jsonData) 
          ? jsonData.find(item => item['@type'] === 'Recipe')
          : jsonData['@type'] === 'Recipe' ? jsonData : null;
        
        if (recipe) {
          recipeData = {
            name: recipe.name,
            description: recipe.description || '',
            image_url: recipe.image?.url || recipe.image || '',
            servings: parseInt(recipe.recipeYield) || 4,
            prep_time: parseDuration(recipe.prepTime),
            cook_time: parseDuration(recipe.cookTime),
            total_time: parseDuration(recipe.totalTime),
            instructions: Array.isArray(recipe.recipeInstructions)
              ? recipe.recipeInstructions.map(step => 
                  typeof step === 'string' ? step : step.text
                ).join('\n\n')
              : recipe.recipeInstructions || '',
            ingredients: Array.isArray(recipe.recipeIngredient)
              ? recipe.recipeIngredient.map((ing, index) => parseIngredient(ing, index))
              : [],
            category: recipe.recipeCategory || 'Main Dish',
            cuisine: recipe.recipeCuisine || '',
            author: recipe.author?.name || 'Food Network',
            source_url: url
          };
        }
      } catch (parseError) {
        console.error('Error parsing JSON-LD:', parseError);
      }
    }
    
    // Fallback to HTML scraping if JSON-LD fails
    if (!recipeData.name) {
      recipeData = {
        name: $('h1.o-AssetTitle__a-Headline').text().trim() || 
              $('.recipe-title').text().trim() ||
              $('h1').first().text().trim(),
        description: $('.o-AssetDescription__a-Description').text().trim() ||
                    $('.recipe-description').text().trim(),
        image_url: $('.m-MediaBlock__a-Image img').attr('src') ||
                  $('.recipe-image img').attr('src') || '',
        servings: parseInt($('.o-RecipeInfo__a-Description:contains("Servings")').text().match(/\d+/)?.[0]) || 4,
        prep_time: $('.o-RecipeInfo__a-Description:contains("Prep")').text().trim(),
        cook_time: $('.o-RecipeInfo__a-Description:contains("Cook")').text().trim(),
        instructions: $('.o-Method__m-Body p').map((i, el) => $(el).text().trim()).get().join('\n\n') ||
                     $('.recipe-instructions li').map((i, el) => $(el).text().trim()).get().join('\n\n'),
        ingredients: $('.o-Ingredients__a-Ingredient').map((i, el) => {
          return parseIngredient($(el).text().trim(), i);
        }).get(),
        source_url: url
      };
    }
    
    return recipeData;
  } catch (error) {
    console.error('Error scraping recipe:', error);
    throw new Error('Failed to scrape recipe from URL');
  }
}

/**
 * Parse ISO 8601 duration to minutes
 * @param {string} duration - ISO 8601 duration (e.g., "PT30M")
 * @returns {number} Duration in minutes
 */
function parseDuration(duration) {
  if (!duration) return null;
  
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
  if (!match) return null;
  
  const hours = parseInt(match[1]) || 0;
  const minutes = parseInt(match[2]) || 0;
  
  return hours * 60 + minutes;
}

/**
 * Parse ingredient string into structured data
 * @param {string} ingredientText - Raw ingredient text
 * @param {number} sortOrder - Sort order index
 * @returns {Object} Parsed ingredient
 */
function parseIngredient(ingredientText, sortOrder) {
  // Common units to detect
  const units = ['cup', 'cups', 'tablespoon', 'tablespoons', 'tbsp', 'teaspoon', 'teaspoons', 'tsp',
                 'pound', 'pounds', 'lb', 'lbs', 'ounce', 'ounces', 'oz', 'gram', 'grams', 'g',
                 'kilogram', 'kilograms', 'kg', 'liter', 'liters', 'l', 'milliliter', 'milliliters', 'ml',
                 'pint', 'pints', 'quart', 'quarts', 'gallon', 'gallons', 'clove', 'cloves',
                 'piece', 'pieces', 'slice', 'slices', 'can', 'cans', 'package', 'packages', 'pkg'];
  
  // Try to extract quantity and unit
  const quantityMatch = ingredientText.match(/^(\d+(?:\/\d+)?(?:\s+\d+\/\d+)?|\d+\.\d+)/);
  let quantity = 1;
  let unit = '';
  let itemName = ingredientText;
  
  if (quantityMatch) {
    const quantityStr = quantityMatch[1];
    // Handle fractions like "1 1/2" or "1/2"
    if (quantityStr.includes('/')) {
      const parts = quantityStr.split(/\s+/);
      if (parts.length === 2) {
        // "1 1/2" format
        const whole = parseInt(parts[0]);
        const [num, den] = parts[1].split('/').map(Number);
        quantity = whole + (num / den);
      } else {
        // "1/2" format
        const [num, den] = quantityStr.split('/').map(Number);
        quantity = num / den;
      }
    } else {
      quantity = parseFloat(quantityStr);
    }
    
    // Remove quantity from item name
    itemName = ingredientText.substring(quantityMatch[0].length).trim();
    
    // Try to extract unit
    const unitMatch = itemName.match(new RegExp(`^(${units.join('|')})\\b`, 'i'));
    if (unitMatch) {
      unit = unitMatch[1];
      itemName = itemName.substring(unit.length).trim();
    }
  }
  
  // Clean up item name (remove parenthetical notes)
  const cleanName = itemName.replace(/\([^)]*\)/g, '').trim();
  const notes = itemName.match(/\(([^)]*)\)/)?.[1] || '';
  
  return {
    item_name: cleanName || itemName,
    quantity: quantity,
    unit: unit,
    is_optional: ingredientText.toLowerCase().includes('optional'),
    notes: notes,
    sort_order: sortOrder
  };
}

/**
 * Search for recipes on Food Network
 * @param {string} query - Search query
 * @returns {Array} Array of recipe search results
 */
async function searchFoodNetworkRecipes(query) {
  try {
    // Food Network search URL
    const searchUrl = `https://www.foodnetwork.com/search/${encodeURIComponent(query)}-`;
    
    const response = await axios.get(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    const $ = cheerio.load(response.data);
    const results = [];
    
    // Extract recipe cards
    $('.m-PromoList__a-ListItem').each((i, el) => {
      const $card = $(el);
      const title = $card.find('.m-MediaBlock__a-Headline').text().trim();
      const url = $card.find('a').attr('href');
      const image = $card.find('img').attr('src');
      const description = $card.find('.m-MediaBlock__a-Description').text().trim();
      
      if (title && url) {
        results.push({
          title,
          url: url.startsWith('http') ? url : `https://www.foodnetwork.com${url}`,
          image,
          description
        });
      }
    });
    
    return results.slice(0, 10); // Return top 10 results
  } catch (error) {
    console.error('Error searching recipes:', error);
    return [];
  }
}

/**
 * Site-specific scrapers (all use generic JSON-LD as fallback)
 */
async function scrapeAllRecipes(url) {
  return scrapeGenericRecipe(url);
}

async function scrapeTasty(url) {
  return scrapeGenericRecipe(url);
}

async function scrapeDelish(url) {
  return scrapeGenericRecipe(url);
}

async function scrapeEpicurious(url) {
  return scrapeGenericRecipe(url);
}

async function scrapeBonAppetit(url) {
  return scrapeGenericRecipe(url);
}

async function scrapeSeriousEats(url) {
  return scrapeGenericRecipe(url);
}

async function scrapeSimplyRecipes(url) {
  return scrapeGenericRecipe(url);
}

/**
 * Universal search function - searches multiple recipe sites
 * @param {string} query - Search query
 * @returns {Array} Array of recipe search results from multiple sites
 */
async function searchRecipes(query) {
  const results = [];
  
  try {
    // Search Food Network
    const fnResults = await searchFoodNetworkRecipes(query);
    results.push(...fnResults.map(r => ({ ...r, source: 'Food Network' })));
  } catch (e) {
    console.error('Food Network search failed:', e.message);
  }
  
  try {
    // Search AllRecipes
    const arResults = await searchAllRecipes(query);
    results.push(...arResults.map(r => ({ ...r, source: 'AllRecipes' })));
  } catch (e) {
    console.error('AllRecipes search failed:', e.message);
  }
  
  return results;
}

/**
 * Search AllRecipes
 */
async function searchAllRecipes(query) {
  try {
    const searchUrl = `https://www.allrecipes.com/search?q=${encodeURIComponent(query)}`;
    
    const response = await axios.get(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    const $ = cheerio.load(response.data);
    const results = [];
    
    $('a.card__titleLink').each((i, el) => {
      if (i >= 10) return false; // Limit to 10 results
      
      const $link = $(el);
      const title = $link.text().trim();
      const url = $link.attr('href');
      const $card = $link.closest('.card');
      const image = $card.find('img').attr('data-src') || $card.find('img').attr('src');
      
      if (title && url) {
        results.push({
          title,
          url: url.startsWith('http') ? url : `https://www.allrecipes.com${url}`,
          image,
          description: ''
        });
      }
    });
    
    return results;
  } catch (error) {
    console.error('Error searching AllRecipes:', error);
    return [];
  }
}

/**
 * Get supported recipe sites
 */
function getSupportedSites() {
  return [
    { name: 'Food Network', domain: 'foodnetwork.com', searchable: true },
    { name: 'AllRecipes', domain: 'allrecipes.com', searchable: true },
    { name: 'Tasty', domain: 'tasty.co', searchable: false },
    { name: 'Delish', domain: 'delish.com', searchable: false },
    { name: 'Epicurious', domain: 'epicurious.com', searchable: false },
    { name: 'Bon Appétit', domain: 'bonappetit.com', searchable: false },
    { name: 'Serious Eats', domain: 'seriouseats.com', searchable: false },
    { name: 'Simply Recipes', domain: 'simplyrecipes.com', searchable: false },
    { name: 'Any site with Recipe Schema', domain: '*', searchable: false }
  ];
}

module.exports = {
  scrapeRecipe,
  scrapeFoodNetworkRecipe,
  searchFoodNetworkRecipes,
  searchRecipes,
  searchAllRecipes,
  getSupportedSites,
  parseIngredient
};
