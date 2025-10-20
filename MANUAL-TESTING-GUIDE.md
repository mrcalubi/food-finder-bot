# 🍽️ FOOD-FINDER-BOT MANUAL TESTING GUIDE

## Overview
This guide provides 100+ manual test cases to thoroughly debug and stress-test your food-finder-bot system. Each test is designed to push different aspects of the system to their limits.

## Prerequisites
- Server running on `http://localhost:3000`
- Browser developer tools open (F12)
- Network tab monitoring enabled

---

## 🧪 BASIC FUNCTIONALITY TESTS (20 tests)

### Test 1-5: Simple Queries
1. **Input**: `restaurant near me`
   - **Expected**: Returns 3 restaurant recommendations
   - **Check**: Images load, distance shows, ratings display

2. **Input**: `good food`
   - **Expected**: Returns general food recommendations
   - **Check**: No errors, reasonable results

3. **Input**: `pizza`
   - **Expected**: Returns pizza places
   - **Check**: Pizza-specific results

4. **Input**: `chinese food`
   - **Expected**: Returns Chinese restaurants
   - **Check**: Chinese cuisine results

5. **Input**: `cafe`
   - **Expected**: Returns cafes
   - **Check**: Cafe-specific results

### Test 6-10: Price Range Tests
6. **Input**: `cheap food`
   - **Expected**: Budget-friendly options
   - **Check**: Price levels show $ or $$

7. **Input**: `expensive restaurant`
   - **Expected**: High-end restaurants
   - **Check**: Price levels show $$$ or $$$$

8. **Input**: `moderate restaurant`
   - **Expected**: Mid-range options
   - **Check**: Price levels show $$ or $$$

9. **Input**: `luxury dining`
   - **Expected**: Fine dining establishments
   - **Check**: High-end results

10. **Input**: `budget food`
    - **Expected**: Affordable options
    - **Check**: Low-price results

### Test 11-15: Dietary Restrictions
11. **Input**: `vegetarian food`
    - **Expected**: Vegetarian-friendly restaurants
    - **Check**: Dietary info shows vegetarian options

12. **Input**: `halal food`
    - **Expected**: Halal-certified restaurants
    - **Check**: Halal information displayed

13. **Input**: `vegan restaurant`
    - **Expected**: Vegan-friendly places
    - **Check**: Vegan options highlighted

14. **Input**: `gluten-free food`
    - **Expected**: Gluten-free options
    - **Check**: GF information shown

15. **Input**: `keto restaurant`
    - **Expected**: Keto-friendly places
    - **Check**: Keto options available

### Test 16-20: Cuisine Types
16. **Input**: `korean bbq`
    - **Expected**: Korean BBQ restaurants
    - **Check**: Korean cuisine results

17. **Input**: `japanese sushi`
    - **Expected**: Japanese sushi places
    - **Check**: Japanese cuisine results

18. **Input**: `indian curry`
    - **Expected**: Indian restaurants
    - **Check**: Indian cuisine results

19. **Input**: `thai food`
    - **Expected**: Thai restaurants
    - **Check**: Thai cuisine results

20. **Input**: `mexican food`
    - **Expected**: Mexican restaurants
    - **Check**: Mexican cuisine results

---

## 🔍 EDGE CASE TESTS (25 tests)

### Test 21-25: Empty/Invalid Inputs
21. **Input**: `` (empty string)
    - **Expected**: Error message or fallback
    - **Check**: System doesn't crash

22. **Input**: `   ` (whitespace only)
    - **Expected**: Error handling
    - **Check**: Graceful error message

23. **Input**: `a` (single character)
    - **Expected**: Minimal results or error
    - **Check**: System handles gracefully

24. **Input**: `food` + 1000x `x` (very long string)
    - **Expected**: Truncated or error
    - **Check**: No memory issues

25. **Input**: `!@#$%^&*()` (special characters only)
    - **Expected**: Error or no results
    - **Check**: Input sanitization

### Test 26-30: Contradictory Terms
26. **Input**: `cheap expensive food`
    - **Expected**: System resolves conflict
    - **Check**: Reasonable interpretation

27. **Input**: `vegetarian meat food`
    - **Expected**: Conflict resolution
    - **Check**: System handles contradiction

