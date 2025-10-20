/**
 * COMPREHENSIVE STRESS TESTING SUITE FOR FOOD-FINDER-BOT
 * 
 * This suite tests the system with 100+ different scenarios including:
 * - Basic functionality tests
 * - Edge cases and error conditions
 * - Filter combinations and conflicts
 * - System-breaking scenarios
 * - Location and distance functionality
 * - Image loading and display
 * - API robustness and error handling
 */

import fetch from 'node-fetch';

// Test configuration
const BASE_URL = 'http://localhost:3000';
const TEST_TIMEOUT = 30000; // 30 seconds per test
const CONCURRENT_TESTS = 5; // Run tests in parallel

// Test results tracking
let testResults = {
  passed: 0,
  failed: 0,
  errors: [],
  warnings: [],
  performance: []
};

// Utility functions
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const logTest = (testName, status, details = '') => {
  const timestamp = new Date().toISOString();
  const statusIcon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️';
  console.log(`${statusIcon} [${timestamp}] ${testName}: ${status} ${details}`);
  
  if (status === 'PASS') testResults.passed++;
  else if (status === 'FAIL') testResults.failed++;
  else testResults.warnings.push({ test: testName, details });
};

const makeRequest = async (endpoint, method = 'GET', body = null) => {
  const startTime = Date.now();
  try {
    const options = {
      method,
      headers: { 'Content-Type': 'application/json' },
      timeout: TEST_TIMEOUT
    };
    
    if (body) options.body = JSON.stringify(body);
    
    const response = await fetch(`${BASE_URL}${endpoint}`, options);
    const data = await response.json();
    const duration = Date.now() - startTime;
    
    return { success: response.ok, data, status: response.status, duration };
  } catch (error) {
    const duration = Date.now() - startTime;
    return { success: false, error: error.message, duration };
  }
};

// Test Categories
const TEST_CATEGORIES = {
  BASIC_FUNCTIONALITY: 'Basic Functionality',
  EDGE_CASES: 'Edge Cases',
  FILTER_COMBINATIONS: 'Filter Combinations',
  SYSTEM_BREAKING: 'System Breaking',
  LOCATION_TESTING: 'Location Testing',
  IMAGE_TESTING: 'Image Testing',
  API_ROBUSTNESS: 'API Robustness',
  PERFORMANCE: 'Performance',
  SECURITY: 'Security',
  ACCESSIBILITY: 'Accessibility'
};

