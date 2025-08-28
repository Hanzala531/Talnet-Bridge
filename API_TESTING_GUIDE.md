# Talent Bridge API Testing Guide

## Overview
This guide provides comprehensive testing instructions for the fixed issues in the Talent Bridge apprenticeship platform.

## Fixed Issues Summary

### 1. Employer Controller Issues ✅
- Fixed `getCompanyProfile` internal server error
- Improved error handling with proper HTTP status codes
- Enhanced response structure consistency
- Added proper input validation

### 2. Swagger Documentation ✅
- Updated field names to match actual API implementation
- Fixed schema definitions for Employer model
- Added detailed request/response examples
- Corrected required fields documentation

### 3. Student Controller Enhancements ✅
- Added privacy settings management endpoints
- Added communication preferences endpoints
- Improved error handling consistency
- Added proper status codes

### 4. General Improvements ✅
- Consistent error handling across controllers
- Proper HTTP status codes usage
- Enhanced input validation
- Better response structure formatting

## Testing Instructions

### A. Employer Endpoints Testing

#### 1. Create Company Profile
```bash
POST /api/v1/employers
Authorization: Bearer <employer_jwt_token>
Content-Type: application/json

{
  "name": "TechCorp Solutions",
  "description": "Leading software development company",
  "companySize": "51-200",
  "industry": "Information Technology",
  "websiteLink": "https://techcorp.com",
  "location": "Karachi, Pakistan",
  "establishedYear": 2015
}
```

**Expected Response (201):**
```json
{
  "status": 201,
  "message": "Employer profile created successfully",
  "payload": {
    "_id": "...",
    "name": "TechCorp Solutions",
    "description": "Leading software development company",
    "companySize": "51-200",
    "industry": "Information Technology",
    "websiteLink": "https://techcorp.com",
    "location": "Karachi, Pakistan",
    "establishedYear": 2015,
    "userId": "...",
    "userDetails": {
      "fullName": "John Doe",
      "email": "john@techcorp.com",
      "phone": "03001234567",
      "profilePicture": "..."
    },
    "createdAt": "...",
    "updatedAt": "..."
  },
  "success": true,
  "timestamp": "..."
}
```

#### 2. Get My Company Profile (Fixed Issue)
```bash
GET /api/v1/employers/me
Authorization: Bearer <employer_jwt_token>
```

**Expected Response (200):**
```json
{
  "status": 200,
  "message": "Company profile fetched successfully",
  "payload": {
    "_id": "...",
    "name": "TechCorp Solutions",
    "companySize": "51-200",
    "industry": "Information Technology",
    "websiteLink": "https://techcorp.com",
    "location": "Karachi, Pakistan",
    "userId": "...",
    "userDetails": {
      "fullName": "John Doe",
      "email": "john@techcorp.com",
      "phone": "03001234567",
      "profilePicture": "..."
    },
    "createdAt": "...",
    "updatedAt": "..."
  },
  "success": true,
  "timestamp": "..."
}
```

#### 3. Get Company by ID
```bash
GET /api/v1/employers/{company_id}
```

#### 4. Update Company Profile
```bash
PUT /api/v1/employers/{company_id}
Authorization: Bearer <employer_jwt_token>
Content-Type: application/json

{
  "description": "Updated company description",
  "location": "Lahore, Pakistan"
}
```

#### 5. Delete Company Profile
```bash
DELETE /api/v1/employers/{company_id}
Authorization: Bearer <employer_jwt_token>
```

### B. Student Privacy Settings Testing (New Features)

#### 1. Get Privacy Settings
```bash
GET /api/v1/students/privacy-settings
Authorization: Bearer <student_jwt_token>
```

**Expected Response (200):**
```json
{
  "status": 200,
  "message": "Privacy settings retrieved successfully",
  "payload": {
    "isPublic": false,
    "isOpenToWork": true,
    "isContactPublic": false,
    "isProgressPublic": true
  },
  "success": true,
  "timestamp": "..."
}
```