28. **Input**: `halal pork`
    - **Expected**: Error or clarification
    - **Check**: Dietary conflict handling

29. **Input**: `gluten-free bread`
    - **Expected**: Clarification needed
    - **Check**: System asks for clarification

30. **Input**: `vegan cheese`
    - **Expected**: Vegan cheese options
    - **Check**: Plant-based alternatives

### Test 31-35: Repetitive Inputs
31. **Input**: `restaurant restaurant restaurant`
    - **Expected**: Deduplication
    - **Check**: Single restaurant search

32. **Input**: `near me near me near me`
    - **Expected**: Location-based search
    - **Check**: Nearby results

33. **Input**: `food food food`
    - **Expected**: General food search
    - **Check**: Food recommendations

34. **Input**: `cheap cheap cheap`
    - **Expected**: Budget search
    - **Check**: Low-price results

35. **Input**: `good good good`
    - **Expected**: Quality-focused search
    - **Check**: High-rated results

### Test 36-40: Mixed Case and Punctuation
36. **Input**: `RESTAURANT NEAR ME`
    - **Expected**: Same as lowercase
    - **Check**: Case insensitive

37. **Input**: `restaurant near me!!!`
    - **Expected**: Ignores excessive punctuation
    - **Check**: Clean processing

38. **Input**: `restaurant\nnear\nme`
    - **Expected**: Handles newlines
    - **Check**: Proper parsing

39. **Input**: `restaurant\tnear\tme`
    - **Expected**: Handles tabs
    - **Check**: Proper parsing

40. **Input**: `restaurant   near   me`
    - **Expected**: Handles multiple spaces
    - **Check**: Proper parsing

### Test 41-45: Unicode and Special Characters
41. **Input**: `restaurant near me` + null byte
    - **Expected**: Sanitized input
    - **Check**: No injection issues

42. **Input**: `restaurant` + zero-width space
    - **Expected**: Clean processing
    - **Check**: No hidden characters

43. **Input**: `restaurant` + right-to-left override
    - **Expected**: Proper text direction
    - **Check**: No display issues

44. **Input**: `restaurant` + byte order mark
    - **Expected**: Clean processing
    - **Check**: No encoding issues

45. **Input**: `restaurant` + replacement character
    - **Expected**: Handled gracefully
    - **Check**: No display corruption

---

## 💥 SYSTEM BREAKING TESTS (20 tests)

### Test 46-50: Invalid Data Types
46. **Input**: `null`
    - **Expected**: Error handling
    - **Check**: System doesn't crash

47. **Input**: `undefined`
    - **Expected**: Error handling
    - **Check**: Graceful failure

48. **Input**: `{}`
    - **Expected**: Error handling
    - **Check**: Type validation

49. **Input**: `[]`
    - **Expected**: Error handling
    - **Check**: Array handling

50. **Input**: `123`
    - **Expected**: Error handling
    - **Check**: Number handling

### Test 51-55: SQL Injection Attempts
51. **Input**: `'; DROP TABLE restaurants; --`
    - **Expected**: Sanitized input
    - **Check**: No SQL execution

52. **Input**: `' OR '1'='1`
    - **Expected**: Sanitized input
    - **Check**: No SQL injection

53. **Input**: `'; SELECT * FROM users; --`
    - **Expected**: Sanitized input
    - **Check**: No data access

54. **Input**: `' UNION SELECT * FROM passwords; --`
    - **Expected**: Sanitized input
    - **Check**: No data breach

55. **Input**: `'; INSERT INTO logs VALUES ('hack'); --`
    - **Expected**: Sanitized input
    - **Check**: No data modification

### Test 56-60: XSS Attempts
56. **Input**: `<script>alert('xss')</script>`
    - **Expected**: Sanitized input
    - **Check**: No script execution

57. **Input**: `javascript:alert('xss')`
    - **Expected**: Sanitized input
    - **Check**: No JavaScript execution

58. **Input**: `data:text/html,<script>alert('xss')</script>`
    - **Expected**: Sanitized input
    - **Check**: No data URI execution

59. **Input**: `<img src=x onerror=alert('xss')>`
    - **Expected**: Sanitized input
    - **Check**: No image-based XSS

60. **Input**: `<svg onload=alert('xss')>`
    - **Expected**: Sanitized input
    - **Check**: No SVG-based XSS