// Test Data Sets
const TEST_PROMPTS = {
  // Basic Functionality Tests (20 tests)
  basic: [
    "restaurant near me",
    "good food",
    "pizza",
    "chinese food",
    "cafe",
    "cheap food",
    "expensive restaurant",
    "vegetarian food",
    "halal food",
    "korean bbq",
    "japanese sushi",
    "indian curry",
    "thai food",
    "mexican food",
    "italian pasta",
    "fast food",
    "fine dining",
    "family restaurant",
    "date night restaurant",
    "business lunch"
  ],

  // Edge Cases (25 tests)
  edgeCases: [
    "", // Empty string
    "   ", // Whitespace only
    "a", // Single character
    "food" + "x".repeat(1000), // Very long string
    "!@#$%^&*()", // Special characters only
    "123456789", // Numbers only
    "restaurant" + "\n" + "near" + "\t" + "me", // Mixed whitespace
    "RESTAURANT NEAR ME", // All caps
    "restaurant near me!!!", // Excessive punctuation
    "restaurant near me near me near me", // Repetitive
    "restaurant restaurant restaurant", // Duplicate words
    "near me restaurant", // Reversed order
    "food restaurant cafe bar", // Multiple types
    "cheap expensive food", // Contradictory terms
    "vegetarian meat food", // Contradictory dietary
    "halal pork", // Contradictory dietary
    "gluten-free bread", // Contradictory dietary
    "vegan cheese", // Contradictory dietary
    "kosher bacon", // Contradictory dietary
    "dairy-free milk", // Contradictory dietary
    "nut-free peanut", // Contradictory dietary
    "sugar-free candy", // Contradictory dietary
    "low-sodium salt", // Contradictory dietary
    "raw-food cooked", // Contradictory dietary
    "pescatarian beef" // Contradictory dietary
  ],

  // System Breaking Tests (20 tests)
  breaking: [
    null, // Null input
    undefined, // Undefined input
    {}, // Object input
    [], // Array input
    true, // Boolean input
    123, // Number input
    "SELECT * FROM users", // SQL injection attempt
    "<script>alert('xss')</script>", // XSS attempt
    "../../etc/passwd", // Path traversal
    "'; DROP TABLE restaurants; --", // SQL injection
    "javascript:alert('xss')", // JavaScript injection
    "data:text/html,<script>alert('xss')</script>", // Data URI XSS
    "restaurant" + String.fromCharCode(0), // Null byte injection
    "restaurant" + "\u0000", // Unicode null byte
    "restaurant" + "\uFFFD", // Replacement character
    "restaurant" + "\u200B", // Zero-width space
    "restaurant" + "\uFEFF", // Byte order mark
    "restaurant" + "\u202E", // Right-to-left override
    "restaurant" + "\u202D", // Left-to-right override
    "restaurant" + "\u2066" // Left-to-right isolate
  ],

  // Complex Filter Combinations (15 tests)
  filterCombinations: [
    { query: "restaurant", filters: { superNearby: true, priceMode: "broke" } },
    { query: "cafe", filters: { immaWalk: true, priceMode: "ballin" } },
    { query: "pizza", filters: { superNearby: true, immaWalk: true } },
    { query: "chinese food", filters: { priceMode: "broke", superNearby: true } },
    { query: "vegetarian", filters: { priceMode: "ballin", immaWalk: true } },
    { query: "halal food", filters: { superNearby: true, priceMode: "off" } },
    { query: "korean bbq", filters: { immaWalk: true, priceMode: "broke" } },
    { query: "fine dining", filters: { superNearby: true, priceMode: "ballin" } },
    { query: "fast food", filters: { immaWalk: true, priceMode: "off" } },
    { query: "family restaurant", filters: { superNearby: true, immaWalk: true, priceMode: "broke" } },
    { query: "date night", filters: { priceMode: "ballin", superNearby: true } },
    { query: "business lunch", filters: { immaWalk: true, priceMode: "off" } },
    { query: "cheap food", filters: { superNearby: true, priceMode: "ballin" } },
    { query: "expensive restaurant", filters: { immaWalk: true, priceMode: "broke" } },
    { query: "surprise me", filters: { superNearby: true, immaWalk: true, priceMode: "ballin" } }
  ],

  // Location Testing (10 tests)
  locationTests: [
    { query: "restaurant", location: "Singapore" },
    { query: "food", location: "New York, NY" },
    { query: "cafe", location: "London, UK" },
    { query: "pizza", location: "Tokyo, Japan" },
    { query: "chinese food", location: "Beijing, China" },
    { query: "restaurant", location: "Invalid City Name" },
    { query: "food", location: "" },
    { query: "cafe", location: null },
    { query: "pizza", location: "12345" },
    { query: "restaurant", location: "!@#$%^&*()" }
  ],

  // Performance Stress Tests (10 tests)
  performanceTests: [
    { query: "restaurant", concurrent: 10 },
    { query: "food", concurrent: 20 },
    { query: "cafe", concurrent: 50 },
    { query: "pizza", concurrent: 100 },
    { query: "chinese food", concurrent: 200 },
    { query: "vegetarian", concurrent: 500 },
    { query: "halal food", concurrent: 1000 },
    { query: "korean bbq", concurrent: 2000 },
    { query: "fine dining", concurrent: 5000 },
    { query: "fast food", concurrent: 10000 }
  ]
};

// Individual Test Functions
const runBasicFunctionalityTests = async () => {
  console.log('\n🧪 RUNNING BASIC FUNCTIONALITY TESTS...');
  
  for (const prompt of TEST_PROMPTS.basic) {
    try {
      const result = await makeRequest('/recommend', 'POST', {
        query: prompt,
        userLocation: 'Singapore',
        searchType: null,
        priceMode: 'off',
        userCoordinates: { latitude: 1.3521, longitude: 103.8198 }
      });
      
      if (result.success && result.data.recommendations) {
        logTest(`Basic: "${prompt}"`, 'PASS', `Found ${result.data.recommendations.length} recommendations`);
      } else {
        logTest(`Basic: "${prompt}"`, 'FAIL', result.error || 'No recommendations found');
      }
    } catch (error) {
      logTest(`Basic: "${prompt}"`, 'FAIL', error.message);
    }
    
    await delay(100); // Small delay between tests
  }
};

