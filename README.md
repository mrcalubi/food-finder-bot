# 🍽️ Food Finder Bot

An AI-powered food recommendation bot that provides personalized restaurant suggestions based on your location, preferences, and dietary requirements. Built with OpenAI's GPT-4 and Google Maps API.

## ✨ Features

### 🤖 AI-Powered Intelligence
- **Natural Language Processing**: Understands complex food queries like "cheap cafe with good wifi for work"
- **Smart Intent Parsing**: Extracts dietary restrictions, price preferences, and special occasions
- **Context-Aware Recommendations**: Considers location, time, and user preferences

### 📍 Location-Based Search
- **Auto-Location Detection**: Automatically detects your current location
- **Geocoding Integration**: Converts coordinates to readable city names
- **Distance-Based Filtering**: Find places within specific walking distances

### 🎯 Smart Filtering
- **Quality Assurance**: Never recommends places below 4.4 stars
- **Rating Penalty System**: Prioritizes higher-rated establishments
- **Dietary Restrictions**: Comprehensive database of 15+ dietary options
- **Price Range Control**: Visual money bag system for budget preferences

### 🚀 Quick Actions
- **Super Nearby (300m)**: Find places within walking distance
- **Surprise Me (10km)**: Random 4.5+ star recommendations
- **Imma Walk (500m)**: Casual walking distance options
- **Price Toggle**: Switch between Broke/Ballin modes

### 👥 Group Features
- **Anonymous Voting**: Pass the phone around for group decisions
- **Real-time Results**: Live vote counting and winner announcement
- **Flexible Group Size**: Support for 2-20 people

### 🎨 Modern UI/UX
- **Responsive Design**: Works perfectly on mobile and desktop
- **Smooth Animations**: Engaging loading screens and transitions
- **Visual Feedback**: Clear status indicators and progress updates
- **Cooking Theme**: Fun, food-focused design language

## 🛠️ Tech Stack

- **Backend**: Node.js, Express.js
- **AI**: OpenAI GPT-4o-mini
- **Maps**: Google Maps Places API, Geocoding API
- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **Location**: HTML5 Geolocation API

## 🚀 Quick Start

### Prerequisites
- Node.js (v14 or higher)
- OpenAI API key
- Google Maps API key with Places and Geocoding enabled

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/mrcalubi/food-finder-bot.git
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
   
   Edit `.env` with your API keys:
   ```env
   OPENAI_API_KEY=your_openai_api_key_here
   GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
   ```

4. **Start the server**
   ```bash
   npm start
   ```

5. **Open your browser**
   Navigate to `http://localhost:3000`

## 🔧 API Setup

### OpenAI API
1. Visit [OpenAI Platform](https://platform.openai.com/)
2. Create an API key
3. Add to your `.env` file

### Google Maps API
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Enable the following APIs:
   - Places API
   - Geocoding API
3. Create an API key
4. Add to your `.env` file

## 📱 Usage

### Basic Search
Simply type your food query:
- "cheap pizza near me"
- "vegetarian restaurant for date night"
- "cafe with wifi for work"

### Quick Actions
- **Super Nearby**: Find places within 300m
- **Surprise Me**: Get a random 4.5+ star recommendation
- **Imma Walk**: Discover places within 500m
- **Price Toggle**: Switch between budget and luxury modes

### Group Voting
1. Get recommendations first
2. Click "Group Vote"
3. Set group size
4. Pass the phone around for anonymous voting
5. Reveal the winner!

## 🎯 Key Features Explained

### Quality Control
- **4.4+ Star Minimum**: Never see mediocre places
- **Smart Penalties**: Lower-rated places only suggested with good reasons
- **Rating Justification**: Clear explanations for lower-rated recommendations

### Location Intelligence
- **Auto-Detection**: No manual location input needed
- **Accurate Geocoding**: Shows your actual city, not generic "current location"
- **Distance Awareness**: All suggestions are location-relevant

### AI Understanding
- **Context Parsing**: Understands "cheap" vs "expensive", "cafe" vs "restaurant"
- **Dietary Intelligence**: Recognizes 15+ dietary restrictions
- **Occasion Awareness**: Considers romantic dinners, business meetings, etc.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- OpenAI for the powerful GPT-4 API
- Google Maps for comprehensive location data
- The open-source community for inspiration and tools

---

**Made with ❤️ for food lovers everywhere!** 🍕🍜🍔