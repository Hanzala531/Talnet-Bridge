import express, { request } from "express";
import {
    registerUser,
    loginUser,
    logoutUser,
    getAllUsers,
    addPicture,
    getAllStudents,
    getAllEmployers,
    getAllSchools,
    adminAnalytics,
    getPendingActions,
    updateUserStatus,
    getStudentsByRegion,
    refreshAccessToken,
    getStudentProfile,
    platformUsage,
    companyDetails,
    getSchoolProfile
} from '../controllers/user.controllers.js';
import { upload } from '../middlewares/Multer.middlewares.js';
import {requestLogger} from '../middlewares/ReqLog.middlewares.js';
import {verifyJWT} from '../middlewares/Auth.middlewares.js';
import {verifyRegisterCredentials} from '../middlewares/check.role.js'
import { authorizeRoles } from "../middlewares/Role.middlewares.js";
const userRouter = express.Router();

/**
 * @swagger
 * /api/v1/users/register:
 *   post:
 *     summary: Register a new user
 *     description: Create a new user account with role-based registration (student, school, or employer)
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - fullName
 *               - email
 *               - phone
 *               - password
 *               - role
 *             properties:
 *               fullName:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 100
 *                 description: User's full name
 *                 example: "John Doe"
 *               email:
 *                 type: string
 *                 format: email
 *                 description: User's email address (must be unique)
 *                 example: "john.doe@example.com"
 *               phone:
 *                 type: string
 *                 pattern: "^[0-9]{10,15}$"
 *                 description: User's phone number (10-15 digits, must be unique)
 *                 example: "03001234567"
 *               role:
 *                 type: string
 *                 enum: ["student", "school", "employer"]
 *                 description: User role in the platform
 *                 example: "student"
 *               password:
 *                 type: string
 *                 minLength: 6
 *                 maxLength: 128
 *                 description: User's password (minimum 6 characters, include letters and numbers)
 *                 example: "SecurePass123!"
 *               confirmPassword:
 *                 type: string
 *                 description: Password confirmation (must match password)
 *                 example: "SecurePass123!"
 *               dateOfBirth:
 *                 type: string
 *                 format: date
 *                 description: User's date of birth (optional, required for students)
 *                 example: "1995-06-15"
 *               acceptTerms:
 *                 type: boolean
 *                 description: User acceptance of terms and conditions
 *                 example: true
 *           example:
 *             fullName: "John Doe"
 *             email: "john.doe@example.com"
 *             phone: "03001234567"
 *             role: "student"
 *             password: "SecurePass123!"
 *             confirmPassword: "SecurePass123!"
 *             dateOfBirth: "1995-06-15"
 *             acceptTerms: true
 *     responses:
 *       201:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: integer
 *                   example: 201
 *                 message:
 *                   type: string
 *                   example: "User registered successfully"
 *                 payload:
 *                   type: object
 *                   properties:
 *                     user:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           example: "64f456def789abc123456789"
 *                         fullName:
 *                           type: string
 *                           example: "John Doe"
 *                         email:
 *                           type: string
 *                           example: "john.doe@example.com"
 *                         phone:
 *                           type: string
 *                           example: "03001234567"
 *                         role:
 *                           type: string
 *                           example: "student"
 *                         isVerified:
 *                           type: boolean
 *                           example: false
 *                         createdAt:
 *                           type: string
 *                           format: date-time
 *                           example: "2025-08-28T10:30:00.000Z"
 *                     accessToken:
 *                       type: string
 *                       example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *                     refreshToken:
 *                       type: string
 *                       example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                   example: "2025-08-28T10:30:00.000Z"
 *       400:
 *         description: Validation error or bad request
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: integer
 *                   example: 400
 *                 message:
 *                   type: string
 *                   example: "Validation failed"
 *                 errors:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       field:
 *                         type: string
 *                         example: "email"
 *                       message:
 *                         type: string
 *                         example: "Invalid email format"
 *                 success:
 *                   type: boolean
 *                   example: false
 *       409:
 *         description: User already exists
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: integer
 *                   example: 409
 *                 message:
 *                   type: string
 *                   example: "User with this email already exists"
 *                 success:
 *                   type: boolean
 *                   example: false
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */

