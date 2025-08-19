// swagger.js
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
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
        name: 'KYC',
        description: 'Know Your Customer document verification endpoints'
      },
      {
        name: 'Certifications',
        description: 'Certification management and search endpoints'
      },
      {
        name: 'Experiences',
        description: 'Work experience management endpoints'
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
        User: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
              example: '64f123abc456def789012345'
            },
            fullName: {
              type: 'string',
              example: 'John Doe'
            },
            email: {
              type: 'string',
              format: 'email',
              example: 'john@example.com'
            },
            phone: {
              type: 'string',
              example: '03001234567'
            },
            role: {
              type: 'string',
              enum: ['student', 'school', 'employer', 'admin'],
              example: 'student'
            },
            onboardingStage: {
              type: 'string',
              enum: ['basic_info', 'profile_setup', 'verification', 'completed'],
              example: 'basic_info'
            },
            status: {
              type: 'string',
              enum: ['active', 'inactive', 'suspended', 'pending'],
              example: 'active'
            },
            createdAt: {
              type: 'string',
              format: 'date-time'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time'
            }
          }
        },
        Course: {
          type: 'object',
          properties: {
            _id: {
              type: 'string',
              example: '64f456def789abc123456789'
            },
            title: {
              type: 'string',
              example: 'Web Development Fundamentals'
            },
            instructor: {
              type: 'string',
              example: 'John Doe'
            },
            duration: {
              type: 'string',
              example: '8 weeks'
            },
            price: {
              type: 'number',
              example: 299.99
            },
            language: {
              type: 'string',
              example: 'English'
            },
            type: {
              type: 'string',
              enum: ['online', 'offline', 'hybrid'],
              example: 'online'
            },
            description: {
              type: 'string',
              example: 'Learn the fundamentals of web development'
            },
            objectives: {
              type: 'array',
              items: {
                type: 'string'
              },
              example: ['Learn HTML', 'Learn CSS', 'Learn JavaScript']
            },
            skills: {
              type: 'array',
              items: {
                type: 'string'
              },
              example: ['Frontend Development', 'Responsive Design']
            },
            category: {
              type: 'string',
              example: 'Technology'
            },
            status: {
              type: 'string',
              enum: ['draft', 'pending_approval', 'approved', 'rejected', 'archived'],
              example: 'approved'
            },
            providerId: {
              type: 'string',
              example: '64f789abc123def456789012'
            },
            createdAt: {
              type: 'string',
              format: 'date-time'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time'
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
              example: '64f890abc123def456789013'
            },
            createdAt: {
              type: 'string',
              format: 'date-time'
            },
            updatedAt: {
              type: 'string',
              format: 'date-time'
            }
          }
        },
        ApiResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: true
            },
            statusCode: {
              type: 'integer',
              example: 200
            },
            data: {
              type: 'object',
              description: 'Response data (varies by endpoint)'
            },
            message: {
              type: 'string',
              example: 'Operation completed successfully'
            }
          }
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            success: {
              type: 'boolean',
              example: false
            },
            statusCode: {
              type: 'integer',
              example: 400
            },
            message: {
              type: 'string',
              example: 'Validation error or operation failed'
            },
            errors: {
              type: 'array',
              items: {
                type: 'string'
              },
              description: 'Detailed error messages (optional)'
            }
          }
        },
        PaginationInfo: {
          type: 'object',
          properties: {
            page: {
              type: 'integer',
              example: 1
            },
            limit: {
              type: 'integer',
              example: 20
            },
            total: {
              type: 'integer',
              example: 150
            },
            totalPages: {
              type: 'integer',
              example: 8
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
                message: 'Access denied'
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
      const order = ["Users", "Courses", "Training Providers"];
      return order.indexOf(a) - order.indexOf(b);
    }
  }
};

function setupSwagger(app) {
  // Serve raw OpenAPI JSON
  app.get('/swagger.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });

  // Serve CDN-based Swagger UI HTML to avoid asset issues on Vercel
  app.get('/docs', (_req, res) => {
    const html = `<!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Talent Bridge API Documentation</title>
      <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist/swagger-ui.css" />
      <style>.swagger-ui .topbar { display: none }</style>
    </head>
    <body>
      <div id="swagger-ui"></div>
      <script src="https://unpkg.com/swagger-ui-dist/swagger-ui-bundle.js"></script>
      <script>
        window.onload = function () {
          SwaggerUIBundle({
            url: '/swagger.json',
            dom_id: '#swagger-ui',
            presets: [SwaggerUIBundle.presets.apis],
            layout: 'BaseLayout',
            tagsSorter: function(a, b) {
              const order = ["Users", "Courses", "Training Providers", "Subscription Plans", "Subscriptions", "Payments", "Webhooks", "Notifications"];
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
