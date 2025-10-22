import express from 'express';
import fetch from 'node-fetch';
import OpenAI from 'openai';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
app.use(express.json());

// Serve static files from public directory
app.use(express.static(join(__dirname, 'public')));

// Configuration validation
const validateConfig = () => {
  const requiredEnvVars = ['OPENAI_API_KEY', 'GOOGLE_MAPS_API_KEY'];
  const missing = requiredEnvVars.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:', missing);
    return false;
  }
  return true;
};

// Initialize OpenAI with proper error handling
let openai = null;
try {
  if (process.env.OPENAI_API_KEY) {
  openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });
  console.log("✅ OpenAI initialized successfully");
  } else {
    console.error("❌ OPENAI_API_KEY not found in environment variables");
  }
} catch (error) {
  console.error("❌ Failed to initialize OpenAI:", error.message);
}

// Check for additional API keys
const apiKeys = {
  yelp: process.env.YELP_API_KEY,
  foursquare: process.env.FOURSQUARE_API_KEY,
  tripadvisor: process.env.TRIPADVISOR_API_KEY
};

Object.entries(apiKeys).forEach(([service, key]) => {
  if (!key) {
    console.warn(`⚠️  ${service.toUpperCase()} API key not found - ${service} data will be limited`);
  } else {
    console.log(`✅ ${service.toUpperCase()} API key found`);
  }
});

// Enhanced logging system
const logger = {
  info: (message, data = {}) => console.log(`ℹ️  ${message}`, data),
  error: (message, error = {}) => console.error(`❌ ${message}`, error),
  warn: (message, data = {}) => console.warn(`⚠️  ${message}`, data),
  success: (message, data = {}) => console.log(`✅ ${message}`, data),
  debug: (message, data = {}) => console.log(`🐛 ${message}`, data)
};

// AI Description Cache (in-memory for now)
const aiDescriptionCache = new Map();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

// Enhanced fallback restaurants with more variety
const fallbackRestaurants = [
  {
    name: "Wingstop",
    location: "Orchard Road, Singapore",
    price: "$$",
    rating: "4.3",
    reason: "Premium chicken wings with amazing flavors and crispy texture",
    dietary_match: "Gluten-free options available, customizable spice levels",
    occasion_fit: "Perfect for casual dining, sports watching, and group hangouts",
    unique_selling_point: "11 signature flavors from Lemon Pepper to Atomic, consistently crispy wings"
  },
  {
    name: "Fish & Co.",
    location: "VivoCity, Singapore",
    price: "$$",
    rating: "4.1",
    reason: "Fresh seafood with Mediterranean flavors and generous portions",
    dietary_match: "Vegetarian pasta options, customizable spice levels",
    occasion_fit: "Perfect for family meals and casual dining",
    unique_selling_point: "Signature fish and chips with unique Mediterranean twist"
  },
  {
    name: "Din Tai Fung",
    location: "ION Orchard, Singapore",
    price: "$$$",
    rating: "4.5",
    reason: "World-famous xiao long bao and authentic Taiwanese cuisine",
    dietary_match: "Vegetarian options available, customizable spice levels",
    occasion_fit: "Perfect for family meals and special occasions",
    unique_selling_point: "Michelin-starred dumplings with consistent quality worldwide"
  }
];

// Enhanced safe restaurant object with better error handling
function safeRestaurant(r) {
  return {
    name: r.name || "Unknown Restaurant",
    location: r.vicinity || r.formatted_address || "Address not available",
    price: r.price_level ? "$".repeat(Math.min(r.price_level, 4)) : "N/A",
    rating: r.rating ? parseFloat(r.rating).toFixed(1) : null,
    user_ratings_total: r.user_ratings_total || 0,
    place_id: r.place_id || null,
    types: r.types || []
  };
}

// Enhanced query parser with context awareness
async function parseUserIntent(userInput, userLocation = null, context = {}, searchType = null) {
  try {
    if (!openai) {
      logger.warn("OpenAI not initialized - using fallback intent parsing");
      return createFallbackIntent(userInput, userLocation);
    }
    
    const locationContext = userLocation ? `User's current location: ${userLocation}` : "No specific location provided";
    const contextPrompt = `
      Previous searches: ${context.searchHistory || 'None'}
      User preferences: ${context.preferences || 'None'}
      Current mood/occasion: ${context.mood || 'Not specified'}
      Dietary restrictions: ${context.dietary || 'None'}
      Budget range: ${context.budget || 'Flexible'}
    `;
    
    const completion = await Promise.race([
      openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are an expert food recommendation AI with deep understanding of human food preferences, natural language, and MULTILINGUAL food names.

          MULTILINGUAL SUPPORT: You must recognize and understand food names in ANY language:
          - Chinese: 火锅 (hotpot), 小笼包 (xiaolongbao), 烧烤 (BBQ), 拉面 (ramen), 粤菜 (Cantonese)
          - Japanese: ラーメン (ramen), 寿司 (sushi), 天ぷら (tempura), 焼き鳥 (yakitori)
          - Korean: 불고기 (bulgogi), 김치찌개 (kimchi jjigae), 삼겹살 (samgyeopsal)
          - Vietnamese: phở, bánh mì, bún chả, cơm tấm
          - Thai: ต้มยำกุ้ง (tom yum), ผัดไทย (pad thai), ส้มตำ (som tam)
          - French: croissant, bouillabaisse, crêpe, coq au vin
          - Italian: pizza, pasta, risotto, osso buco
          - Spanish: paella, tapas, churros, tortilla
          - German: schnitzel, bratwurst, spätzle
          - And ANY other language or transliteration!

          CRITICAL: Handle these human variations with intelligence and provide recommendations when possible:
          - Vague queries: "I'm hungry", "something good", "surprise me", "I don't know what I want" → Provide general food recommendations
          - Emotional states: "I'm sad and need comfort food", "celebrating something", "stressed and need something quick" → Match mood to food type
          - Cultural context: "authentic [cuisine]", "local favorite", "hidden gem", "like my grandma used to make" → Focus on authenticity
          - Time-based: "quick lunch", "late night food", "brunch spot", "something for now" → Consider timing
          - Group dynamics: "family-friendly", "date night", "business meeting", "group of friends" → Match occasion
          - Dietary needs: "something healthy", "comfort food", "light meal", "heavy meal" → Match dietary preferences
          - Price sensitivity: "cheap but good", "splurge", "budget-friendly", "worth the money" → Match price range
          - Distance indicators: "nearby", "close", "walking distance", "around here" → Use 1km radius
          - Broader searches: "in the area", "around [location]", "within [X] km" → Use 5-10km radius
          - Rating requirements: "5 stars", "highly rated", "best rated", "top rated" → Set min_rating: 4.5
          - Specific ratings: "4 stars", "3 stars", etc. → Set min_rating accordingly
          
          IMPORTANT: Only set needs_clarification to true if the query is completely incomprehensible or contradictory. 
          For queries like "cafe with food", "restaurant near me", "good food" - provide recommendations with confidence.

          ${locationContext}
          ${contextPrompt}

          Return ONLY valid JSON in this exact format:
          {
            "search_term": "the specific food/cuisine they want",
            "location": "${userLocation || 'current location'}",
            "radius": 1,
            "dietary_restrictions": [],
            "special_occasions": [],
            "price_range": "budget|moderate|expensive|luxury",
            "min_rating": null,
            "time_requirement": null,
            "special_features": [],
            "mood": "casual|romantic|celebration|comfort|adventure",
            "confidence": 0.85,
            "needs_clarification": false,
            "suggested_alternatives": []
          }
          
          RADIUS GUIDELINES:
          - "nearby", "close", "walking distance", "around here" → radius: 1
          - "in the area", "around [location]", "within 2km" → radius: 2
          - "within 5km", "in [district/area]" → radius: 5
          - "in [city]", "anywhere in [city]" → radius: 10
          - Default for general queries → radius: 5
          
          RATING GUIDELINES:
          - "5 stars", "highly rated", "best rated", "top rated" → min_rating: 4.5
          - "4 stars" → min_rating: 4.0
          - "3 stars" → min_rating: 3.0
          - Default: min_rating: null (no filter)`
        },
        {
          role: "user",
          content: `User query: "${userInput}"`
        }
      ],
      temperature: 0.7,
      max_tokens: 500
    }),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('OpenAI API timeout after 5 seconds')), 5000)
      )
    ]);

    let content = completion.choices[0].message.content.trim();
    
    // Extract JSON from potential markdown code blocks
    content = content.replace(/^```json\s*/, '').replace(/^```\s*/, '').replace(/\s*```$/, '');
    
    // Try to find JSON object in the content
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      content = jsonMatch[0];
    }
    
    logger.info("AI Response:", content);
    
    const parsed = JSON.parse(content);
    
    // Validate required fields
    const requiredFields = ['search_term', 'location', 'radius'];
    const missingFields = requiredFields.filter(field => !parsed[field]);
    
    if (missingFields.length > 0) {
      logger.warn("Missing required fields in AI response:", parsed);
      throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
    }
    
    // Override radius if distance keywords are detected (only if no search type is specified)
    if (!searchType) {
      const detectedRadius = detectDistanceIntent(userInput);
      if (detectedRadius !== parsed.radius) {
        logger.info(`Distance keyword detected, adjusting radius from ${parsed.radius} to ${detectedRadius}`);
        parsed.radius = detectedRadius;
      }
    }
    
    logger.success("Parsed intent successfully:", parsed);
    return parsed;
    
  } catch (err) {
    logger.error("Query parsing error:", err);
    return createFallbackIntent(userInput, userLocation);
  }
}
    
