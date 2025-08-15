# Talent Bridge API Test Data

This file contains comprehensive test data for all API endpoints in the Talent Bridge platform.

## Authentication Headers
For authenticated requests, include:
```json
{
  "Authorization": "Bearer YOUR_JWT_TOKEN",
  "Content-Type": "application/json"
}
```

## 1. User Management APIs

### Register User
```json
POST /api/v1/users/register
{
  "fullName": "John Doe",
  "email": "john.doe@example.com",
  "phone": "03001234567",
  "password": "SecurePass123!",
  "role": "school"
}
```

### Login User
```json
POST /api/v1/users/login
{
  "email": "john.doe@example.com",
  "password": "SecurePass123!"
}
```

## 2. Subscription Plan Management (Admin Only)

### Create Basic Plan
```json
POST /api/v1/subscriptions/plans
{
  "name": "basic",
  "displayName": "Basic Plan",
  "description": "Perfect for individual training providers starting their journey",
  "price": 29.99,
  "billingCycle": "monthly",
  "features": {
    "maxCourses": 5,
    "maxStudents": 100,
    "supportLevel": "email",
    "analytics": false,
    "customBranding": false,
    "certificateTemplates": 1,
    "storageGB": 5
  },
  "stripePriceId": "price_basic_monthly_001",
  "stripeProductId": "prod_basic_001"
}
```

### Create Premium Plan
```json
POST /api/v1/subscriptions/plans
{
  "name": "premium",
  "displayName": "Premium Plan",
  "description": "For growing training providers with advanced needs",
  "price": 79.99,
  "billingCycle": "monthly",
  "features": {
    "maxCourses": 25,
    "maxStudents": 500,
    "supportLevel": "priority",
    "analytics": true,
    "customBranding": true,
    "certificateTemplates": 5,
    "storageGB": 25
  },
  "stripePriceId": "price_premium_monthly_001",
  "stripeProductId": "prod_premium_001"
}
```

### Create Enterprise Plan
```json
POST /api/v1/subscriptions/plans
{
  "name": "enterprise",
  "displayName": "Enterprise Plan",
  "description": "For large organizations with unlimited requirements",
  "price": 199.99,
  "billingCycle": "monthly",
  "features": {
    "maxCourses": -1,
    "maxStudents": -1,
    "supportLevel": "dedicated",
    "analytics": true,
    "customBranding": true,
    "certificateTemplates": -1,
    "storageGB": -1
  },
  "stripePriceId": "price_enterprise_monthly_001",
  "stripeProductId": "prod_enterprise_001"
}
```

## 3. Subscription Management

### Create Subscription
```json
POST /api/v1/subscriptions
{
  "planId": "PLAN_ID_FROM_PREVIOUS_STEP"
}
```

### Create Payment Intent
```json
POST /api/v1/subscriptions/payment/intent
{
  "subscriptionId": "SUBSCRIPTION_ID_FROM_PREVIOUS_STEP"
}
```

### Confirm Payment
```json
POST /api/v1/subscriptions/payment/confirm
{
  "paymentIntentId": "pi_test_1234567890",
  "subscriptionId": "SUBSCRIPTION_ID"
}
```

## 4. Training Provider Profile Management

### Create/Update Training Provider Profile
```json
PUT /api/v1/schools/profile
{
  "about": "Leading technology training institute established in 2020. We specialize in modern web development, data science, and AI/ML training programs.",
  "established": "2020-01-15",
  "focusAreas": [
    "Web Development",
    "Data Science", 
    "Artificial Intelligence",
    "Mobile App Development",
    "Cloud Computing"
  ],
  "location": {
    "address": "123 Tech Street, Block A",
    "city": "Karachi",
    "state": "Sindh",
    "country": "Pakistan",
    "postalCode": "75000"
  },
  "contact": {
    "phone": "+92-300-1234567",
    "email": "info@techtrain.com",
    "website": "https://techtrain.com"
  },
  "accreditation": [
    "ISO 9001:2015",
    "NVQL Certified",
    "Google Partner"
  ]
}
```

## 5. Course Management

### Create Course
```json
POST /api/v1/courses
{
  "title": "Full Stack Web Development Bootcamp",
  "instructor": "Sarah Johnson",
  "duration": "12 weeks",
  "price": 599.99,
  "language": "English",
  "type": "online",
  "description": "A comprehensive bootcamp covering HTML, CSS, JavaScript, React, Node.js, and MongoDB. Perfect for beginners looking to become full-stack developers.",
  "objectives": [
    "Master HTML5 and CSS3 fundamentals",
    "Learn JavaScript ES6+ features",
    "Build responsive web applications with React",
    "Create REST APIs with Node.js and Express",
    "Work with MongoDB and database design",
    "Deploy applications to cloud platforms"
  ],
  "skills": [
    "HTML5",
    "CSS3",
    "JavaScript",
    "React.js",
    "Node.js",
    "MongoDB",
    "Git",
    "Responsive Design"
  ],
  "category": "Technology"
}
```

