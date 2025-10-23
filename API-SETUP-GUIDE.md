# 🔑 API Setup Guide

## Required APIs

### 1. OpenAI API (REQUIRED)

**Purpose:** Powers AI intent parsing and natural language understanding

**Steps:**
1. Go to https://platform.openai.com/api-keys
2. Sign in or create an account
3. Click "Create new secret key"
4. Copy the key (it starts with `sk-...`)
5. Add to `.env`:
   ```
   OPENAI_API_KEY=sk-proj-your_key_here
   ```

**Cost:** ~$0.0015 per request (GPT-4o-mini model)

---

### 2. Google Maps API (REQUIRED)

**Purpose:** Find restaurants, get locations, fetch photos

**Steps:**
1. Go to https://console.cloud.google.com/
2. Create a new project (or select existing)
3. Enable these APIs:
   - **Places API** (New)
   - **Geocoding API**
4. Go to "Credentials" → "Create Credentials" → "API Key"
5. Copy the key
6. **IMPORTANT:** Restrict the key:
   - Click "Edit API key"
   - Under "API restrictions", select "Restrict key"
   - Check: Places API (New), Geocoding API
   - Under "Application restrictions", set to "HTTP referrers" or "IP addresses" for production
7. Add to `.env`:
   ```
   GOOGLE_MAPS_API_KEY=AIzaSy...your_key_here
   ```

**Cost:**
- Places Text Search: $32 per 1000 requests
- Places Details: $17 per 1000 requests  
- Geocoding: $5 per 1000 requests
- **Free tier:** $200 credit per month

---

## Optional APIs (Enhance Results)

### 3. Yelp Fusion API (OPTIONAL)

**Purpose:** Get additional restaurant data, reviews, and ratings

**Steps:**
1. Go to https://www.yelp.com/developers/v3/manage_app
2. Sign in or create account
3. Click "Create New App"
4. Fill in details:
   - App Name: "Food Finder Bot"
   - Industry: "Food & Restaurants"
   - Contact Email: your_email@example.com
5. Accept terms and create app
6. Copy the "API Key" (NOT Client ID)
7. Add to `.env`:
   ```
   YELP_API_KEY=your_yelp_key_here
   ```

**Cost:** FREE (5000 requests/day limit)

**Impact:**
- +10-20% more restaurant results
- Better review data
- More accurate pricing info

---

### 4. Foursquare Places API (OPTIONAL)

**Purpose:** Get additional restaurant data and tips

**Steps:**
1. Go to https://foursquare.com/developers/apps
2. Sign in or create account
3. Click "Create a new app"
4. Fill in details:
   - App Name: "Food Finder Bot"
   - App URL: http://localhost:3000 (or your domain)
5. Copy the "API Key" from the app page
6. Add to `.env`:
   ```
   FOURSQUARE_API_KEY=your_foursquare_key_here
   ```

**Cost:** FREE (950 regular calls per day)

**Impact:**
- +5-10% more restaurant results
- Unique venue tips and insights
- Alternative rating perspectives

---

### 5. TripAdvisor Content API (OPTIONAL)

**Purpose:** Get TripAdvisor ratings and reviews

**Steps:**
1. Go to https://www.tripadvisor.com/developers
2. Register for API access
3. **Note:** TripAdvisor API requires approval and may have restrictions
4. Once approved, get your API key
5. **Alternative:** Use RapidAPI's TripAdvisor endpoint:
   - Go to https://rapidapi.com/search/tripadvisor
   - Subscribe to a TripAdvisor API service
   - Get your RapidAPI key
6. Add to `.env`:
   ```
   TRIPADVISOR_API_KEY=your_key_here
   ```

**Cost:** Varies by provider

**Impact:**
- +5-10% more restaurant results
- TripAdvisor-specific ratings
- Tourist-oriented reviews

---

## 📝 Complete .env File Template

Create a `.env` file in the project root with:

```bash
# ====================================
# REQUIRED APIs
# ====================================

# OpenAI API Key (REQUIRED)
OPENAI_API_KEY=sk-proj-your_key_here

# Google Maps API Key (REQUIRED)
GOOGLE_MAPS_API_KEY=AIzaSy...your_key_here

# ====================================
# OPTIONAL APIs (Recommended)
# ====================================

# Yelp Fusion API Key (OPTIONAL but recommended)
# Get from: https://www.yelp.com/developers
YELP_API_KEY=your_yelp_key_here

# Foursquare API Key (OPTIONAL)
# Get from: https://foursquare.com/developers
FOURSQUARE_API_KEY=your_foursquare_key_here

# TripAdvisor API Key (OPTIONAL)
# Get from: https://www.tripadvisor.com/developers
TRIPADVISOR_API_KEY=your_tripadvisor_key_here

# ====================================
# Server Configuration
# ====================================

PORT=3000
NODE_ENV=development
```