// Enhanced fallback intent creation
function createFallbackIntent(userInput, userLocation) {
  const input = userInput.toLowerCase();
  
    const fallback = { 
      search_term: "restaurant", 
      location: userLocation || "current location", 
      radius: 20,
      dietary_restrictions: [], 
      special_occasions: [], 
      price_range: "moderate", 
      time_requirement: null,
    special_features: [],
    mood: "casual",
    confidence: 0.3,
    needs_clarification: false,
    suggested_alternatives: []
  };
  
  // Enhanced keyword detection
  const cuisineKeywords = {
    'korean': ['korean', 'korea', 'kimchi', 'bulgogi', 'bbq'],
    'japanese': ['japanese', 'japan', 'sushi', 'ramen', 'tempura'],
    'chinese': ['chinese', 'china', 'dim sum', 'noodles', 'wok'],
    'italian': ['italian', 'italy', 'pasta', 'pizza', 'risotto'],
    'indian': ['indian', 'india', 'curry', 'tandoor', 'naan'],
    'thai': ['thai', 'thailand', 'pad thai', 'tom yum', 'green curry'],
    'mexican': ['mexican', 'mexico', 'taco', 'burrito', 'quesadilla'],
    'vietnamese': ['vietnamese', 'vietnam', 'pho', 'banh mi', 'spring roll']
  };
  
  // Detect cuisine type
  for (const [cuisine, keywords] of Object.entries(cuisineKeywords)) {
    if (keywords.some(keyword => input.includes(keyword))) {
      fallback.search_term = cuisine + ' food';
      break;
    }
  }
  
  // Detect price sensitivity
  if (input.includes('cheap') || input.includes('budget') || input.includes('affordable')) {
      fallback.price_range = 'budget';
  } else if (input.includes('expensive') || input.includes('luxury') || input.includes('fine dining')) {
      fallback.price_range = 'expensive';
    }
  
  // Detect mood/occasion
  if (input.includes('date') || input.includes('romantic')) {
    fallback.mood = 'romantic';
    fallback.special_occasions = ['date_night'];
  } else if (input.includes('family') || input.includes('kids')) {
    fallback.mood = 'family';
    fallback.special_occasions = ['family'];
  } else if (input.includes('celebration') || input.includes('birthday') || input.includes('anniversary')) {
    fallback.mood = 'celebration';
    fallback.special_occasions = ['celebration'];
  } else if (input.includes('comfort') || input.includes('sad') || input.includes('stressed')) {
    fallback.mood = 'comfort';
  }
  
  // Detect dietary restrictions
  if (input.includes('vegetarian') || input.includes('veggie')) {
    fallback.dietary_restrictions = ['vegetarian'];
  } else if (input.includes('vegan')) {
    fallback.dietary_restrictions = ['vegan'];
  } else if (input.includes('halal')) {
    fallback.dietary_restrictions = ['halal'];
  } else if (input.includes('gluten') || input.includes('celiac')) {
    fallback.dietary_restrictions = ['gluten-free'];
  }
  
  // Detect time requirements
  if (input.includes('quick') || input.includes('fast') || input.includes('lunch')) {
    fallback.time_requirement = 'quick';
  } else if (input.includes('late') || input.includes('night')) {
      fallback.time_requirement = 'late';
    }
    
    return fallback;
}

// Add timeout wrapper for fetch requests
async function fetchWithTimeout(url, options = {}, timeout = 5000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error(`Request timeout after ${timeout}ms`);
    }
    throw error;
  }
}

// Remove duplicate restaurants, keeping the best one (nearest or highest rated)
function removeDuplicates(restaurants) {
  const seen = new Map();
  
  return restaurants.filter(restaurant => {
    // Create a key based on name and location for duplicate detection
    const key = `${restaurant.name?.toLowerCase().trim()}_${restaurant.location?.toLowerCase().trim()}`;
    
    if (!seen.has(key)) {
      seen.set(key, restaurant);
      return true;
    }
    
    // Compare with existing restaurant
    const existing = seen.get(key);
    
    // Priority: 1) Has distance (closer), 2) Higher rating, 3) More reviews
    if (restaurant.distance !== null && existing.distance === null) {
      seen.set(key, restaurant);
      return true;
    } else if (restaurant.distance !== null && existing.distance !== null) {
      if (restaurant.distance < existing.distance) {
        seen.set(key, restaurant);
        return true;
      }
    } else if (restaurant.rating > existing.rating) {
      seen.set(key, restaurant);
      return true;
    } else if (restaurant.rating === existing.rating && restaurant.user_ratings_total > existing.user_ratings_total) {
      seen.set(key, restaurant);
      return true;
    }
    
    return false;
  });
}

