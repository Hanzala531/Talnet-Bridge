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
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
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
