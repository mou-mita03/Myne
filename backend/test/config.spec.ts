import { envValidationSchema } from '../src/config/env.validation';

describe('environment configuration', () => {
  it('rejects missing required variables', () => {
    const { error } = envValidationSchema.validate({});

    expect(error).toBeDefined();
    expect(error?.details[0].path[0]).toBe('DATABASE_URL');
  });

  it('accepts the documented environment shape', () => {
    const { error, value } = envValidationSchema.validate({
      DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/myne',
      FIREBASE_PROJECT_ID: 'my-project',
      FIREBASE_CLIENT_EMAIL: 'firebase-adminsdk@my-project.iam.gserviceaccount.com',
      FIREBASE_PRIVATE_KEY: 'private-key',
      NODE_ENV: 'test',
      PORT: 3000,
    });

    expect(error).toBeUndefined();
    expect(value.PORT).toBe(3000);
  });
});