userRouter.post('/register', requestLogger, verifyRegisterCredentials,  registerUser);
/**
 * @swagger
 * /api/v1/users/login:
 *   post:
 *     summary: Login a user
 *     description: Authenticate user with email and password, returns access token and sets HTTP-only cookies for session management
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: User's registered email address
 *                 example: "john.doe@example.com"
 *               password:
 *                 type: string
 *                 minLength: 6
 *                 description: User's password
 *                 example: "SecurePass123!"
 *               rememberMe:
 *                 type: boolean
 *                 description: Whether to extend session duration (optional)
 *                 default: false
 *                 example: true
 *           example:
 *             email: "john.doe@example.com"
 *             password: "SecurePass123!"
 *             rememberMe: true
 *     responses:
 *       200:
 *         description: User logged in successfully
 *         headers:
 *           Set-Cookie:
 *             description: HTTP-only cookies for refresh token
 *             schema:
 *               type: string
 *               example: "refreshToken=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...; HttpOnly; Secure; SameSite=Strict; Max-Age=604800"
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: integer
 *                   example: 200
 *                 message:
 *                   type: string
 *                   example: "User logged in successfully"
 *                 payload:
 *                   type: object
 *                   properties:
 *                     user:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           example: "64f456def789abc123456789"
 *                         fullName:
 *                           type: string
 *                           example: "John Doe"
 *                         email:
 *                           type: string
 *                           example: "john.doe@example.com"
 *                         role:
 *                           type: string
 *                           example: "student"
 *                         isVerified:
 *                           type: boolean
 *                           example: true
 *                         avatar:
 *                           type: string
 *                           example: "https://res.cloudinary.com/talentbridge/image/upload/v1234567890/avatars/user_abc123.jpg"
 *                         lastLogin:
 *                           type: string
 *                           format: date-time
 *                           example: "2025-08-28T10:30:00.000Z"
 *                     accessToken:
 *                       type: string
 *                       description: JWT access token for API authorization
 *                       example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *                     tokenExpiry:
 *                       type: string
 *                       format: date-time
 *                       description: Access token expiration time
 *                       example: "2025-08-28T16:30:00.000Z"
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                   example: "2025-08-28T10:30:00.000Z"
 *       400:
 *         description: Validation error - Invalid email or password format
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: integer
 *                   example: 400
 *                 message:
 *                   type: string
 *                   example: "Invalid email or password format"
 *                 success:
 *                   type: boolean
 *                   example: false
 *       401:
 *         description: Authentication failed - Invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: integer
 *                   example: 401
 *                 message:
 *                   type: string
 *                   example: "Invalid email or password"
 *                 success:
 *                   type: boolean
 *                   example: false
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: integer
 *                   example: 404
 *                 message:
 *                   type: string
 *                   example: "User not found with this email"
 *                 success:
 *                   type: boolean
 *                   example: false
 *       423:
 *         description: Account locked due to multiple failed attempts
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: integer
 *                   example: 423
 *                 message:
 *                   type: string
 *                   example: "Account temporarily locked due to multiple failed login attempts"
 *                 success:
 *                   type: boolean
 *                   example: false
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
userRouter.post('/login', requestLogger, loginUser);

/**
 * @swagger
 * /api/v1/users/logout:
 *   post:
 *     summary: Logout a user
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User logged out successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiResponse'
 *             example:
 *               success: true
 *               statusCode: 200
 *               message: "User logged out successfully"
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 */
userRouter.post('/logout', requestLogger, verifyJWT, logoutUser);

