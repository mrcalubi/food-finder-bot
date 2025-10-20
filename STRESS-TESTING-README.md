# 🍽️ Food-Finder-Bot Stress Testing Suite

## Overview
This comprehensive testing suite is designed to stress-test your food-finder-bot system with 100+ different scenarios, including edge cases, security vulnerabilities, performance bottlenecks, and system-breaking attempts.

## 🚀 Quick Start

### Prerequisites
- Node.js installed
- Server running on `http://localhost:3000`
- API keys configured (OpenAI, Google Maps)

### Running Tests

#### 1. Quick Test (10 tests - 2 minutes)
```bash
npm test
# or
node quick-test.js
```
This runs essential tests to check basic functionality.

#### 2. Full Stress Test (134 tests - 15 minutes)
```bash
npm run test:full
# or
node run-stress-tests.js
```
This runs the complete testing suite with countdown and progress tracking.

#### 3. Direct Stress Test Suite
```bash
npm run test:stress
# or
node stress-test-suite.js
```
This runs the stress test suite directly without countdown.

## 📊 Test Categories

### 1. Basic Functionality Tests (20 tests)
- Simple queries: "restaurant near me", "good food", "pizza"
- Price range tests: "cheap food", "expensive restaurant"
- Dietary restrictions: "vegetarian food", "halal food", "vegan restaurant"
- Cuisine types: "korean bbq", "japanese sushi", "indian curry"

### 2. Edge Case Tests (25 tests)
- Empty/whitespace inputs
- Contradictory terms: "cheap expensive food", "vegetarian meat"
- Repetitive inputs: "restaurant restaurant restaurant"
- Mixed case and punctuation
- Unicode and special characters

### 3. System Breaking Tests (20 tests)
- Invalid data types: null, undefined, objects, arrays
- SQL injection attempts: `'; DROP TABLE restaurants; --`
- XSS attempts: `<script>alert('xss')</script>`
- Path traversal: `../../etc/passwd`
- Unicode injection attacks

### 4. Filter Combination Tests (15 tests)
- Distance + Price filters: Super Nearby + Broke
- Conflicting filters: Super Nearby + Imma Walk
- Edge case filters: All filters on
- Filter resolution testing

### 5. Location Testing (10 tests)
- Valid locations: Singapore, New York, London, Tokyo
- Invalid locations: Empty, null, special characters
- Location fallback handling

### 6. Image Testing (5 tests)
- Image loading verification
- Image gallery functionality
- Multiple images per restaurant
- Image click handling

### 7. API Robustness Tests (9 tests)
- Health endpoint testing
- Fallback system testing
- Geocoding API testing
- Error handling verification
- Method validation

### 8. Performance Stress Tests (10 tests)
- Concurrent requests: 10, 20, 50, 100, 200, 500, 1000, 2000, 5000, 10000
- Response time monitoring
- Memory usage tracking
- System stability under load

### 9. Security Tests (10 tests)
- SQL injection prevention
- XSS attack prevention
- Path traversal protection
- Input sanitization verification
- Unicode attack prevention

### 10. Accessibility Tests (10 tests)
- Screen reader compatibility
- Keyboard navigation
- Clear language usage
- Dietary information clarity
- Accessibility feature support

## 🔧 Manual Testing

For detailed manual testing, see [MANUAL-TESTING-GUIDE.md](./MANUAL-TESTING-GUIDE.md) which provides:
- Step-by-step test instructions
- Expected results for each test
- Common issues to look for
- Testing checklist
- Critical issues to report

## 📈 Expected Results

### Success Criteria
- **Basic Tests**: 95%+ success rate
- **Edge Cases**: 90%+ handled gracefully
- **Security Tests**: 100% blocked malicious input
- **Performance**: < 5s response time for 90% of requests
- **Accessibility**: All features accessible via keyboard/screen reader

### Performance Benchmarks
- **Response Time**: < 5 seconds for single requests
- **Concurrent Load**: Handle 100+ concurrent requests
- **Memory Usage**: Stable under load
- **Error Rate**: < 5% under normal conditions

## 🚨 Critical Issues to Watch For

1. **System Crashes**: Any test that causes server crash
2. **Security Vulnerabilities**: Successful injection or XSS
3. **Data Corruption**: Incorrect or missing data
4. **Performance Issues**: Response times > 10 seconds
5. **Accessibility Barriers**: Features not accessible
6. **Image Loading Failures**: Images not displaying
7. **Distance Calculation Errors**: Incorrect distance data
8. **Filter Conflicts**: Filters not resolving properly

## 🛠️ Troubleshooting

### Common Issues

#### Server Not Running
```bash
# Start the server
npm start
# or
node server.js
```

#### API Key Issues
- Check `.env` file for required keys
- Verify OpenAI API key is valid
- Verify Google Maps API key is valid

#### Test Failures
- Check server logs for errors
- Verify network connectivity
- Check API rate limits

#### Performance Issues
- Monitor server resources
- Check database connections
- Verify API response times

### Debug Mode
Enable debug logging by setting environment variable:
```bash
DEBUG=true npm test
```

## 📝 Test Results Interpretation

### Test Output Format
```
✅ Test Name: PASS Details
❌ Test Name: FAIL Error details
⚠️  Test Name: WARN Warning details
```

### Result Categories
- **PASS**: Test completed successfully
- **FAIL**: Test failed with error
- **WARN**: Test completed but with warnings

### Performance Metrics
- **Response Time**: Time taken for API response
- **Success Rate**: Percentage of successful requests
- **Concurrent Load**: Number of simultaneous requests handled
- **Memory Usage**: RAM consumption during tests

## 🔄 Continuous Testing

### Automated Testing
Set up automated testing with:
```bash
# Run tests every hour
crontab -e
# Add: 0 * * * * cd /path/to/food-finder-bot && npm test
```

### CI/CD Integration
Integrate with GitHub Actions or similar:
```yaml
name: Stress Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - run: npm install
      - run: npm start &
      - run: sleep 10
      - run: npm test
```

## 📚 Additional Resources

- [Manual Testing Guide](./MANUAL-TESTING-GUIDE.md)
- [API Documentation](./README.md)
- [Security Best Practices](./SECURITY.md)
- [Performance Optimization](./PERFORMANCE.md)

## 🤝 Contributing

To add new tests:
1. Add test case to appropriate category in `stress-test-suite.js`
2. Update test count in documentation
3. Add expected results and validation
4. Test the new test case
5. Submit pull request

## 📄 License

MIT License - see LICENSE file for details.

---

**Happy Testing! 🎉**

Remember: The goal is to make your food-finder-bot robust, secure, and performant. These tests help identify issues before they reach production users.