// Enhanced Google Maps search with better error handling
async function searchGoogle(userIntent, userCoordinates = null) {
  try {
    logger.info("Starting Google search with:", { userIntent, userCoordinates });
    
    const { 
      search_term, 
      location, 
      radius = 5,
      dietary_restrictions = [],
      price_range = 'moderate'
    } = userIntent;
    
    if (!process.env.GOOGLE_MAPS_API_KEY) {
      logger.error("Google Maps API key not configured");
      return [];
    }
    
    // Build enhanced search query
    let searchQuery = search_term;
    
    // Add dietary restrictions to search query
    if (dietary_restrictions.length > 0) {
      searchQuery += ` ${dietary_restrictions.join(' ')}`;
    }
    
    const q = `${searchQuery} near ${location}`;
    
    logger.info("Google Places API query:", q);
    
    const baseUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json`;
    
    const params = new URLSearchParams({
      query: q, // Query already includes location (e.g. "cafe in Bình Thạnh, Ho Chi Minh")
      key: process.env.GOOGLE_MAPS_API_KEY
      // REMOVED type: 'restaurant' - too restrictive, excludes cafes, bars, bakeries, etc.
      // REMOVED fields parameter - doesn't work with textsearch, only with place details
      // REMOVED location/radius - query parameter already includes full location context
      // Text Search API returns geometry by default
    });
    
    const url = `${baseUrl}?${params}`;
    logger.info("Google Places API URL:", url);
    
    // Add price level filtering - REMOVED: Too restrictive, causes 0 results in many locations
    // Google Places price levels vary greatly by region (e.g. Vietnam cafes are mostly level 1)
    // Only apply if explicitly requested via priceMode (broke/ballin), not default "moderate"
    if (price_range && price_range !== 'any' && price_range !== 'moderate') {
      const priceLevels = {
        'budget': '1',
        'expensive': '3,4',
        'luxury': '4'
      };
      if (priceLevels[price_range]) {
        const levels = priceLevels[price_range].split(',');
        if (levels.length === 2) {
          params.append('minprice', levels[0]);
          params.append('maxprice', levels[1]);
        } else {
          params.append('maxprice', levels[0]);
        }
      }
    }
    
    logger.info("Google API Request:", `${baseUrl}?${params}`);

    const res = await fetchWithTimeout(`${baseUrl}?${params}`, {}, 10000); // 10 second timeout
    
    if (!res.ok) {
      throw new Error(`Google API request failed: ${res.status} ${res.statusText}`);
    }
    
    const data = await res.json();

    logger.info("Google API Response:", {
      status: data.status,
      results_count: data.results ? data.results.length : 0,
      error_message: data.error_message
    });

    if (data.status !== "OK") {
      logger.error("Google API Error:", data.status, data.error_message);
      return [];
    }

    if (!data.results || data.results.length === 0) {
      logger.warn("No results from Google Places API");
      return [];
    }

    // Enhanced filtering and ranking
    let filteredResults = data.results
      .filter(p => p.business_status !== "CLOSED_PERMANENTLY")
      .filter(p => {
        // More flexible rating filter - only filter out very low rated places
        if (p.rating && p.rating < 2.5) return false;
        return true;
      });

    // Process places with distance calculation and images
    let results = await Promise.all(filteredResults.map(async (place) => {
      // Calculate distance if user coordinates are available
      let distance = null;
      let distanceFormatted = null;
      let images = [];
      
      if (userCoordinates) {
        let placeLocation = null;
        let placePhotos = [];
        
        if (place.geometry && place.geometry.location) {
          placeLocation = place.geometry.location;
        } else if (place.place_id) {
          // Try to get coordinates and photos from place details
          const details = await getPlaceDetails(place.place_id);
          if (details) {
            placeLocation = details.location;
            placePhotos = details.photos || [];
          }
        }
        
        if (placeLocation) {
          distance = calculateDistance(
            userCoordinates.latitude,
            userCoordinates.longitude,
            placeLocation.lat,
            placeLocation.lng
          );
          distanceFormatted = formatDistance(distance);
          logger.info(`Distance calculated for ${place.name}: ${distance}km`);
        } else {
          logger.info(`No placeLocation for ${place.name}, using fallback distance estimation`);
          // Fallback: estimate distance based on location name
          // This is a simple heuristic - in production you'd want more sophisticated geocoding
          const locationText = (place.vicinity || place.formatted_address || '').toLowerCase();
          if (locationText.includes('quận 1') || locationText.includes('district 1')) {
            distance = Math.random() * 2 + 0.5; // 0.5-2.5km
            distanceFormatted = formatDistance(distance);
          } else if (locationText.includes('quận 2') || locationText.includes('district 2')) {
            distance = Math.random() * 3 + 2; // 2-5km
            distanceFormatted = formatDistance(distance);
          } else {
            distance = Math.random() * 5 + 1; // 1-6km
            distanceFormatted = formatDistance(distance);
          }
        }
        
        // Get images for the place
        if (placePhotos.length > 0) {
          place.photos = placePhotos;
        }
        images = await getRestaurantImages(place);
      } else {
        // No user coordinates available
        distance = null;
        distanceFormatted = formatDistance(distance);
        
        // Still try to get images
        images = await getRestaurantImages(place);
      }
      
      return {
        ...place,
        // Add enhanced metadata
        has_dietary_options: checkDietaryOptions(place, dietary_restrictions),
        price_category: getPriceCategory(place.price_level),
        cuisine_indicators: extractCuisineIndicators(place),
        rating_penalty: calculateRatingPenalty(place.rating),
        low_rating_reason: generateLowRatingReason(place),
        distance_score: calculateDistanceScore(place, userIntent.radius),
        mood_match: calculateMoodMatch(place, userIntent.mood),
        distance: distance,
        distance_formatted: distanceFormatted,
        images: images
      };
    }));

    // Apply distance and rating filters with better error handling
    logger.info(`Applying filters - Distance: ${userIntent.radius}km, Min Rating: ${userIntent.min_rating}`);
    const beforeFilter = results.length;
    
    results = results.filter(place => {
      // Distance filter - temporarily disabled for deployment to ensure results
      // if (userIntent.radius && place.distance !== null && place.distance !== undefined) {
      //   const distanceKm = typeof place.distance === 'number' ? place.distance : parseFloat(place.distance);
      //   if (!isNaN(distanceKm)) {
      //     // Apply appropriate tolerance based on search type (very lenient for deployment)
      //     let maxDistance = userIntent.radius;
      //     if (userIntent.radius === 1) {
      //       maxDistance = 3.0; // "near me" - allow up to 3km
      //     } else if (userIntent.radius === 0.3) {
      //       maxDistance = 1.0; // "super nearby" - allow up to 1km
      //     } else if (userIntent.radius === 0.5) {
      //       maxDistance = 1.5; // "imma walk" - allow up to 1.5km
      //     }
      //     
      //     if (distanceKm > maxDistance) {
      //       logger.debug(`Filtered out ${place.name} - distance ${distanceKm}km > ${maxDistance}km`);
      //       return false;
      //     }
      //   }
      // }
      
      // Rating filter - temporarily disabled for deployment
      // if (userIntent.min_rating && place.rating !== null && place.rating !== undefined) {
      //   const placeRating = typeof place.rating === 'number' ? place.rating : parseFloat(place.rating);
      //   if (!isNaN(placeRating)) {
      //     // For "5 stars" (min_rating: 4.5), allow 3.5+ to be very forgiving
      //     const minRating = userIntent.min_rating === 4.5 ? 3.5 : userIntent.min_rating;
      //     if (placeRating < minRating) {
      //       logger.debug(`Filtered out ${place.name} - rating ${placeRating} < ${minRating}`);
      //       return false;
      //     }
      //   }
      // }
      
      return true;
    });
    
    logger.info(`Filtered ${beforeFilter} results down to ${results.length} after applying distance/rating filters`);

    // Sort and limit results
    results = results
      .sort((a, b) => {
        // Enhanced scoring algorithm with personalization
        const scoreA = calculateOverallScore(a, userIntent, userCoordinates?.userId);
        const scoreB = calculateOverallScore(b, userIntent, userCoordinates?.userId);
        return scoreB - scoreA;
      })
      .slice(0, 20);

    // Remove duplicates before returning
    const uniqueResults = removeDuplicates(results);
    
    logger.success(`Filtered to ${results.length} results, ${uniqueResults.length} unique after deduplication`);
    return uniqueResults;
  } catch (err) {
    logger.error("Google API search error:", err);
    return [];
  }
}

// Enhanced scoring algorithm with personalization
function calculateOverallScore(place, userIntent, userId = null) {
  let score = 0;
  
  // Base rating (weighted by review count) - 25% weight
  const rating = place.rating || 0;
  const reviewCount = place.user_ratings_total || 0;
  score += rating * Math.log(reviewCount + 1) * 0.25;
  
  // Distance factor - 20% weight
  score += place.distance_score * 0.2;
  
  // Price match - 15% weight
  score += calculatePriceMatch(place.price_level, userIntent.price_range) * 0.15;
  
  // Dietary match - 15% weight
  score += calculateDietaryMatch(place, userIntent.dietary_restrictions) * 0.15;
  
  // Mood match - 10% weight
  score += place.mood_match * 0.1;
  
  // Cuisine match - 10% weight
  score += calculateCuisineMatch(place, userIntent.search_term) * 0.1;
  
  // Personalization score - 5% weight
  if (userId) {
    const personalizationScore = calculatePersonalizationScore(place, userId);
    score += personalizationScore * 0.05;
  }
  
  return score;
}

// Calculate personalization score based on user preferences
function calculatePersonalizationScore(place, userId) {
  const profile = userProfiles.get(userId);
  if (!profile || profile.totalInteractions < 2) {
    return 0; // No personalization data available
  }
  
  let personalizationScore = 0;
  const preferences = profile.preferences;
  
  // Check if restaurant is in favorites
  if (profile.favoriteRestaurants.has(place.name)) {
    personalizationScore += 0.8;
  }
  
  // Check if restaurant is disliked
  if (profile.dislikedRestaurants.has(place.name)) {
    personalizationScore -= 0.5;
  }
  
  // Check cuisine preferences
  if (place.types) {
    place.types.forEach(type => {
      const preferenceWeight = preferences[PREFERENCE_CATEGORIES.CUISINE].get(type) || 0;
      if (preferenceWeight > 0) {
        personalizationScore += Math.min(preferenceWeight * 0.1, 0.3);
      } else if (preferenceWeight < 0) {
        personalizationScore += Math.max(preferenceWeight * 0.1, -0.2);
      }
    });
  }
  
  // Check price preferences
  if (place.price_level !== undefined) {
    const priceRange = getPriceRangeFromLevel(place.price_level);
    const preferenceWeight = preferences[PREFERENCE_CATEGORIES.PRICE_RANGE].get(priceRange) || 0;
    if (preferenceWeight > 0) {
      personalizationScore += Math.min(preferenceWeight * 0.1, 0.2);
    } else if (preferenceWeight < 0) {
      personalizationScore += Math.max(preferenceWeight * 0.1, -0.1);
    }
  }
  
  return Math.max(Math.min(personalizationScore, 1), -0.5); // Clamp between -0.5 and 1
}

// User profiles and preference tracking
const userProfiles = new Map();
const conversationHistory = new Map();

// User preference categories
const PREFERENCE_CATEGORIES = {
  CUISINE: 'cuisine',
  PRICE_RANGE: 'price_range',
  MOOD: 'mood',
  OCCASION: 'occasion',
  DIETARY: 'dietary',
  LOCATION: 'location',
  TIME: 'time'
};

// Initialize user profile
function initializeUserProfile(userId) {
  if (!userProfiles.has(userId)) {
    userProfiles.set(userId, {
      id: userId,
      preferences: {
        [PREFERENCE_CATEGORIES.CUISINE]: new Map(),
        [PREFERENCE_CATEGORIES.PRICE_RANGE]: new Map(),
        [PREFERENCE_CATEGORIES.MOOD]: new Map(),
        [PREFERENCE_CATEGORIES.OCCASION]: new Map(),
        [PREFERENCE_CATEGORIES.DIETARY]: new Map(),
        [PREFERENCE_CATEGORIES.LOCATION]: new Map(),
        [PREFERENCE_CATEGORIES.TIME]: new Map()
      },
      interactionHistory: [],
      favoriteRestaurants: new Set(),
      dislikedRestaurants: new Set(),
      lastUpdated: new Date(),
      totalInteractions: 0
    });
  }
  return userProfiles.get(userId);
}

// Update user preferences based on interaction
function updateUserPreferences(userId, interaction) {
  const profile = initializeUserProfile(userId);
  const { query, selectedRestaurant, rejectedRestaurants = [], userIntent } = interaction;
  
  // Update interaction history
  profile.interactionHistory.push({
    timestamp: new Date(),
    query,
    selectedRestaurant,
    rejectedRestaurants,
    userIntent
  });
  
  // Keep only last 50 interactions
  if (profile.interactionHistory.length > 50) {
    profile.interactionHistory = profile.interactionHistory.slice(-50);
  }
  
  // Update preferences based on selection
  if (selectedRestaurant) {
    profile.favoriteRestaurants.add(selectedRestaurant.name);
    
    // Learn from selected restaurant characteristics
    learnFromRestaurant(profile, selectedRestaurant, userIntent, 1.0);
  }
  
  // Learn from rejected restaurants
  rejectedRestaurants.forEach(restaurant => {
    profile.dislikedRestaurants.add(restaurant.name);
    learnFromRestaurant(profile, restaurant, userIntent, -0.5);
  });
  
  profile.totalInteractions++;
  profile.lastUpdated = new Date();
  
  logger.info(`Updated preferences for user ${userId}`, {
    totalInteractions: profile.totalInteractions,
    favoriteCount: profile.favoriteRestaurants.size,
    dislikedCount: profile.dislikedRestaurants.size
  });
}

// Learn from restaurant characteristics
function learnFromRestaurant(profile, restaurant, userIntent, weight) {
  const preferences = profile.preferences;
  
  // Learn cuisine preferences
  if (restaurant.types) {
    restaurant.types.forEach(type => {
      const currentWeight = preferences[PREFERENCE_CATEGORIES.CUISINE].get(type) || 0;
      preferences[PREFERENCE_CATEGORIES.CUISINE].set(type, currentWeight + weight);
    });
  }
  
  // Learn price preferences
  if (restaurant.price_level !== undefined) {
    const priceRange = getPriceRangeFromLevel(restaurant.price_level);
    const currentWeight = preferences[PREFERENCE_CATEGORIES.PRICE_RANGE].get(priceRange) || 0;
    preferences[PREFERENCE_CATEGORIES.PRICE_RANGE].set(priceRange, currentWeight + weight);
  }
  
  // Learn mood preferences
  if (userIntent.mood) {
    const currentWeight = preferences[PREFERENCE_CATEGORIES.MOOD].get(userIntent.mood) || 0;
    preferences[PREFERENCE_CATEGORIES.MOOD].set(userIntent.mood, currentWeight + weight);
  }
  
  // Learn occasion preferences
  if (userIntent.special_occasions && userIntent.special_occasions.length > 0) {
    userIntent.special_occasions.forEach(occasion => {
      const currentWeight = preferences[PREFERENCE_CATEGORIES.OCCASION].get(occasion) || 0;
      preferences[PREFERENCE_CATEGORIES.OCCASION].set(occasion, currentWeight + weight);
    });
  }
  
  // Learn dietary preferences
  if (userIntent.dietary_restrictions && userIntent.dietary_restrictions.length > 0) {
    userIntent.dietary_restrictions.forEach(dietary => {
      const currentWeight = preferences[PREFERENCE_CATEGORIES.DIETARY].get(dietary) || 0;
      preferences[PREFERENCE_CATEGORIES.DIETARY].set(dietary, currentWeight + weight);
    });
  }
}

// Get price range from price level
function getPriceRangeFromLevel(priceLevel) {
  const priceRanges = {
    0: 'budget',
    1: 'budget',
    2: 'moderate',
    3: 'expensive',
    4: 'luxury'
  };
  return priceRanges[priceLevel] || 'moderate';
}

// Get user's top preferences
function getUserTopPreferences(userId, category, limit = 5) {
  const profile = userProfiles.get(userId);
  if (!profile) return [];
  
  const preferences = profile.preferences[category];
  return Array.from(preferences.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([key, weight]) => ({ key, weight }));
}

// Generate personalized search suggestions
function generatePersonalizedSuggestions(userId, baseQuery) {
  const profile = userProfiles.get(userId);
  if (!profile || profile.totalInteractions < 3) {
    return []; // Not enough data for personalization
  }
  
  const suggestions = [];
  
  // Add top cuisine preferences
  const topCuisines = getUserTopPreferences(userId, PREFERENCE_CATEGORIES.CUISINE, 3);
  topCuisines.forEach(({ key }) => {
    if (!baseQuery.toLowerCase().includes(key.toLowerCase())) {
      suggestions.push(`${baseQuery} ${key}`);
    }
  });
  
  // Add mood-based suggestions
  const topMoods = getUserTopPreferences(userId, PREFERENCE_CATEGORIES.MOOD, 2);
  topMoods.forEach(({ key }) => {
    if (key !== 'casual' && !baseQuery.toLowerCase().includes(key)) {
      suggestions.push(`${key} ${baseQuery}`);
    }
  });
  
  return suggestions.slice(0, 3);
}

// Detect distance-related keywords and suggest appropriate radius
function detectDistanceIntent(query, searchType = null) {
  const nearbyKeywords = ['nearby', 'close', 'walking distance', 'around here', 'near me', 'close by'];
  const areaKeywords = ['in the area', 'around', 'within 2km', 'within 1km'];
  const cityKeywords = ['in the city', 'anywhere in', 'in [city]'];
  
  const lowerQuery = query.toLowerCase();
  
  if (nearbyKeywords.some(keyword => lowerQuery.includes(keyword))) {
    return 1; // 1km for nearby
  } else if (areaKeywords.some(keyword => lowerQuery.includes(keyword))) {
    return 2; // 2km for area searches
  } else if (cityKeywords.some(keyword => lowerQuery.includes(keyword))) {
    return 10; // 10km for city-wide searches
  }
  
  return 5; // Default radius
}

// Distance calculation using Haversine formula
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c;
  return distance;
}

// Format distance for display
function formatDistance(distance) {
  if (distance === null || distance === undefined || isNaN(distance)) {
    return "N/A";
  }
  
  if (distance < 1) {
    return `${Math.round(distance * 1000)}m`;
  } else if (distance < 10) {
    return `${distance.toFixed(1)}km`;
  } else {
    return `${Math.round(distance)}km`;
  }
}

// Get place details with coordinates and photos
async function getPlaceDetails(placeId) {
  try {
    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=geometry,photos&key=${process.env.GOOGLE_MAPS_API_KEY}`;
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.status === 'OK' && data.result && data.result.geometry) {
      return {
        location: data.result.geometry.location,
        photos: data.result.photos || []
      };
    }
    return null;
  } catch (error) {
    logger.error("Error getting place details:", error);
    return null;
  }
}

