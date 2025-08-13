import swaggerJsdoc from 'swagger-jsdoc';
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
          ? 'https://talnet-bridge.vercel.app/'
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

export default swaggerSpec;
