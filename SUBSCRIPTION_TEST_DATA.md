# 🧪 Subscription API Testing Data

## 📋 Prerequisites
1. **Start your server**: `npm run dev`
2. **Register a user** with role "school" 
3. **Login** to get JWT token
4. **Add token to Authorization header**: `Bearer YOUR_JWT_TOKEN`

---

## 🎯 Step-by-Step Testing Guide

### Step 1: Register Training Provider User
```json
POST http://localhost:4000/api/v1/users/register
Content-Type: application/json

{
  "fullName": "Tech Academy Ltd",
  "email": "admin@techacademy.com",
  "phone": "03001234567",
  "password": "SecurePass123!",
  "role": "school"
}
```

### Step 2: Login to Get JWT Token
```json
POST http://localhost:4000/api/v1/users/login
Content-Type: application/json

{
  "email": "admin@techacademy.com",
  "password": "SecurePass123!"
}
```
**💡 Copy the `accessToken` from response for next requests**

---

## 📦 Subscription Plan Management (Admin Only)

### Create Basic Plan
```json
POST http://localhost:4000/api/v1/subscriptions/plans
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

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
  "stripePriceId": "price_1234567890basic",
  "stripeProductId": "prod_1234567890basic"
}
```

### Create Premium Plan
```json
POST http://localhost:4000/api/v1/subscriptions/plans
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

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
  "stripePriceId": "price_1234567890premium",
  "stripeProductId": "prod_1234567890premium"
}
```

### Create Enterprise Plan
```json
POST http://localhost:4000/api/v1/subscriptions/plans
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

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
  "stripePriceId": "price_1234567890enterprise",
  "stripeProductId": "prod_1234567890enterprise"
}
```

### Get All Plans
```json
GET http://localhost:4000/api/v1/subscriptions/plans?active=true
```

---

## 📝 Subscription Management

### Create Subscription
```json
POST http://localhost:4000/api/v1/subscriptions
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "planId": "PLAN_ID_FROM_PREVIOUS_STEP"
}
```
**💡 Copy the plan `_id` from the plan creation response**

### Get My Subscription
```json
GET http://localhost:4000/api/v1/subscriptions/my
Authorization: Bearer YOUR_JWT_TOKEN
```

### Get Subscription Stats
```json
GET http://localhost:4000/api/v1/subscriptions/stats
Authorization: Bearer YOUR_JWT_TOKEN
```

---

## 💳 Payment Processing

### Create Payment Intent
```json
POST http://localhost:4000/api/v1/subscriptions/payment/intent
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "subscriptionId": "SUBSCRIPTION_ID_FROM_PREVIOUS_STEP"
}
```

### Simulate Payment Confirmation
```json
POST http://localhost:4000/api/v1/subscriptions/payment/confirm
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "paymentIntentId": "pi_test_success_12345",
  "subscriptionId": "SUBSCRIPTION_ID_FROM_PREVIOUS_STEP"
}
```

---

## 🏫 Training Provider Profile

### Create Profile
```json
PUT http://localhost:4000/api/v1/schools/profile
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "about": "Tech Academy is a leading training institute specializing in modern web development, data science, and AI/ML programs. Founded in 2020, we have trained over 1000+ students.",
  "established": "2020-03-15",
  "focusAreas": [
    "Web Development",
    "Data Science", 
    "Artificial Intelligence",
    "Mobile App Development",
    "Cloud Computing",
    "Cybersecurity"
  ],
  "location": {
    "address": "Tech Tower, Block 15, Gulshan-e-Iqbal",
    "city": "Karachi",
    "state": "Sindh",
    "country": "Pakistan",
    "postalCode": "75300"
  },
  "contact": {
    "phone": "+92-300-1234567",
    "email": "info@techacademy.com",
    "website": "https://techacademy.com"
  },
  "accreditation": [
    "ISO 9001:2015",
    "NVQL Certified",
    "Google Partner",
    "Microsoft Learning Partner"
  ]
}
```

---

## 📚 Course Creation (Requires Active Subscription)

### Create Web Development Course
```json
POST http://localhost:4000/api/v1/courses
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "title": "Complete Full Stack Web Development",
  "instructor": "Sarah Ahmed",
  "duration": "16 weeks",
  "price": 599.99,
  "language": "English",
  "type": "online",
  "description": "Master full stack web development with HTML, CSS, JavaScript, React, Node.js, and MongoDB. Includes 3 real-world projects and job placement assistance.",
  "objectives": [
    "Master HTML5, CSS3, and responsive design",
    "Learn JavaScript ES6+ and modern frameworks",
    "Build dynamic web applications with React",
    "Create RESTful APIs with Node.js and Express",
    "Work with MongoDB and database design",
    "Deploy applications to cloud platforms",
    "Build portfolio-worthy projects"
  ],
  "skills": [
    "HTML5",
    "CSS3",
    "JavaScript",
    "React.js",
    "Node.js",
    "Express.js",
    "MongoDB",
    "Git/GitHub",
    "Responsive Design",
    "RESTful APIs"
  ],
  "category": "Technology"
}
```