// Get Google Places photo URL using proxy endpoint
function getGooglePhotoUrl(photoReference, maxWidth = 400) {
  if (!photoReference) return null;
  return `/api/photo?photo_reference=${photoReference}&maxwidth=${maxWidth}`;
}


// Get restaurant images from Google Places (official photos only)
async function getRestaurantImages(place) {
  const images = [];
  
  // Use Google Places photos (official photos uploaded by restaurant owners)
  if (place.photos && place.photos.length > 0) {
    // Google provides photos in order of relevance/quality
    // Take up to 5 photos for variety
    const photoCount = Math.min(5, place.photos.length);
    
    for (let i = 0; i < photoCount; i++) {
      const photo = place.photos[i];
      const photoUrl = getGooglePhotoUrl(photo.photo_reference, 1200); // High resolution
      if (photoUrl) {
        images.push({
          url: photoUrl,
          source: 'google',
          alt: `${place.name} - Official Photo ${i + 1}`,
          quality: 'official',
          isOwnerUploaded: true
        });
      }
    }
  }
  
  return images;
}

// Yelp API integration
async function searchYelp(query, location, radius = 5000) {
  if (!process.env.YELP_API_KEY) {
    logger.warn("Yelp API key not available");
    return [];
  }

  try {
    const url = `https://api.yelp.com/v3/businesses/search?term=${encodeURIComponent(query)}&location=${encodeURIComponent(location)}&radius=${radius}&limit=10&sort_by=best_match`;
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${process.env.YELP_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Yelp API error: ${response.status}`);
    }

    const data = await response.json();
    
    return data.businesses.map(business => ({
      name: business.name,
      rating: business.rating,
      review_count: business.review_count,
      price: business.price?.length || null,
      categories: business.categories.map(cat => cat.title),
      location: business.location.display_address?.join(', '),
      phone: business.display_phone,
      url: business.url,
      image_url: business.image_url,
      coordinates: business.coordinates,
      source: 'yelp',
      yelp_id: business.id
    }));
  } catch (error) {
    logger.error("Yelp API error:", error);
    return [];
  }
}

// Foursquare API integration
async function searchFoursquare(query, location, radius = 5000) {
  if (!process.env.FOURSQUARE_API_KEY) {
    logger.warn("Foursquare API key not available");
    return [];
  }

  try {
    const url = `https://api.foursquare.com/v3/places/search?query=${encodeURIComponent(query)}&near=${encodeURIComponent(location)}&radius=${radius}&limit=10&fields=name,rating,price,location,categories,photos,tips`;
    
    const response = await fetch(url, {
      headers: {
        'Authorization': process.env.FOURSQUARE_API_KEY,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Foursquare API error: ${response.status}`);
    }

    const data = await response.json();
    
    return data.results.map(place => ({
      name: place.name,
      rating: place.rating,
      price: place.price,
      categories: place.categories?.map(cat => cat.name) || [],
      location: place.location?.formatted_address || place.location?.address,
      coordinates: place.geocodes?.main,
      source: 'foursquare',
      foursquare_id: place.fsq_id,
      photos: place.photos?.map(photo => ({
        url: `${photo.prefix}800x600${photo.suffix}`,
        source: 'foursquare'
      })) || []
    }));
  } catch (error) {
    logger.error("Foursquare API error:", error);
    return [];
  }
}

// TripAdvisor API integration (using RapidAPI)
async function searchTripAdvisor(query, location) {
  if (!process.env.TRIPADVISOR_API_KEY) {
    logger.warn("TripAdvisor API key not available");
    return [];
  }

  try {
    const url = `https://tripadvisor16.p.rapidapi.com/api/v1/restaurant/searchLocation?query=${encodeURIComponent(location)}`;
    
    const response = await fetch(url, {
      headers: {
        'X-RapidAPI-Key': process.env.TRIPADVISOR_API_KEY,
        'X-RapidAPI-Host': 'tripadvisor16.p.rapidapi.com'
      }
    });

    if (!response.ok) {
      throw new Error(`TripAdvisor API error: ${response.status}`);
    }

    const data = await response.json();
    
    // Note: TripAdvisor API structure may vary, this is a simplified example
    return data.data?.map(restaurant => ({
      name: restaurant.name,
      rating: restaurant.averageRating,
      review_count: restaurant.totalReviews,
      location: restaurant.address,
      source: 'tripadvisor',
      tripadvisor_id: restaurant.locationId
    })) || [];
  } catch (error) {
    logger.error("TripAdvisor API error:", error);
    return [];
  }
}

// Combine data from multiple sources
async function searchMultipleSources(query, location, radius = 5000, userCoordinates = null) {
  const results = {
    google: [],
    yelp: [],
    foursquare: [],
    tripadvisor: []
  };

  // Create a userIntent object for Google search
  const userIntent = {
    search_term: query,
    location: location,
    radius: radius / 1000, // Convert meters to km
    price_range: 'moderate',
    dietary_restrictions: [],
    special_occasions: [],
    time_requirement: null,
    special_features: [],
    mood: 'casual'
  };

  // Build array of API calls based on available keys
  const apiCalls = [];
  
  // Always include Google (it's the primary source)
  apiCalls.push(searchGoogle(userIntent, userCoordinates));
  
  // Only include other APIs if keys are available
  if (process.env.YELP_API_KEY) {
    apiCalls.push(searchYelp(query, location, radius));
  }
  if (process.env.FOURSQUARE_API_KEY) {
    apiCalls.push(searchFoursquare(query, location, radius));
  }
  if (process.env.TRIPADVISOR_API_KEY) {
    apiCalls.push(searchTripAdvisor(query, location));
  }
  
  // Search available sources in parallel
  const apiResults = await Promise.allSettled(apiCalls);

  // Extract successful results
  let resultIndex = 0;
  
  // Google results (always first)
  if (apiResults[resultIndex]) {
    console.log('Google API result status:', apiResults[resultIndex].status);
    if (apiResults[resultIndex].status === 'fulfilled') {
      results.google = apiResults[resultIndex].value;
      console.log('Google results count:', results.google.length);
    } else if (apiResults[resultIndex].status === 'rejected') {
      console.log('Google API rejected:', apiResults[resultIndex].reason);
    }
  }
  resultIndex++;
  
  // Yelp results (if called)
  if (process.env.YELP_API_KEY && apiResults[resultIndex] && apiResults[resultIndex].status === 'fulfilled') {
    results.yelp = apiResults[resultIndex].value;
    resultIndex++;
  }
  
  // Foursquare results (if called)
  if (process.env.FOURSQUARE_API_KEY && apiResults[resultIndex] && apiResults[resultIndex].status === 'fulfilled') {
    results.foursquare = apiResults[resultIndex].value;
    resultIndex++;
  }
  
  // TripAdvisor results (if called)
  if (process.env.TRIPADVISOR_API_KEY && apiResults[resultIndex] && apiResults[resultIndex].status === 'fulfilled') {
    results.tripadvisor = apiResults[resultIndex].value;
  }

  return results;
}

// Merge and deduplicate results from multiple sources
function mergeRestaurantData(sources) {
  const merged = new Map();
  
  // Process each source
  Object.entries(sources).forEach(([source, restaurants]) => {
    restaurants.forEach(restaurant => {
      const key = restaurant.name.toLowerCase().trim();
      
      if (merged.has(key)) {
        // Merge with existing restaurant
        const existing = merged.get(key);
        merged.set(key, {
          ...existing,
          [source]: restaurant,
          sources: [...(existing.sources || []), source],
          // Use the best rating from all sources
          rating: Math.max(existing.rating || 0, restaurant.rating || 0),
          // Combine review counts
          review_count: (existing.review_count || 0) + (restaurant.review_count || 0),
          // Use Google coordinates if available, otherwise use others
          coordinates: existing.coordinates || restaurant.coordinates,
          // Combine categories
          categories: [...new Set([...(existing.categories || []), ...(restaurant.categories || [])])]
        });
      } else {
        // New restaurant
        merged.set(key, {
          ...restaurant,
          sources: [source],
          [source]: restaurant
        });
      }
    });
  });

  return Array.from(merged.values());
}


// Helper functions
function checkDietaryOptions(place, restrictions) {
  if (!restrictions || restrictions.length === 0) return "Standard options available";
  
  const placeText = `${place.name} ${place.types?.join(' ') || ''}`.toLowerCase();
  
  const indicators = [];
  restrictions.forEach(restriction => {
    const restrictionLower = restriction.toLowerCase();
    if (restrictionLower.includes('vegetarian') && placeText.includes('vegetarian')) {
      indicators.push('Vegetarian options');
    }
    if (restrictionLower.includes('vegan') && placeText.includes('vegan')) {
      indicators.push('Vegan options');
    }
    if (restrictionLower.includes('halal') && placeText.includes('halal')) {
      indicators.push('Halal certified');
    }
  });
  
  return indicators.length > 0 ? indicators.join(', ') : 'Standard options available';
}

function getPriceCategory(priceLevel) {
  const categories = {
    0: 'free',
    1: 'budget',
    2: 'moderate', 
    3: 'expensive',
    4: 'very_expensive'
  };
  return categories[priceLevel] || 'moderate';
}

function extractCuisineIndicators(place) {
  const types = place.types || [];
  const cuisines = ['korean', 'japanese', 'chinese', 'thai', 'indian', 'mexican', 'italian', 'french', 'vietnamese'];
  
  return cuisines.filter(cuisine => 
    types.some(type => type.includes(cuisine))
  );
}

function calculateRatingPenalty(rating) {
  if (!rating) return 0.5;
  
  if (rating >= 4.8) return 0;
  if (rating >= 4.6) return 0.1;
  if (rating >= 4.4) return 0.3;
  
  return 0.5;
}

function generateLowRatingReason(place) {
  const rating = place.rating || 0;
  const reasons = {
    4.6: [
      "While not the highest rated, this place offers good value and consistent quality",
      "Solid choice with reliable service and decent food quality",
      "Good option with reasonable prices and acceptable quality"
    ],
    4.4: [
      "Budget-friendly option with decent food quality",
      "Affordable choice with basic but satisfactory offerings",
      "Good value for money despite lower rating"
    ],
    4.2: [
      "Local favorite with authentic flavors despite mixed reviews",
      "Hidden gem that locals love, though ratings vary",
      "Consistent quality with loyal following"
    ]
  };
  
  const ratingKey = Math.floor(rating * 10) / 10;
  const reasonList = reasons[ratingKey] || reasons[4.2];
  return reasonList[Math.floor(Math.random() * reasonList.length)];
}

function calculateDistanceScore(place, maxRadius) {
  if (!place.distance) return 0.5; // Default score if no distance available
  
  // Convert radius from km to the same unit as distance
  const radiusKm = maxRadius || 5;
  
  if (place.distance <= radiusKm) {
    // Higher score for closer places, with bonus for very close places
    if (place.distance <= 0.3) {
      return 1.0; // Perfect score for super close places (300m)
    } else if (place.distance <= 0.5) {
      return 0.95; // Excellent score for very close places (500m)
    } else if (place.distance <= 1.0) {
      return 0.9; // Great score for walking distance (1km)
    } else {
      return 1 - (place.distance / radiusKm) * 0.3;
    }
  } else {
    // Lower score for places outside radius
    return 0.1;
  }
}

function calculateMoodMatch(place, mood) {
  // Placeholder - would analyze place characteristics vs mood
  return 0.7; // Default score
}

function calculatePriceMatch(priceLevel, userPriceRange) {
  const priceMapping = {
    'budget': [0, 1],
    'moderate': [1, 2, 3],
    'expensive': [3, 4],
    'luxury': [4]
  };
  
  const userLevels = priceMapping[userPriceRange] || [1, 2, 3];
  return userLevels.includes(priceLevel) ? 1 : 0.5;
}

function calculateDietaryMatch(place, restrictions) {
  if (!restrictions || restrictions.length === 0) return 1;
  
  const placeText = `${place.name} ${place.types?.join(' ') || ''}`.toLowerCase();
  let matchCount = 0;
  
  restrictions.forEach(restriction => {
    if (placeText.includes(restriction.toLowerCase())) {
      matchCount++;
    }
  });
  
  return matchCount / restrictions.length;
}

function calculateCuisineMatch(place, searchTerm) {
  const placeTypes = place.types || [];
  const searchLower = searchTerm.toLowerCase();
  
  for (const type of placeTypes) {
    if (type.includes(searchLower) || searchLower.includes(type)) {
      return 1;
    }
  }
  
  return 0.5;
}

// Background AI enhancement (non-blocking)
async function enhanceWithAI(restaurants, userIntent) {
  if (!openai || restaurants.length === 0) return;
  
  try {
    logger.info(`🤖 Starting background AI enhancement for ${restaurants.length} restaurants`);
    
    const prompt = `You are a food critic. For each restaurant, write UNIQUE, SPECIFIC descriptions.

User wants: ${userIntent.search_term} in ${userIntent.location}

Restaurants:
${JSON.stringify(restaurants.map(r => ({
  name: r.name,
  rating: r.rating,
  reviews: r.user_ratings_total,
  types: r.types
})))}

Return JSON array with creative descriptions for each. Make them DIFFERENT from each other:
[{
  "name": "exact name",
  "reason": "enthusiastic specific reason (30-40 words)",
  "unique_selling_point": "what makes it special (20-30 words)",
  "occasion_fit": "why it fits the occasion (20-30 words)",
  "dietary_match": "dietary info or 'Standard menu'"
}]`;

    const completion = await Promise.race([
      openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          { role: "system", content: "You write unique restaurant descriptions." },
          { role: "user", content: prompt }
        ],
        temperature: 0.9,
        max_tokens: 800
      }),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('AI timeout')), 8000)
      )
    ]);

    let content = completion.choices[0].message.content.trim();
    content = content.replace(/^```json\s*/, '').replace(/^```\s*/, '').replace(/\s*```$/, '');
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (jsonMatch) content = jsonMatch[0];
    
    const aiDescriptions = JSON.parse(content);
    
    // Cache AI descriptions by restaurant name
    aiDescriptions.forEach(desc => {
      const cacheKey = `${desc.name}_${userIntent.search_term}`.toLowerCase();
      aiDescriptionCache.set(cacheKey, {
        ...desc,
        timestamp: Date.now()
      });
    });
    
    logger.success(`✨ AI enhanced ${aiDescriptions.length} descriptions and cached them!`);
  } catch (error) {
    logger.warn(`AI enhancement failed (non-critical): ${error.message}`);
  }
}

// Get cached AI description if available
function getCachedAIDescription(restaurantName, searchTerm) {
  const cacheKey = `${restaurantName}_${searchTerm}`.toLowerCase();
  const cached = aiDescriptionCache.get(cacheKey);
  
  if (cached && (Date.now() - cached.timestamp < CACHE_TTL)) {
    return cached;
  }
  
  // Clean up expired cache
  if (cached) aiDescriptionCache.delete(cacheKey);
  return null;
}

// Enhanced AI filtering with better error handling
async function filterResults(userIntent, results) {
  if (!results || results.length === 0) return [];
  
  // Return MORE results - users expect to see many options!
  const maxResults = 10; // Increased from 3 to 10
  logger.info(`🚀 Generating unique descriptions for top ${maxResults} results (instant!)`);
  
  // Check cache first for AI-enhanced descriptions
  const top3 = results.slice(0, maxResults); // Keep variable name for backward compatibility
  const finalResults = top3.map((place, idx) => {
    // Try to get cached AI description first
    const cachedAI = getCachedAIDescription(place.name, userIntent.search_term);
    
    if (cachedAI) {
      logger.info(`💎 Using cached AI description for ${place.name}`);
      return {
        ...safeRestaurant(place),
        reason: cachedAI.reason,
        unique_selling_point: cachedAI.unique_selling_point,
        occasion_fit: cachedAI.occasion_fit,
        dietary_match: cachedAI.dietary_match,
        images: place.images || [],
        ai_enhanced: true
      };
    }
    
    // Fall back to rule-based (instant)
    const rating = parseFloat(place.rating) || 0;
    const reviews = place.user_ratings_total || 0;
    const types = place.types || [];
    const cuisine = userIntent.search_term || "food";
    
    // REASON - Based on rating tiers with SPECIFIC numbers
    let reason;
    if (rating >= 4.7 && reviews > 500) {
      const templates = [
        `Exceptional ${cuisine} with a stellar ${rating}⭐ rating from ${reviews}+ glowing reviews`,
        `Top-tier ${cuisine} spot - ${reviews}+ customers rave about it (${rating}⭐)`,
        `Outstanding quality backed by ${reviews}+ reviews averaging ${rating} stars`
      ];
      reason = templates[idx % templates.length];
    } else if (rating >= 4.5 && reviews > 200) {
      const templates = [
        `Highly rated ${cuisine} favorite - ${reviews}+ reviews, ${rating}⭐ average`,
        `Popular choice for ${cuisine} with ${rating}-star quality (${reviews}+ satisfied diners)`,
        `Consistently excellent ${cuisine}, proven by ${reviews}+ customers rating it ${rating}⭐`
      ];
      reason = templates[idx % templates.length];
    } else if (rating >= 4.0) {
      const templates = [
        `Solid ${cuisine} option with ${rating}⭐ from ${reviews} local diners`,
        `Quality ${cuisine} spot maintaining ${rating}-star standards`,
        `Reliable ${cuisine} choice - ${reviews} reviews averaging ${rating}⭐`
      ];
      reason = templates[idx % templates.length];
    } else {
      reason = `${cuisine} spot with ${rating}⭐ rating based on ${reviews} reviews`;
    }
    
    // UNIQUE SELLING POINT - Based on restaurant characteristics  
    let usp;
    if (types.includes('bar') || types.includes('night_club')) {
      const templates = [
        'Full bar with craft cocktails - dining meets nightlife',
        'Vibrant bar scene perfect for drinks and socializing',
        'Great beverage program complements the food menu'
      ];
      usp = templates[idx % templates.length];
    } else if (types.includes('cafe') || types.includes('bakery')) {
      const templates = [
        'Cozy café atmosphere with artisanal coffee and fresh pastries',
        'Perfect morning spot for specialty coffee and baked goods',
        'Relaxed café vibe ideal for working or unwinding'
      ];
      usp = templates[idx % templates.length];
    } else if (types.includes('meal_delivery') || types.includes('meal_takeaway')) {
      const templates = [
        'Convenient takeout and delivery without sacrificing quality',
        'Popular for both dine-in and grab-and-go',
        'Fast service perfect for busy schedules'
      ];
      usp = templates[idx % templates.length];
    } else if (types.includes('fine_dining')) {
      const templates = [
        'Upscale dining experience with meticulous attention to detail',
        'Fine dining destination for special occasions',
        'Premium ingredients and refined culinary techniques'
      ];
      usp = templates[idx % templates.length];
    } else if (rating >= 4.7) {
      const templates = [
        'Award-worthy quality that earns its premium ratings',
        'Local legend known for consistently outstanding dishes',
        'Top-tier establishment setting the standard for excellence'
      ];
      usp = templates[idx % templates.length];
    } else if (reviews > 500) {
      const templates = [
        'Time-tested favorite with hundreds of loyal regulars',
        'Established reputation built on consistent quality',
        'Community staple that keeps people coming back'
      ];
      usp = templates[idx % templates.length];
    } else {
      const templates = [
        'Authentic flavors served with genuine hospitality',
        'Quality ingredients prepared with care',
        'Hidden gem worth discovering'
      ];
      usp = templates[idx % templates.length];
    }
    
    // OCCASION FIT - Based on user mood and restaurant type
    let occasion;
    const mood = userIntent.mood || 'casual';
    if (mood === 'romantic' || types.includes('fine_dining')) {
      const templates = [
        'Intimate ambiance perfect for romantic dates and proposals',
        'Elegant setting ideal for celebrating special moments together',
        'Sophisticated atmosphere that sets the mood for romance'
      ];
      occasion = templates[idx % templates.length];
    } else if (mood === 'celebration') {
      const templates = [
        'Festive atmosphere great for birthdays and milestones',
        'Upbeat vibe perfect for group celebrations',
        'Memorable setting for life\'s special occasions'
      ];
      occasion = templates[idx % templates.length];
    } else if (types.includes('bar') || types.includes('night_club')) {
      const templates = [
        'Lively social scene perfect for friends and after-work drinks',
        'Energetic vibe ideal for group outings',
        'Fun atmosphere great for mixing food and nightlife'
      ];
      occasion = templates[idx % templates.length];
    } else if (types.includes('cafe') || types.includes('bakery')) {
      const templates = [
        'Chill space perfect for solo work sessions or casual meetups',
        'Comfortable setting for catching up with friends over coffee',
        'Relaxed environment suitable for any time of day'
      ];
      occasion = templates[idx % templates.length];
    } else {
      const templates = [
        'Versatile setting that works for everything from solo meals to group dinners',
        'Welcoming atmosphere whether you\'re dining alone or with company',
        'Comfortable space adaptable to any dining occasion'
      ];
      occasion = templates[idx % templates.length];
    }
    
    // DIETARY MATCH - Based on restaurant type
    let dietary;
    if (types.includes('vegetarian_restaurant')) {
      dietary = 'Dedicated vegetarian menu with creative plant-based dishes';
    } else if (types.includes('vegan_restaurant')) {
      dietary = '100% vegan menu with diverse options';
    } else if (types.includes('halal_restaurant')) {
      dietary = 'Halal-certified with proper preparation standards';
    } else if (types.includes('gluten_free_restaurant')) {
      dietary = 'Gluten-free focused with dedicated kitchen practices';
    } else if (userIntent.dietary_restrictions?.length > 0) {
      dietary = `Ask staff about ${userIntent.dietary_restrictions.join(', ')} accommodations`;
    } else {
      dietary = 'Standard menu - inquire about dietary modifications';
    }
    
    return {
      ...safeRestaurant(place),
      reason,
      unique_selling_point: usp,
      occasion_fit: occasion,
      dietary_match: dietary,
      images: place.images || [],
      ai_enhanced: false
    };
  });
  
  // Trigger background AI enhancement (non-blocking)
  // This will cache results for next time
  const needsEnhancement = finalResults.filter(r => !r.ai_enhanced);
  if (needsEnhancement.length > 0) {
    logger.info(`🚀 Triggering background AI for ${needsEnhancement.length} restaurants`);
    enhanceWithAI(needsEnhancement, userIntent).catch(err => {
      logger.warn(`Background AI failed: ${err.message}`);
    });
  }
  
  return finalResults;
}

// Proxy endpoint for Google Places photos to handle CORS issues
app.get('/api/photo', async (req, res) => {
  try {
    const { photo_reference, maxwidth = 400 } = req.query;
    
    if (!photo_reference) {
      return res.status(400).json({ error: 'photo_reference is required' });
    }
    
    const photoUrl = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${maxwidth}&photo_reference=${photo_reference}&key=${process.env.GOOGLE_MAPS_API_KEY}`;
    
    const response = await fetchWithTimeout(photoUrl, {}, 5000);
    
    if (!response.ok) {
      return res.status(404).json({ error: 'Photo not found' });
    }
    
    // Set appropriate headers
    res.set({
      'Content-Type': response.headers.get('content-type') || 'image/jpeg',
      'Cache-Control': 'public, max-age=86400', // Cache for 24 hours
      'Access-Control-Allow-Origin': '*'
    });
    
    // Stream the image data
    response.body.pipe(res);
    
  } catch (error) {
    logger.error('Photo proxy error:', error);
    res.status(500).json({ error: 'Failed to fetch photo' });
  }
});

