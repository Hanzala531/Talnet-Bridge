# Student Management & Profile System (MERN Backend)

## Project Overview

This project is a robust backend API for a Student Management & Profile System, designed for educational institutions and e-learning platforms. It enables seamless management of users (students, teachers, admins), student profiles, courses, enrollments, certifications, and analytics. The system is built for scalability, security, and extensibility, providing a solid foundation for a full-stack MERN (MongoDB, Express, React, Node.js) application.

**Key Features:**
- **User Authentication:** Secure JWT-based login for students, teachers, and admins.
- **Student Profile Management:** Store and update personal info, academic records, skills, certifications, and experiences.
- **Course & Enrollment System:** Teachers create courses, students enroll, and admins oversee all activity.
- **Certification Module:** Students upload certifications; teachers/admins validate them.
- **Analytics & Reporting:** Track enrollments, course completions, and certification stats.
- **Admin Panel:** Admins manage users, courses, and system-wide settings.

---

## Tech Stack

- **Node.js** – JavaScript runtime for server-side logic
- **Express.js** – Web framework for building RESTful APIs
- **MongoDB** – NoSQL database for flexible data storage
- **Mongoose** – ODM for MongoDB schema modeling
- **JWT (jsonwebtoken)** – Secure authentication tokens
- **bcrypt** – Password hashing
- **Swagger/OpenAPI** – API documentation
- **Other:** dotenv, cookie-parser, CORS, nodemon, etc.

---

## Folder Structure

```
├── src/
│   ├── models/         # Mongoose schemas for all entities
│   ├── controllers/    # Business logic for each module
│   ├── routes/         # Express route definitions (RESTful)
│   ├── middlewares/    # Auth, role, error, logging, etc.
│   ├── utils/          # Helpers: responses, errors, async handler
│   └── app.js          # Main Express app
├── public/             # Static files (e.g., Swagger UI)
├── swagger.js          # Swagger/OpenAPI config
├── package.json        # Project dependencies
└── README.md           # Project documentation
```