### Test 61-65: Path Traversal Attempts
61. **Input**: `../../etc/passwd`
    - **Expected**: Sanitized input
    - **Check**: No file access

62. **Input**: `..\\..\\windows\\system32\\config\\sam`
    - **Expected**: Sanitized input
    - **Check**: No Windows file access

63. **Input**: `/etc/shadow`
    - **Expected**: Sanitized input
    - **Check**: No system file access

64. **Input**: `C:\\Windows\\System32\\config\\SAM`
    - **Expected**: Sanitized input
    - **Check**: No Windows system access

65. **Input**: `../../../var/log/auth.log`
    - **Expected**: Sanitized input
    - **Check**: No log file access

---

## 🔧 FILTER COMBINATION TESTS (15 tests)

### Test 66-70: Distance + Price Filters
66. **Query**: `restaurant`, **Filters**: Super Nearby + Broke
    - **Expected**: Very close, cheap restaurants
    - **Check**: Distance < 300m, price $ or $$

67. **Query**: `cafe`, **Filters**: Imma Walk + Ballin
    - **Expected**: Walking distance, expensive cafes
    - **Check**: Distance < 500m, price $$$ or $$$$

68. **Query**: `pizza`, **Filters**: Super Nearby + Off
    - **Expected**: Very close pizza places, any price
    - **Check**: Distance < 300m, mixed prices

69. **Query**: `chinese food`, **Filters**: Imma Walk + Broke
    - **Expected**: Walking distance, cheap Chinese food
    - **Check**: Distance < 500m, price $ or $$

70. **Query**: `vegetarian`, **Filters**: Super Nearby + Ballin
    - **Expected**: Very close, expensive vegetarian places
    - **Check**: Distance < 300m, price $$$ or $$$$

### Test 71-75: Conflicting Filters
71. **Query**: `restaurant`, **Filters**: Super Nearby + Imma Walk
    - **Expected**: System resolves conflict (prefer closer)
    - **Check**: Distance < 300m (super nearby wins)

72. **Query**: `cafe`, **Filters**: Broke + Ballin
    - **Expected**: System resolves conflict
    - **Check**: One price mode applied

73. **Query**: `pizza`, **Filters**: All filters on
    - **Expected**: System handles multiple filters
    - **Check**: Reasonable results

74. **Query**: `fine dining`, **Filters**: Super Nearby + Broke
    - **Expected**: Conflict resolution
    - **Check**: System suggests alternatives

75. **Query**: `fast food`, **Filters**: Imma Walk + Ballin
    - **Expected**: Conflict resolution
    - **Check**: System suggests alternatives

### Test 76-80: Edge Case Filters
76. **Query**: `restaurant`, **Filters**: Super Nearby + Surprise Me
    - **Expected**: Very close random high-rated places
    - **Check**: Distance < 300m, rating > 4.5

77. **Query**: `cafe`, **Filters**: Imma Walk + Surprise Me
    - **Expected**: Walking distance random cafes
    - **Check**: Distance < 500m, random selection

78. **Query**: `pizza`, **Filters**: All distance filters
    - **Expected**: System handles multiple distance filters
    - **Check**: Closest distance applied

79. **Query**: `chinese food`, **Filters**: All price filters
    - **Expected**: System handles multiple price filters
    - **Check**: One price mode applied

80. **Query**: `vegetarian`, **Filters**: No filters
    - **Expected**: General vegetarian search
    - **Check**: No filter restrictions

---

## 📍 LOCATION TESTING (10 tests)

### Test 81-85: Valid Locations
81. **Query**: `restaurant`, **Location**: `Singapore`
    - **Expected**: Singapore restaurants
    - **Check**: Location-specific results

82. **Query**: `food`, **Location**: `New York, NY`
    - **Expected**: NYC restaurants
    - **Check**: NYC-specific results

83. **Query**: `cafe`, **Location**: `London, UK`
    - **Expected**: London cafes
    - **Check**: London-specific results

84. **Query**: `pizza`, **Location**: `Tokyo, Japan`
    - **Expected**: Tokyo pizza places
    - **Check**: Tokyo-specific results

85. **Query**: `chinese food`, **Location**: `Beijing, China`
    - **Expected**: Beijing Chinese restaurants
    - **Check**: Beijing-specific results