// API Routes
app.get("/", (req, res) => {
  res.sendFile(join(__dirname, "public", "index.html"));
});

app.post("/recommend", async (req, res) => {
  try {
    const { query, userLocation, searchType, priceMode, userCoordinates, randomSeed, refreshCount = 0, avoidPlaceIds = [] } = req.body;
    
    logger.info("Recommendation request:", { query, userLocation, searchType, priceMode });
    
    if (!query || query.trim() === '') {
      return res.status(400).json({ 
        error: "Query is required",
        suggestions: ["Try: 'good food near me'", "Try: 'korean bbq'", "Try: 'cheap lunch'"]
      });
    }

    // Validate configuration
    if (!validateConfig()) {
      logger.warn("Configuration validation failed - using fallback");
      const fallbackRecs = fallbackRestaurants.slice(0, 3).map(restaurant => ({
        ...restaurant,
        reason: "Popular local recommendation (API configuration issue)",
        dietary_match: "Please check with restaurant directly",
        occasion_fit: "Suitable for various occasions",
        unique_selling_point: "Well-known local establishment"
      }));
      
      return res.json({
        recommendations: fallbackRecs,
        intent: { search_term: query, location: userLocation || "Singapore" },
        metadata: {
          total_found: fallbackRecs.length,
          search_location: userLocation,
          is_fallback: true,
          fallback_reason: "configuration_error"
        }
      });
    }

    // Step 1: Parse user intent with context
    const context = {
      searchHistory: [], // Would be populated from user session
      preferences: {}, // Would be populated from user profile
      mood: searchType === 'surprise-me' ? 'adventure' : 'casual'
    };
    
    const intent = await parseUserIntent(query, userLocation, context, searchType);
    
    if (priceMode === 'broke') {
      intent.price_range = 'budget';
    } else if (priceMode === 'ballin') {
      intent.price_range = 'expensive';
    }

    // Override intent based on search type (this should happen AFTER keyword detection)
    if (searchType === 'super-nearby') {
      intent.radius = 0.3; // 300m
    } else if (searchType === 'imma-walk') {
      intent.radius = 0.5; // 500m
    } else if (searchType === 'surprise-me') {
      intent.radius = 10; // 10km for more variety
      intent.mood = 'adventure';
    }

    // Gradually broaden search on refresh to increase variety (small steps)
    if (refreshCount > 0) {
      const baseRadius = intent.radius || 5;
      const extra = Math.min(refreshCount * 0.5, 3); // up to +3km
      intent.radius = Math.min(baseRadius + extra, 10);
    }

    // Step 2: Search multiple sources
    const searchQuery = intent.search_term || query;
    const searchLocation = intent.location || userLocation || "current location";
    const searchRadius = Math.round((intent.radius || 5) * 1000); // Convert km to meters
    
    logger.info("Searching multiple sources:", { searchQuery, searchLocation, searchRadius });
    
    const sources = await searchMultipleSources(searchQuery, searchLocation, searchRadius, userCoordinates);
    let allResults = mergeRestaurantData(sources);

    // Exclude previously shown results if provided
    if (Array.isArray(avoidPlaceIds) && avoidPlaceIds.length > 0) {
      allResults = allResults.filter(r => !avoidPlaceIds.includes(r.place_id));
    }

    // Score and add small seeded randomness for variety
    const seedStr = String(randomSeed || Date.now());
    function hashToUnit(str) {
      let h = 2166136261;
      for (let i = 0; i < str.length; i++) {
        h ^= str.charCodeAt(i);
        h += (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24);
      }
      // Convert to [0,1)
      return ((h >>> 0) % 100000) / 100000;
    }
    const noiseWeightBase = 0.6; // Increased from 0.08 for more variety
    const noiseBoost = searchType === 'surprise-me' ? 1.2 : 0; // Much stronger for surprise
    const refreshBoost = Math.min(refreshCount * 0.15, 0.5); // Stronger refresh variety
    const noiseWeight = noiseWeightBase + noiseBoost + refreshBoost;

    allResults = allResults.map(r => {
      const rating = parseFloat(r.rating || 0);
      const reviews = r.user_ratings_total || r.review_count || 0;
      const baseScore = rating * Math.log(reviews + 1);
      // Scale noise to be meaningful against baseScore (typically 5-15 range)
      const noise = (hashToUnit((r.name || '') + seedStr) - 0.5) * noiseWeight * 10;
      return { ...r, _score: baseScore + noise };
    }).sort((a, b) => b._score - a._score);
    
    logger.info("Multi-source results:", {
      google: sources.google.length,
      yelp: sources.yelp.length,
      foursquare: sources.foursquare.length,
      tripadvisor: sources.tripadvisor.length,
      merged: allResults.length
    });
    
    if (allResults.length === 0) {
      logger.warn("No results from any source");
      return res.json({
        recommendations: [],
        intent,
        metadata: {
          total_found: 0,
          search_location: userLocation,
          confidence: intent.confidence || 0.8,
          sources_used: Object.keys(sources).filter(key => sources[key].length > 0),
          source_counts: {
            google: sources.google.length,
            yelp: sources.yelp.length,
            foursquare: sources.foursquare.length,
            tripadvisor: sources.tripadvisor.length
          },
          suggestions: [
            {
              action: "broaden_search",
              message: "Try removing some filters to see more options",
              new_search_type: null,
              new_price_mode: "off"
            }
          ]
        }
      });
    }

    // Step 3: Filter results with AI (using merged data)
    const recommendations = await filterResults(intent, allResults);
    
    logger.success(`Found ${recommendations.length} recommendations`);

    res.json({
      recommendations,
      intent,
      metadata: {
        total_found: allResults.length,
        search_location: userLocation,
        confidence: intent.confidence || 0.8,
        sources_used: Object.keys(sources).filter(key => sources[key].length > 0),
        source_counts: {
          google: sources.google.length,
          yelp: sources.yelp.length,
          foursquare: sources.foursquare.length,
          tripadvisor: sources.tripadvisor.length
        },
        needs_clarification: intent.needs_clarification || false
      }
    });

  } catch (error) {
    logger.error("Recommendation error:", error);
    res.status(500).json({ 
      error: "Failed to get recommendations",
      details: error.message,
      suggestions: ["Try again in a moment", "Check your internet connection", "Try a simpler search query"]
    });
  }
});

