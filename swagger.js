// swagger.js
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Talent Bridge API',
      version: '1.0.0',
      description: 'API documentation for the Talent Bridge platform',
      contact: {
        name: 'Talent Bridge Team',
        email: 'support@talentbridge.com'
      }
    },
    servers: [
      {
        url: process.env.NODE_ENV === 'production'
          ? 'https://talnet-bridge.vercel.app/' // Change to your Vercel deployment URL
          : 'http://localhost:4000',
        description: process.env.NODE_ENV === 'production'
          ? 'Production server'
          : 'Development server'
      }
    ],
    tags: [
      {
        name: 'Users',
        description: 'User authentication and management endpoints'
      },
      {
        name: 'Courses',
        description: 'Course management and search endpoints'
      },
      {
        name: 'Training Providers',
        description: 'Training provider/school management endpoints'
      },
      {
        name: 'Employers',
        description: 'Employer company profile management endpoints'
      },
      {
        name: 'Jobs',
        description: 'Job posting and management endpoints'
      },
      {
        name: 'Students',
        description: 'Student profile management endpoints'
      },
      {
        name: 'Student Experiences',
        description: 'Student work experience management endpoints (under /api/v1/students/experiences)'
      },
      {
        name: 'Student Certifications',
        description: 'Student certification management endpoints (under /api/v1/students/certifications)'
      },
      {
        name: 'KYC',
        description: 'Know Your Customer document verification endpoints'
      },
      {
        name: 'Enrollments',
        description: 'Course enrollment management and tracking endpoints'
      },
      {
        name: 'Subscription Plans',
        description: 'Subscription plan management endpoints'
      },
      {
        name: 'Subscriptions',
        description: 'User subscription management endpoints'
      },
      {
        name: 'Payments',
        description: 'Payment processing endpoints'
      },
      {
        name: 'Webhooks',
        description: 'Webhook handling endpoints'
      },
      {
        name: 'Notifications',
        description: 'User notification management endpoints'
      },
      {
        name: 'Chat',
        description: 'Real-time chat and messaging endpoints'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT token obtained from login endpoint'
        }
      },
      schemas: {
        EnrollmentRequest: {
          type: 'object',
          required: ['courseId'],
          properties: {
            courseId: {
              type: 'string',
              description: 'The ID of the course to enroll in',
              example: '64f789abc123def456789012'
            }
          }
        },
        User: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
              description: 'User unique identifier',
              example: '64f123abc456def789012345'
            },
            fullName: {
              type: 'string',
              description: 'User full name',
              example: 'John Doe'
            },
            email: {
              type: 'string',
              format: 'email',
              description: 'User email address',
              example: 'john@example.com'
            },
            phone: {
              type: 'string',
              description: 'User phone number',
              example: '03001234567'
            },
            role: {
              type: 'string',
              enum: ['student', 'school', 'employer', 'admin'],
              description: 'User role in the platform',
              example: 'student'
            },
            onboardingStage: {
              type: 'string',
              enum: ['basic_info', 'profile_setup', 'verification', 'completed'],
              description: 'Current onboarding stage',
              example: 'basic_info'
            },
            status: {
              type: 'string',
              enum: ['active', 'inactive', 'suspended', 'pending'],
              description: 'User account status',
              example: 'active'
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Account creation timestamp',
              example: '2025-08-15T10:30:00.000Z'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Account last update timestamp',
              example: '2025-08-19T14:20:00.000Z'
            }
          }
        },
        Course: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
              description: 'Course unique identifier',
              example: '64f456def789abc123456789'
            },
            title: {
              type: 'string',
              description: 'Course title',
              example: 'Web Development Fundamentals'
            },
            instructor: {
              type: 'string',
              description: 'Instructor name',
              example: 'John Doe'
            },
            duration: {
              type: 'string',
              description: 'Course duration',
              example: '8 weeks'
            },
            price: {
              type: 'number',
              description: 'Course price in PKR',
              example: 299.99
            },
            language: {
              type: 'string',
              description: 'Course language',
              example: 'English'
            },
            type: {
              type: 'string',
              enum: ['oncampus','hybrid'],
              description: 'Course delivery type',
              example: 'oncampus'
            },
            description: {
              type: 'string',
              description: 'Course description',
              example: 'Learn the fundamentals of web development including HTML, CSS, and JavaScript'
            },
            objectives: {
              type: 'array',
              items: {
                type: 'string'
              },
              description: 'Course learning objectives',
              example: ['Learn HTML structure and semantics', 'Master CSS styling and layouts', 'Understand JavaScript fundamentals']
            },
            skills: {
              type: 'array',
              items: {
                type: 'string'
              },
              description: 'Skills gained from this course',
              description: 'Skills gained from this course',
              example: ['Frontend Development', 'Responsive Design', 'JavaScript Programming']
            },
            category: {
              type: 'string',
              description: 'Course category',
              example: 'Technology'
            },
            status: {
              type: 'string',
              enum: ['draft', 'pending_approval', 'approved', 'rejected', 'archived'],
              description: 'Course approval status',
              example: 'approved'
            },
            providerId: {
              type: 'string',
              description: 'Training provider (school) ID',
              example: '64f789abc123def456789012'
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Course creation timestamp',
              example: '2025-08-15T10:30:00.000Z'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Course last update timestamp',
              example: '2025-08-19T14:20:00.000Z'
            }
          }
        },
        Job: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
              example: '64f789abc123def456789012'
            },
            jobTitle: {
              type: 'string',
              example: 'Software Engineer'
            },
            department: {
              type: 'string',
              example: 'Engineering'
            },
            location: {
              type: 'string',
              example: 'Lahore'
            },
            employmentType: {
              type: 'string',
              enum: ['Full-time', 'Part-time', 'Internship', 'Contract'],
              example: 'Full-time'
            },
            salary: {
              type: 'object',
              properties: {
                min: {
                  type: 'number',
                  example: 50000
                },
                max: {
                  type: 'number',
                  example: 100000
                },
                currency: {
                  type: 'string',
                  example: 'PKR'
                }
              }
            },
            jobDescription: {
              type: 'string',
              example: 'Develop and maintain web applications.'
            },
            skillsRequired: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  skill: {
                    type: 'string',
                    example: 'JavaScript'
                  },
                  proficiency: {
                    type: 'string',
                    enum: ['Beginner', 'Intermediate', 'Advanced'],
                    example: 'Intermediate'
                  }
                }
              }
            },
            benefits: {
              type: 'string',
              example: 'Health insurance, Flexible hours'
            },
            category: {
              type: 'string',
              example: 'Technology'
            },
            applicationDeadline: {
              type: 'string',
              format: 'date',
              example: '2025-12-31'
            },
            status: {
              type: 'string',
              enum: ['active', 'closed', 'expired'],
              example: 'active'
            },
            companyId: {
              type: 'string',
              description: 'Employer company ID',
              example: '64f890abc123def456789013'
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Job creation timestamp',
              example: '2025-08-15T10:30:00.000Z'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Job last update timestamp',
              example: '2025-08-19T14:20:00.000Z'
            }
          }
        },
        Student: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
              description: 'Student unique identifier',
              example: '64f123abc456def789012345'
            },
            userId: {
              type: 'string',
              description: 'Associated user ID (required)',
              example: '64f123abc456def789012345'
            },
            bio: {
              type: 'string',
              description: 'Student biography',
              example: 'Passionate about technology and learning'
            },
            location: {
              type: 'string',
              description: 'Student location',
              example: 'Lahore, Pakistan'
            },
            website: {
              type: 'string',
              description: 'Student personal website URL',
              example: 'https://myportfolio.com'
            },
            skills: {
              type: 'array',
              items: {
                type: 'string'
              },
              description: 'Student skills (required)',
              example: ['JavaScript', 'React', 'Node.js', 'MongoDB']
            },
            certifications: {
              type: 'array',
              items: {
                type: 'string',
                description: 'Certification ID reference'
              },
              description: 'Array of certification IDs',
              example: ['64f0f4f4f4f4f4f4f4f4f4f4']
            },
            kycVerification: {
              type: 'array',
              items: {
                type: 'string',
                description: 'KYC document ID reference'
              },
              description: 'Array of KYC verification document IDs',
              example: ['64f0f4f4f4f4f4f4f4f4f4f5']
            },
            experience: {
              type: 'array',
              items: {
                type: 'string',
                description: 'Experience ID reference'
              },
              description: 'Array of experience IDs',
              example: ['64f0f4f4f4f4f4f4f4f4f4f6']
            },
            gsceResult: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/GSCEResult'
              },
              description: 'GSCE examination results',
              example: [
                {
                  subject: 'Mathematics',
                  marks: '85',
                  grade: 'A'
                },
                {
                  subject: 'English',
                  marks: '78',
                  grade: 'B'
                }
              ]
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Profile creation timestamp',
              example: '2025-08-15T10:30:00.000Z'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Profile last update timestamp',
              example: '2025-08-19T14:20:00.000Z'
            }
          }
        },
        GSCEResult: {
          type: 'object',
          required: ['subject', 'marks', 'grade'],
          properties: {
            subject: {
              type: 'string',
              description: 'Subject name',
              example: 'Mathematics'
            },
            marks: {
              type: 'string',
              description: 'Marks obtained',
              example: '85'
            },
            grade: {
              type: 'string',
              description: 'Grade achieved',
              example: 'A'
            }
          }
        },
        Experience: {
          type: 'object',
          required: ['title', 'company', 'startDate'],
          properties: {
            _id: {
              type: 'string',
              description: 'Experience unique identifier',
              example: '64f0f4f4f4f4f4f4f4f4f4f4'
            },
            title: {
              type: 'string',
              description: 'Job title',
              example: 'Software Engineer'
            },
            company: {
              type: 'string',
              description: 'Company name',
              example: 'Google'
            },
            startDate: {
              type: 'string',
              format: 'date',
              description: 'Employment start date',
              example: '2022-01-15'
            },
            endDate: {
              type: 'string',
              format: 'date',
              nullable: true,
              description: 'Employment end date (null if current job)',
              example: '2023-06-30'
            },
            description: {
              type: 'string',
              description: 'Job description and responsibilities',
              example: 'Developed web applications using React and Node.js'
            },
            isCurrentJob: {
              type: 'boolean',
              readOnly: true,
              description: 'Whether this is the current job',
              example: false
            },
            duration: {
              type: 'string',
              readOnly: true,
              description: 'Calculated duration of employment',
              example: '1 year 5 months'
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Record creation timestamp',
              example: '2025-08-15T10:30:00.000Z'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Record last update timestamp',
              example: '2025-08-19T14:20:00.000Z'
            }
          }
        },
        Certification: {
          type: 'object',
          required: ['name', 'issuedBy'],
          properties: {
            _id: {
              type: 'string',
              description: 'Certification unique identifier',
              example: '64f0f4f4f4f4f4f4f4f4f4f4'
            },
            name: {
              type: 'string',
              description: 'Certification name',
              example: 'AWS Certified Solutions Architect'
            },
            issuedBy: {
              type: 'string',
              description: 'Issuing organization',
              example: 'Amazon Web Services'
            },
            issueDate: {
              type: 'string',
              format: 'date',
              description: 'Date when certification was issued',
              example: '2023-06-15'
            },
            expiryDate: {
              type: 'string',
              format: 'date',
              nullable: true,
              description: 'Certification expiry date (null if no expiry)',
              example: '2026-06-15'
            },
            certificateFile: {
              type: 'string',
              description: 'URL to certificate file',
              example: 'https://cloudinary.com/certificate.pdf'
            },
            extracted: {
              type: 'boolean',
              default: false,
              description: 'Whether certification details were extracted from file',
              example: false
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Record creation timestamp',
              example: '2025-08-15T10:30:00.000Z'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Record last update timestamp',
              example: '2025-08-19T14:20:00.000Z'
            }
          }
        },
        Employer: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
              description: 'Employer unique identifier',
              example: '64f890abc123def456789013'
            },
            userId: {
              type: 'string',
              description: 'Associated user ID',
              example: '64f890abc123def456789013'
            },
            companyName: {
              type: 'string',
              description: 'Company name',
              example: 'TechCorp Solutions'
            },
            companyDescription: {
              type: 'string',
              description: 'Company description',
              example: 'Leading software development company specializing in web and mobile applications'
            },
            industry: {
              type: 'string',
              description: 'Company industry',
              example: 'Information Technology'
            },
            companySize: {
              type: 'string',
              enum: ['1-10', '11-50', '51-200', '201-500', '501-1000', '1000+'],
              description: 'Company size range',
              example: '51-200'
            },
            website: {
              type: 'string',
              format: 'url',
              description: 'Company website URL',
              example: 'https://techcorp.com'
            },
            address: {
              type: 'object',
              properties: {
                street: {
                  type: 'string',
                  example: '456 Business Avenue'
                },
                city: {
                  type: 'string',
                  example: 'Karachi'
                },
                state: {
                  type: 'string',
                  example: 'Sindh'
                },
                country: {
                  type: 'string',
                  example: 'Pakistan'
                },
                postalCode: {
                  type: 'string',
                  example: '75600'
                }
              }
            },
            establishedYear: {
              type: 'integer',
              description: 'Year company was established',
              example: 2015
            },
            verificationStatus: {
              type: 'string',
              enum: ['pending', 'verified', 'rejected'],
              description: 'Company verification status',
              example: 'verified'
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Profile creation timestamp',
              example: '2025-08-15T10:30:00.000Z'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Profile last update timestamp',
              example: '2025-08-19T14:20:00.000Z'
            }
          }
        },
        School: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
              description: 'School unique identifier',
              example: '64f789abc123def456789012'
            },
            userId: {
              type: 'string',
              description: 'Associated user ID',
              example: '64f789abc123def456789012'
            },
            institutionName: {
              type: 'string',
              description: 'Institution name',
              example: 'TechEd Academy'
            },
            institutionType: {
              type: 'string',
              enum: ['university', 'college', 'training_institute', 'certification_body'],
              description: 'Type of educational institution',
              example: 'training_institute'
            },
            description: {
              type: 'string',
              description: 'Institution description',
              example: 'Premier technology training institute offering industry-relevant courses'
            },
            address: {
              type: 'object',
              properties: {
                street: {
                  type: 'string',
                  example: '789 Education Street'
                },
                city: {
                  type: 'string',
                  example: 'Islamabad'
                },
                state: {
                  type: 'string',
                  example: 'Federal'
                },
                country: {
                  type: 'string',
                  example: 'Pakistan'
                },
                postalCode: {
                  type: 'string',
                  example: '44000'
                }
              }
            },
            website: {
              type: 'string',
              format: 'url',
              description: 'Institution website URL',
              example: 'https://techedacademy.edu.pk'
            },
            accreditation: {
              type: 'array',
              items: {
                type: 'string'
              },
              description: 'Institution accreditations',
              example: ['HEC Recognized', 'ISO 9001:2015 Certified']
            },
            establishedYear: {
              type: 'integer',
              description: 'Year institution was established',
              example: 2010
            },
            verificationStatus: {
              type: 'string',
              enum: ['pending', 'verified', 'rejected'],
              description: 'Institution verification status',
              example: 'verified'
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Profile creation timestamp',
              example: '2025-08-15T10:30:00.000Z'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Profile last update timestamp',
              example: '2025-08-19T14:20:00.000Z'
            }
          }
        },
        ApiResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              description: 'Indicates if the operation was successful',
              example: true
            },
            statusCode: {
              type: 'integer',
              description: 'HTTP status code',
              example: 200
            },
            data: {
              type: 'object',
              description: 'Response data (varies by endpoint)'
            },
            message: {
              type: 'string',
              description: 'Success message',
              example: 'Operation completed successfully'
            }
          }
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              description: 'Always false for error responses',
              example: false
            },
            statusCode: {
              type: 'integer',
              description: 'HTTP error status code',
              example: 400
            },
            message: {
              type: 'string',
              description: 'Error message describing what went wrong',
              example: 'Validation error or operation failed'
            },
            errors: {
              type: 'array',
              items: {
                type: 'string'
              },
              description: 'Detailed error messages (optional)',
              example: ['Email is required', 'Password must be at least 6 characters']
            }
          }
        },
        PaginationInfo: {
          type: 'object',
          properties: {
            page: {
              type: 'integer',
              description: 'Current page number',
              example: 1
            },
            limit: {
              type: 'integer',
              description: 'Number of items per page',
              example: 20
            },
            total: {
              type: 'integer',
              description: 'Total number of items',
              example: 150
            },
            totalPages: {
              type: 'integer',
              description: 'Total number of pages',
              example: 8
            }
          }
        },
        Student: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
              description: 'Student unique identifier',
              example: '64f123abc456def789012345'
            },
            userId: {
              type: 'string',
              description: 'Associated user ID (required)',
              example: '64f123abc456def789012345'
            },
            bio: {
              type: 'string',
              description: 'Student biography',
              example: 'Passionate about technology and learning'
            },
            location: {
              type: 'string',
              description: 'Student location',
              example: 'Lahore, Pakistan'
            },
            website: {
              type: 'string',
              description: 'Student personal website URL',
              example: 'https://myportfolio.com'
            },
            skills: {
              type: 'array',
              items: {
                type: 'string'
              },
              description: 'Student skills (required)',
              example: ['JavaScript', 'React', 'Node.js', 'MongoDB']
            },
            certifications: {
              type: 'array',
              items: {
                type: 'string',
                description: 'Certification ID reference'
              },
              description: 'Array of certification IDs',
              example: ['64f0f4f4f4f4f4f4f4f4f4f4']
            },
            kycVerification: {
              type: 'array',
              items: {
                type: 'string',
                description: 'KYC document ID reference'
              },
              description: 'Array of KYC verification document IDs',
              example: ['64f0f4f4f4f4f4f4f4f4f4f5']
            },
            experience: {
              type: 'array',
              items: {
                type: 'string',
                description: 'Experience ID reference'
              },
              description: 'Array of experience IDs',
              example: ['64f0f4f4f4f4f4f4f4f4f4f6']
            },
            gsceResult: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/GSCEResult'
              },
              description: 'GSCE examination results',
              example: [
                {
                  subject: 'Mathematics',
                  marks: '85',
                  grade: 'A'
                },
                {
                  subject: 'English',
                  marks: '78',
                  grade: 'B'
                }
              ]
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Profile creation timestamp',
              example: '2025-08-15T10:30:00.000Z'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Profile last update timestamp',
              example: '2025-08-19T14:20:00.000Z'
            }
          }
        },
        GSCEResult: {
          type: 'object',
          required: ['subject', 'marks', 'grade'],
          properties: {
            subject: {
              type: 'string',
              description: 'Subject name',
              example: 'Mathematics'
            },
            marks: {
              type: 'string',
              description: 'Marks obtained',
              example: '85'
            },
            grade: {
              type: 'string',
              description: 'Grade achieved',
              example: 'A'
            }
          }
        },
        Experience: {
          type: 'object',
          required: ['title', 'company', 'startDate'],
          properties: {
            _id: {
              type: 'string',
              description: 'Experience unique identifier',
              example: '64f0f4f4f4f4f4f4f4f4f4f4'
            },
            title: {
              type: 'string',
              description: 'Job title',
              example: 'Software Engineer'
            },
            company: {
              type: 'string',
              description: 'Company name',
              example: 'Google'
            },
            startDate: {
              type: 'string',
              format: 'date',
              description: 'Employment start date',
              example: '2022-01-15'
            },
            endDate: {
              type: 'string',
              format: 'date',
              nullable: true,
              description: 'Employment end date (null if current job)',
              example: '2023-06-30'
            },
            description: {
              type: 'string',
              description: 'Job description and responsibilities',
              example: 'Developed web applications using React and Node.js'
            },
            isCurrentJob: {
              type: 'boolean',
              readOnly: true,
              description: 'Whether this is the current job',
              example: false
            },
            duration: {
              type: 'string',
              readOnly: true,
              description: 'Calculated duration of employment',
              example: '1 year 5 months'
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Record creation timestamp',
              example: '2025-08-15T10:30:00.000Z'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Record last update timestamp',
              example: '2025-08-19T14:20:00.000Z'
            }
          }
        },
        Certification: {
          type: 'object',
          required: ['name', 'issuedBy'],
          properties: {
            _id: {
              type: 'string',
              description: 'Certification unique identifier',
              example: '64f0f4f4f4f4f4f4f4f4f4f4'
            },
            name: {
              type: 'string',
              description: 'Certification name',
              example: 'AWS Certified Solutions Architect'
            },
            issuedBy: {
              type: 'string',
              description: 'Issuing organization',
              example: 'Amazon Web Services'
            },
            issueDate: {
              type: 'string',
              format: 'date',
              description: 'Date when certification was issued',
              example: '2023-06-15'
            },
            expiryDate: {
              type: 'string',
              format: 'date',
              nullable: true,
              description: 'Certification expiry date (null if no expiry)',
              example: '2026-06-15'
            },
            certificateFile: {
              type: 'string',
              description: 'URL to certificate file',
              example: 'https://cloudinary.com/certificate.pdf'
            },
            extracted: {
              type: 'boolean',
              default: false,
              description: 'Whether certification details were extracted from file',
              example: false
            },
            createdAt: {
              type: 'string',
              format: 'date-time',
              description: 'Record creation timestamp',
              example: '2025-08-15T10:30:00.000Z'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time',
              description: 'Record last update timestamp',
              example: '2025-08-19T14:20:00.000Z'
            }
          }
        }
      },
      responses: {
        UnauthorizedError: {
          description: 'Authentication required or token invalid',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse'
              },
              example: {
                success: false,
                statusCode: 401,
                message: 'Access token required'
              }
            }
          }
        },
        ForbiddenError: {
          description: 'Insufficient permissions for this operation',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse'
              },
              example: {
                success: false,
                statusCode: 403,
                message: 'Access denied - insufficient permissions'
              }
            }
          }
        },
        NotFoundError: {
          description: 'Resource not found',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse'
              },
              example: {
                success: false,
                statusCode: 404,
                message: 'Resource not found'
              }
            }
          }
        },
        ValidationError: {
          description: 'Request validation failed',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse'
              },
              example: {
                success: false,
                statusCode: 400,
                message: 'Validation error',
                errors: ['Email is required', 'Password must be at least 6 characters']
              }
            }
          }
        },
        InternalServerError: {
          description: 'Internal server error',
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/ErrorResponse'
              },
              example: {
                success: false,
                statusCode: 500,
                message: 'Internal server error'
              }
            }
          }
        }
      }
    },
    security: [{ bearerAuth: [] }]
  },
  apis: [
    path.join(__dirname, './src/routes/*.js'),
    path.join(__dirname, './src/controllers/*.js'),
    path.join(__dirname, './src/models/*.js')
  ]
};