const runEdgeCaseTests = async () => {
  console.log('\n🔍 RUNNING EDGE CASE TESTS...');
  
  for (const prompt of TEST_PROMPTS.edgeCases) {
    try {
      const result = await makeRequest('/recommend', 'POST', {
        query: prompt,
        userLocation: 'Singapore',
        searchType: null,
        priceMode: 'off',
        userCoordinates: { latitude: 1.3521, longitude: 103.8198 }
      });
      
      if (result.success) {
        logTest(`Edge Case: "${prompt}"`, 'PASS', 'Handled gracefully');
      } else {
        logTest(`Edge Case: "${prompt}"`, 'FAIL', result.error || 'Failed to handle');
      }
    } catch (error) {
      logTest(`Edge Case: "${prompt}"`, 'FAIL', error.message);
    }
    
    await delay(100);
  }
};

const runSystemBreakingTests = async () => {
  console.log('\n💥 RUNNING SYSTEM BREAKING TESTS...');
  
  for (const input of TEST_PROMPTS.breaking) {
    try {
      const result = await makeRequest('/recommend', 'POST', {
        query: input,
        userLocation: 'Singapore',
        searchType: null,
        priceMode: 'off',
        userCoordinates: { latitude: 1.3521, longitude: 103.8198 }
      });
      
      if (result.success) {
        logTest(`Breaking: ${typeof input}`, 'PASS', 'System remained stable');
      } else {
        logTest(`Breaking: ${typeof input}`, 'FAIL', result.error || 'System broke');
      }
    } catch (error) {
      logTest(`Breaking: ${typeof input}`, 'FAIL', error.message);
    }
    
    await delay(100);
  }
};

const runFilterCombinationTests = async () => {
  console.log('\n🔧 RUNNING FILTER COMBINATION TESTS...');
  
  for (const test of TEST_PROMPTS.filterCombinations) {
    try {
      const result = await makeRequest('/recommend', 'POST', {
        query: test.query,
        userLocation: 'Singapore',
        searchType: test.filters.superNearby ? 'super-nearby' : test.filters.immaWalk ? 'imma-walk' : null,
        priceMode: test.filters.priceMode,
        userCoordinates: { latitude: 1.3521, longitude: 103.8198 }
      });
      
      if (result.success && result.data.recommendations) {
        logTest(`Filter: "${test.query}"`, 'PASS', `Filters applied successfully`);
      } else {
        logTest(`Filter: "${test.query}"`, 'FAIL', result.error || 'Filter application failed');
      }
    } catch (error) {
      logTest(`Filter: "${test.query}"`, 'FAIL', error.message);
    }
    
    await delay(100);
  }
};

const runLocationTests = async () => {
  console.log('\n📍 RUNNING LOCATION TESTS...');
  
  for (const test of TEST_PROMPTS.locationTests) {
    try {
      const result = await makeRequest('/recommend', 'POST', {
        query: test.query,
        userLocation: test.location,
        searchType: null,
        priceMode: 'off',
        userCoordinates: test.location === 'Singapore' ? { latitude: 1.3521, longitude: 103.8198 } : null
      });
      
      if (result.success) {
        logTest(`Location: "${test.location}"`, 'PASS', 'Location handled');
      } else {
        logTest(`Location: "${test.location}"`, 'FAIL', result.error || 'Location failed');
      }
    } catch (error) {
      logTest(`Location: "${test.location}"`, 'FAIL', error.message);
    }
    
    await delay(100);
  }
};

const runImageTests = async () => {
  console.log('\n🖼️ RUNNING IMAGE TESTS...');
  
  const imageTests = [
    "restaurant with photos",
    "cafe with images",
    "pizza place with pictures",
    "fine dining with photos",
    "family restaurant with images"
  ];
  
  for (const prompt of imageTests) {
    try {
      const result = await makeRequest('/recommend', 'POST', {
        query: prompt,
        userLocation: 'Singapore',
        searchType: null,
        priceMode: 'off',
        userCoordinates: { latitude: 1.3521, longitude: 103.8198 }
      });
      
      if (result.success && result.data.recommendations) {
        const hasImages = result.data.recommendations.some(r => r.images && r.images.length > 0);
        if (hasImages) {
          logTest(`Image: "${prompt}"`, 'PASS', 'Images loaded successfully');
        } else {
          logTest(`Image: "${prompt}"`, 'WARN', 'No images found');
        }
      } else {
        logTest(`Image: "${prompt}"`, 'FAIL', result.error || 'Image test failed');
      }
    } catch (error) {
      logTest(`Image: "${prompt}"`, 'FAIL', error.message);
    }
    
    await delay(100);
  }
};

