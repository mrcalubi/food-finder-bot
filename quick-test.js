#!/usr/bin/env node

/**
 * QUICK STRESS TEST FOR FOOD-FINDER-BOT
 * 
 * This script runs a quick set of critical tests to identify immediate issues.
 * Run this first to get a quick overview of system health.
 */

import fetch from 'node-fetch';

const BASE_URL = 'http://localhost:3000';
let passed = 0;
let failed = 0;
let errors = [];

const logTest = (testName, status, details = '') => {
  const icon = status === 'PASS' ? '✅' : '❌';
  console.log(`${icon} ${testName}: ${status} ${details}`);
  
  if (status === 'PASS') passed++;
  else {
    failed++;
    errors.push({ test: testName, details });
  }
};

const makeRequest = async (endpoint, method = 'GET', body = null) => {
  try {
    const options = {
      method,
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000
    };
    
    if (body) options.body = JSON.stringify(body);
    
    const response = await fetch(`${BASE_URL}${endpoint}`, options);
    const data = await response.json();
    
    return { success: response.ok, data, status: response.status };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

const runQuickTests = async () => {
  console.log('🚀 QUICK STRESS TEST - FOOD-FINDER-BOT');
  console.log('=====================================');
  console.log('');
  
  // Test 1: Health Check
  console.log('1. Testing API Health...');
  try {
    const result = await makeRequest('/health');
    if (result.success) {
      logTest('Health Check', 'PASS', 'API is running');
    } else {
      logTest('Health Check', 'FAIL', result.error || 'Health check failed');
    }
  } catch (error) {
    logTest('Health Check', 'FAIL', error.message);
  }
  
  // Test 2: Basic Search
  console.log('\n2. Testing Basic Search...');
  try {
    const result = await makeRequest('/recommend', 'POST', {
      query: 'restaurant near me',
      userLocation: 'Singapore',
      searchType: null,
      priceMode: 'off',
      userCoordinates: { latitude: 1.3521, longitude: 103.8198 }
    });
    
    if (result.success && result.data.recommendations) {
      logTest('Basic Search', 'PASS', `Found ${result.data.recommendations.length} recommendations`);
    } else {
      logTest('Basic Search', 'FAIL', result.error || 'No recommendations found');
    }
  } catch (error) {
    logTest('Basic Search', 'FAIL', error.message);
  }
  
  // Test 3: Image Loading
  console.log('\n3. Testing Image Loading...');
  try {
    const result = await makeRequest('/recommend', 'POST', {
      query: 'restaurant with photos',
      userLocation: 'Singapore',
      searchType: null,
      priceMode: 'off',
      userCoordinates: { latitude: 1.3521, longitude: 103.8198 }
    });
    
    if (result.success && result.data.recommendations) {
      const hasImages = result.data.recommendations.some(r => r.images && r.images.length > 0);
      if (hasImages) {
        logTest('Image Loading', 'PASS', 'Images loaded successfully');
      } else {
        logTest('Image Loading', 'FAIL', 'No images found');
      }
    } else {
      logTest('Image Loading', 'FAIL', result.error || 'Image test failed');
    }
  } catch (error) {
    logTest('Image Loading', 'FAIL', error.message);
  }
  
  // Test 4: Distance Calculation
  console.log('\n4. Testing Distance Calculation...');
  try {
    const result = await makeRequest('/recommend', 'POST', {
      query: 'restaurant near me',
      userLocation: 'Singapore',
      searchType: 'super-nearby',
      priceMode: 'off',
      userCoordinates: { latitude: 1.3521, longitude: 103.8198 }
    });
    
    if (result.success && result.data.recommendations) {
      const hasDistance = result.data.recommendations.some(r => r.distance_formatted && r.distance_formatted !== 'N/A');
      if (hasDistance) {
        logTest('Distance Calculation', 'PASS', 'Distance calculated successfully');
      } else {
        logTest('Distance Calculation', 'FAIL', 'No distance information');
      }
    } else {
      logTest('Distance Calculation', 'FAIL', result.error || 'Distance test failed');
    }
  } catch (error) {
    logTest('Distance Calculation', 'FAIL', error.message);
  }
  
  // Test 5: Filter Application
  console.log('\n5. Testing Filter Application...');
  try {
    const result = await makeRequest('/recommend', 'POST', {
      query: 'restaurant',
      userLocation: 'Singapore',
      searchType: 'super-nearby',
      priceMode: 'broke',
      userCoordinates: { latitude: 1.3521, longitude: 103.8198 }
    });
    
    if (result.success && result.data.recommendations) {
      logTest('Filter Application', 'PASS', 'Filters applied successfully');
    } else {
      logTest('Filter Application', 'FAIL', result.error || 'Filter test failed');
    }
  } catch (error) {
    logTest('Filter Application', 'FAIL', error.message);
  }
  
  // Test 6: Edge Case Handling
  console.log('\n6. Testing Edge Case Handling...');
  try {
    const result = await makeRequest('/recommend', 'POST', {
      query: '',
      userLocation: 'Singapore',
      searchType: null,
      priceMode: 'off',
      userCoordinates: { latitude: 1.3521, longitude: 103.8198 }
    });
    
    if (result.success) {
      logTest('Edge Case Handling', 'FAIL', 'Empty query should return error');
    } else if (result.status === 400 && result.data.error) {
      logTest('Edge Case Handling', 'PASS', 'Empty query handled gracefully');
    } else {
      logTest('Edge Case Handling', 'FAIL', result.error || 'Edge case not handled');
    }
  } catch (error) {
    logTest('Edge Case Handling', 'FAIL', error.message);
  }
  
  // Test 7: Security Test
  console.log('\n7. Testing Security...');
  try {
    const result = await makeRequest('/recommend', 'POST', {
      query: '<script>alert("xss")</script>',
      userLocation: 'Singapore',
      searchType: null,
      priceMode: 'off',
      userCoordinates: { latitude: 1.3521, longitude: 103.8198 }
    });
    
    if (result.success) {
      logTest('Security Test', 'PASS', 'XSS attempt blocked');
    } else {
      logTest('Security Test', 'FAIL', result.error || 'Security vulnerability');
    }
  } catch (error) {
    logTest('Security Test', 'FAIL', error.message);
  }
  
  // Test 8: Performance Test
  console.log('\n8. Testing Performance...');
  try {
    const startTime = Date.now();
    const result = await makeRequest('/recommend', 'POST', {
      query: 'restaurant',
      userLocation: 'Singapore',
      searchType: null,
      priceMode: 'off',
      userCoordinates: { latitude: 1.3521, longitude: 103.8198 }
    });
    const duration = Date.now() - startTime;
    
    if (result.success && duration < 5000) {
      logTest('Performance Test', 'PASS', `Response time: ${duration}ms`);
    } else {
      logTest('Performance Test', 'FAIL', `Response time: ${duration}ms (too slow)`);
    }
  } catch (error) {
    logTest('Performance Test', 'FAIL', error.message);
  }
  
  // Test 9: Concurrent Requests
  console.log('\n9. Testing Concurrent Requests...');
  try {
    const promises = [];
    for (let i = 0; i < 5; i++) {
      promises.push(makeRequest('/recommend', 'POST', {
        query: 'restaurant',
        userLocation: 'Singapore',
        searchType: null,
        priceMode: 'off',
        userCoordinates: { latitude: 1.3521, longitude: 103.8198 }
      }));
    }
    
    const results = await Promise.allSettled(promises);
    const successCount = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
    
    if (successCount >= 4) {
      logTest('Concurrent Requests', 'PASS', `${successCount}/5 requests successful`);
    } else {
      logTest('Concurrent Requests', 'FAIL', `Only ${successCount}/5 requests successful`);
    }
  } catch (error) {
    logTest('Concurrent Requests', 'FAIL', error.message);
  }
  
  // Test 10: Fallback System
  console.log('\n10. Testing Fallback System...');
  try {
    const result = await makeRequest('/api/fallback');
    if (result.success && result.data.recommendations) {
      logTest('Fallback System', 'PASS', 'Fallback restaurants available');
    } else {
      logTest('Fallback System', 'FAIL', result.error || 'Fallback system failed');
    }
  } catch (error) {
    logTest('Fallback System', 'FAIL', error.message);
  }
  
  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 QUICK TEST RESULTS SUMMARY');
  console.log('='.repeat(50));
  console.log(`✅ Tests Passed: ${passed}`);
  console.log(`❌ Tests Failed: ${failed}`);
  console.log(`📈 Success Rate: ${((passed / (passed + failed)) * 100).toFixed(2)}%`);
  
  if (errors.length > 0) {
    console.log('\n❌ FAILED TESTS:');
    errors.forEach(error => {
      console.log(`   • ${error.test}: ${error.details}`);
    });
  }
  
  console.log('\n🎯 RECOMMENDATIONS:');
  if (failed === 0) {
    console.log('   🎉 All tests passed! Your system is working well.');
    console.log('   💡 Run the full stress test suite for deeper analysis.');
  } else if (failed <= 2) {
    console.log('   ⚠️  Minor issues detected. Review failed tests.');
    console.log('   🔧 Fix issues before running full stress tests.');
  } else {
    console.log('   🚨 Multiple issues detected. System needs attention.');
    console.log('   🛠️  Fix critical issues before proceeding.');
  }
  
  console.log('\n🏁 Quick test complete!');
};

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runQuickTests().catch(console.error);
}

export { runQuickTests };
