const express = require('express');
const fetch = require('node-fetch');
const OpenAI = require('openai');

const app = express();
app.use(express.json());

// Initialize OpenAI
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

// Fallback restaurants
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
  }
];

// Safe restaurant object
function safeRestaurant(r) {
  return {
    name: r.name || "Unknown",
    location: r.vicinity || r.formatted_address || "N/A",
    price: r.price_level ? "$".repeat(r.price_level) : "N/A",
    rating: r.rating ? r.rating.toFixed(1) : null
  };
}

// Parse user intent
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
    
    const locationContext = userLocation ? `User's current location: ${userLocation}` : "No specific location provided";
    
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are an expert food recommendation assistant. Extract user intent for food recommendations.

          CRITICAL: Pay close attention to the user's exact words:
          - "cheap", "affordable", "budget" = budget price range
          - "cafe", "coffee shop" = cafe domain (NOT restaurant)
          - "nearby", "near me" = use the user's current location
          - "expensive", "luxury" = expensive/luxury price range
          - "moderate" = moderate price range
          - "highly rated", "best rated" = requires 4.8+ stars
          - "popular", "famous" = requires 500+ reviews

          ${locationContext}

          Return ONLY valid JSON:
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
          }`
        },
        { role: "user", content: userInput }
      ]
    });

    let content = completion.choices[0].message.content.trim();
    content = content.replace(/^```json\s*/, '').replace(/^```\s*/, '').replace(/\s*```$/, '');
    
    const jsonMatch = content.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    if (jsonMatch) {
      content = jsonMatch[0];
    }
    
    let parsed = JSON.parse(content);
    
    if (!parsed.domain || !parsed.query || !parsed.location) {
      throw new Error('Invalid response structure from AI');
    }
    
    if (userLocation && (userInput.toLowerCase().includes('nearby') || userInput.toLowerCase().includes('near me'))) {
      parsed.location = userLocation;
    }
    
    if (parsed.location === 'nearby' && userLocation) {
      parsed.location = userLocation;
    }
    
    if (parsed.location === 'current location' && userLocation) {
      parsed.location = userLocation;
    }
    
    return parsed;
  } catch (err) {
    console.error("Rewrite error:", err);
    
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

// Google Maps search
async function searchGoogle(userIntent) {
  try {
    const { query, location, dietary_restrictions, cuisine_type, price_range, min_rating, min_reviews } = userIntent;
    
    let searchQuery = query;
    if (cuisine_type && cuisine_type !== "any") {
      searchQuery += ` ${cuisine_type}`;
    }
    
    if (dietary_restrictions && dietary_restrictions.length > 0) {
      searchQuery += ` ${dietary_restrictions.join(" ")}`;
    }
    
    const q = encodeURIComponent(`${searchQuery} near ${location}`);
    
    const baseUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json`;
    const params = new URLSearchParams({
      query: q,
      key: process.env.GOOGLE_MAPS_API_KEY,
      type: 'restaurant',
      opennow: 'true'
    });
    
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
      return [];
    }

    if (!data.results || data.results.length === 0) {
      console.log("No results from Google Places API");
      return [];
    }

    let results = data.results
      .filter(p => p.business_status !== "CLOSED_PERMANENTLY")
      .filter(p => {
        if (!p.rating || p.rating < 4.4) return false;
        if (min_rating && min_rating > 0) {
          if (p.rating < min_rating) return false;
        }
        if (min_reviews && min_reviews > 0) {
          if (!p.user_ratings_total || p.user_ratings_total < min_reviews) return false;
        }
        return true;
      })
      .map(place => ({
        ...place,
        price_category: getPriceCategory(place.price_level),
        rating_penalty: calculateRatingPenalty(place.rating),
        low_rating_reason: generateLowRatingReason(place)
      }))
      .sort((a, b) => {
        const scoreA = (a.rating || 0) - (a.rating_penalty || 0);
        const scoreB = (b.rating || 0) - (b.rating_penalty || 0);
        return scoreB - scoreA;
      })
      .slice(0, 20);

    console.log(`🔍 Filtered to ${results.length} results (rating: 4.4+ required)`);
    return results;
  } catch (err) {
    console.error("Google API fetch error:", err);
    return [];
  }
}

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

function calculateRatingPenalty(rating) {
  if (!rating) return 0.9;
  if (rating >= 4.8) return 0;
  if (rating >= 4.6) return 0.1;
  if (rating >= 4.4) return 0.3;
  return 0.9;
}

function generateLowRatingReason(place) {
  const rating = place.rating;
  if (!rating || rating >= 4.6) return null;
  
  const reasons = {
    4.5: [
      "While not the highest rated, this place offers excellent value and authentic local experience",
      "Slightly lower rating but known for consistent quality and friendly service"
    ],
    4.4: [
      "This place has a dedicated following despite mixed reviews - often due to specific preferences",
      "Lower rating but offers something unique that other highly-rated places don't have"
    ]
  };
  
  const ratingKey = Math.floor(rating * 10) / 10;
  const reasonList = reasons[ratingKey] || reasons[4.4];
  return reasonList[Math.floor(Math.random() * reasonList.length)];
}

// AI filtering
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

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are an expert food recommendation AI. Analyze restaurant data and provide the TOP 3 BEST recommendations.

          User Context:
          - Dietary Restrictions: ${userIntent.dietary_restrictions?.join(', ') || 'None specified'}
          - Special Occasions: ${userIntent.special_occasions?.join(', ') || 'None specified'}
          - Price Range: ${userIntent.price_range}
          - Quality Requirements: ${userIntent.min_rating > 0 ? `Min ${userIntent.min_rating} stars` : 'Any rating'} ${userIntent.min_reviews > 0 ? `, Min ${userIntent.min_reviews} reviews` : ''}

          Return ONLY valid JSON array with exactly 3 recommendations:
          [
            {
              "name": "Restaurant Name",
              "location": "Address", 
              "price": "Price Level",
              "rating": "X.X",
              "reason": "Detailed explanation of why this is perfect",
              "dietary_match": "How it matches dietary requirements",
              "occasion_fit": "Why it's perfect for their occasion",
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
            rating_penalty: place.rating_penalty,
            low_rating_reason: place.low_rating_reason
          })), null, 2)}

          Please select the TOP 3 that best match the user's requirements.`
        }
      ]
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
    
    console.log(`🤖 AI returned ${parsed.length} recommendations`);
    
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
      }
    }
    
    while (parsed.length < 3 && parsed.length > 0) {
      const duplicateIndex = parsed.length % parsed.length;
      const duplicate = { ...parsed[duplicateIndex] };
      duplicate.name = duplicate.name + " (Alternative)";
      duplicate.reason = duplicate.reason + " - Another great option in the area";
      parsed.push(duplicate);
    }

    console.log(`✅ Final recommendations count: ${parsed.length}`);
    return parsed.slice(0, 3);
  } catch (err) {
    console.error("AI Filter error:", err);
    
    let fallbackResults = results.slice(0, 3).map(place => ({
      ...safeRestaurant(place),
      reason: `Good option based on your search criteria`,
      dietary_match: "Please check with restaurant directly",
      occasion_fit: "Suitable for various occasions",
      unique_selling_point: "Well-rated establishment"
    }));
    
    while (fallbackResults.length < 3 && results.length > fallbackResults.length) {
      const fallbackIndex = fallbackResults.length;
      if (results[fallbackIndex]) {
        fallbackResults.push({
          ...safeRestaurant(results[fallbackIndex]),
          reason: `Good option based on your search criteria`,
          dietary_match: "Please check with restaurant directly",
          occasion_fit: "Suitable for various occasions",
          unique_selling_point: "Well-rated establishment"
        });
      }
    }
    
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

// Main handler
module.exports = async (req, res) => {
  console.log("🚀 /recommend endpoint hit");
  console.log("📦 Request body:", req.body);
  
  const { query, userLocation, searchType, priceMode } = req.body;
  console.log("💬 User query:", query);
  console.log("📍 User location:", userLocation);
  console.log("🔍 Search type:", searchType || 'normal');
  console.log("💰 Price mode:", priceMode || 'normal');

  try {
    let intent = await rewriteQuery(query || "restaurant Singapore", userLocation);
    
    if (priceMode === 'ballin') {
      intent.price_range = 'luxury';
    } else if (priceMode === 'broke') {
      intent.price_range = 'budget';
    }
    
    if (searchType === 'super-nearby') {
      intent.radius = 300;
    } else if (searchType === 'imma-walk') {
      intent.radius = 500;
    } else if (searchType === 'surprise-me') {
      intent.radius = 10000;
      intent.min_rating = 4.5;
    }
    
    console.log("🎯 Parsed intent:", intent);

    let results = await searchGoogle(intent);
    console.log(`🔍 Found ${results.length} results using Google search`);

    let finalRecs = await filterResults(intent, results);

    if (!Array.isArray(finalRecs)) finalRecs = [finalRecs];
    
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
};