### Create Data Science Course
```json
POST /api/v1/courses
{
  "title": "Data Science with Python",
  "instructor": "Dr. Ahmed Khan", 
  "duration": "10 weeks",
  "price": 799.99,
  "language": "English",
  "type": "hybrid",
  "description": "Learn data science fundamentals using Python. Covers statistics, data analysis, machine learning, and data visualization.",
  "objectives": [
    "Master Python programming for data science",
    "Learn statistical analysis and hypothesis testing",
    "Understand machine learning algorithms",
    "Create compelling data visualizations",
    "Work with real-world datasets",
    "Build and deploy ML models"
  ],
  "skills": [
    "Python",
    "Pandas",
    "NumPy",
    "Matplotlib",
    "Scikit-learn",
    "Jupyter",
    "Statistics",
    "Machine Learning"
  ],
  "category": "Data Science"
}
```

### Search Courses
```
GET /api/v1/courses/search?q=web development&category=Technology&priceMin=100&priceMax=1000&page=1&limit=10
```

### Get Courses by Provider
```
GET /api/v1/courses/provider/PROVIDER_ID?page=1&limit=5
```

## 6. Webhook Testing

### Test Payment Success Webhook
```json
POST /api/v1/webhooks/payment/success
{
  "subscriptionId": "SUBSCRIPTION_ID",
  "paymentIntentId": "pi_test_success_001"
}
```

### Test Payment Failed Webhook
```json
POST /api/v1/webhooks/payment/failed
{
  "subscriptionId": "SUBSCRIPTION_ID", 
  "paymentIntentId": "pi_test_failed_001"
}
```

### Test Subscription Updated Webhook
```json
POST /api/v1/webhooks/subscription/updated
{
  "subscriptionId": "SUBSCRIPTION_ID",
  "status": "active"
}
```

## 7. Notification Management

### Get User Notifications
```
GET /api/v1/notifications?page=1&limit=10&unread=true
```

### Get Notification Count
```
GET /api/v1/notifications/count
```

### Mark Notification as Read
```
PATCH /api/v1/notifications/NOTIFICATION_ID/read
```

### Mark All Notifications as Read
```
PATCH /api/v1/notifications/read-all
```

## 8. Error Test Cases

### Invalid Subscription Plan (Missing Required Fields)
```json
POST /api/v1/subscriptions/plans
{
  "name": "invalid",
  "description": "Missing required fields"
}
```

### Duplicate Plan Name
```json
POST /api/v1/subscriptions/plans
{
  "name": "basic",
  "displayName": "Duplicate Basic Plan",
  "description": "This should fail due to duplicate name",
  "price": 29.99,
  "billingCycle": "monthly",
  "features": {},
  "stripePriceId": "price_duplicate_001",
  "stripeProductId": "prod_duplicate_001"
}
```

### Create Course Without Subscription
```json
POST /api/v1/courses
{
  "title": "Unauthorized Course",
  "instructor": "Test Instructor",
  "duration": "5 weeks",
  "price": 199.99,
  "language": "English",
  "type": "online",
  "description": "This should fail without active subscription",
  "objectives": ["Test objective"],
  "skills": ["Test skill"],
  "category": "Test"
}
```

## 9. Admin Operations

### Update Subscription Status (Admin Only)
```json
PATCH /api/v1/subscriptions/SUBSCRIPTION_ID/status
{
  "status": "active"
}
```

### Update Course Status (Admin Only)
```json
PATCH /api/v1/courses/COURSE_ID/status
{
  "status": "approved"
}
```

### Update Training Provider Status (Admin Only)
```json
PATCH /api/v1/schools/PROVIDER_ID/status
{
  "status": "active"
}
```

## 10. Query Parameters Examples

### Get All Plans (Active Only)
```
GET /api/v1/subscriptions/plans?active=true
```

### Get All Subscriptions with Filters (Admin)
```
GET /api/v1/subscriptions?status=active&page=1&limit=10
```

### Get All Courses with Pagination
```
GET /api/v1/courses?page=2&limit=5&category=Technology
```

### Search Training Providers
```
GET /api/v1/schools/search?q=technology&focusArea=Web Development&city=Karachi
```

## 11. Stripe Test Data

Use these test values for Stripe integration:
- **Test Card**: 4242424242424242
- **Expiry**: Any future date (e.g., 12/34)
- **CVC**: Any 3 digits (e.g., 123)
- **ZIP**: Any 5 digits (e.g., 12345)

For webhook testing, use Stripe CLI:
```bash
stripe listen --forward-to localhost:4000/api/v1/webhooks/stripe
```

## 12. Complete User Journey Test

1. Register as training provider
2. Login and get JWT token
3. Create training provider profile
4. Get available subscription plans
5. Create subscription
6. Create payment intent
7. Confirm payment (simulate)
8. Create courses (within subscription limits)
9. Update courses
10. Check notifications
11. View subscription statistics

This comprehensive test data covers all major functionality of the Talent Bridge platform.
