# School Controller Documentation

## Overview

The School Controller handles all operations related to training institutes/schools, including profile management, directory services, and statistics. This controller provides comprehensive functionality for schools to manage their profiles, view their students, and browse employer directories.

## Table of Contents

1. [Profile Management](#profile-management)
2. [Directory Services](#directory-services)
3. [Statistics and Analytics](#statistics-and-analytics)
4. [Utility Functions](#utility-functions)
5. [API Endpoints Reference](#api-endpoints-reference)
6. [Error Handling](#error-handling)

---

## Profile Management

### Create Profile

**Endpoint:** `POST /api/school/profile`  
**Authentication:** Required (School user)

Creates a new training institute profile for the authenticated school user.

#### Request Body
```javascript
{
  "name": "TechEd Institute",
  "email": "contact@teched.com",
  "phone": "+1234567890",
  "about": "Leading technology training institute",
  "established": "2020-01-01",
  "location": "123 Tech Street, Silicon Valley, CA",
  "focusAreas": ["Technology", "AI", "Web Development"]
}
```

#### File Upload
- **Field:** `picture` (optional)
- **Type:** Image file (JPG, PNG)
- **Size:** Max 5MB

#### Response
```javascript
{
  "success": true,
  "message": "Profile created successfully",
  "payload": {
    "profile": {
      "_id": "64a7b8c9d1e2f3a4b5c6d7e8",
      "userId": "64a7b8c9d1e2f3a4b5c6d7e9",
      "name": "TechEd Institute",
      "email": "contact@teched.com",
      "phone": "+1234567890",
      "about": "Leading technology training institute",
      "established": "2020-01-01T00:00:00.000Z",
      "location": "123 Tech Street, Silicon Valley, CA",
      "focusAreas": ["Technology", "AI", "Web Development"],
      "picture": "https://cloudinary.com/image.jpg",
      "status": "active",
      "createdAt": "2024-01-15T10:30:00.000Z"
    }
  }
}
```

#### Validation Rules
- `name`: Required, non-empty string
- `email`: Required, valid email format
- `phone`: Required, non-empty string
- `about`: Required, max 1000 characters
- `established`: Required, valid date
- `location`: Required, string format

### Get Own Profile

**Endpoint:** `GET /api/school/profile`  
**Authentication:** Required (School user)

Retrieves the profile of the currently authenticated school.

#### Response
```javascript
{
  "success": true,
  "message": "Training provider profile found successfully",
  "payload": {
    "profile": {
      // Profile object (same as create response)
    }
  }
}
```

### Edit Profile

**Endpoint:** `PUT /api/school/profile`  
**Authentication:** Required (School user)

Updates the profile of the currently authenticated school.

#### Request Body
```javascript
{
  "name": "Updated Institute Name",
  "about": "Updated description",
  "focusAreas": ["Updated", "Focus", "Areas"]
}
```

#### Response
```javascript
{
  "success": true,
  "message": "Profile updated successfully"
}
```

### Add Profile Picture

**Endpoint:** `POST /api/school/profile/picture`  
**Authentication:** Required (School user)

Uploads and sets a profile picture for the school.

#### File Upload
- **Field:** `picture`
- **Type:** Image file (JPG, PNG)
- **Size:** Max 5MB

#### Response
```javascript
{
  "success": true,
  "message": "Profile picture updated successfully",
  "payload": {
    "user": {
      // Updated profile object
    },
    "imageUrl": "https://cloudinary.com/new-image.jpg"
  }
}
```

---

## Directory Services

### Students Directory

**Endpoint:** `GET /api/school/students`  
**Authentication:** Required (School user)

Retrieves all students who have enrolled in courses from the authenticated school.

#### Query Parameters
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20, max: 100)

#### Response
```javascript
{
  "success": true,
  "message": "Students directory fetched successfully",
  "payload": {
    "students": [
      {
        "studentId": "64a7b8c9d1e2f3a4b5c6d7e8",
        "name": "John Doe",
        "email": "john@example.com",
        "phone": "+1234567890",
        "status": "active",
        "enrolledCourses": [
          {
            "enrollmentId": "64a7b8c9d1e2f3a4b5c6d7e9",
            "courseId": "64a7b8c9d1e2f3a4b5c6d7ea",
            "courseName": "JavaScript Fundamentals",
            "status": "enrolled",
            "enrolledAt": "2024-01-10T10:00:00.000Z"
          }
        ],
        "totalEnrollments": 1
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 45,
      "totalPages": 3
    }
  }
}
```

#### Features
- **Security:** Only shows students enrolled in courses from the requesting school
- **Pagination:** Efficient pagination with customizable page size
- **Enrollment Details:** Includes enrollment ID, status, and enrollment date
- **Course Information:** Shows course names and IDs for each enrollment

#### Error Cases
- No courses exist for the school
- No students enrolled in school courses
- Invalid pagination parameters

### Employers Directory

**Endpoint:** `GET /api/school/employers`  
**Authentication:** Required (School user)

Retrieves a directory of all employers with optional filtering capabilities.

#### Query Parameters
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20, max: 100)
- `industry` (optional): Filter by industry (case-insensitive partial match)
- `location` (optional): Filter by company location (case-insensitive partial match)
- `companyName` (optional): Filter by company name (case-insensitive partial match)

#### Response
```javascript
{
  "success": true,
  "message": "Successfully fetched 10 employers (page 1 of 5)",
  "payload": {
    "employers": [
      {
        "employerId": "64a7b8c9d1e2f3a4b5c6d7e8",
        "user": {
          "userId": "64a7b8c9d1e2f3a4b5c6d7e9",
          "fullName": "Jane Smith",
          "email": "jane@techcorp.com",
          "phone": "+1234567890",
          "profilePicture": "https://cloudinary.com/profile.jpg",
          "joinedAt": "2023-06-15T10:30:00.000Z"
        },
        "company": {
          "name": "TechCorp Inc",
          "location": "San Francisco, CA",
          "website": "https://techcorp.com",
          "establishedYear": 2015,
          "size": "51-200"
        },
        "industry": "Technology",
        "profileCreatedAt": "2023-06-20T14:20:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 100,
      "totalPages": 5
    },
    "filters": {
      "industry": "technology",
      "location": null,
      "companyName": null
    },
    "summary": {
      "totalEmployers": 100,
      "currentPageResults": 10,
      "hasNextPage": true,
      "hasPreviousPage": false
    }
  }
}
```

#### Search Examples

**Filter by Industry:**
```
GET /api/school/employers?industry=technology&page=1&limit=10
```

**Filter by Location:**
```
GET /api/school/employers?location=san francisco&page=1&limit=15
```

**Combined Filters:**
```
GET /api/school/employers?industry=tech&location=california&companyName=corp&page=2&limit=25
```

#### Features
- **Advanced Filtering:** Multiple filter options with case-insensitive search
- **Comprehensive Data:** User info, company details, and industry information
- **Efficient Pagination:** Server-side pagination with detailed metadata
- **Sort Order:** Results sorted by newest profiles first
- **Null Safety:** Handles missing user data gracefully

---

## Statistics and Analytics

### Dashboard Statistics

**Endpoint:** `GET /api/school/dashboard`  
**Authentication:** Required (School user)

Provides comprehensive dashboard statistics for the school.

#### Response
```javascript
{
  "success": true,
  "message": "Dashboard statistics calculated successfully",
  "payload": {
    "totalEnrollments": 150,
    "completionRate": "75.50",
    "totalRevenue": 45000,
    "activeCourses": 12
  }
}
```

### Training Provider Statistics

**Endpoint:** `GET /api/school/stats`  
**Authentication:** Required (School user)

Detailed statistics specific to the training provider.

#### Response
```javascript
{
  "success": true,
  "message": "Training provider statistics fetched successfully",
  "payload": {
    "provider": {
      "id": "64a7b8c9d1e2f3a4b5c6d7e8",
      "status": "active",
      "established": "2020-01-01T00:00:00.000Z",
      "focusAreas": ["Technology", "AI"]
    },
    "courses": {
      "total": 15,
      "active": 12,
      "pending": 3,
      "byCategory": [
        { "_id": "Technology", "count": 8 },
        { "_id": "Business", "count": 4 },
        { "_id": "Design", "count": 3 }
      ]
    }
  }
}
```

---

## Utility Functions

### Match Students

**Endpoint:** `GET /api/school/match-students`  
**Authentication:** Required (School user)

Matches students with job requirements based on skills.

#### Query Parameters
- `jobId` (required): The job ID to match students against

#### Response
```javascript
{
  "success": true,
  "message": "Found 5 students matching at least 70% of required skills.",
  "payload": {
    "job": {
      "_id": "64a7b8c9d1e2f3a4b5c6d7e8",
      "jobTitle": "Frontend Developer",
      "requiredSkills": ["JavaScript", "React", "CSS"]
    },
    "matchedStudents": [
      {
        "studentId": "64a7b8c9d1e2f3a4b5c6d7e9",
        "user": {
          "fullName": "John Doe",
          "email": "john@example.com"
        },
        "skills": ["JavaScript", "React", "CSS", "Node.js"],
        "matchedSkills": ["JavaScript", "React", "CSS"],
        "matchPercent": 100
      }
    ]
  }
}
```

---

## API Endpoints Reference

### Profile Management
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/school/profile` | Create school profile | Yes |
| GET | `/api/school/profile` | Get own profile | Yes |
| PUT | `/api/school/profile` | Update profile | Yes |
| POST | `/api/school/profile/picture` | Upload profile picture | Yes |

### Directory Services
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/school/students` | Get students directory | Yes |
| GET | `/api/school/employers` | Get employers directory | Yes |

### Statistics
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/school/dashboard` | Get dashboard stats | Yes |
| GET | `/api/school/stats` | Get detailed stats | Yes |

### Utilities
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/school/match-students` | Match students to jobs | Yes |

### Public Endpoints
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/school/providers` | Get all training providers | No |
| GET | `/api/school/providers/:id` | Get provider by ID | No |
| GET | `/api/school/search` | Search providers | No |

### Admin Only
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| PUT | `/api/school/providers/:id/status` | Update provider status | Admin |
| DELETE | `/api/school/providers/:id` | Delete provider | Admin |

---

## Error Handling

### Common Error Responses

#### Validation Error (422)
```javascript
{
  "success": false,
  "message": "Validation failed",
  "payload": [
    "Field 'name' is required",
    "Email must be valid"
  ]
}
```

#### Not Found (404)
```javascript
{
  "success": false,
  "message": "Profile of training provider not found",
  "payload": null
}
```

#### Bad Request (400)
```javascript
{
  "success": false,
  "message": "SchoolId query parameter is required",
  "payload": null
}
```

#### Conflict (409)
```javascript
{
  "success": false,
  "message": "Training provider profile already exists",
  "payload": null
}
```

#### Internal Server Error (500)
```javascript
{
  "success": false,
  "message": "Failed to create training provider profile",
  "payload": null
}
```

### Error Handling Best Practices

1. **Input Validation:** All inputs are validated before processing
2. **Graceful Degradation:** Missing optional data is handled gracefully
3. **Descriptive Messages:** Error messages provide clear guidance
4. **Consistent Format:** All errors follow the same response structure
5. **Logging:** Errors are logged for debugging and monitoring

---

## Security Considerations

### Authentication
- All endpoints require valid JWT authentication
- User role verification ensures only schools can access school endpoints

### Authorization
- Schools can only access their own data
- Admin endpoints require admin role verification

### Input Sanitization
- All user inputs are sanitized and validated
- File uploads are restricted and validated
- Query parameters are sanitized to prevent injection

### Data Privacy
- Student data is only accessible to schools they've enrolled with
- Employer directory is available to all authenticated schools
- Personal information is handled according to privacy guidelines

---

## Usage Examples

### Creating a School Profile
```javascript
// Frontend JavaScript example
const createProfile = async (profileData, imageFile) => {
  const formData = new FormData();
  
  // Add profile data
  Object.keys(profileData).forEach(key => {
    formData.append(key, profileData[key]);
  });
  
  // Add image file
  if (imageFile) {
    formData.append('picture', imageFile);
  }
  
  const response = await fetch('/api/school/profile', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    },
    body: formData
  });
  
  return response.json();
};
```

### Fetching Students with Pagination
```javascript
const getStudents = async (page = 1, limit = 20) => {
  const response = await fetch(
    `/api/school/students?page=${page}&limit=${limit}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }
  );
  
  return response.json();
};
```

### Searching Employers
```javascript
const searchEmployers = async (filters) => {
  const queryParams = new URLSearchParams();
  
  if (filters.industry) queryParams.append('industry', filters.industry);
  if (filters.location) queryParams.append('location', filters.location);
  if (filters.companyName) queryParams.append('companyName', filters.companyName);
  if (filters.page) queryParams.append('page', filters.page);
  if (filters.limit) queryParams.append('limit', filters.limit);
  
  const response = await fetch(
    `/api/school/employers?${queryParams.toString()}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }
  );
  
  return response.json();
};
```

---

## Performance Considerations

### Database Optimization
- Efficient queries with proper indexing
- Lean queries to reduce data transfer
- Batch operations for multiple records
- Aggregation pipelines for complex calculations

### Pagination
- Server-side pagination to handle large datasets
- Configurable page sizes with reasonable limits
- Efficient skip/limit operations

### Caching
- Consider implementing Redis caching for frequently accessed data
- Cache static content like employer directories
- Implement cache invalidation strategies

### File Handling
- Cloudinary integration for image storage and optimization
- File size and type validation
- Efficient upload handling with progress tracking

---

## Testing

### Unit Tests
```javascript
// Example test for students directory
describe('Students Directory', () => {
  it('should return paginated students for school', async () => {
    const response = await request(app)
      .get('/api/school/students?page=1&limit=10')
      .set('Authorization', `Bearer ${schoolToken}`)
      .expect(200);
    
    expect(response.body.success).toBe(true);
    expect(response.body.payload.students).toBeDefined();
    expect(response.body.payload.pagination).toBeDefined();
  });
});
```

### Integration Tests
- Test complete user flows
- Verify database interactions
- Test file upload functionality
- Validate authentication and authorization

---

## Future Enhancements

1. **Real-time Updates:** WebSocket integration for live notifications
2. **Advanced Analytics:** More detailed statistics and reports
3. **Export Functionality:** CSV/PDF export for directories
4. **Advanced Search:** Full-text search capabilities
5. **Bulk Operations:** Bulk actions for managing multiple records
6. **Mobile API:** Optimized endpoints for mobile applications