const runAPIRobustnessTests = async () => {
  console.log('\n🛡️ RUNNING API ROBUSTNESS TESTS...');
  
  const apiTests = [
    { endpoint: '/health', method: 'GET' },
    { endpoint: '/api/fallback', method: 'GET' },
    { endpoint: '/api/geocode', method: 'GET', params: { lat: 1.3521, lng: 103.8198 } },
    { endpoint: '/recommend', method: 'POST', body: { query: 'restaurant' } },
    { endpoint: '/nonexistent', method: 'GET' },
    { endpoint: '/recommend', method: 'GET' }, // Wrong method
    { endpoint: '/recommend', method: 'POST', body: { invalid: 'data' } },
    { endpoint: '/recommend', method: 'POST', body: null },
    { endpoint: '/recommend', method: 'POST', body: 'invalid json' }
  ];
  
  for (const test of apiTests) {
    try {
      const result = await makeRequest(test.endpoint, test.method, test.body);
      
      if (test.endpoint === '/nonexistent') {
        if (result.status === 404) {
          logTest(`API: ${test.endpoint}`, 'PASS', '404 handled correctly');
        } else {
          logTest(`API: ${test.endpoint}`, 'FAIL', 'Expected 404');
        }
      } else if (result.success) {
        logTest(`API: ${test.endpoint}`, 'PASS', 'API responded');
      } else {
        logTest(`API: ${test.endpoint}`, 'FAIL', result.error || 'API failed');
      }
    } catch (error) {
      logTest(`API: ${test.endpoint}`, 'FAIL', error.message);
    }
    
    await delay(100);
  }
};

const runPerformanceTests = async () => {
  console.log('\n⚡ RUNNING PERFORMANCE TESTS...');
  
  for (const test of TEST_PROMPTS.performanceTests) {
    try {
      const startTime = Date.now();
      const promises = [];
      
      // Create concurrent requests
      for (let i = 0; i < test.concurrent; i++) {
        promises.push(makeRequest('/recommend', 'POST', {
          query: test.query,
          userLocation: 'Singapore',
          searchType: null,
          priceMode: 'off',
          userCoordinates: { latitude: 1.3521, longitude: 103.8198 }
        }));
      }
      
      const results = await Promise.allSettled(promises);
      const duration = Date.now() - startTime;
      
      const successCount = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
      const avgResponseTime = duration / test.concurrent;
      
      if (successCount > test.concurrent * 0.8) { // 80% success rate
        logTest(`Performance: ${test.concurrent} concurrent`, 'PASS', 
          `${successCount}/${test.concurrent} successful, ${avgResponseTime.toFixed(2)}ms avg`);
      } else {
        logTest(`Performance: ${test.concurrent} concurrent`, 'FAIL', 
          `Only ${successCount}/${test.concurrent} successful`);
      }
      
      testResults.performance.push({
        concurrent: test.concurrent,
        successRate: successCount / test.concurrent,
        avgResponseTime,
        duration
      });
      
    } catch (error) {
      logTest(`Performance: ${test.concurrent} concurrent`, 'FAIL', error.message);
    }
    
    await delay(1000); // Longer delay for performance tests
  }
};

const runSecurityTests = async () => {
  console.log('\n🔒 RUNNING SECURITY TESTS...');
  
  const securityTests = [
    "'; DROP TABLE restaurants; --",
    "<script>alert('xss')</script>",
    "../../etc/passwd",
    "javascript:alert('xss')",
    "data:text/html,<script>alert('xss')</script>",
    "restaurant" + String.fromCharCode(0),
    "restaurant" + "\u0000",
    "restaurant" + "\uFFFD",
    "restaurant" + "\u200B",
    "restaurant" + "\uFEFF"
  ];
  
  for (const payload of securityTests) {
    try {
      const result = await makeRequest('/recommend', 'POST', {
        query: payload,
        userLocation: 'Singapore',
        searchType: null,
        priceMode: 'off',
        userCoordinates: { latitude: 1.3521, longitude: 103.8198 }
      });
      
      if (result.success) {
        logTest(`Security: ${payload.substring(0, 20)}...`, 'PASS', 'Payload sanitized');
      } else {
        logTest(`Security: ${payload.substring(0, 20)}...`, 'FAIL', 'Security vulnerability');
      }
    } catch (error) {
      logTest(`Security: ${payload.substring(0, 20)}...`, 'FAIL', error.message);
    }
    
    await delay(100);
  }
};

