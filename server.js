import express from "express";
import dotenv from "dotenv";
import fetch from "node-fetch";
import OpenAI from "openai";
import path from "path";
import { fileURLToPath } from "url";
import { fallbackRestaurants } from "./restaurants.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());
app.use(express.static("public"));

// Initialize OpenAI with error handling
let openai = null;
try {
  if (process.env.OPENAI_API_KEY) {
    openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    console.log("✅ OpenAI initialized successfully");
  } else {
    console.error("❌ OPENAI_API_KEY not found in environment variables");
  }
} catch (error) {
  console.error("❌ Failed to initialize OpenAI:", error.message);
}

// --- Utility: Clean restaurant object ---
function safeRestaurant(r) {
  return {
    name: r.name || "Unknown",
    location: r.vicinity || r.formatted_address || "N/A",
    price: r.price_level ? "$".repeat(r.price_level) : "N/A",
    rating: r.rating ? r.rating.toFixed(1) : null
  };
}

// --- Step A: Parse User Intent ---
async function rewriteQuery(userInput, userLocation = null) {
  try {
    if (!openai) {
      console.error("OpenAI not initialized - using fallback intent");
      return {
        domain: "food",
        query: "restaurant",
        location: userLocation || "Singapore",
        dietary_restrictions: [],
        special_occasions: [],
        price_range: "moderate",
        ambiance: [],
        features: [],
        cuisine_type: "any",
        min_rating: 0,
        min_reviews: 0
      };
    }
    
    // Prepare location context for the AI
    const locationContext = userLocation ? `User's current location: ${userLocation}` : "No specific location provided";
    
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are an expert food recommendation assistant with deep understanding of natural language. Extract user intent for food recommendations with comprehensive filtering.

          CRITICAL: Pay close attention to the user's exact words and intent:
          - "cheap", "affordable", "budget", "inexpensive" = budget price range
          - "cafe", "coffee shop", "coffee" = cafe domain (NOT restaurant), query should be "cafe"
          - "nearby", "near me", "close by" = use the user's current location provided below
          - "expensive", "luxury", "high-end" = expensive/luxury price range
          - "moderate", "mid-range", "reasonable" = moderate price range
          - "highly rated", "best rated", "top rated", "excellent" = requires 4.8+ stars
          - "popular", "famous", "well-known", "trending" = requires 500+ reviews
          - "hidden gem", "local favorite", "underrated" = lower review count but high quality
          
          For query field: If user says "cafe with cheap food", query should be "cafe" not "food"

          ${locationContext}

          Analyze the user's request and extract:
          - Domain: cafe, food, bar, dessert, fast_food, fine_dining, casual_dining
          - Query: specific food type or cuisine (if user says "cafe", query should be "cafe" not "restaurant")
          - Location: use the user's current location if they say "nearby" or "near me", otherwise use their specified location
          - Dietary restrictions: halal, vegetarian, vegan, gluten-free, keto, paleo, dairy-free, nut-free, kosher
          - Special occasions: romantic, business, family, celebration, casual, date_night, birthday, anniversary
          - Price range: budget, moderate, expensive, luxury
          - Ambiance: quiet, lively, outdoor, rooftop, cozy, modern, traditional
          - Features: wifi, parking, delivery, takeout, reservations_required, kid_friendly, pet_friendly
          - Cuisine type: italian, chinese, japanese, indian, mexican, thai, korean, french, american, etc.

          Examples:
          - "nearby cafe with cheap but good food" → domain: "cafe", price_range: "budget", location: use current location, min_rating: 0, min_reviews: 0
          - "expensive romantic restaurant" → domain: "food", price_range: "expensive", special_occasions: ["romantic"], min_rating: 0, min_reviews: 0
          - "halal food near me" → domain: "food", dietary_restrictions: ["halal"], location: use current location, min_rating: 0, min_reviews: 0
          - "highly rated italian restaurant" → domain: "food", cuisine_type: "italian", min_rating: 4.8, min_reviews: 0
          - "popular cafe" → domain: "cafe", min_rating: 0, min_reviews: 500
          - "famous restaurant with excellent food" → domain: "food", min_rating: 4.8, min_reviews: 500

          CRITICAL: You MUST return ONLY valid JSON. Do NOT use markdown code blocks. Do NOT add explanations. Do NOT add any text before or after the JSON. Just return the raw JSON object.

          Output JSON:
          {
            "domain": "cafe|food|bar|dessert|fast_food|fine_dining|casual_dining",
            "query": "specific food type or cuisine",
            "location": "city or area",
            "dietary_restrictions": ["halal","vegetarian","vegan","gluten-free","keto","paleo","dairy-free","nut-free","kosher"],
            "special_occasions": ["romantic","business","family","celebration","casual","date_night","birthday","anniversary"],
            "price_range": "budget|moderate|expensive|luxury",
            "ambiance": ["quiet","lively","outdoor","rooftop","cozy","modern","traditional"],
            "features": ["wifi","parking","delivery","takeout","reservations_required","kid_friendly","pet_friendly"],
            "cuisine_type": "italian|chinese|japanese|indian|mexican|thai|korean|french|american|etc",
            "min_rating": 0,
            "min_reviews": 0
          }
          
          Defaults: { "domain":"food", "query":"restaurant", "location":"Singapore", "dietary_restrictions":[], "special_occasions":[], "price_range":"moderate", "ambiance":[], "features":[], "cuisine_type":"any" }`
        },
        { role: "user", content: userInput }
      ]
    });

    // Extract JSON from potential markdown code blocks
    let content = completion.choices[0].message.content.trim();
    
    // More robust markdown removal
    content = content.replace(/^```json\s*/, '').replace(/^```\s*/, '').replace(/\s*```$/, '');
    
    // Try to find JSON object/array in the content
    const jsonMatch = content.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    if (jsonMatch) {
      content = jsonMatch[0];
    }
    
    console.log("🔍 Extracted content:", content.substring(0, 100) + "...");
    
    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch (parseError) {
      console.error("JSON Parse Error:", parseError.message);
      console.error("Content that failed to parse:", content);
      throw new Error(`Failed to parse AI response: ${parseError.message}`);
    }
    
    // Validate required fields
    if (!parsed.domain || !parsed.query || !parsed.location) {
      console.error("Missing required fields in AI response:", parsed);
      throw new Error('Invalid response structure from AI');
    }
    
    // Override location if user provided current location and they asked for "nearby"
    if (userLocation && (userInput.toLowerCase().includes('nearby') || userInput.toLowerCase().includes('near me'))) {
      parsed.location = userLocation;
      console.log(`📍 Using user's actual location: ${userLocation}`);
    }
    
    // Also fix if AI parsed "nearby" as location
    if (parsed.location === 'nearby' && userLocation) {
      parsed.location = userLocation;
      console.log(`📍 Fixed 'nearby' to actual location: ${userLocation}`);
    }
    
    // Also fix if AI parsed "current location" as location
    if (parsed.location === 'current location' && userLocation) {
      parsed.location = userLocation;
      console.log(`📍 Fixed 'current location' to actual location: ${userLocation}`);
    }
    
    return parsed;
  } catch (err) {
    console.error("Rewrite error:", err);
    
    // Try to extract basic info from user input as fallback
    const fallback = { 
      domain: "food", 
      query: "restaurant", 
      location: userLocation || "Singapore", 
      dietary_restrictions: [], 
      special_occasions: [], 
      price_range: "moderate", 
      ambiance: [], 
      features: [], 
      cuisine_type: "any",
      min_rating: 0,
      min_reviews: 0
    };
    
    // Basic keyword detection as fallback
    const input = userInput.toLowerCase();
    if (input.includes('cafe') || input.includes('coffee')) {
      fallback.domain = 'cafe';
      fallback.query = 'cafe';
    }
    if (input.includes('cheap') || input.includes('budget')) {
      fallback.price_range = 'budget';
    }
    if (input.includes('expensive') || input.includes('luxury')) {
      fallback.price_range = 'expensive';
    }
    if (input.includes('highly rated') || input.includes('best rated')) {
      fallback.min_rating = 4.8;
    }
    if (input.includes('popular') || input.includes('famous')) {
      fallback.min_reviews = 500;
    }
    
    return fallback;
  }
}