### Create Data Science Course
```json
POST http://localhost:4000/api/v1/courses
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "title": "Data Science Bootcamp with Python",
  "instructor": "Dr. Ahmed Khan",
  "duration": "12 weeks",
  "price": 799.99,
  "language": "English",
  "type": "hybrid",
  "description": "Comprehensive data science program covering Python programming, statistics, machine learning, and data visualization. Includes hands-on projects with real datasets.",
  "objectives": [
    "Master Python programming for data science",
    "Learn statistical analysis and hypothesis testing",
    "Understand machine learning algorithms and implementation",
    "Create compelling data visualizations",
    "Work with big data and cloud platforms",
    "Build end-to-end ML projects",
    "Prepare for data science interviews"
  ],
  "skills": [
    "Python",
    "Pandas",
    "NumPy",
    "Matplotlib",
    "Seaborn",
    "Scikit-learn",
    "TensorFlow",
    "Jupyter Notebooks",
    "SQL",
    "Statistics"
  ],
  "category": "Data Science"
}
```

---

## 🔔 Webhook Testing

### Test Payment Success
```json
POST http://localhost:4000/api/v1/webhooks/payment/success
Content-Type: application/json

{
  "subscriptionId": "SUBSCRIPTION_ID",
  "paymentIntentId": "pi_test_success_001"
}
```

### Test Payment Failed
```json
POST http://localhost:4000/api/v1/webhooks/payment/failed
Content-Type: application/json

{
  "subscriptionId": "SUBSCRIPTION_ID",
  "paymentIntentId": "pi_test_failed_001"
}
```

### Test Subscription Updated
```json
POST http://localhost:4000/api/v1/webhooks/subscription/updated
Content-Type: application/json

{
  "subscriptionId": "SUBSCRIPTION_ID",
  "status": "active"
}
```

---

## 📬 Notification Testing

### Get Notifications
```json
GET http://localhost:4000/api/v1/notifications?page=1&limit=10
Authorization: Bearer YOUR_JWT_TOKEN
```

### Get Notification Count
```json
GET http://localhost:4000/api/v1/notifications/count
Authorization: Bearer YOUR_JWT_TOKEN
```

### Mark Notification as Read
```json
PATCH http://localhost:4000/api/v1/notifications/NOTIFICATION_ID/read
Authorization: Bearer YOUR_JWT_TOKEN
```

---

## 🧪 Error Testing

### Try Creating Course Without Subscription
```json
POST http://localhost:4000/api/v1/courses
Authorization: Bearer JWT_TOKEN_WITHOUT_SUBSCRIPTION
Content-Type: application/json

{
  "title": "Test Course",
  "instructor": "Test Instructor",
  "duration": "4 weeks",
  "price": 199.99,
  "language": "English",
  "type": "online",
  "description": "This should fail without subscription",
  "objectives": ["Test objective"],
  "skills": ["Test skill"],
  "category": "Test"
}
```
**Expected Result**: `403 - Active subscription required`

### Try Creating Duplicate Plan
```json
POST http://localhost:4000/api/v1/subscriptions/plans
Authorization: Bearer YOUR_JWT_TOKEN
Content-Type: application/json

{
  "name": "basic",
  "displayName": "Duplicate Basic Plan",
  "description": "This should fail",
  "price": 29.99,
  "billingCycle": "monthly",
  "features": {},
  "stripePriceId": "price_duplicate",
  "stripeProductId": "prod_duplicate"
}
```
**Expected Result**: `409 - Plan with this name already exists`

---

## 🔄 Complete User Journey Test

1. **Register** training provider
2. **Login** and get JWT
3. **Create** training provider profile
4. **View** available subscription plans
5. **Create** subscription (basic plan)
6. **Create** payment intent
7. **Confirm** payment (simulate)
8. **Create** first course (should work)
9. **Try** creating 6th course (should fail with basic plan)
10. **Upgrade** to premium plan
11. **Create** more courses
12. **Check** notifications for payment confirmations

---

## 💳 Stripe Test Cards

For payment testing, use these test cards:
- **Success**: `4242424242424242`
- **Declined**: `4000000000000002`
- **Insufficient Funds**: `4000000000009995`
- **Expired Card**: `4000000000000069`

**Expiry**: Any future date (e.g., `12/34`)
**CVC**: Any 3 digits (e.g., `123`)
**ZIP**: Any 5 digits (e.g., `12345`)

---

## 📊 Swagger Documentation

Visit: `http://localhost:4000/docs` to see interactive API documentation

---

## 🚀 Quick Test Commands

```bash
# Start server
npm run dev

# Test basic functionality
curl -X GET http://localhost:4000/api/v1/subscriptions/plans

# Check if server is running
curl -X GET http://localhost:4000/
```

**🔥 Pro Tip**: Use tools like Postman, Thunder Client (VS Code), or Insomnia for easier API testing!
