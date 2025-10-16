# 🍽️ Food Finder Bot

An intelligent food recommendation system that goes beyond typical Google searches to provide personalized restaurant recommendations based on dietary restrictions, special occasions, and detailed preferences.

## ✨ Features

### 🧠 AI-Powered Recommendations
- **OpenAI GPT-4 Integration**: Advanced natural language processing to understand complex food requests
- **Context-Aware Analysis**: Considers dietary restrictions, special occasions, and personal preferences
- **Intelligent Filtering**: Goes beyond basic search to provide curated, high-quality recommendations

### 🥗 Comprehensive Dietary Support
- **Dietary Restrictions**: Halal, Vegetarian, Vegan, Gluten-free, Keto, Paleo, Dairy-free, Nut-free, Kosher
- **Allergy Considerations**: Smart filtering for common food allergies and sensitivities
- **Special Diets**: Support for various lifestyle and health-based dietary choices

### 🎉 Special Occasions
- **Romantic Dinners**: Perfect spots for date nights and anniversaries
- **Business Meetings**: Professional dining environments
- **Family Gatherings**: Kid-friendly and group-friendly establishments
- **Celebrations**: Birthday parties, graduations, and special events
- **Casual Dining**: Quick meals and everyday dining

### 🗺️ Enhanced Google Maps Integration
- **Advanced Search**: Utilizes Google Places API with comprehensive filtering
- **Price Range Filtering**: Budget, moderate, expensive, and luxury options
- **Real-time Data**: Current hours, ratings, and availability
- **Location Intelligence**: Smart location-based recommendations

### 💡 Smart Features
- **Detailed Explanations**: Why each recommendation is perfect for your specific needs
- **Dietary Match Details**: How each restaurant accommodates your dietary requirements
- **Occasion Suitability**: Why it's perfect for your special occasion
- **Unique Selling Points**: What makes each place special beyond typical search results

## 🚀 Quick Start

### Prerequisites
- Node.js (v14 or higher)
- OpenAI API key
- Google Maps API key

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd food-finder-bot
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` and add your API keys:
   ```
   OPENAI_API_KEY=your_openai_api_key_here
   GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
   PORT=3000
   ```

4. **Start the server**
   ```bash
   npm start
   ```

5. **Open your browser**
   Navigate to `http://localhost:3000`

## 📝 Usage Examples

### Basic Queries
- "Best Italian restaurant in downtown"
- "Cheap halal food near me"
- "Romantic dinner with sea view"

### Advanced Queries
- "Gluten-free vegan restaurant for anniversary dinner"
- "Kid-friendly halal buffet for family celebration"
- "Quiet cafe with wifi for business meeting"
- "Keto-friendly fine dining for special occasion"

### Special Occasion Queries
- "Romantic rooftop restaurant for proposal"
- "Family-friendly halal restaurant for birthday party"
- "Quiet coffee shop for first date"
- "Luxury restaurant for business client dinner"

## 🏗️ Architecture

### Backend (Node.js + Express)
- **Intent Parsing**: OpenAI GPT-4 analyzes user queries
- **Google Places Integration**: Advanced restaurant search and filtering
- **AI-Powered Recommendations**: Context-aware restaurant selection
- **Comprehensive Error Handling**: Graceful fallbacks and error recovery

### Frontend (Vanilla JavaScript + HTML/CSS)
- **Responsive Design**: Works on desktop and mobile
- **Interactive UI**: Expandable details for each recommendation
- **Real-time Feedback**: Shows detected intent and filters
- **Google Maps Integration**: Direct links to restaurant locations

## 🔧 API Endpoints

### `POST /recommend`
Main recommendation endpoint that processes user queries.

**Request Body:**
```json
{
  "query": "romantic halal restaurant with sea view"
}
```

**Response:**
```json
{
  "recommendations": [
    {
      "name": "Restaurant Name",
      "location": "Address",
      "price": "$$",
      "rating": "4.5",
      "reason": "Detailed explanation...",
      "dietary_match": "How it matches dietary requirements",
      "occasion_fit": "Why it's perfect for the occasion",
      "unique_selling_point": "What makes it special"
    }
  ],
  "intent": {
    "domain": "food",
    "query": "restaurant",
    "location": "Singapore",
    "dietary_restrictions": ["halal"],
    "special_occasions": ["romantic"],
    "price_range": "moderate",
    "ambiance": ["sea view"],
    "features": [],
    "cuisine_type": "any"
  },
  "metadata": {
    "total_found": 15,
    "dietary_restrictions": ["halal"],
    "special_occasions": ["romantic"],
    "price_range": "moderate",
    "search_location": "Singapore"
  }
}
```

### `GET /health`
Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "message": "API running 🚀"
}
```

## 🎯 Key Improvements Made

### 1. Enhanced Intent Parsing
- **Comprehensive Analysis**: Extracts dietary restrictions, special occasions, price ranges, ambiance, and features
- **Better Context Understanding**: More nuanced understanding of user needs
- **Fallback Handling**: Graceful degradation when parsing fails

### 2. Advanced Google Maps Integration
- **Multi-Parameter Search**: Combines cuisine type, dietary restrictions, and location
- **Price Level Filtering**: Smart price range filtering based on user preferences
- **Enhanced Data Processing**: Adds dietary indicators and cuisine categorization
- **Better Error Handling**: Comprehensive error handling for API failures

### 3. AI-Powered Recommendations
- **Context-Aware Filtering**: Uses full user context for better recommendations
- **Detailed Explanations**: Provides specific reasons for each recommendation
- **Dietary Match Analysis**: Explains how each restaurant meets dietary needs
- **Occasion Suitability**: Details why each place is perfect for the occasion

### 4. Comprehensive Dietary Support
- **Multiple Dietary Restrictions**: Support for 9+ dietary requirements
- **Smart Detection**: Automatically detects dietary needs from user queries
- **Restaurant Matching**: Analyzes restaurant data for dietary compatibility
- **Clear Communication**: Explains dietary options for each recommendation

### 5. Special Occasions Support
- **Occasion Detection**: Identifies special occasions from user queries
- **Context-Aware Recommendations**: Tailors suggestions to specific occasions
- **Ambiance Matching**: Considers desired atmosphere and setting
- **Feature Requirements**: Matches specific needs like wifi, parking, etc.

### 6. Enhanced User Experience
- **Rich Information Display**: Shows detailed information for each recommendation
- **Expandable Details**: Collapsible sections for different types of information
- **Visual Filter Tags**: Color-coded tags for different types of filters
- **Better Error Handling**: Clear error messages and fallback recommendations

## 🔑 Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `OPENAI_API_KEY` | OpenAI API key for GPT-4 access | Yes |
| `GOOGLE_MAPS_API_KEY` | Google Maps API key for Places API | Yes |
| `PORT` | Server port (default: 3000) | No |

## 🚨 Error Handling

The system includes comprehensive error handling:

- **API Failures**: Graceful fallback to local restaurant data
- **Invalid Queries**: Smart defaults and helpful error messages
- **Network Issues**: Retry logic and timeout handling
- **Malformed Responses**: Data validation and sanitization

## 🔮 Future Enhancements

- **User Preferences**: Save and learn from user preferences
- **Reservation Integration**: Direct booking through restaurant APIs
- **Menu Analysis**: AI-powered menu analysis for dietary compatibility
- **Reviews Integration**: Aggregate reviews from multiple sources
- **Location Services**: GPS-based location detection
- **Multi-language Support**: Support for multiple languages
- **Social Features**: Share recommendations with friends

## 📄 License

This project is licensed under the MIT License.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📞 Support

For support, please open an issue in the repository or contact the development team.
