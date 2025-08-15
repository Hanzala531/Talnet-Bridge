// Subscription Plans Test Data
export const SUBSCRIPTION_PLANS = {
    BASIC: {
        name: "basic",
        displayName: "Basic Plan",
        description: "Perfect for small training providers just getting started",
        price: 19.99,
        billingCycle: "monthly",
        features: {
            maxCourses: 5,
            maxStudents: 50,
            analyticsAccess: false,
            prioritySupport: false,
            customBranding: false,
            apiAccess: false,
            certificateTemplates: 1,
            storageGB: 5
        },
        stripePriceId: "price_test_basic_monthly",
        stripeProductId: "prod_test_basic"
    },

    PREMIUM: {
        name: "premium",
        displayName: "Premium Plan",
        description: "Advanced features for growing training institutes",
        price: 49.99,
        billingCycle: "monthly",
        features: {
            maxCourses: 25,
            maxStudents: 250,
            analyticsAccess: true,
            prioritySupport: true,
            customBranding: true,
            apiAccess: false,
            certificateTemplates: 5,
            storageGB: 50
        },
        stripePriceId: "price_test_premium_monthly",
        stripeProductId: "prod_test_premium"
    },

    ENTERPRISE: {
        name: "enterprise",
        displayName: "Enterprise Plan",
        description: "Complete solution for large training organizations",
        price: 99.99,
        billingCycle: "monthly",
        features: {
            maxCourses: -1,
            maxStudents: -1,
            analyticsAccess: true,
            prioritySupport: true,
            customBranding: true,
            apiAccess: true,
            certificateTemplates: -1,
            storageGB: -1
        },
        stripePriceId: "price_test_enterprise_monthly",
        stripeProductId: "prod_test_enterprise"
    }
};

// Course Test Data
export const COURSES = {
    WEB_DEVELOPMENT: {
        title: "Complete Web Development Bootcamp",
        description: "Learn HTML, CSS, JavaScript, React, Node.js and more in this comprehensive course",
        category: "Programming",
        level: "beginner",
        duration: 480, // 8 hours
        price: 99.99,
        isPublished: true,
        tags: ["web development", "javascript", "react", "nodejs"],
        requirements: ["Basic computer skills", "No prior programming experience required"],
        whatYouWillLearn: [
            "HTML5 and CSS3 fundamentals",
            "JavaScript programming",
            "React.js framework",
            "Node.js backend development",
            "Database integration"
        ]
    },

    DATA_SCIENCE: {
        title: "Data Science with Python",
        description: "Master data analysis, visualization, and machine learning with Python",
        category: "Data Science",
        level: "intermediate",
        duration: 720, // 12 hours
        price: 149.99,
        isPublished: true,
        tags: ["python", "data science", "machine learning", "pandas"],
        requirements: ["Basic Python knowledge", "High school mathematics"],
        whatYouWillLearn: [
            "Data manipulation with Pandas",
            "Data visualization with Matplotlib",
            "Machine learning algorithms",
            "Statistical analysis",
            "Real-world projects"
        ]
    },

    DIGITAL_MARKETING: {
        title: "Digital Marketing Masterclass",
        description: "Learn SEO, social media marketing, PPC, and content marketing strategies",
        category: "Marketing",
        level: "beginner",
        duration: 360, // 6 hours
        price: 79.99,
        isPublished: false, // For testing unpublished courses
        tags: ["digital marketing", "seo", "social media", "ppc"],
        requirements: ["Basic internet knowledge"],
        whatYouWillLearn: [
            "SEO fundamentals",
            "Social media strategies",
            "Google Ads campaigns",
            "Content marketing",
            "Analytics and reporting"
        ]
    }
};

// User Test Data
export const USERS = {
    ADMIN: {
        fullName: "Test Admin User",
        email: "admin.test@example.com",
        password: "TestAdmin123!",
        role: "admin",
        isEmailVerified: true
    },

    SCHOOL_OWNER: {
        fullName: "School Owner Test",
        email: "school.test@example.com", 
        password: "TestSchool123!",
        role: "school",
        isEmailVerified: true
    },

    STUDENT: {
        fullName: "Student Test User",
        email: "student.test@example.com",
        password: "TestStudent123!",
        role: "student",
        isEmailVerified: true
    },

    INSTRUCTOR: {
        fullName: "Instructor Test User",
        email: "instructor.test@example.com",
        password: "TestInstructor123!",
        role: "school",
        isEmailVerified: true
    }
};

// School/Training Institute Test Data
export const TRAINING_INSTITUTES = {
    TECH_ACADEMY: {
        instituteName: "Tech Academy",
        description: "Leading technology training institute",
        address: {
            street: "123 Tech Street",
            city: "San Francisco",
            state: "CA",
            zipCode: "94102",
            country: "USA"
        },
        contact: {
            phone: "+1-555-123-4567",
            email: "info@techacademy.com",
            website: "https://techacademy.com"
        },
        specializations: ["Web Development", "Data Science", "AI/ML"],
        establishedYear: 2015,
        isVerified: false
    },

    BUSINESS_SCHOOL: {
        instituteName: "Business Leadership Institute",
        description: "Professional business and leadership training",
        address: {
            street: "456 Business Ave",
            city: "New York",
            state: "NY", 
            zipCode: "10001",
            country: "USA"
        },
        contact: {
            phone: "+1-555-987-6543",
            email: "contact@businessleader.com",
            website: "https://businessleader.com"
        },
        specializations: ["Management", "Leadership", "Marketing"],
        establishedYear: 2010,
        isVerified: true
    }
};

// Payment Test Data
export const PAYMENT_DATA = {
    VALID_CARD: {
        number: "4242424242424242", // Stripe test card
        exp_month: 12,
        exp_year: 2025,
        cvc: "123"
    },

    DECLINED_CARD: {
        number: "4000000000000002", // Stripe test declined card
        exp_month: 12,
        exp_year: 2025,
        cvc: "123"
    },

    PAYMENT_INTENT: {
        currency: "usd",
        payment_method_types: ["card"]
    }
};

// Webhook Test Data
export const WEBHOOK_EVENTS = {
    PAYMENT_SUCCESS: {
        type: "payment_intent.succeeded",
        data: {
            object: {
                id: "pi_test_success",
                amount: 1999, // $19.99
                currency: "usd",
                status: "succeeded",
                metadata: {
                    subscriptionId: "test_subscription_id",
                    userId: "test_user_id"
                }
            }
        }
    },

    PAYMENT_FAILED: {
        type: "payment_intent.payment_failed",
        data: {
            object: {
                id: "pi_test_failed",
                amount: 1999,
                currency: "usd",
                status: "failed",
                metadata: {
                    subscriptionId: "test_subscription_id",
                    userId: "test_user_id"
                }
            }
        }
    }
};
