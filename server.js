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

// Enhanced logging system
const logger = {
  info: (message, data = {}) => console.log(`ℹ️  ${message}`, data),
  error: (message, error = {}) => console.error(`❌ ${message}`, error),
  warn: (message, data = {}) => console.warn(`⚠️  ${message}`, data),
  success: (message, data = {}) => console.log(`✅ ${message}`, data)
};

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
    
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are an expert food recommendation AI with deep understanding of human food preferences and natural language.

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
          - Default for general queries → radius: 5`
        },
        {
          role: "user",
          content: `User query: "${userInput}"`
        }
      ],
      temperature: 0.7,
      max_tokens: 500
    });

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

// Enhanced Google Maps search with better error handling
async function searchGoogle(userIntent, userCoordinates = null) {
  try {
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
    
    const baseUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json`;
    
    const params = new URLSearchParams({
      query: q,
      key: process.env.GOOGLE_MAPS_API_KEY,
      type: 'restaurant',
      opennow: 'true'
    });
    
    // Add price level filtering
    if (price_range && price_range !== 'any') {
      const priceLevels = {
        'budget': '1',
        'moderate': '2,3', 
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
    
    const url = `${baseUrl}?${params}`;
    logger.info("Google API Request:", url);

    const res = await fetch(url);
    
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
        // More flexible rating filter
        if (!p.rating || p.rating < 3.5) return false;
        return true;
      });

    // Process places with distance calculation
    let results = filteredResults.map(place => {
      // Calculate distance if user coordinates are available
      let distance = null;
      let distanceFormatted = null;
      
      if (userCoordinates) {
        let placeLocation = null;
        
        if (place.geometry && place.geometry.location) {
          placeLocation = place.geometry.location;
        }
        
        if (placeLocation) {
          distance = calculateDistance(
            userCoordinates.latitude,
            userCoordinates.longitude,
            placeLocation.lat,
            placeLocation.lng
          );
          distanceFormatted = formatDistance(distance);
      } else {
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
    } else {
      // No user coordinates available
      distance = null;
      distanceFormatted = formatDistance(distance);
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
        distance_formatted: distanceFormatted
      };
    });

    // Sort and limit results
    results = results
      .sort((a, b) => {
        // Enhanced scoring algorithm with personalization
        const scoreA = calculateOverallScore(a, userIntent, userCoordinates?.userId);
        const scoreB = calculateOverallScore(b, userIntent, userCoordinates?.userId);
        return scoreB - scoreA;
      })
      .slice(0, 20);

    logger.success(`Filtered to ${results.length} results`);
    return results;
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

// Get place details with coordinates
async function getPlaceDetails(placeId) {
  try {
    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=geometry&key=${process.env.GOOGLE_MAPS_API_KEY}`;
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.status === 'OK' && data.result && data.result.geometry) {
      return data.result.geometry.location;
    }
    return null;
  } catch (error) {
    logger.error("Error getting place details:", error);
    return null;
  }
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

// Enhanced AI filtering with better error handling
async function filterResults(userIntent, results) {
  if (!results || results.length === 0) return [];
  
  try {
    if (!openai) {
      logger.warn("OpenAI not available - using basic filtering");
  return results.slice(0, 3).map(place => ({
    ...safeRestaurant(place),
        reason: `Good option based on your search for "${userIntent.search_term}"`,
    dietary_match: "Standard options available",
    occasion_fit: "Suitable for your needs",
    unique_selling_point: "Well-rated establishment"
  }));
}

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are an expert food recommendation AI. Analyze restaurant data and provide the TOP 3 BEST recommendations.

          User Context:
          - Search Intent: ${userIntent.search_term}
          - Dietary Restrictions: ${userIntent.dietary_restrictions?.join(', ') || 'None specified'}
          - Special Occasions: ${userIntent.special_occasions?.join(', ') || 'None specified'}
          - Price Range: ${userIntent.price_range}
          - Mood: ${userIntent.mood || 'casual'}
          - Location: ${userIntent.location}

          Return ONLY valid JSON array with exactly 3 recommendations:
          [
            {
              "name": "Restaurant Name",
              "location": "Address", 
              "price": "Price Level",
              "rating": "X.X",
              "distance": "X.X",
              "distance_formatted": "X.Xkm",
              "reason": "Detailed explanation of why this is perfect for the user",
              "dietary_match": "How it matches dietary requirements",
              "occasion_fit": "Why it's perfect for their occasion/mood",
              "unique_selling_point": "What makes this better than typical search results"
            }
          ]`
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
            user_ratings_total: place.user_ratings_total,
            price_category: place.price_category,
            cuisine_indicators: place.cuisine_indicators,
            distance: place.distance,
            distance_formatted: place.distance_formatted
          })), null, 2)}

          Please select the TOP 3 that best match the user's requirements and mood.`
        }
      ],
      temperature: 0.7,
      max_tokens: 1000
    });

    let content = completion.choices[0].message.content.trim();
    content = content.replace(/^```json\s*/, '').replace(/^```\s*/, '').replace(/\s*```$/, '');
    
    const jsonMatch = content.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      content = jsonMatch[0];
    }
    
    let parsed = JSON.parse(content);
    
    if (!Array.isArray(parsed)) {
      if (parsed && typeof parsed === 'object') {
        parsed = [parsed];
      } else {
        throw new Error('Invalid response structure from AI - expected array');
      }
    }
    
    parsed = parsed.filter(rec => rec && rec.name && rec.location);
    
    logger.info(`AI returned ${parsed.length} recommendations`);
    
    // Ensure we have exactly 3 recommendations
    while (parsed.length < 3 && results.length > parsed.length) {
      const fallbackIndex = parsed.length;
      if (results[fallbackIndex]) {
        parsed.push({
          ...safeRestaurant(results[fallbackIndex]),
          reason: `Good option based on your search for "${userIntent.search_term}"`,
          dietary_match: "Standard options available",
          occasion_fit: "Suitable for your needs",
          unique_selling_point: "Well-rated establishment",
          distance: results[fallbackIndex].distance,
          distance_formatted: results[fallbackIndex].distance_formatted
        });
      }
    }
    
    // Fill remaining slots with alternatives if needed
    while (parsed.length < 3 && parsed.length > 0) {
      const duplicateIndex = parsed.length % parsed.length;
      const duplicate = { ...parsed[duplicateIndex] };
      duplicate.name = duplicate.name + " (Alternative)";
      duplicate.reason = duplicate.reason + " - Another great option in the area";
      parsed.push(duplicate);
    }

    logger.success(`Final recommendations count: ${parsed.length}`);
    return parsed.slice(0, 3);
  } catch (err) {
    logger.error("AI Filter error:", err);
    
    // Enhanced fallback with better error handling
    let fallbackResults = results.slice(0, 3).map(place => ({
      ...safeRestaurant(place),
      reason: `Good option based on your search for "${userIntent.search_term}"`,
      dietary_match: "Please check with restaurant directly",
      occasion_fit: "Suitable for various occasions",
      unique_selling_point: "Well-rated establishment",
      distance: place.distance,
      distance_formatted: place.distance_formatted
    }));
    
    // Ensure we have exactly 3 results
    while (fallbackResults.length < 3 && results.length > fallbackResults.length) {
      const fallbackIndex = fallbackResults.length;
      if (results[fallbackIndex]) {
        fallbackResults.push({
          ...safeRestaurant(results[fallbackIndex]),
          reason: `Good option based on your search for "${userIntent.search_term}"`,
          dietary_match: "Please check with restaurant directly",
          occasion_fit: "Suitable for various occasions",
          unique_selling_point: "Well-rated establishment",
          distance: results[fallbackIndex].distance,
          distance_formatted: results[fallbackIndex].distance_formatted
        });
      }
    }
    
    logger.warn(`Fallback recommendations count: ${fallbackResults.length}`);
    return fallbackResults.slice(0, 3);
  }
}

// API Routes
app.get("/", (req, res) => {
  res.sendFile(join(__dirname, "public", "index.html"));
});

app.post("/recommend", async (req, res) => {
  try {
    const { query, userLocation, searchType, priceMode, userCoordinates } = req.body;
    
    logger.info("Recommendation request:", { query, userLocation, searchType, priceMode });
    
    if (!query) {
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

    // Step 2: Search Google Maps
    const googleResults = await searchGoogle(intent, userCoordinates);
    
    if (googleResults.length === 0) {
      logger.warn("No results from Google Maps");
      return res.json({
        recommendations: [],
        intent,
        metadata: {
          total_found: 0,
          search_location: userLocation,
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

    // Step 3: Filter results with AI
    const recommendations = await filterResults(intent, googleResults);
    
    logger.success(`Found ${recommendations.length} recommendations`);

    res.json({
      recommendations,
      intent,
      metadata: {
        total_found: googleResults.length,
        search_location: userLocation,
        confidence: intent.confidence || 0.8,
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
      google_key: process.env.GOOGLE_MAPS_API_KEY ? "✅ Set" : "❌ Missing"
    },
    features: {
      ai_recommendations: !!openai,
      google_search: !!process.env.GOOGLE_MAPS_API_KEY,
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