#### 2. Update Privacy Settings
```bash
PUT /api/v1/students/privacy-settings
Authorization: Bearer <student_jwt_token>
Content-Type: application/json

{
  "isPublic": true,
  "isOpenToWork": true,
  "isContactPublic": false,
  "isProgressPublic": true
}
```

#### 3. Get Communication Preferences
```bash
GET /api/v1/students/communication-preferences
Authorization: Bearer <student_jwt_token>
```

#### 4. Update Communication Preferences
```bash
PUT /api/v1/students/communication-preferences
Authorization: Bearer <student_jwt_token>
Content-Type: application/json

{
  "isCourseRecomendations": true,
  "isMarketingCommunications": false
}
```

### C. Error Handling Testing

#### 1. Test Unauthorized Access
```bash
GET /api/v1/employers/me
# No Authorization header
```

**Expected Response (401):**
```json
{
  "status": 401,
  "message": "Unauthorized access",
  "payload": null,
  "success": false,
  "timestamp": "..."
}
```

#### 2. Test Missing Company Profile
```bash
GET /api/v1/employers/me
Authorization: Bearer <employer_jwt_token_without_profile>
```

**Expected Response (404):**
```json
{
  "status": 404,
  "message": "Company profile not found. Please create your company profile first.",
  "payload": null,
  "success": false,
  "timestamp": "..."
}
```

#### 3. Test Invalid Input
```bash
POST /api/v1/employers
Authorization: Bearer <employer_jwt_token>
Content-Type: application/json

{
  "name": "",
  "companySize": "invalid-size"
}
```

**Expected Response (400):**
```json
{
  "status": 400,
  "message": "All fields (name, companySize, industry, websiteLink) are required.",
  "payload": null,
  "success": false,
  "timestamp": "..."
}
```

## Swagger Documentation Testing

### Access Swagger UI
Navigate to: `http://localhost:4000/docs`

### Verify Fixed Documentation
1. **Employer Schema**: Check that field names match (name vs companyName, websiteLink vs website)
2. **Request Examples**: Verify examples use correct field names
3. **Response Examples**: Check response structures match actual API responses
4. **Required Fields**: Confirm required fields match controller validation

## Common Test Scenarios

### 1. Authentication Flow
1. Register user with employer role
2. Login to get JWT token
3. Create company profile
4. Access employer endpoints

### 2. Data Validation
1. Test required field validation
2. Test data type validation
3. Test enum value validation (companySize)
4. Test URL validation (websiteLink)

### 3. Authorization Testing
1. Test role-based access control
2. Test ownership verification for updates/deletes
3. Test cross-user access restrictions

## Expected Behavior Changes

### Before Fixes
- ❌ `GET /api/v1/employers/me` returned internal server error
- ❌ Inconsistent response structures
- ❌ Swagger docs had mismatched field names
- ❌ Missing privacy/communication preference endpoints
- ❌ Inconsistent error handling

### After Fixes
- ✅ `GET /api/v1/employers/me` returns proper company profile
- ✅ Consistent response structures across all endpoints
- ✅ Swagger docs match actual API implementation
- ✅ Complete privacy and notification preference management
- ✅ Consistent error handling with proper HTTP status codes

## Performance Improvements

1. **Database Queries**: Added proper indexing in models
2. **Population**: Optimized user data population
3. **Validation**: Added client-side validation hints in swagger
4. **Error Handling**: Reduced unnecessary error propagation

## Security Enhancements

1. **Input Sanitization**: Added trim() to all string inputs
2. **URL Validation**: Added regex validation for website URLs
3. **Authorization Checks**: Improved ownership verification
4. **Error Messages**: Sanitized error messages to prevent information leakage

## Next Steps

1. **Run Integration Tests**: Use the provided test cases
2. **Monitor Logs**: Check console logs for any remaining issues
3. **User Acceptance Testing**: Test with actual frontend integration
4. **Performance Testing**: Monitor API response times
5. **Security Testing**: Verify authorization controls work correctly
