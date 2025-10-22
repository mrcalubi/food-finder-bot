#!/usr/bin/env node

/**
 * COMPREHENSIVE STRESS TEST for Food Finder
 * Tests core functionality: finding food with various combinations
 */

const BASE_URL = process.env.TEST_URL || 'https://food-finder-92blvu8ql-calebs-projects-f483d550.vercel.app';

const testCases = [
  // Basic searches
  { name: 'Simple cafe', query: 'cafe', location: 'New York', coords: { latitude: 40.7128, longitude: -74.0060 } },
  { name: 'Simple pizza', query: 'pizza', location: 'New York', coords: { latitude: 40.7128, longitude: -74.0060 } },
  { name: 'Simple sushi', query: 'sushi', location: 'Tokyo', coords: { latitude: 35.6762, longitude: 139.6503 } },
  
  // Cuisines
  { name: 'Italian food', query: 'italian restaurant', location: 'London', coords: { latitude: 51.5074, longitude: -0.1278 } },
  { name: 'Korean BBQ', query: 'korean bbq', location: 'Seoul', coords: { latitude: 37.5665, longitude: 126.9780 } },
  { name: 'Thai food', query: 'thai restaurant', location: 'Bangkok', coords: { latitude: 13.7563, longitude: 100.5018 } },
  { name: 'Mexican tacos', query: 'mexican tacos', location: 'Mexico City', coords: { latitude: 19.4326, longitude: -99.1332 } },
  { name: 'Chinese dim sum', query: 'chinese dim sum', location: 'Hong Kong', coords: { latitude: 22.3193, longitude: 114.1694 } },
  { name: 'Japanese ramen', query: 'ramen', location: 'Osaka', coords: { latitude: 34.6937, longitude: 135.5023 } },
  { name: 'Vietnamese pho', query: 'pho', location: 'Hanoi', coords: { latitude: 21.0285, longitude: 105.8542 } },
  
  // Drinks & Beverages
  { name: 'Coffee shop', query: 'coffee shop', location: 'Seattle', coords: { latitude: 47.6062, longitude: -122.3321 } },
  { name: 'Bubble tea', query: 'bubble tea', location: 'Taipei', coords: { latitude: 25.0330, longitude: 121.5654 } },
  { name: 'Cocktail bar', query: 'cocktail bar', location: 'Paris', coords: { latitude: 48.8566, longitude: 2.3522 } },
  { name: 'Wine bar', query: 'wine bar', location: 'Barcelona', coords: { latitude: 41.3851, longitude: 2.1734 } },
  
  // Time-based
  { name: 'Breakfast spot', query: 'breakfast cafe', location: 'Sydney', coords: { latitude: -33.8688, longitude: 151.2093 } },
  { name: 'Brunch place', query: 'brunch restaurant', location: 'Melbourne', coords: { latitude: -37.8136, longitude: 144.9631 } },
  { name: 'Late night food', query: 'late night food', location: 'Las Vegas', coords: { latitude: 36.1699, longitude: -115.1398 } },
  
  // Atmosphere & Occasion
  { name: 'Romantic dinner', query: 'romantic restaurant', location: 'Venice', coords: { latitude: 45.4408, longitude: 12.3155 } },
  { name: 'Family friendly', query: 'family friendly restaurant', location: 'Orlando', coords: { latitude: 28.5383, longitude: -81.3792 } },
  { name: 'Quick lunch', query: 'quick lunch near me', location: 'Singapore', coords: { latitude: 1.3521, longitude: 103.8198 } },
  { name: 'Cozy cafe', query: 'cozy cafe', location: 'Amsterdam', coords: { latitude: 52.3676, longitude: 4.9041 } },
  
  // Dietary
  { name: 'Vegan food', query: 'vegan restaurant', location: 'Los Angeles', coords: { latitude: 34.0522, longitude: -118.2437 } },
  { name: 'Vegetarian', query: 'vegetarian food', location: 'New Delhi', coords: { latitude: 28.6139, longitude: 77.2090 } },
  { name: 'Halal food', query: 'halal restaurant', location: 'Dubai', coords: { latitude: 25.2048, longitude: 55.2708 } },
  { name: 'Gluten free', query: 'gluten free restaurant', location: 'San Francisco', coords: { latitude: 37.7749, longitude: -122.4194 } },
  
  // Price-based
  { name: 'Cheap eats', query: 'cheap good food', location: 'Mumbai', coords: { latitude: 19.0760, longitude: 72.8777 } },
  { name: 'Budget friendly', query: 'budget friendly restaurant', location: 'Manila', coords: { latitude: 14.5995, longitude: 120.9842 } },
  { name: 'Fine dining', query: 'fine dining', location: 'Geneva', coords: { latitude: 46.2044, longitude: 6.1432 } },
  
  // Distance indicators
  { name: 'Nearby cafe', query: 'cafe nearby', location: 'Berlin', coords: { latitude: 52.5200, longitude: 13.4050 } },
  { name: 'Walking distance', query: 'restaurant walking distance', location: 'Toronto', coords: { latitude: 43.6532, longitude: -79.3832 } },
  
  // Filter tests (to be run separately)
  { name: 'Super Nearby test', query: 'restaurant', location: 'New York', coords: { latitude: 40.7128, longitude: -74.0060 }, searchType: 'super-nearby' },
  { name: 'Imma Walk test', query: 'cafe', location: 'London', coords: { latitude: 51.5074, longitude: -0.1278 }, searchType: 'imma-walk' },
  { name: 'Surprise Me test', query: 'food', location: 'Paris', coords: { latitude: 48.8566, longitude: 2.3522 }, searchType: 'surprise-me' },
  { name: 'Broke mode', query: 'restaurant', location: 'Tokyo', coords: { latitude: 35.6762, longitude: 139.6503 }, priceMode: 'broke' },
  { name: 'Ballin mode', query: 'restaurant', location: 'Dubai', coords: { latitude: 25.2048, longitude: 55.2708 }, priceMode: 'ballin' },
];

