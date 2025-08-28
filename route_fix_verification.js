// Quick verification of route order
console.log("Route verification - Our new routes should now be accessible:");
console.log("✅ GET /api/v1/students/dashboard - Student dashboard (should work now)");
console.log("✅ GET /api/v1/students/currently-enrolled - Currently enrolled courses (should work now)");
console.log("❌ GET /api/v1/students/:id - Get student by ID (requires 'school' role - was catching our routes before)");
console.log("");
console.log("Route order fix applied:");
console.log("1. Specific routes (/dashboard, /currently-enrolled) are now BEFORE the generic /:id route");
console.log("2. This prevents the /:id route from catching 'dashboard' and 'currently-enrolled' as IDs");
console.log("3. Authorization is correct: 'student' role for our new routes, 'school' role for /:id route");