### Test 86-90: Invalid Locations
86. **Query**: `restaurant`, **Location**: `Invalid City Name`
    - **Expected**: Error or fallback
    - **Check**: Graceful handling

87. **Query**: `food`, **Location**: `` (empty)
    - **Expected**: Uses current location
    - **Check**: Fallback to GPS/IP

88. **Query**: `cafe`, **Location**: `null`
    - **Expected**: Uses current location
    - **Check**: Fallback handling

89. **Query**: `pizza`, **Location**: `12345`
    - **Expected**: Error or fallback
    - **Check**: Invalid location handling

90. **Query**: `restaurant`, **Location**: `!@#$%^&*()`
    - **Expected**: Error or fallback
    - **Check**: Special character handling

---

## 🖼️ IMAGE TESTING (5 tests)

### Test 91-95: Image Loading
91. **Query**: `restaurant with photos`
    - **Expected**: Restaurants with images
    - **Check**: Images load properly

92. **Query**: `cafe with images`
    - **Expected**: Cafes with photos
    - **Check**: Image gallery displays

93. **Query**: `pizza place with pictures`
    - **Expected**: Pizza places with images
    - **Check**: Images are clickable

94. **Query**: `fine dining with photos`
    - **Expected**: Fine dining with images
    - **Check**: High-quality images

95. **Query**: `family restaurant with images`
    - **Expected**: Family restaurants with photos
    - **Check**: Multiple images per restaurant

---

## 🛡️ API ROBUSTNESS TESTS (9 tests)

### Test 96-100: Endpoint Testing
96. **Endpoint**: `/health`
    - **Expected**: Health status
    - **Check**: API key status, features enabled

97. **Endpoint**: `/api/fallback`
    - **Expected**: Fallback restaurants
    - **Check**: Caleb's favorites displayed

98. **Endpoint**: `/api/geocode?lat=1.3521&lng=103.8198`
    - **Expected**: Singapore location data
    - **Check**: Proper geocoding response

99. **Endpoint**: `/nonexistent`
    - **Expected**: 404 error
    - **Check**: Proper error handling

100. **Endpoint**: `/recommend` (GET method)
    - **Expected**: Method not allowed
    - **Check**: Proper HTTP method handling

### Test 101-104: Error Handling
101. **Request**: Invalid JSON body
    - **Expected**: JSON parse error
    - **Check**: Graceful error message

102. **Request**: Missing required fields
    - **Expected**: Validation error
    - **Check**: Clear error message

103. **Request**: Malformed coordinates
    - **Expected**: Coordinate error
    - **Check**: Proper validation

104. **Request**: Oversized payload
    - **Expected**: Payload too large
    - **Check**: Size limit enforcement

---

## ⚡ PERFORMANCE STRESS TESTS (10 tests)

### Test 105-114: Concurrent Load Testing
105. **Concurrent Requests**: 10
    - **Expected**: All requests succeed
    - **Check**: Response time < 5s

106. **Concurrent Requests**: 20
    - **Expected**: Most requests succeed
    - **Check**: Response time < 10s

107. **Concurrent Requests**: 50
    - **Expected**: System handles load
    - **Check**: No crashes

108. **Concurrent Requests**: 100
    - **Expected**: System remains stable
    - **Check**: Memory usage stable

109. **Concurrent Requests**: 200
    - **Expected**: Graceful degradation
    - **Check**: Error handling works

110. **Concurrent Requests**: 500
    - **Expected**: System limits requests
    - **Check**: Rate limiting active

111. **Concurrent Requests**: 1000
    - **Expected**: System protects itself
    - **Check**: No memory leaks

112. **Concurrent Requests**: 2000
    - **Expected**: System remains responsive
    - **Check**: Core functionality works

113. **Concurrent Requests**: 5000
    - **Expected**: System handles gracefully
    - **Check**: No data corruption

114. **Concurrent Requests**: 10000
    - **Expected**: System protects resources
    - **Check**: No system crash

---

## 🔒 SECURITY TESTS (10 tests)

### Test 115-124: Security Vulnerabilities
115. **Input**: `'; DROP TABLE restaurants; --`
    - **Expected**: Sanitized input
    - **Check**: No SQL injection