// --- Step B: Enhanced Google Maps Search ---
async function searchGoogle(userIntent) {
  try {
    const { query, location, dietary_restrictions, cuisine_type, price_range, min_rating, min_reviews } = userIntent;
    
    // Build comprehensive search query
    let searchQuery = query;
    if (cuisine_type && cuisine_type !== "any") {
      searchQuery += ` ${cuisine_type}`;
    }
    
    // Add dietary restrictions to search
    if (dietary_restrictions && dietary_restrictions.length > 0) {
      searchQuery += ` ${dietary_restrictions.join(" ")}`;
    }
    
    const q = encodeURIComponent(`${searchQuery} near ${location}`);
    
    // Use multiple Google Places API endpoints for better results
    const baseUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json`;
    const params = new URLSearchParams({
      query: q,
      key: process.env.GOOGLE_MAPS_API_KEY,
      type: 'restaurant',
      opennow: 'true'
    });
    
    // Add price level filter if specified
    if (price_range) {
      const priceLevels = {
        'budget': '1',
        'moderate': '2,3', 
        'expensive': '3,4',
        'luxury': '4'
      };
      if (priceLevels[price_range]) {
        params.append('maxprice', priceLevels[price_range].split(',')[1] || priceLevels[price_range]);
        params.append('minprice', priceLevels[price_range].split(',')[0]);
      }
    }
    
    const url = `${baseUrl}?${params}`;
    console.log("🌍 Google API:", url);

    const res = await fetch(url);
    const data = await res.json();

    if (data.status !== "OK") {
      console.error("Google API Error:", data.status, data.error_message);
      console.error("This usually means: API key invalid, quota exceeded, or API not enabled");
      return [];
    }

    if (!data.results || data.results.length === 0) {
      console.log("No results from Google Places API");
      return [];
    }

    // Filter and enhance results
    let results = data.results
      .filter(p => p.business_status !== "CLOSED_PERMANENTLY")
      .filter(p => {
        // Apply minimum 4.4 star filter (NEVER recommend below 4.4)
        if (!p.rating || p.rating < 4.4) return false;
        
        // Apply custom rating filter if specified
        if (min_rating && min_rating > 0) {
          if (p.rating < min_rating) return false;
        }
        
        // Apply review count filter
        if (min_reviews && min_reviews > 0) {
          if (!p.user_ratings_total || p.user_ratings_total < min_reviews) return false;
        }
        
        return true;
      })
      .map(place => ({
        ...place,
        // Add dietary restriction indicators
        has_dietary_options: checkDietaryOptions(place, dietary_restrictions),
        // Add price level mapping
        price_category: getPriceCategory(place.price_level),
        // Add cuisine type if available
        cuisine_indicators: extractCuisineIndicators(place),
        // Add rating penalty for selection bias
        rating_penalty: calculateRatingPenalty(place.rating),
        // Add low rating reasoning
        low_rating_reason: generateLowRatingReason(place)
      }))
      .sort((a, b) => {
        // Sort by rating with penalty consideration
        const scoreA = (a.rating || 0) - (a.rating_penalty || 0);
        const scoreB = (b.rating || 0) - (b.rating_penalty || 0);
        return scoreB - scoreA; // Higher score first
      })
      .slice(0, 20); // Get more results for better filtering

    console.log(`🔍 Filtered to ${results.length} results (rating: 4.4+ required, reviews: ${min_reviews || 'any'})`);
    return results;
  } catch (err) {
    console.error("Google API fetch error:", err);
    console.error("This could be: network issue, API key problem, or quota exceeded");
    return [];
  }
}

// Helper function to check dietary options
function checkDietaryOptions(place, dietaryRestrictions) {
  if (!dietaryRestrictions || dietaryRestrictions.length === 0) return {};
  
  const indicators = {};
  const nameAndTypes = `${place.name || ''} ${place.types?.join(' ') || ''}`.toLowerCase();
  
  dietaryRestrictions.forEach(restriction => {
    switch (restriction) {
      case 'halal':
        indicators.halal = nameAndTypes.includes('halal') || nameAndTypes.includes('muslim');
        break;
      case 'vegetarian':
        indicators.vegetarian = nameAndTypes.includes('vegetarian') || nameAndTypes.includes('veggie');
        break;
      case 'vegan':
        indicators.vegan = nameAndTypes.includes('vegan');
        break;
      case 'gluten-free':
        indicators.glutenFree = nameAndTypes.includes('gluten') || nameAndTypes.includes('gluten-free');
        break;
    }
  });
  
  return indicators;
}

// Helper function to categorize price levels
function getPriceCategory(priceLevel) {
  const categories = {
    0: 'budget',
    1: 'budget', 
    2: 'moderate',
    3: 'expensive',
    4: 'luxury'
  };
  return categories[priceLevel] || 'moderate';
}

// Helper function to extract cuisine indicators
function extractCuisineIndicators(place) {
  const types = place.types || [];
  const cuisineTypes = [
    'italian', 'chinese', 'japanese', 'indian', 'mexican', 'thai', 
    'korean', 'french', 'american', 'mediterranean', 'middle_eastern'
  ];
  
  return cuisineTypes.filter(cuisine => 
    types.some(type => type.includes(cuisine))
  );
}

// Calculate rating penalty (higher penalty for lower ratings)
function calculateRatingPenalty(rating) {
  if (!rating) return 0.9; // Heavy penalty for no rating
  
  if (rating >= 4.8) return 0; // No penalty for 4.8+
  if (rating >= 4.6) return 0.1; // Light penalty for 4.6-4.7
  if (rating >= 4.4) return 0.3; // Medium penalty for 4.4-4.5
  
  return 0.9; // Heavy penalty for below 4.4 (shouldn't happen due to filter)
}

// Generate reasoning for lower-rated places
function generateLowRatingReason(place) {
  const rating = place.rating;
  if (!rating || rating >= 4.6) return null;
  
  const reasons = {
    4.5: [
      "While not the highest rated, this place offers excellent value and authentic local experience",
      "Slightly lower rating but known for consistent quality and friendly service",
      "Good option with solid reviews and unique local charm"
    ],
    4.4: [
      "This place has a dedicated following despite mixed reviews - often due to specific preferences",
      "Lower rating but offers something unique that other highly-rated places don't have",
      "Good choice if you're looking for authentic local experience over perfect service"
    ]
  };
  
  const ratingKey = Math.floor(rating * 10) / 10;
  const reasonList = reasons[ratingKey] || reasons[4.4];
  return reasonList[Math.floor(Math.random() * reasonList.length)];
}

// --- Step C: Advanced Filtering and AI-Powered Recommendations ---
async function filterResults(userIntent, results) {
  if (!results || results.length === 0) return [];
  
  try {
    if (!openai) {
      console.error("OpenAI not initialized - using basic filtering");
      return results.slice(0, 3).map(place => ({
        ...safeRestaurant(place),
        reason: `Good option based on your search criteria`,
        dietary_match: "Standard options available",
        occasion_fit: "Suitable for your needs",
        unique_selling_point: "Well-rated establishment"
      }));
    }
    // Prepare context for AI analysis
    const context = {
      user_intent: userIntent,
      total_results: results.length,
      dietary_restrictions: userIntent.dietary_restrictions || [],
      special_occasions: userIntent.special_occasions || [],
      price_range: userIntent.price_range || 'moderate',
      ambiance: userIntent.ambiance || [],
      features: userIntent.features || [],
      min_rating: userIntent.min_rating || 0,
      min_reviews: userIntent.min_reviews || 0
    };

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are an expert food recommendation AI with deep knowledge of restaurants, dietary requirements, and special occasions. You provide BETTER recommendations than Google Maps by understanding context, quality, and user intent.

          Your task: Analyze restaurant data and provide the TOP 3 BEST recommendations based on user intent.

          User Context:
          - Dietary Restrictions: ${context.dietary_restrictions.join(', ') || 'None specified'}
          - Special Occasions: ${context.special_occasions.join(', ') || 'None specified'}
          - Price Range: ${context.price_range}
          - Desired Ambiance: ${context.ambiance.join(', ') || 'Any'}
          - Required Features: ${context.features.join(', ') || 'Any'}
          - Quality Requirements: ${context.min_rating > 0 ? `Min ${context.min_rating} stars` : 'Any rating'} ${context.min_reviews > 0 ? `, Min ${context.min_reviews} reviews` : ''}

          ADVANTAGES OVER GOOGLE MAPS:
          1. Context-aware filtering (Google just shows popular places)
          2. Dietary restriction intelligence (Google doesn't understand dietary needs well)
          3. Special occasion matching (Google doesn't consider romantic vs business vs family)
          4. Quality over quantity (Google shows too many mediocre options)
          5. Personalized explanations (Google gives generic info)

          RATING QUALITY REQUIREMENTS:
          - NEVER recommend anything below 4.4 stars
          - Heavily favor 4.8+ star places (no penalty)
          - Light penalty for 4.6-4.7 stars
          - Medium penalty for 4.4-4.5 stars (least likely to suggest)
          - If recommending 4.4-4.5 star places, provide strong justification

          For each recommendation, provide:
          1. A compelling reason WHY this place is perfect for their specific needs
          2. How it matches their dietary restrictions (if any)
          3. Why it's suitable for their special occasion (if any)
          4. What makes it BETTER than typical Google search results
          5. If rating is 4.6 or below, include the low_rating_reason provided
          6. Specific details that show you understand their unique requirements

          CRITICAL: You MUST return ONLY valid JSON array. Do NOT use markdown code blocks. Do NOT add explanations. Do NOT add any text before or after the JSON. Just return the raw JSON array.

          Output JSON array with exactly 3 recommendations:
          [
            {
              "name": "Restaurant Name",
              "location": "Address",
              "price": "Price Level",
              "rating": "X.X",
              "reason": "Detailed explanation of why this is perfect for their specific needs",
              "dietary_match": "How it matches their dietary requirements",
              "occasion_fit": "Why it's perfect for their special occasion",
              "unique_selling_point": "What makes this better than a typical search result"
            }
          ]

          Focus on QUALITY over quantity. Be specific and helpful.`
        },
        {
          role: "user",
          content: `Here are ${results.length} restaurant options to analyze:

          ${JSON.stringify(results.map(place => ({
            name: place.name,
            location: place.vicinity || place.formatted_address,
            price: place.price_level ? "$".repeat(place.price_level) : "N/A",
            rating: place.rating,
            types: place.types,
            has_dietary_options: place.has_dietary_options,
            price_category: place.price_category,
            cuisine_indicators: place.cuisine_indicators,
            user_ratings_total: place.user_ratings_total,
            photos: place.photos ? place.photos.length : 0,
            rating_penalty: place.rating_penalty,
            low_rating_reason: place.low_rating_reason
          })), null, 2)}

          Please select the TOP 3 that best match the user's specific requirements.`
        }
      ]
    });

    // Extract JSON from potential markdown code blocks
    let content = completion.choices[0].message.content.trim();
    
    // More robust markdown removal
    content = content.replace(/^```json\s*/, '').replace(/^```\s*/, '').replace(/\s*```$/, '');
    
    // Try to find JSON array in the content
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      content = jsonMatch[0];
    }
    
    console.log("🔍 Filter content:", content.substring(0, 100) + "...");
    
    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch (parseError) {
      console.error("Filter JSON Parse Error:", parseError.message);
      console.error("Filter content that failed to parse:", content);
      throw new Error(`Failed to parse AI filter response: ${parseError.message}`);
    }
    
    // Validate response structure
    if (!Array.isArray(parsed)) {
      if (parsed && typeof parsed === 'object') {
        parsed = [parsed];
      } else {
        throw new Error('Invalid response structure from AI - expected array');
      }
    }
    
    // Validate each recommendation has required fields
    parsed = parsed.filter(rec => rec && rec.name && rec.location);
    
    console.log(`🤖 AI returned ${parsed.length} recommendations`);
    
    // Pad with fallbacks if needed to ensure we always have 3 results
    while (parsed.length < 3 && results.length > parsed.length) {
      const fallbackIndex = parsed.length;
      if (results[fallbackIndex]) {
        parsed.push({
          ...safeRestaurant(results[fallbackIndex]),
          reason: `Good option based on your search criteria`,
          dietary_match: "Standard options available",
          occasion_fit: "Suitable for your needs",
          unique_selling_point: "Well-rated establishment"
        });
        console.log(`➕ Added fallback recommendation ${parsed.length}: ${results[fallbackIndex].name}`);
      }
    }
    
    // If we still don't have 3, duplicate the best ones
    while (parsed.length < 3 && parsed.length > 0) {
      const duplicateIndex = parsed.length % parsed.length;
      const duplicate = { ...parsed[duplicateIndex] };
      duplicate.name = duplicate.name + " (Alternative)";
      duplicate.reason = duplicate.reason + " - Another great option in the area";
      parsed.push(duplicate);
      console.log(`🔄 Duplicated recommendation to reach 3 total`);
    }

    console.log(`✅ Final recommendations count: ${parsed.length}`);
    return parsed.slice(0, 3);
  } catch (err) {
    console.error("AI Filter error:", err);
    
    // Fallback to basic filtering with enhanced reasons
    let fallbackResults = results.slice(0, 3).map(place => ({
      ...safeRestaurant(place),
      reason: generateFallbackReason(place, userIntent),
      dietary_match: "Please check with restaurant directly",
      occasion_fit: "Suitable for various occasions",
      unique_selling_point: "Well-rated establishment"
    }));
    
    // Ensure we have exactly 3 results
    while (fallbackResults.length < 3 && results.length > fallbackResults.length) {
      const fallbackIndex = fallbackResults.length;
      if (results[fallbackIndex]) {
        fallbackResults.push({
          ...safeRestaurant(results[fallbackIndex]),
          reason: generateFallbackReason(results[fallbackIndex], userIntent),
          dietary_match: "Please check with restaurant directly",
          occasion_fit: "Suitable for various occasions",
          unique_selling_point: "Well-rated establishment"
        });
      }
    }
    
    // If we still don't have 3, duplicate the best ones
    while (fallbackResults.length < 3 && fallbackResults.length > 0) {
      const duplicateIndex = fallbackResults.length % fallbackResults.length;
      const duplicate = { ...fallbackResults[duplicateIndex] };
      duplicate.name = duplicate.name + " (Alternative)";
      duplicate.reason = duplicate.reason + " - Another great option in the area";
      fallbackResults.push(duplicate);
    }
    
    console.log(`🔄 Fallback recommendations count: ${fallbackResults.length}`);
    return fallbackResults.slice(0, 3);
  }
}

// Helper function to generate fallback reasons
function generateFallbackReason(place, userIntent) {
  const reasons = [];
  
  if (place.rating && place.rating >= 4.0) {
    reasons.push(`Highly rated (${place.rating}/5)`);
  }
  
  if (userIntent.dietary_restrictions && userIntent.dietary_restrictions.length > 0) {
    reasons.push(`May have ${userIntent.dietary_restrictions.join(', ')} options`);
  }
  
  if (userIntent.special_occasions && userIntent.special_occasions.length > 0) {
    reasons.push(`Good for ${userIntent.special_occasions.join(', ')}`);
  }
  
  if (place.price_category === userIntent.price_range) {
    reasons.push(`Matches your ${userIntent.price_range} budget`);
  }
  
  return reasons.length > 0 ? reasons.join(', ') : 'Good option based on your search';
}

// Enhanced search with multiple strategies to beat Google
async function enhancedSearch(userIntent) {
  const strategies = [
    // Strategy 1: Direct search with all parameters
    () => searchGoogle(userIntent),
    
    // Strategy 2: Search with broader terms if no results
    () => {
      if (userIntent.cuisine_type && userIntent.cuisine_type !== 'any') {
        const broadIntent = { ...userIntent, query: userIntent.cuisine_type };
        return searchGoogle(broadIntent);
      }
      return Promise.resolve([]);
    },
    
    // Strategy 3: Search by domain if specific query fails
    () => {
      if (userIntent.domain !== 'food') {
        const domainIntent = { ...userIntent, query: userIntent.domain };
        return searchGoogle(domainIntent);
      }
      return Promise.resolve([]);
    }
  ];
  
  for (const strategy of strategies) {
    try {
      const results = await strategy();
      if (results && results.length > 0) {
        console.log(`✅ Strategy successful: Found ${results.length} results`);
        return results;
      }
    } catch (error) {
      console.log(`❌ Strategy failed:`, error.message);
    }
  }
  
  return [];
}

// --- API Routes ---
// Serve the main page
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.get("/health", (req, res) => {
  res.json({ 
    status: "ok", 
    message: "API running 🚀",
    env_check: {
      openai_key: process.env.OPENAI_API_KEY ? "✅ Set" : "❌ Missing",
      google_key: process.env.GOOGLE_MAPS_API_KEY ? "✅ Set" : "❌ Missing"
    }
  });
});

// Special endpoint for fallback recommendations (only when location/network fails)
app.get("/api/fallback", (req, res) => {
  const fallbackRecs = fallbackRestaurants.slice(0, 3).map(restaurant => ({
    ...restaurant,
    reason: "Caleb's personal favorite - tried and tested!",
    dietary_match: "Please check with restaurant directly",
    occasion_fit: "Perfect for various occasions",
    unique_selling_point: "One of Caleb's go-to spots for great food",
    is_fallback: true
  }));
  
  res.json({
    recommendations: fallbackRecs,
    is_fallback: true,
    message: "Location detection failed - showing Caleb's favorites instead!",
    metadata: {
      total_found: fallbackRecs.length,
      fallback_reason: "location_network_error"
    }
  });
});

// Geocoding endpoint for reverse geocoding
app.get("/api/geocode", async (req, res) => {
  const { lat, lng } = req.query;
  
  if (!lat || !lng) {
    return res.status(400).json({ error: "Latitude and longitude are required" });
  }

  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${process.env.GOOGLE_MAPS_API_KEY}`;
    const response = await fetch(url);
    const data = await response.json();
    
    res.json(data);
  } catch (error) {
    console.error("Geocoding error:", error);
    res.status(500).json({ error: "Geocoding failed" });
  }
});