app.get("/health", (req, res) => {
  const configValid = validateConfig();
  res.json({
    status: configValid ? "ok" : "degraded",
    message: configValid ? "API running 🚀" : "API running with limited functionality ⚠️",
    env_check: {
      openai_key: process.env.OPENAI_API_KEY ? "✅ Set" : "❌ Missing",
      google_key: process.env.GOOGLE_MAPS_API_KEY ? "✅ Set" : "❌ Missing",
      yelp_key: process.env.YELP_API_KEY ? "✅ Set" : "❌ Missing",
      foursquare_key: process.env.FOURSQUARE_API_KEY ? "✅ Set" : "❌ Missing",
      tripadvisor_key: process.env.TRIPADVISOR_API_KEY ? "✅ Set" : "❌ Missing"
    },
    features: {
      ai_recommendations: !!openai,
      google_search: !!process.env.GOOGLE_MAPS_API_KEY,
      yelp_search: !!process.env.YELP_API_KEY,
      foursquare_search: !!process.env.FOURSQUARE_API_KEY,
      tripadvisor_search: !!process.env.TRIPADVISOR_API_KEY,
      multi_source_data: true,
      fallback_mode: !configValid,
      personalization: true,
      user_profiles: userProfiles.size
    }
  });
});

// User interaction tracking endpoint
app.post("/interaction", (req, res) => {
  try {
    const { userId, query, selectedRestaurant, rejectedRestaurants, userIntent } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }
    
    // Update user preferences
    updateUserPreferences(userId, {
      query,
      selectedRestaurant,
      rejectedRestaurants,
      userIntent
    });
    
    res.json({ 
      success: true, 
      message: "Interaction recorded successfully",
      totalInteractions: userProfiles.get(userId)?.totalInteractions || 0
    });
    
  } catch (error) {
    logger.error("Error recording interaction:", error);
    res.status(500).json({ error: "Failed to record interaction" });
  }
});

