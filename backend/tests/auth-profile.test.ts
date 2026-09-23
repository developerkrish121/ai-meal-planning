import crypto from 'node:crypto';

import bcrypt from 'bcryptjs';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { app } from '../src/app.js';
import { prisma } from '../src/config/prisma.js';

const email = `day4-${crypto.randomUUID()}@example.com`;
const password = 'StrongPassword123!';
let accessToken = '';

describe('authentication and profile API', () => {
  beforeAll(async () => {
    await prisma.user.deleteMany({ where: { email } });
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email } });
    await prisma.$disconnect();
  });

  describe('registration', () => {
    it('registers a user with a normalized email and hashed password', async () => {
      const response = await request(app).post('/api/auth/register').send({
        email: email.toUpperCase(),
        password,
      });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user.email).toBe(email);
      expect(response.body.data.user).not.toHaveProperty('passwordHash');

      const storedUser = await prisma.user.findUniqueOrThrow({ where: { email } });
      expect(storedUser.passwordHash).not.toBe(password);
      expect(await bcrypt.compare(password, storedUser.passwordHash)).toBe(true);
    });

    it('rejects a duplicate email', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({ email, password });

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
    });

    it('rejects an invalid email', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({ email: 'not-an-email', password });

      expect(response.status).toBe(400);
    });

    it('rejects a short password', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({ email: 'short-password@example.com', password: 'short' });

      expect(response.status).toBe(400);
    });
  });

  describe('login', () => {
    it('logs in with valid credentials', async () => {
      const response = await request(app).post('/api/auth/login').send({ email, password });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.user).not.toHaveProperty('passwordHash');
      expect(response.body.data.accessToken).toEqual(expect.any(String));
      accessToken = response.body.data.accessToken;
    });

    it('rejects a wrong password with a generic message', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ email, password: 'IncorrectPassword123!' });

      expect(response.status).toBe(401);
      expect(response.body.message).toBe('Invalid email or password');
    });

    it('rejects an unknown user with the same generic message', async () => {
      const response = await request(app).post('/api/auth/login').send({
        email: `unknown-${crypto.randomUUID()}@example.com`,
        password,
      });

      expect(response.status).toBe(401);
      expect(response.body.message).toBe('Invalid email or password');
    });
  });

  describe('authentication middleware', () => {
    it('rejects a missing token', async () => {
      const response = await request(app).get('/api/profile');

      expect(response.status).toBe(401);
      expect(response.body).toEqual({ success: false, message: 'Authentication required' });
    });

    it('rejects an invalid token', async () => {
      const response = await request(app)
        .get('/api/profile')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
      expect(response.body.message).toBe('Invalid or expired token');
    });

    it('accepts a valid token', async () => {
      const response = await request(app)
        .get('/api/profile')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
    });
  });

  describe('profile', () => {
    it('rejects unauthenticated profile updates', async () => {
      const response = await request(app).put('/api/profile').send({ age: 30 });

      expect(response.status).toBe(401);
    });

    it('creates the authenticated profile', async () => {
      const response = await request(app)
        .put('/api/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          age: 30,
          gender: 'prefer-not-to-say',
          height: 175.5,
          weight: 70.25,
          activityLevel: 'moderately-active',
          fitnessGoal: 'general wellness',
          dietPreference: 'vegetarian',
          allergies: ['peanuts'],
          dietaryRestrictions: ['gluten-free'],
        });

      expect(response.status).toBe(200);
      expect(response.body.data.profile.age).toBe(30);
      expect(response.body.data.profile.user.email).toBe(email);
      expect(response.body.data.profile.user).not.toHaveProperty('passwordHash');
    });

    it('retrieves the authenticated profile', async () => {
      const response = await request(app)
        .get('/api/profile')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.profile.allergies).toEqual(['peanuts']);
      expect(response.body.data.user.email).toBe(email);
      expect(response.body.data.user).not.toHaveProperty('passwordHash');
    });

    it('updates the authenticated profile', async () => {
      const response = await request(app)
        .put('/api/profile')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ age: 31, allergies: [] });

      expect(response.status).toBe(200);
      expect(response.body.data.profile.age).toBe(31);
      expect(response.body.data.profile.allergies).toEqual([]);
    });
  });
});