app.post("/recommend", async (req, res) => {
  const { query, userLocation, searchType, priceMode } = req.body;
  console.log("💬 User query:", query);
  console.log("📍 User location:", userLocation);
  console.log("🔍 Search type:", searchType || 'normal');
  console.log("💰 Price mode:", priceMode || 'normal');

  try {
    // Parse user intent with enhanced analysis, using user location if available
    let intent = await rewriteQuery(query || "restaurant Singapore", userLocation);
    
    // Override price range based on price mode
    if (priceMode === 'ballin') {
      intent.price_range = 'luxury';
    } else if (priceMode === 'broke') {
      intent.price_range = 'budget';
    }
    // If priceMode is 'off' or null, keep the original price_range from AI parsing
    
    // Override search parameters based on search type
    if (searchType === 'super-nearby') {
      intent.radius = 300; // 300 meters
    } else if (searchType === 'imma-walk') {
      intent.radius = 500; // 500 meters
    } else if (searchType === 'surprise-me') {
      intent.radius = 10000; // 10km
      intent.min_rating = 4.5; // At least 4.5 stars
    }
    
    console.log("🎯 Parsed intent:", intent);

    // Use enhanced search with multiple strategies
    let results = await enhancedSearch(intent);
    console.log(`🔍 Found ${results.length} results using enhanced search`);

    // AI-powered filtering and recommendations
    let finalRecs = await filterResults(intent, results);

    // Ensure we have proper array format
    if (!Array.isArray(finalRecs)) finalRecs = [finalRecs];
    
    // Only return actual results - no automatic fallbacks
    // Fallbacks will be handled by frontend in specific error conditions

    // Add metadata to response
    const response = {
      recommendations: finalRecs.slice(0, 3),
      intent: intent,
      metadata: {
        total_found: results.length,
        dietary_restrictions: intent.dietary_restrictions || [],
        special_occasions: intent.special_occasions || [],
        price_range: intent.price_range || 'moderate',
        search_location: intent.location
      }
    };

    console.log("📤 Sending recommendations:", finalRecs.length, "results");
    res.json(response);
  } catch (err) {
    console.error("Recommend error:", err);
    
    // Enhanced error response with fallbacks
    const fallbackRecs = fallbackRestaurants.slice(0, 3).map(restaurant => ({
      ...restaurant,
      reason: "Popular local recommendation (fallback)",
      dietary_match: "Please check with restaurant directly",
      occasion_fit: "Suitable for various occasions",
      unique_selling_point: "Well-known local establishment"
    }));
    
    res.json({
      recommendations: fallbackRecs,
      intent: { 
        domain: "food", 
        query: "restaurant", 
        location: "Singapore",
        dietary_restrictions: [],
        special_occasions: [],
        price_range: "moderate"
      },
      isFallback: true,
      error: err.message,
      metadata: {
        total_found: 0,
        error_type: "api_error"
      }
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
// Force Vercel deployment - Fri Oct 17 11:40:31 +07 2025