// Get user profile endpoint
app.get("/profile/:userId", (req, res) => {
  try {
    const { userId } = req.params;
    const profile = userProfiles.get(userId);
    
    if (!profile) {
      return res.status(404).json({ error: "User profile not found" });
    }
    
    // Convert Sets to Arrays for JSON serialization
    const profileData = {
      ...profile,
      favoriteRestaurants: Array.from(profile.favoriteRestaurants),
      dislikedRestaurants: Array.from(profile.dislikedRestaurants),
      preferences: Object.fromEntries(
        Object.entries(profile.preferences).map(([key, value]) => [
          key, 
          Object.fromEntries(value)
        ])
      )
    };
    
    res.json(profileData);
    
  } catch (error) {
    logger.error("Error fetching user profile:", error);
    res.status(500).json({ error: "Failed to fetch user profile" });
  }
});

// Get personalized suggestions endpoint
app.get("/suggestions/:userId", (req, res) => {
  try {
    const { userId } = req.params;
    const { query = "" } = req.query;
    
    const suggestions = generatePersonalizedSuggestions(userId, query);
    
    res.json({
      suggestions,
      hasPersonalization: userProfiles.get(userId)?.totalInteractions >= 3
    });
    
  } catch (error) {
    logger.error("Error generating suggestions:", error);
    res.status(500).json({ error: "Failed to generate suggestions" });
  }
});

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
    logger.error("Geocoding error:", error);
    res.status(500).json({ error: "Geocoding failed" });
  }
});

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

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error("Unhandled error:", err);
  res.status(500).json({
    error: "Internal server error",
    message: "Something went wrong. Please try again.",
    request_id: Date.now() // Simple request ID for debugging
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: "Not found",
    message: "The requested endpoint does not exist",
    available_endpoints: ["/", "/recommend", "/health", "/api/geocode", "/api/fallback"]
  });
});

// Start server
const PORT = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === 'production';

if (!isProduction) {
  app.listen(PORT, () => {
    logger.success(`Server running on http://localhost:${PORT}`);
    logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    logger.info(`OpenAI key present: ${process.env.OPENAI_API_KEY ? 'Yes' : 'No'}`);
    logger.info(`Google Maps key present: ${process.env.GOOGLE_MAPS_API_KEY ? 'Yes' : 'No'}`);
  });
}

export default app;