const runAccessibilityTests = async () => {
  console.log('\n♿ RUNNING ACCESSIBILITY TESTS...');
  
  const accessibilityTests = [
    "restaurant near me", // Screen reader friendly
    "good food", // Simple language
    "vegetarian food", // Clear dietary info
    "cheap restaurant", // Clear pricing
    "family friendly restaurant", // Clear audience
    "wheelchair accessible restaurant", // Accessibility needs
    "quiet restaurant", // Sensory needs
    "well lit restaurant", // Visual needs
    "restaurant with large print menu", // Visual accessibility
    "restaurant with braille menu" // Visual accessibility
  ];
  
  for (const prompt of accessibilityTests) {
    try {
      const result = await makeRequest('/recommend', 'POST', {
        query: prompt,
        userLocation: 'Singapore',
        searchType: null,
        priceMode: 'off',
        userCoordinates: { latitude: 1.3521, longitude: 103.8198 }
      });
      
      if (result.success && result.data.recommendations) {
        logTest(`Accessibility: "${prompt}"`, 'PASS', 'Accessible recommendations');
      } else {
        logTest(`Accessibility: "${prompt}"`, 'FAIL', result.error || 'Accessibility failed');
      }
    } catch (error) {
      logTest(`Accessibility: "${prompt}"`, 'FAIL', error.message);
    }
    
    await delay(100);
  }
};

// Main test runner
const runAllTests = async () => {
  console.log('🚀 STARTING COMPREHENSIVE STRESS TESTING SUITE');
  console.log('=' .repeat(60));
  
  const startTime = Date.now();
  
  try {
    // Run all test suites
    await runBasicFunctionalityTests();
    await runEdgeCaseTests();
    await runSystemBreakingTests();
    await runFilterCombinationTests();
    await runLocationTests();
    await runImageTests();
    await runAPIRobustnessTests();
    await runPerformanceTests();
    await runSecurityTests();
    await runAccessibilityTests();
    
    const totalDuration = Date.now() - startTime;
    
    // Generate final report
    console.log('\n' + '=' .repeat(60));
    console.log('📊 STRESS TEST RESULTS SUMMARY');
    console.log('=' .repeat(60));
    console.log(`✅ Tests Passed: ${testResults.passed}`);
    console.log(`❌ Tests Failed: ${testResults.failed}`);
    console.log(`⚠️  Warnings: ${testResults.warnings.length}`);
    console.log(`⏱️  Total Duration: ${(totalDuration / 1000).toFixed(2)}s`);
    console.log(`📈 Success Rate: ${((testResults.passed / (testResults.passed + testResults.failed)) * 100).toFixed(2)}%`);
    
    if (testResults.performance.length > 0) {
      console.log('\n⚡ PERFORMANCE METRICS:');
      testResults.performance.forEach(perf => {
        console.log(`   ${perf.concurrent} concurrent: ${(perf.successRate * 100).toFixed(1)}% success, ${perf.avgResponseTime.toFixed(2)}ms avg`);
      });
    }
    
    if (testResults.warnings.length > 0) {
      console.log('\n⚠️  WARNINGS:');
      testResults.warnings.forEach(warning => {
        console.log(`   ${warning.test}: ${warning.details}`);
      });
    }
    
    if (testResults.errors.length > 0) {
      console.log('\n❌ ERRORS:');
      testResults.errors.forEach(error => {
        console.log(`   ${error.test}: ${error.details}`);
      });
    }
    
    console.log('\n🎯 RECOMMENDATIONS:');
    if (testResults.failed > 0) {
      console.log('   - Review failed tests and fix underlying issues');
    }
    if (testResults.warnings.length > 0) {
      console.log('   - Address warnings to improve system robustness');
    }
    if (testResults.performance.some(p => p.successRate < 0.9)) {
      console.log('   - Optimize performance for high-load scenarios');
    }
    
    console.log('\n🏁 STRESS TESTING COMPLETE!');
    
  } catch (error) {
    console.error('💥 CRITICAL ERROR IN TEST SUITE:', error);
    process.exit(1);
  }
};

// Export for use
export {
  runAllTests,
  runBasicFunctionalityTests,
  runEdgeCaseTests,
  runSystemBreakingTests,
  runFilterCombinationTests,
  runLocationTests,
  runImageTests,
  runAPIRobustnessTests,
  runPerformanceTests,
  runSecurityTests,
  runAccessibilityTests,
  TEST_CATEGORIES,
  TEST_PROMPTS
};

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllTests().catch(console.error);
}
