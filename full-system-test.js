#!/usr/bin/env node

/**
 * FULL SYSTEM TEST - Backend + Frontend simulation
 */

const BASE_URL = 'https://food-finder-giugsz4x0-calebs-projects-f483d550.vercel.app';

const criticalTests = [
  { name: 'CAFE (user reported broken)', query: 'cafe', location: 'New York', coords: { latitude: 40.7128, longitude: -74.0060 } },
  { name: 'PIZZA', query: 'pizza', location: 'New York', coords: { latitude: 40.7128, longitude: -74.0060 } },
  { name: 'SUSHI', query: 'sushi', location: 'Tokyo', coords: { latitude: 35.6762, longitude: 139.6503 } },
  { name: 'BURGER', query: 'burger', location: 'Los Angeles', coords: { latitude: 34.0522, longitude: -118.2437 } },
  { name: 'RESTAURANT', query: 'restaurant', location: 'London', coords: { latitude: 51.5074, longitude: -0.1278 } },
  { name: 'BREAKFAST', query: 'breakfast', location: 'Sydney', coords: { latitude: -33.8688, longitude: 151.2093 } },
  { name: 'ITALIAN', query: 'italian', location: 'Rome', coords: { latitude: 41.9028, longitude: 12.4964 } },
  { name: 'COFFEE', query: 'coffee', location: 'Seattle', coords: { latitude: 47.6062, longitude: -122.3321 } },
  { name: 'VEGAN', query: 'vegan', location: 'Berlin', coords: { latitude: 52.5200, longitude: 13.4050 } },
  { name: 'CHEAP FOOD', query: 'cheap food', location: 'Bangkok', coords: { latitude: 13.7563, longitude: 100.5018 } },
];

const filterTests = [
  { name: 'SUPER NEARBY', query: 'restaurant', location: 'Paris', coords: { latitude: 48.8566, longitude: 2.3522 }, searchType: 'super-nearby' },
  { name: 'IMMA WALK', query: 'cafe', location: 'Amsterdam', coords: { latitude: 52.3676, longitude: 4.9041 }, searchType: 'imma-walk' },
  { name: 'SURPRISE ME', query: 'food', location: 'Barcelona', coords: { latitude: 41.3851, longitude: 2.1734 }, searchType: 'surprise-me' },
  { name: 'BROKE MODE', query: 'restaurant', location: 'Mexico City', coords: { latitude: 19.4326, longitude: -99.1332 }, priceMode: 'broke' },
  { name: 'BALLIN MODE', query: 'restaurant', location: 'Monaco', coords: { latitude: 43.7384, longitude: 7.4246 }, priceMode: 'ballin' },
];

const edgeCases = [
  { name: 'EMPTY SPACE', query: '   ', location: 'New York', coords: { latitude: 40.7128, longitude: -74.0060 }, shouldFail: true },
  { name: 'SINGLE LETTER', query: 'a', location: 'New York', coords: { latitude: 40.7128, longitude: -74.0060 } },
  { name: 'VERY LONG QUERY', query: 'I want a restaurant with good food that is not too expensive but also has great atmosphere and is family friendly with outdoor seating and serves italian food', location: 'New York', coords: { latitude: 40.7128, longitude: -74.0060 } },
  { name: 'EMOJIS', query: '🍕 pizza 🍕', location: 'New York', coords: { latitude: 40.7128, longitude: -74.0060 } },
  { name: 'MULTILINGUAL', query: '火锅', location: 'Beijing', coords: { latitude: 39.9042, longitude: 116.4074 } },
];

let totalTests = 0;
let passed = 0;
let failed = 0;

