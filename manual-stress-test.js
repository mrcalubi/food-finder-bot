import fetch from 'node-fetch';

const API_URL = 'http://localhost:3000/recommend';
const TIMEOUT = 30000; // 30 second timeout

// Test coordinates (Singapore)
const testCoordinates = {
  latitude: 1.3521,
  longitude: 103.8198,
  userId: 'test_user_' + Date.now()
};

// Test queries as specified
const testQueries = [
  { id: 1, query: 'cafe', description: 'Basic cafe search' },
  { id: 2, query: 'cafe near me', description: 'Cafe with "near me" filter' },
  { id: 3, query: 'vegetarian food open till late that serves alcoholic drinks', description: 'Complex multi-filter query' },
  { id: 4, query: 'dessert place near me that is opened till late', description: 'Dessert with time and location filters' },
  { id: 5, query: 'prata', description: 'Specific food item' },
  { id: 6, query: 'what should i eat', description: 'Vague query' },
  { id: 7, query: 'decide for me', description: 'Very vague query' },
  { id: 8, query: 'fusion food', description: 'Cuisine type' },
  { id: 9, query: 'cheap and good food near me', description: 'Price and quality filter' }
];

const results = {
  passed: [],
  failed: [],
  details: []
};

async function testQuery(testCase, refreshTest = false) {
  const startTime = Date.now();
  
  try {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🧪 Test ${testCase.id}: ${testCase.query}`);
    console.log(`   ${testCase.description}${refreshTest ? ' (REFRESH TEST)' : ''}`);
    console.log(`${'='.repeat(60)}`);
    
    const requestBody = {
      query: testCase.query,
      userLocation: 'Singapore',
      userCoordinates: testCoordinates,
      randomSeed: Date.now() + Math.random() * 1000000
    };
    
    console.log(`📤 Request:`, JSON.stringify(requestBody, null, 2));
    
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT);
    
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
      signal: controller.signal
    });
    
    clearTimeout(timeout);
    const duration = Date.now() - startTime;
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }
    
    const data = await response.json();
    
    console.log(`\n✅ Response received in ${duration}ms`);
    console.log(`📊 Results:`, {
      count: data.recommendations?.length || 0,
      intent: data.intent,
      total_found: data.metadata?.total_found
    });
    
    // Analyze results
    const analysis = {
      testId: testCase.id,
      query: testCase.query,
      duration,
      success: true,
      recommendationCount: data.recommendations?.length || 0,
      intent: data.intent,
      metadata: data.metadata,
      recommendations: data.recommendations?.map(r => ({
        name: r.name,
        location: r.location,
        rating: r.rating,
        price: r.price,
        distance: r.distance_formatted
      }))
    };
    
    // Display recommendations
    console.log(`\n🍽️ Recommendations:`);
    data.recommendations?.forEach((rec, idx) => {
      console.log(`\n${idx + 1}. ${rec.name}`);
      console.log(`   📍 ${rec.location}`);
      console.log(`   ⭐ ${rec.rating}/5 (${rec.user_ratings_total} reviews)`);
      console.log(`   💰 ${rec.price}`);
      if (rec.distance_formatted) {
        console.log(`   📏 ${rec.distance_formatted} away`);
      }
      console.log(`   💡 ${rec.reason}`);
    });
    
    // Check for issues
    const issues = [];
    
    if (data.recommendations?.length === 0) {
      issues.push('⚠️  No recommendations returned');
    }
    
    if (testCase.query.includes('near me') && !data.recommendations?.some(r => r.distance_formatted)) {
      issues.push('⚠️  "near me" query but no distance information');
    }
    
    if (testCase.query.includes('cheap') && data.intent?.price_range !== 'budget') {
      issues.push('⚠️  "cheap" in query but price_range not set to budget');
    }
    
    if (issues.length > 0) {
      console.log(`\n❌ Issues found:`);
      issues.forEach(issue => console.log(`   ${issue}`));
      analysis.issues = issues;
    }
    
    results.details.push(analysis);
    results.passed.push(testCase.id);
    
    return analysis;
    
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`\n❌ Test FAILED after ${duration}ms:`, error.message);
    
    results.failed.push(testCase.id);
    results.details.push({
      testId: testCase.id,
      query: testCase.query,
      duration,
      success: false,
      error: error.message
    });
    
    return null;
  }
}

async function testRefreshVariety() {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🔄 REFRESH VARIETY TEST`);
  console.log(`   Testing if refresh returns different results`);
  console.log(`${'='.repeat(60)}`);
  
  const testQuery = 'cafe near me';
  const refreshResults = [];
  
  for (let i = 0; i < 3; i++) {
    console.log(`\n🔄 Refresh attempt ${i + 1}/3`);
    
    const requestBody = {
      query: testQuery,
      userLocation: 'Singapore',
      userCoordinates: testCoordinates,
      randomSeed: Date.now() + Math.random() * 1000000,
      refreshCount: i
    };
    
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });
      
      const data = await response.json();
      const restaurantNames = data.recommendations?.map(r => r.name) || [];
      
      refreshResults.push({
        attempt: i + 1,
        names: restaurantNames
      });
      
      console.log(`   Results: ${restaurantNames.join(', ')}`);
      
    } catch (error) {
      console.error(`   ❌ Failed:`, error.message);
    }
    
    // Wait a bit between requests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Check for variety
  console.log(`\n📊 Refresh Variety Analysis:`);
  const allNames = new Set();
  refreshResults.forEach(result => {
    result.names.forEach(name => allNames.add(name));
  });
  
  console.log(`   Total unique restaurants across 3 refreshes: ${allNames.size}`);
  console.log(`   Expected: 9 (3 per refresh)`);
  console.log(`   Actual unique: ${allNames.size}`);
  
  if (allNames.size < 6) {
    console.log(`   ⚠️  Low variety - refresh might not be working properly`);
  } else if (allNames.size >= 9) {
    console.log(`   ✅ Excellent variety - all results are different!`);
  } else {
    console.log(`   ✅ Good variety - some overlap is normal`);
  }
  
  return refreshResults;
}

