#!/usr/bin/env node

/**
 * STRESS TEST RUNNER FOR FOOD-FINDER-BOT
 * 
 * This script runs comprehensive stress tests on the food-finder-bot system.
 * It tests 100+ different scenarios to ensure robustness and reliability.
 */

import { runAllTests } from './stress-test-suite.js';

console.log('🍽️  FOOD-FINDER-BOT STRESS TESTING SUITE');
console.log('==========================================');
console.log('');
console.log('This suite will test your system with:');
console.log('• 20 Basic functionality tests');
console.log('• 25 Edge case scenarios');
console.log('• 20 System-breaking attempts');
console.log('• 15 Filter combination tests');
console.log('• 10 Location handling tests');
console.log('• 5 Image loading tests');
console.log('• 9 API robustness tests');
console.log('• 10 Performance stress tests');
console.log('• 10 Security vulnerability tests');
console.log('• 10 Accessibility tests');
console.log('');
console.log('Total: 134 comprehensive tests');
console.log('');
console.log('Make sure your server is running on http://localhost:3000');
console.log('Press Ctrl+C to cancel, or wait 5 seconds to start...');
console.log('');

// Countdown before starting
let countdown = 5;
const countdownInterval = setInterval(() => {
  process.stdout.write(`\rStarting in ${countdown} seconds...`);
  countdown--;
  
  if (countdown < 0) {
    clearInterval(countdownInterval);
    console.log('\n');
    runAllTests().catch(console.error);
  }
}, 1000);

// Handle Ctrl+C
process.on('SIGINT', () => {
  clearInterval(countdownInterval);
  console.log('\n\n❌ Stress testing cancelled by user');
  process.exit(0);
});