116. **Input**: `<script>alert('xss')</script>`
    - **Expected**: Sanitized input
    - **Check**: No XSS execution

117. **Input**: `../../etc/passwd`
    - **Expected**: Sanitized input
    - **Check**: No file access

118. **Input**: `javascript:alert('xss')`
    - **Expected**: Sanitized input
    - **Check**: No JavaScript execution

119. **Input**: `data:text/html,<script>alert('xss')</script>`
    - **Expected**: Sanitized input
    - **Check**: No data URI execution

120. **Input**: `<img src=x onerror=alert('xss')>`
    - **Expected**: Sanitized input
    - **Check**: No image-based XSS

121. **Input**: `<svg onload=alert('xss')>`
    - **Expected**: Sanitized input
    - **Check**: No SVG-based XSS

122. **Input**: `restaurant` + null byte
    - **Expected**: Sanitized input
    - **Check**: No null byte injection

123. **Input**: `restaurant` + zero-width space
    - **Expected**: Clean processing
    - **Check**: No hidden characters

124. **Input**: `restaurant` + right-to-left override
    - **Expected**: Proper text direction
    - **Check**: No display manipulation

---

## ♿ ACCESSIBILITY TESTS (10 tests)

### Test 125-134: Accessibility Features
125. **Query**: `restaurant near me`
    - **Expected**: Screen reader friendly
    - **Check**: Proper ARIA labels

126. **Query**: `good food`
    - **Expected**: Simple language
    - **Check**: Clear descriptions

127. **Query**: `vegetarian food`
    - **Expected**: Clear dietary info
    - **Check**: Dietary restrictions highlighted

128. **Query**: `cheap restaurant`
    - **Expected**: Clear pricing
    - **Check**: Price range clearly shown

129. **Query**: `family friendly restaurant`
    - **Expected**: Clear audience info
    - **Check**: Family-friendly features

130. **Query**: `wheelchair accessible restaurant`
    - **Expected**: Accessibility info
    - **Check**: Accessibility features

131. **Query**: `quiet restaurant`
    - **Expected**: Sensory info
    - **Check**: Noise level information

132. **Query**: `well lit restaurant`
    - **Expected**: Visual accessibility
    - **Check**: Lighting information

133. **Query**: `restaurant with large print menu`
    - **Expected**: Visual accessibility
    - **Check**: Menu accessibility

134. **Query**: `restaurant with braille menu`
    - **Expected**: Visual accessibility
    - **Check**: Braille menu availability

---

## 📊 TESTING CHECKLIST

### Before Testing
- [ ] Server is running on localhost:3000
- [ ] Browser developer tools are open
- [ ] Network tab is monitoring requests
- [ ] Console tab is monitoring errors
- [ ] Location services are enabled

### During Testing
- [ ] Monitor response times
- [ ] Check for JavaScript errors
- [ ] Verify image loading
- [ ] Test distance calculations
- [ ] Validate filter applications
- [ ] Check error handling

### After Testing
- [ ] Review failed tests
- [ ] Check performance metrics
- [ ] Verify security measures
- [ ] Test accessibility features
- [ ] Document issues found

---

## 🎯 EXPECTED RESULTS

### Success Criteria
- **Basic Tests**: 95%+ success rate
- **Edge Cases**: 90%+ handled gracefully
- **Security Tests**: 100% blocked malicious input
- **Performance**: < 5s response time for 90% of requests
- **Accessibility**: All features accessible via keyboard/screen reader

### Common Issues to Look For
- Images not loading
- Distance calculations incorrect
- Filter conflicts not resolved
- Security vulnerabilities
- Performance degradation
- Accessibility barriers

---

## 🚨 CRITICAL ISSUES TO REPORT

1. **System Crashes**: Any test that causes the server to crash
2. **Security Vulnerabilities**: Any successful injection or XSS
3. **Data Corruption**: Incorrect or missing data
4. **Performance Issues**: Response times > 10 seconds
5. **Accessibility Barriers**: Features not accessible

---

## 📝 TESTING NOTES

- Run tests in order for best results
- Document any unexpected behavior
- Take screenshots of errors
- Note response times for performance tests
- Test on different browsers/devices
- Test with different network conditions

This comprehensive testing suite will help you identify and fix any issues in your food-finder-bot system!
