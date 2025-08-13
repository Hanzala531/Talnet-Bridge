import swaggerJSDoc from 'swagger-jsdoc';

const swaggerDefinition = {
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
      url: 'http://localhost:4000',
      description: 'Development server'
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
};

const options = {
  swaggerDefinition,
  // Path to the API docs (controllers with JSDoc comments)
  apis: ['./src/routes/*.js', './src/controllers/*.js', './src/models/*.js'],
};

const swaggerSpec = swaggerJSDoc(options);

export default swaggerSpec;
