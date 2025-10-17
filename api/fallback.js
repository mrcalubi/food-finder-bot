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
    name: "Wingstop",
    location: "Marina Bay, Singapore",
    price: "$$",
    rating: "4.2",
    reason: "Great location with waterfront views and delicious wings",
    dietary_match: "Vegetarian sides available, halal-certified",
    occasion_fit: "Ideal for casual meals with friends and family",
    unique_selling_point: "Same great wings with stunning Marina Bay backdrop"
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

module.exports = (req, res) => {
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
};