/**
 * @swagger
 * /api/v1/users/profile-picture:
 *   post:
 *     summary: Upload or update user profile picture
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *                 description: The image file to upload (JPG, PNG, GIF, WEBP)
 *     responses:
 *       200:
 *         description: Profile picture updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 statusCode:
 *                   type: integer
 *                   example: 200
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       $ref: '#/components/schemas/User'
 *                     imageUrl:
 *                       type: string
 *                       example: "https://res.cloudinary.com/demo/image/upload/v1620000000/sample.jpg"
 *                 message:
 *                   type: string
 *                   example: "Profile picture updated successfully"
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
userRouter.post('/profile-picture', requestLogger, verifyJWT, upload.single('image'), addPicture);

/**
 * @swagger
 * /api/v1/users/refresh-token:
 *   post:
 *     summary: Refresh access token
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 description: The refresh token to exchange for a new access token
 *                 example: "d1b55f3e4c6e4f3e8a6e4c6e4f3e8a6"
 *     responses:
 *       200:
 *         description: Access token refreshed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 statusCode:
 *                   type: integer
 *                   example: 200
 *                 data:
 *                   type: object
 *                   properties:
 *                     accessToken:
 *                       type: string
 *                       example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *                     refreshToken:
 *                       type: string
 *                       example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *                 message:
 *                   type: string
 *                   example: "Access token refreshed successfully"
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
userRouter.post("/refresh-token", refreshAccessToken);

/**
 * @swagger
 * /api/v1/users:
 *   get:
 *     summary: Get all users (Admin or authenticated access)
 *     description: Retrieve paginated list of users with filtering and search capabilities
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number for pagination
 *         example: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Number of users per page (max 100)
 *         example: 20
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by full name, email, or phone (case-insensitive)
 *         example: "john doe"
 *       - in: query
 *         name: role
 *         schema:
 *           type: string
 *           enum: ["student", "school", "employer", "admin"]
 *         description: Filter by user role
 *         example: "student"
 *     responses:
 *       200:
 *         description: Users retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 statusCode:
 *                   type: integer
 *                   example: 200
 *                 data:
 *                   type: object
 *                   properties:
 *                     users:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           _id:
 *                             type: string
 *                             example: "64f123abc456def789012345"
 *                           fullName:
 *                             type: string
 *                             example: "John Doe"
 *                           email:
 *                             type: string
 *                             example: "john@example.com"
 *                           phone:
 *                             type: string
 *                             example: "03001234567"
 *                           role:
 *                             type: string
 *                             example: "student"
 *                           onboardingStage:
 *                             type: string
 *                             example: "basic_info"
 *                           status:
 *                             type: string
 *                             example: "active"
 *                           createdAt:
 *                             type: string
 *                             format: date-time
 *                             example: "2025-01-15T10:30:00.000Z"
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: integer
 *                           example: 150
 *                         page:
 *                           type: integer
 *                           example: 1
 *                         limit:
 *                           type: integer
 *                           example: 20
 *                         totalPages:
 *                           type: integer
 *                           example: 8
 *                 message:
 *                   type: string
 *                   example: "Users fetched successfully"
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
userRouter.get('/', requestLogger, verifyJWT, authorizeRoles('admin'), getAllUsers);

/**
 * @swagger
 * /api/v1/users/students:
 *   get:
 *     summary: Get all students (Admin only)
 *     description: Retrieve paginated list of students with filtering and search capabilities (Admin access required)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number for pagination
 *         example: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Number of students per page (max 100)
 *         example: 20
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by full name, email, or phone (case-insensitive)
 *         example: "john doe"
 *     responses:
 *       200:
 *         description: Students retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 statusCode:
 *                   type: integer
 *                   example: 200
 *                 data:
 *                   type: object
 *                   properties:
 *                     students:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           _id:
 *                             type: string
 *                             example: "64f123abc456def789012345"
 *                           fullName:
 *                             type: string
 *                             example: "John Doe"
 *                           email:
 *                             type: string
 *                             example: "john@example.com"
 *                           phone:
 *                             type: string
 *                             example: "03001234567"
 *                           role:
 *                             type: string
 *                             example: "student"
 *                           onboardingStage:
 *                             type: string
 *                             example: "basic_info"
 *                           status:
 *                             type: string
 *                             example: "active"
 *                           createdAt:
 *                             type: string
 *                             format: date-time
 *                             example: "2025-01-15T10:30:00.000Z"
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: integer
 *                           example: 150
 *                         page:
 *                           type: integer
 *                           example: 1
 *                         limit:
 *                           type: integer
 *                           example: 20
 *                         totalPages:
 *                           type: integer
 *                           example: 8
 *                 message:
 *                   type: string
 *                   example: "Students fetched successfully"
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         description: Forbidden - Admin access required
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 statusCode:
 *                   type: integer
 *                   example: 403
 *                 message:
 *                   type: string
 *                   example: "Access denied. Admin role required."
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
userRouter.get('/students', requestLogger, verifyJWT, authorizeRoles('admin'), getAllStudents);

/**
 * @swagger
 * /api/v1/users/employers:
 *   get:
 *     summary: Get all employers (Admin only)
 *     description: Retrieve paginated list of employers with filtering and search capabilities (Admin access required)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number for pagination
 *         example: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Number of employers per page (max 100)
 *         example: 20
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by full name, email, or phone (case-insensitive)
 *         example: "john doe"
 *     responses:
 *       200:
 *         description: Employers retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 statusCode:
 *                   type: integer
 *                   example: 200
 *                 data:
 *                   type: object
 *                   properties:
 *                     employers:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           _id:
 *                             type: string
 *                             example: "64f123abc456def789012345"
 *                           fullName:
 *                             type: string
 *                             example: "John Doe"
 *                           email:
 *                             type: string
 *                             example: "john@example.com"
 *                           phone:
 *                             type: string
 *                             example: "03001234567"
 *                           role:
 *                             type: string
 *                             example: "employer"
 *                           onboardingStage:
 *                             type: string
 *                             example: "basic_info"
 *                           status:
 *                             type: string
 *                             example: "active"
 *                           createdAt:
 *                             type: string
 *                             format: date-time
 *                             example: "2025-01-15T10:30:00.000Z"
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: integer
 *                           example: 150
 *                         page:
 *                           type: integer
 *                           example: 1
 *                         limit:
 *                           type: integer
 *                           example: 20
 *                         totalPages:
 *                           type: integer
 *                           example: 8
 *                 message:
 *                   type: string
 *                   example: "Employers fetched successfully"
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         description: Forbidden - Admin access required
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 statusCode:
 *                   type: integer
 *                   example: 403
 *                 message:
 *                   type: string
 *                   example: "Access denied. Admin role required."
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
userRouter.get('/employers', requestLogger, verifyJWT, authorizeRoles('admin'), getAllEmployers);

/**
 * @swagger
 * /api/v1/users/schools:
 *   get:
 *     summary: Get all schools (Admin only)
 *     description: Retrieve paginated list of schools with filtering and search capabilities (Admin access required)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number for pagination
 *         example: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *         description: Number of schools per page (max 100)
 *         example: 20
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by full name, email, or phone (case-insensitive)
 *         example: "john doe"
 *     responses:
 *       200:
 *         description: Schools retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 statusCode:
 *                   type: integer
 *                   example: 200
 *                 data:
 *                   type: object
 *                   properties:
 *                     schools:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           _id:
 *                             type: string
 *                             example: "64f123abc456def789012345"
 *                           fullName:
 *                             type: string
 *                             example: "John Doe"
 *                           email:
 *                             type: string
 *                             example: "john@example.com"
 *                           phone:
 *                             type: string
 *                             example: "03001234567"
 *                           role:
 *                             type: string
 *                             example: "school"
 *                           onboardingStage:
 *                             type: string
 *                             example: "basic_info"
 *                           status:
 *                             type: string
 *                             example: "active"
 *                           createdAt:
 *                             type: string
 *                             format: date-time
 *                             example: "2025-01-15T10:30:00.000Z"
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: integer
 *                           example: 150
 *                         page:
 *                           type: integer
 *                           example: 1
 *                         limit:
 *                           type: integer
 *                           example: 20
 *                         totalPages:
 *                           type: integer
 *                           example: 8
 *                 message:
 *                   type: string
 *                   example: "Schools fetched successfully"
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         description: Forbidden - Admin access required
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 statusCode:
 *                   type: integer
 *                   example: 403
 *                 message:
 *                   type: string
 *                   example: "Access denied. Admin role required."
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
userRouter.get('/schools', requestLogger, verifyJWT, authorizeRoles('admin'), getAllSchools);

/**
 * @swagger
 * /api/v1/users/admin-analytics:
 *   get:
 *     summary: Get admin analytics (Admin only)
 *     description: Retrieve platform analytics data including user counts, activity metrics, and other admin insights (Admin access required)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Analytics data retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 statusCode:
 *                   type: integer
 *                   example: 200
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalUsers:
 *                       type: integer
 *                       example: 1500
 *                     activeUsers:
 *                       type: integer
 *                       example: 1200
 *                     newUsersThisMonth:
 *                       type: integer
 *                       example: 150
 *                     userRoleBreakdown:
 *                       type: object
 *                       properties:
 *                         students:
 *                           type: integer
 *                           example: 800
 *                         employers:
 *                           type: integer
 *                           example: 400
 *                         schools:
 *                           type: integer
 *                           example: 300
 *                     platformActivity:
 *                       type: object
 *                       properties:
 *                         totalLogins:
 *                           type: integer
 *                           example: 5000
 *                         averageSessionTime:
 *                           type: string
 *                           example: "25 minutes"
 *                 message:
 *                   type: string
 *                   example: "Admin analytics fetched successfully"
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         description: Forbidden - Admin access required
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 statusCode:
 *                   type: integer
 *                   example: 403
 *                 message:
 *                   type: string
 *                   example: "Access denied. Admin role required."
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
userRouter.get('/admin-analytics', requestLogger, verifyJWT, authorizeRoles('admin'), adminAnalytics);

/**
 * @swagger
 * /api/v1/users/pending-actions:
 *   get:
 *     summary: Get pending actions (Admin only)
 *     description: Retrieve a list of pending actions requiring admin attention, such as user approvals or verifications (Admin access required)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Pending actions retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 statusCode:
 *                   type: integer
 *                   example: 200
 *                 data:
 *                   type: object
 *                   properties:
 *                     pendingActions:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           _id:
 *                             type: string
 *                             example: "64f123abc456def789012345"
 *                           type:
 *                             type: string
 *                             example: "user_verification"
 *                           description:
 *                             type: string
 *                             example: "User John Doe requires email verification"
 *                           userId:
 *                             type: string
 *                             example: "64f456def789abc123456789"
 *                           createdAt:
 *                             type: string
 *                             format: date-time
 *                             example: "2025-01-15T10:30:00.000Z"
 *                 message:
 *                   type: string
 *                   example: "Pending actions fetched successfully"
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         description: Forbidden - Admin access required
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 statusCode:
 *                   type: integer
 *                   example: 403
 *                 message:
 *                   type: string
 *                   example: "Access denied. Admin role required."
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
userRouter.get('/pending-actions', requestLogger, verifyJWT, authorizeRoles('admin'), getPendingActions);

/**
 * @swagger
 * /api/v1/users/{userId}/status:
 *   patch:
 *     summary: Update user status (Admin only)
 *     description: Update the status of a specific user (e.g., activate, deactivate, or approve) (Admin access required)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the user to update
 *         example: "64f456def789abc123456789"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: ["active", "inactive", "pending", "suspended"]
 *                 description: The new status for the user
 *                 example: "active"
 *               reason:
 *                 type: string
 *                 description: Optional reason for the status change
 *                 example: "User verified email"
 *           example:
 *             status: "active"
 *             reason: "User verified email"
 *     responses:
 *       200:
 *         description: User status updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 statusCode:
 *                   type: integer
 *                   example: 200
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       type: object
 *                       properties:
 *                         _id:
 *                           type: string
 *                           example: "64f456def789abc123456789"
 *                         fullName:
 *                           type: string
 *                           example: "John Doe"
 *                         email:
 *                           type: string
 *                           example: "john.doe@example.com"
 *                         status:
 *                           type: string
 *                           example: "active"
 *                         updatedAt:
 *                           type: string
 *                           format: date-time
 *                           example: "2025-08-28T10:30:00.000Z"
 *                 message:
 *                   type: string
 *                   example: "User status updated successfully"
 *       400:
 *         description: Validation error - Invalid status or user ID
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 statusCode:
 *                   type: integer
 *                   example: 400
 *                 message:
 *                   type: string
 *                   example: "Invalid status value"
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         description: Forbidden - Admin access required
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 statusCode:
 *                   type: integer
 *                   example: 403
 *                 message:
 *                   type: string
 *                   example: "Access denied. Admin role required."
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: integer
 *                   example: 404
 *                 message:
 *                   type: string
 *                   example: "User not found"
 *                 success:
 *                   type: boolean
 *                   example: false
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
userRouter.patch('/:userId/status', requestLogger, verifyJWT, authorizeRoles('admin'), updateUserStatus);

/**
 * @swagger
 * /api/v1/users/students-by-region:
 *   get:
 *     summary: Get students by region (Admin only)
 *     description: Retrieve analytics on student distribution by region, extracted from student profile locations (Admin access required)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Students by region analytics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 statusCode:
 *                   type: integer
 *                   example: 200
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalStudents:
 *                       type: integer
 *                       example: 150
 *                     regions:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           region:
 *                             type: string
 *                             example: "Punjab"
 *                           count:
 *                             type: integer
 *                             example: 50
 *                 message:
 *                   type: string
 *                   example: "Students by region analytics fetched successfully"
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         description: Forbidden - Admin access required
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 statusCode:
 *                   type: integer
 *                   example: 403
 *                 message:
 *                   type: string
 *                   example: "Access denied. Admin role required."
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
userRouter.get('/students-by-region', requestLogger, verifyJWT, authorizeRoles('admin'), getStudentsByRegion);

/**
 * @swagger
 * /api/v1/users/platform-usage:
 *   get:
 *     summary: Get platform usage statistics (Admin only)
 *     description: Retrieve statistics about platform usage, including user counts by role and activity (Admin access required)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Platform usage statistics fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 statusCode:
 *                   type: integer
 *                 data:
 *                   type: object
 *                 message:
 *                   type: string
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
userRouter.get('/platform-usage', requestLogger, verifyJWT, authorizeRoles('admin'), platformUsage);


/**
 * @swagger
 * /api/v1/users/students/{userId}/profile:
 *   get:
 *     summary: Get student profile by user ID (Admin only)
 *     description: Retrieve a student's profile using their user ID (Admin access required)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: The user ID of the student
 *         example: "64f456def789abc123456789"
 *     responses:
 *       200:
 *         description: Student profile fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 statusCode:
 *                   type: integer
 *                 data:
 *                   type: object
 *                 message:
 *                   type: string
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
userRouter.get('/students/:userId/profile', requestLogger, verifyJWT, authorizeRoles('admin'), getStudentProfile);


/**
 * @swagger
 * /api/v1/users/company/{userId}:
 *   get:
 *     summary: Get company profile by user ID (Admin only)
 *     description: Retrieve a company profile using the user ID (Admin access required)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: The user ID of the company owner
 *         example: "64f456def789abc123456789"
 *     responses:
 *       200:
 *         description: Company profile fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 statusCode:
 *                   type: integer
 *                 data:
 *                   type: object
 *                 message:
 *                   type: string
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
userRouter.get('/company/:userId', requestLogger, verifyJWT, authorizeRoles('admin'), companyDetails);

/**
 * @swagger
 * /api/v1/users/schools/{userId}/profile:
 *   get:
 *     summary: Get school profile by user ID (Admin only)
 *     description: Retrieve a school's profile using their user ID (Admin access required)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: The user ID of the school
 *         example: "64f456def789abc123456789"
 *     responses:
 *       200:
 *         description: School profile fetched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 statusCode:
 *                   type: integer
 *                 data:
 *                   type: object
 *                 message:
 *                   type: string
 *       401:
 *         $ref: '#/components/responses/UnauthorizedError'
 *       403:
 *         $ref: '#/components/responses/ForbiddenError'
 *       404:
 *         $ref: '#/components/responses/NotFoundError'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
userRouter.get('/schools/:userId/profile', requestLogger, verifyJWT, authorizeRoles('admin'), getSchoolProfile);

// Exporting the router
export default userRouter