let passCount = 0;
let failCount = 0;
let results = [];

async function testQuery(testCase) {
  const { name, query, location, coords, searchType = null, priceMode = null } = testCase;
  
  try {
    const requestBody = {
      query,
      userLocation: location,
      searchType,
      priceMode,
      userCoordinates: {
        ...coords,
        userId: 'stress-test-user'
      }
    };
    
    const startTime = Date.now();
    const response = await fetch(`${BASE_URL}/recommend`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });
    const elapsed = Date.now() - startTime;
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Validate response
    const recommendations = data.recommendations || [];
    const hasResults = recommendations.length > 0;
    const hasUniqueResults = new Set(recommendations.map(r => r.name)).size === recommendations.length;
    const avgRating = recommendations.reduce((sum, r) => sum + (parseFloat(r.rating) || 0), 0) / (recommendations.length || 1);
    
    const passed = hasResults && recommendations.length >= 1;
    
    if (passed) {
      passCount++;
      console.log(`✅ ${name}: ${recommendations.length} results in ${elapsed}ms (avg rating: ${avgRating.toFixed(1)})`);
      console.log(`   → ${recommendations.slice(0, 3).map(r => r.name).join(', ')}`);
    } else {
      failCount++;
      console.log(`❌ ${name}: FAILED - ${recommendations.length} results`);
    }
    
    results.push({
      name,
      passed,
      resultCount: recommendations.length,
      unique: hasUniqueResults,
      avgRating: avgRating.toFixed(1),
      responseTime: elapsed,
      restaurants: recommendations.slice(0, 3).map(r => r.name)
    });
    
  } catch (error) {
    failCount++;
    console.log(`❌ ${name}: ERROR - ${error.message}`);
    results.push({
      name,
      passed: false,
      error: error.message
    });
  }
}

async function testVariety() {
  console.log('\n🔄 VARIETY TEST: Running same query 3 times to check uniqueness...\n');
  
  const query = 'restaurant';
  const location = 'New York';
  const coords = { latitude: 40.7128, longitude: -74.0060, userId: 'variety-test' };
  
  const sets = [];
  
  for (let i = 0; i < 3; i++) {
    try {
      const response = await fetch(`${BASE_URL}/recommend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          userLocation: location,
          userCoordinates: coords,
          randomSeed: Date.now() + i * 1000
        })
      });
      
      const data = await response.json();
      const names = (data.recommendations || []).map(r => r.name);
      sets.push(names);
      console.log(`  Run ${i + 1}: ${names.join(', ')}`);
      
      await new Promise(resolve => setTimeout(resolve, 500)); // Small delay
    } catch (error) {
      console.log(`  Run ${i + 1}: ERROR - ${error.message}`);
    }
  }
  
  // Check for overlap
  const allNames = sets.flat();
  const uniqueNames = new Set(allNames);
  const varietyScore = (uniqueNames.size / allNames.length * 100).toFixed(1);
  
  console.log(`\n  Variety Score: ${varietyScore}% unique (${uniqueNames.size}/${allNames.length} total results)`);
  
  if (varietyScore < 50) {
    console.log(`  ⚠️  LOW VARIETY - Same results appearing too often`);
  } else if (varietyScore > 80) {
    console.log(`  ✅ GOOD VARIETY - Results are diverse`);
  } else {
    console.log(`  ⚡ MODERATE VARIETY - Some overlap expected`);
  }
}

async function runTests() {
  console.log('🍔 COMPREHENSIVE FOOD FINDER STRESS TEST\n');
  console.log(`Testing against: ${BASE_URL}\n`);
  console.log('=' .repeat(70));
  
  for (const testCase of testCases) {
    await testQuery(testCase);
    await new Promise(resolve => setTimeout(resolve, 300)); // Rate limiting
  }
  
  console.log('\n' + '='.repeat(70));
  await testVariety();
  console.log('=' .repeat(70));
  
  console.log(`\n📊 SUMMARY:`);
  console.log(`   ✅ Passed: ${passCount}/${testCases.length}`);
  console.log(`   ❌ Failed: ${failCount}/${testCases.length}`);
  console.log(`   Success Rate: ${((passCount / testCases.length) * 100).toFixed(1)}%`);
  
  if (failCount > 0) {
    console.log(`\n❌ FAILED TESTS:`);
    results.filter(r => !r.passed).forEach(r => {
      console.log(`   - ${r.name}: ${r.error || 'No results'}`);
    });
  }
  
  console.log(`\n💡 Core Function Status: ${passCount >= testCases.length * 0.8 ? '✅ HEALTHY' : '⚠️  NEEDS ATTENTION'}`);
  
  process.exit(failCount > testCases.length * 0.2 ? 1 : 0);
}

runTests().catch(console.error);