async function runAllTests() {
  console.log(`\n${'🎯'.repeat(30)}`);
  console.log(`FOOD FINDER BOT - COMPREHENSIVE STRESS TEST`);
  console.log(`${'🎯'.repeat(30)}\n`);
  console.log(`Starting tests at: ${new Date().toISOString()}`);
  console.log(`API Endpoint: ${API_URL}\n`);
  
  // Wait for server to be ready
  console.log(`⏳ Waiting for server to be ready...`);
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  // Run all test queries
  for (const testCase of testQueries) {
    const result = await testQuery(testCase);
    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  // Test refresh variety
  await testRefreshVariety();
  
  // Final summary
  console.log(`\n\n${'='.repeat(60)}`);
  console.log(`📊 FINAL SUMMARY`);
  console.log(`${'='.repeat(60)}`);
  console.log(`✅ Passed: ${results.passed.length}/${testQueries.length}`);
  console.log(`❌ Failed: ${results.failed.length}/${testQueries.length}`);
  
  if (results.failed.length > 0) {
    console.log(`\n❌ Failed tests: ${results.failed.join(', ')}`);
  }
  
  // Calculate average duration
  const successfulTests = results.details.filter(d => d.success);
  const avgDuration = successfulTests.reduce((sum, d) => sum + d.duration, 0) / successfulTests.length;
  console.log(`\n⏱️  Average response time: ${avgDuration.toFixed(0)}ms`);
  
  // Check for common issues
  console.log(`\n🔍 Common Issues Found:`);
  const allIssues = results.details
    .filter(d => d.issues)
    .flatMap(d => d.issues);
  
  if (allIssues.length === 0) {
    console.log(`   ✅ No issues found!`);
  } else {
    const issueCount = {};
    allIssues.forEach(issue => {
      issueCount[issue] = (issueCount[issue] || 0) + 1;
    });
    Object.entries(issueCount).forEach(([issue, count]) => {
      console.log(`   ${issue} (${count} times)`);
    });
  }
  
  console.log(`\n${'='.repeat(60)}\n`);
}

// Run the tests
runAllTests()
  .then(() => {
    console.log(`\n✅ All tests completed!`);
    process.exit(0);
  })
  .catch(error => {
    console.error(`\n❌ Test suite failed:`, error);
    process.exit(1);
  });

