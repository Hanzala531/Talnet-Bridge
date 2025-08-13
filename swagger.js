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
          ? 'https://your-vercel-app.vercel.app' // Change to your Vercel deployment URL
          : 'http://localhost:4000',
        description: process.env.NODE_ENV === 'production'
          ? 'Production server'
          : 'Development server'
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
    ]
  }
};

// Function to set up Swagger routes
function setupSwagger(app) {
  // Serve swagger.json
  app.get('/swagger.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });

  // Serve Swagger UI
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, swaggerUiOptions));
}

export { swaggerSpec, swaggerUi, swaggerUiOptions, setupSwagger };