const swaggerSpec = swaggerJsdoc(options);

// Custom Swagger UI options
const swaggerUiOptions = {
  explorer: true,
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: "Talent Bridge API Documentation",
  swaggerOptions: {
    urls: [
      {
        url: '/swagger.json',
        name: 'Talent Bridge API'
      }
    ],
    tagsSorter: (a, b) => {
      const order = ["Users", "Training Providers", "Students", "Student Experiences", "Student Certifications", "Enrollments", "Courses"];
      return order.indexOf(a) - order.indexOf(b);
    }
  }
};

function setupSwagger(app) {
  // Serve swagger-ui assets locally
  app.use('/swagger', express.static(path.join(__dirname, 'public/swagger')));
  
  // Serve raw OpenAPI JSON
  app.get('/swagger.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });

  // Serve local Swagger UI HTML with local assets
  app.get('/docs', (_req, res) => {
    const html = `<!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Talent Bridge API Documentation</title>
      <link rel="stylesheet" href="/swagger/swagger-ui.css" />
      <style>.swagger-ui .topbar { display: none }</style>
    </head>
    <body>
      <div id="swagger-ui"></div>
      <script src="/swagger/swagger-ui-bundle.js"></script>
      <script src="/swagger/swagger-ui-standalone-preset.js"></script>
      <script>
        window.onload = function () {
          SwaggerUIBundle({
            url: '/swagger.json',
            dom_id: '#swagger-ui',
            presets: [
              SwaggerUIBundle.presets.apis,
              SwaggerUIStandalonePreset
            ],
            layout: 'StandaloneLayout',
            tagsSorter: function(a, b) {
              const order = ["Users", "Training Providers", "Students", "Student Experiences", "Student Certifications", "Enrollments", "Courses", "Subscription Plans", "Subscriptions", "Payments", "Webhooks", "Notifications"];
              const indexA = order.indexOf(a);
              const indexB = order.indexOf(b);
              if (indexA === -1 && indexB === -1) return a.localeCompare(b);
              if (indexA === -1) return 1;
              if (indexB === -1) return -1;
              return indexA - indexB;
            }
          });
        };
      </script>
    </body>
    </html>`;
    res.setHeader('Content-Type', 'text/html');
    res.status(200).send(html);
  });
}


export { swaggerSpec, swaggerUi, swaggerUiOptions, setupSwagger };
