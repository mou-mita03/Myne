import * as Joi from "joi";

export const environmentValidationSchema = Joi.object({
  DATABASE_URL: Joi.string()
    .uri({ scheme: ["postgresql", "postgres"] })
    .required(),
  FIREBASE_PROJECT_ID: Joi.string().required(),
  FIREBASE_CLIENT_EMAIL: Joi.string().email().required(),
  FIREBASE_PRIVATE_KEY: Joi.string().required(),
  FRONTEND_ORIGIN: Joi.string().uri().default("http://localhost:3000"),
  PORT: Joi.number().port().default(3001),
});