async function testEndpoint(testCase) {
  const { name, query, location, coords, searchType = null, priceMode = null, shouldFail = false } = testCase;
  
  totalTests++;
  
  try {
    const requestBody = {
      query,
      userLocation: location,
      searchType,
      priceMode,
      userCoordinates: { ...coords, userId: 'full-system-test' }
    };
    
    const startTime = Date.now();
    const response = await fetch(`${BASE_URL}/recommend`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });
    const elapsed = Date.now() - startTime;
    
    const data = await response.json();
    
    if (shouldFail) {
      if (response.status >= 400) {
        passed++;
        console.log(`✅ ${name}: Correctly failed (${response.status})`);
        return;
      } else {
        failed++;
        console.log(`❌ ${name}: Should have failed but got ${data.recommendations?.length || 0} results`);
        return;
      }
    }
    
    const hasResults = data.recommendations && data.recommendations.length > 0;
    const resultCount = data.recommendations?.length || 0;
    
    if (!response.ok) {
      failed++;
      console.log(`❌ ${name}: HTTP ${response.status} - ${data.error || 'Unknown error'}`);
      return;
    }
    
    if (!hasResults) {
      failed++;
      console.log(`❌ ${name}: NO RESULTS (${elapsed}ms)`);
      console.log(`   Query: "${query}" in ${location}`);
      console.log(`   Response:`, JSON.stringify(data, null, 2).substring(0, 200));
      return;
    }
    
    // Validate result structure
    const firstResult = data.recommendations[0];
    const hasName = firstResult.name && firstResult.name.length > 0;
    const hasLocation = firstResult.location && firstResult.location.length > 0;
    const hasRating = firstResult.rating !== undefined;
    
    if (!hasName || !hasLocation) {
      failed++;
      console.log(`❌ ${name}: INCOMPLETE DATA - name: ${hasName}, location: ${hasLocation}`);
      return;
    }
    
    passed++;
    const avgRating = data.recommendations.reduce((sum, r) => sum + (parseFloat(r.rating) || 0), 0) / resultCount;
    console.log(`✅ ${name}: ${resultCount} results in ${elapsed}ms (avg ${avgRating.toFixed(1)}⭐)`);
    console.log(`   → ${data.recommendations.slice(0, 2).map(r => r.name).join(', ')}${resultCount > 2 ? '...' : ''}`);
    
  } catch (error) {
    failed++;
    console.log(`❌ ${name}: EXCEPTION - ${error.message}`);
  }
}

async function runAllTests() {
  console.log('🔥 FULL SYSTEM STRESS TEST');
  console.log(`Testing: ${BASE_URL}`);
  console.log('='.repeat(80));
  
  console.log('\n📋 CRITICAL USER QUERIES:');
  console.log('-'.repeat(80));
  for (const test of criticalTests) {
    await testEndpoint(test);
    await new Promise(r => setTimeout(r, 200));
  }
  
  console.log('\n🎛️  FILTER BUTTONS:');
  console.log('-'.repeat(80));
  for (const test of filterTests) {
    await testEndpoint(test);
    await new Promise(r => setTimeout(r, 200));
  }
  
  console.log('\n🧪 EDGE CASES:');
  console.log('-'.repeat(80));
  for (const test of edgeCases) {
    await testEndpoint(test);
    await new Promise(r => setTimeout(r, 200));
  }
  
  console.log('\n' + '='.repeat(80));
  console.log('📊 FINAL RESULTS:');
  console.log(`   Total Tests: ${totalTests}`);
  console.log(`   ✅ Passed: ${passed}`);
  console.log(`   ❌ Failed: ${failed}`);
  console.log(`   Success Rate: ${((passed / totalTests) * 100).toFixed(1)}%`);
  
  if (failed > 0) {
    console.log('\n⚠️  ATTENTION REQUIRED - Some tests failed!');
  } else {
    console.log('\n🎉 ALL TESTS PASSED - System is healthy!');
  }
  
  console.log('='.repeat(80));
  
  // Check frontend health
  console.log('\n🌐 FRONTEND HEALTH CHECK:');
  try {
    const homeRes = await fetch(BASE_URL);
    const html = await homeRes.text();
    const hasSearchFunction = html.includes('getRecommendations');
    const hasInput = html.includes('id="input"');
    const hasOutput = html.includes('id="output"');
    
    console.log(`   Index page loads: ${homeRes.ok ? '✅' : '❌'}`);
    console.log(`   Search function exists: ${hasSearchFunction ? '✅' : '❌'}`);
    console.log(`   Input field exists: ${hasInput ? '✅' : '❌'}`);
    console.log(`   Output container exists: ${hasOutput ? '✅' : '❌'}`);
    
    if (!hasSearchFunction || !hasInput || !hasOutput) {
      console.log('\n   ⚠️  FRONTEND ISSUE DETECTED - Key elements missing!');
    }
  } catch (error) {
    console.log(`   ❌ Frontend check failed: ${error.message}`);
  }
  
  process.exit(failed > 0 ? 1 : 0);
}

runAllTests().catch(console.error);