### Folder Details
- **models/**: All MongoDB schemas (User, Student, Course, etc.)
- **controllers/**: Functions for CRUD, validation, business rules
- **routes/**: Maps HTTP endpoints to controllers, applies middleware
- **middlewares/**: Handles authentication, authorization, error catching, logging
- **utils/**: Common utilities for API responses, error formatting, async wrappers

---

## Database Models & Relationships

### 1. **User**
- **Fields:** fullName, email, password (hashed), phone, role (admin/student/teacher), status, subscription, timestamps
- **Relationships:**
  - One-to-One with StudentProfile (if role is student)
  - One-to-Many with Course (if role is teacher)

### 2. **StudentProfile**
- **Fields:** userId (ref User), bio, location, website, skills, certifications, experiences, academic records, timestamps
- **Relationships:**
  - One-to-One with User
  - Many-to-Many with Certification, Experience

### 3. **Course**
- **Fields:** title, description, instructor (ref User), duration, price, category, status, enrolledStudents, timestamps
- **Relationships:**
  - Many-to-One with User (teacher as instructor)
  - Many-to-Many with User (students via Enrollment)

### 4. **Enrollment**
- **Fields:** studentId (ref User), courseId (ref Course), status, enrolledAt, completedAt
- **Relationships:**
  - Many-to-One with User (student)
  - Many-to-One with Course

### 5. **Certification**
- **Fields:** name, issuedBy, issueDate, certificateFile, status (pending/validated), validatedBy (ref User), timestamps
- **Relationships:**
  - Many-to-One with User (student)
  - Many-to-One with User (teacher/admin as validator)

### 6. **Experience**
- **Fields:** title, company, startDate, endDate, description, timestamps
- **Relationships:**
  - Many-to-One with StudentProfile

### 7. **Other Supporting Models**
- **Notification, Message, Subscription, etc.** (optional, for future expansion)

#### **Relationship Diagram (Textual)**
- **User** (1) — (1) **StudentProfile**
- **User** (1) — (M) **Course** (as instructor)
- **User** (1) — (M) **Enrollment** (as student)
- **Course** (1) — (M) **Enrollment**
- **StudentProfile** (1) — (M) **Certification**
- **StudentProfile** (1) — (M) **Experience**

---

## API Routes Explanation

### **Auth Routes**
| Method | Endpoint           | Description                | Request Body / Params         | Response                |
|--------|--------------------|----------------------------|-------------------------------|-------------------------|
| POST   | /api/v1/users/register | Register new user      | { fullName, email, phone, password, role } | JWT, user info         |
| POST   | /api/v1/users/login    | Login user              | { email, password }           | JWT, user info          |
| POST   | /api/v1/users/logout   | Logout user             | (JWT in cookie/header)        | Success message         |

### **Student Routes**
| Method | Endpoint                | Description                        | Request Body / Params         | Response                |
|--------|-------------------------|------------------------------------|-------------------------------|-------------------------|
| GET    | /api/v1/students/my     | Get current user's profile         | JWT                           | Student profile         |
| POST   | /api/v1/students        | Create student profile             | { bio, location, ... }        | Student profile         |
| PUT    | /api/v1/students/:id    | Update student profile             | { bio, ... }                  | Updated profile         |
| GET    | /api/v1/students/:id    | Get student by ID                  | :id param                     | Student profile         |
| DELETE | /api/v1/students/:id    | Delete student profile             | :id param                     | Success message         |
| POST   | /api/v1/students/:id/certifications | Add certification to student | { certificationId }           | Updated profile         |
| DELETE | /api/v1/students/:id/certifications/:certId | Remove certification | :id, :certId params           | Updated profile         |

### **Course Routes**
| Method | Endpoint                | Description                        | Request Body / Params         | Response                |
|--------|-------------------------|------------------------------------|-------------------------------|-------------------------|
| GET    | /api/v1/courses         | List all courses                   | [filters, pagination]         | List of courses         |
| POST   | /api/v1/courses         | Create new course (teacher/admin)  | { title, description, ... }   | Course info             |
| GET    | /api/v1/courses/:id     | Get course by ID                   | :id param                     | Course info             |
| PATCH  | /api/v1/courses/:id     | Update course                      | { ...fields }                 | Updated course          |
| DELETE | /api/v1/courses/:id     | Delete course                      | :id param                     | Success message         |
| POST   | /api/v1/courses/:id/enroll | Enroll student in course         | JWT, :id param                | Enrollment info         |

### **Certification Routes**
| Method | Endpoint                | Description                        | Request Body / Params         | Response                |
|--------|-------------------------|------------------------------------|-------------------------------|-------------------------|
| POST   | /api/v1/certifications  | Upload certification (student)     | { name, issuedBy, ... }       | Certification info      |
| GET    | /api/v1/certifications  | List certifications                | [filters, pagination]         | List of certifications  |
| GET    | /api/v1/certifications/:id | Get certification by ID           | :id param                     | Certification info      |
| PUT    | /api/v1/certifications/:id | Update certification (admin/teacher) | { ...fields }             | Updated certification   |
| DELETE | /api/v1/certifications/:id | Delete certification (admin)      | :id param                     | Success message         |
| PATCH  | /api/v1/certifications/:id/validate | Validate certification (teacher/admin) | { status }         | Updated certification   |

### **Admin Routes**
| Method | Endpoint                | Description                        | Request Body / Params         | Response                |
|--------|-------------------------|------------------------------------|-------------------------------|-------------------------|
| GET    | /api/v1/users           | List all users (admin)             | [filters, pagination]         | List of users           |
| GET    | /api/v1/analytics       | Get system analytics               | -                             | Stats, reports          |
| PATCH  | /api/v1/users/:id/role  | Change user role                   | { role }                      | Updated user            |
| DELETE | /api/v1/users/:id       | Delete user                        | :id param                     | Success message         |

---

## Workflow Explanation

### **Student Workflow**
1. **Registration:** Student signs up via `/api/v1/users/register`.
2. **Login:** Receives JWT token after `/api/v1/users/login`.
3. **Profile Completion:** Fills out profile via `/api/v1/students` (bio, skills, etc.).
4. **Upload Certifications:** Adds certifications via `/api/v1/certifications`.
5. **Enroll in Courses:** Enrolls using `/api/v1/courses/:id/enroll`.
6. **View Progress:** Can view enrolled courses, certifications, and analytics.

### **Teacher Workflow**
1. **Login:** Authenticates via `/api/v1/users/login`.
2. **Create Courses:** Adds new courses via `/api/v1/courses`.
3. **Manage Enrollments:** Views and manages students in their courses.
4. **Validate Certifications:** Reviews and validates student certifications via `/api/v1/certifications/:id/validate`.

### **Admin Workflow**
1. **Login:** Authenticates via `/api/v1/users/login`.
2. **Manage Users:** Views, edits, or deletes users via `/api/v1/users` endpoints.
3. **Manage Courses:** Oversees all courses and enrollments.
4. **Monitor Analytics:** Accesses `/api/v1/analytics` for system-wide stats.
5. **Validate/Remove Certifications:** Can validate or remove any certification.

---

## Data Flow

1. **Frontend → Backend:**
   - Frontend (React) sends HTTP requests to Express API endpoints.
   - JWT token is sent in Authorization header or cookies for protected routes.
2. **Backend → Database:**
   - Express controllers process requests, validate data, and interact with MongoDB via Mongoose models.
   - Responses are formatted and sent back to the frontend.
3. **Backend → Frontend:**
   - API returns JSON responses with status, message, payload, and success flag.

---

## Error Handling

- All errors are caught by a global error handler middleware.
- Errors are returned in a consistent JSON format:

```json
{
  "status": 400,
  "message": "Validation error: email is required",
  "payload": null,
  "success": false,
  "timestamp": "2025-08-18T12:34:56.789Z"
}
```
- Common error types: Validation errors, Authentication errors, Authorization errors, Not found, Server errors.

---

## Security

- **Password Hashing:** All passwords are hashed using bcrypt before storage.
- **JWT Authentication:**
  - On login, a JWT is issued and must be sent with each protected request.
  - JWT contains user ID, role, and other claims.
- **Role-Based Access Control:**
  - Middleware checks user role for each route (admin, student, teacher).
  - Only authorized users can access/modify certain resources.
- **Input Validation & Sanitization:**
  - All incoming data is validated and sanitized to prevent injection attacks.
- **Sensitive Data Protection:**
  - Passwords, tokens, and sensitive fields are never returned in API responses.

---

## Future Improvements

- **Notifications:** Real-time or email notifications for important events (enrollment, certification validation, etc.)
- **File Storage:** Store certification files and profile images on cloud storage (AWS S3, Cloudinary, etc.)
- **Advanced Analytics:** More detailed reporting and dashboards for teachers/admins.
- **Soft Deletes:** Implement soft delete for users and courses for auditability.
- **Multi-Tenancy:** Support for multiple institutions/organizations.
- **API Rate Limiting:** Prevent abuse by limiting requests per user/IP.
- **Unit & Integration Tests:** Add comprehensive automated tests.
- **Frontend Integration:** Build a React frontend to consume this API.

---

## Getting Started

1. **Clone the repository:**
   ```sh
   git clone <repo-url>
   cd <project-folder>
   ```
2. **Install dependencies:**
   ```sh
   npm install
   ```
3. **Configure environment variables:**
   - Copy `.env.example` to `.env` and fill in your MongoDB URI, JWT secrets, etc.
4. **Run the server:**
   ```sh
   npm run dev
   ```
5. **Access API docs:**
   - Visit `http://localhost:4000/docs` for Swagger UI.

---

## Contributing

Pull requests are welcome! Please open an issue first to discuss major changes.

---

## License

MIT License. See [LICENSE](LICENSE) for details.