---

## 🧪 Testing Your API Keys

After setting up your `.env` file:

```bash
# Start the server
npm start

# Open browser to health check
open http://localhost:3000/health
```

You should see:

```json
{
  "status": "ok",
  "message": "API running 🚀",
  "env_check": {
    "openai_key": "✅ Set",
    "google_key": "✅ Set",
    "yelp_key": "✅ Set",       // or "❌ Missing"
    "foursquare_key": "✅ Set", // or "❌ Missing"
    "tripadvisor_key": "❌ Missing"
  },
  "features": {
    "ai_recommendations": true,
    "google_search": true,
    "yelp_search": true,        // based on API key presence
    "foursquare_search": false,
    "tripadvisor_search": false,
    "multi_source_data": true,
    "fallback_mode": false,
    "personalization": true,
    "user_profiles": 0
  }
}
```

---

## 💰 Cost Estimation

**Minimum (Required APIs only):**
- OpenAI: ~$0.0015 per request
- Google Maps: ~$0.05 per request (text search + details)
- **Total per request:** ~$0.052

**With 1000 requests/month:**
- Cost: ~$52/month
- But Google gives $200/month free credit!
- **Actual cost:** ~$0/month (within free tier)

**With all optional APIs:**
- Yelp: FREE (up to 5000/day)
- Foursquare: FREE (up to 950/day)
- TripAdvisor: Varies (often paid)
- **Total: Still ~$0-52/month** (within Google's free tier)

---

## 🔒 Security Best Practices

### 1. Protect Your API Keys

**Never commit `.env` to git:**
```bash
# .gitignore already includes:
.env
.env.local
.env.*.local
```

### 2. Restrict API Keys

**Google Maps API:**
- Set HTTP referrer restrictions
- Limit to specific domains/IPs
- Enable only required APIs

**OpenAI API:**
- Set monthly spending limits
- Monitor usage dashboard
- Rotate keys periodically

### 3. Use Environment Variables

**Never hardcode keys in source code:**
```javascript
// ❌ BAD
const apiKey = "AIzaSy...";

// ✅ GOOD
const apiKey = process.env.GOOGLE_MAPS_API_KEY;
```

---

## 🚀 Quick Start

1. **Copy .env template:**
   ```bash
   cp .env.example .env
   ```

2. **Edit .env with your keys:**
   ```bash
   nano .env
   # or use any text editor
   ```

3. **Install dependencies:**
   ```bash
   npm install
   ```

4. **Test your setup:**
   ```bash
   npm start
   open http://localhost:3000/health
   ```

5. **Run stress tests:**
   ```bash
   npm test
   ```

---

## 🆘 Troubleshooting

### "OpenAI API key not found"
- Make sure `.env` file exists in project root
- Check for typos: `OPENAI_API_KEY=sk-...`
- No spaces around `=`
- No quotes needed

### "Google API Error: REQUEST_DENIED"
- Enable Places API (New) in Google Cloud Console
- Enable Geocoding API
- Check API key restrictions
- Make sure billing is enabled (for free tier)

### "Rate limit exceeded"
- Check your API quotas in respective dashboards
- Increase limits if needed
- Implement caching to reduce calls

### "CORS errors" with Google Maps
- Don't expose API keys in frontend
- Use the `/api/photo` proxy endpoint (already implemented)
- Set proper HTTP referrer restrictions

---

## 📚 Useful Links

- [OpenAI API Docs](https://platform.openai.com/docs)
- [Google Places API Docs](https://developers.google.com/maps/documentation/places/web-service)
- [Yelp Fusion API Docs](https://www.yelp.com/developers/documentation/v3)
- [Foursquare Places Docs](https://developer.foursquare.com/docs/places-api-overview)
- [Rate Limiting Best Practices](https://cloud.google.com/apis/design/rate_limiting)

---

## ✅ Checklist

Before going to production:

- [ ] All required API keys set in `.env`
- [ ] Google Maps API restrictions configured
- [ ] OpenAI spending limit set
- [ ] `.env` file in `.gitignore`
- [ ] Health endpoint returns `status: "ok"`
- [ ] All tests passing
- [ ] Rate limiting configured
- [ ] Error handling tested
- [ ] API usage monitored

---

**You're all set!** 🎉

Next: Run `npm install` and `npm start` to get started!

