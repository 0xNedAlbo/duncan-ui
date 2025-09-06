import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from './route';
import bcrypt from 'bcryptjs';

// Mock bcrypt
vi.mock('bcryptjs', () => ({
  default: {
    hash: vi.fn(),
  },
}));

// Mock Prisma
const mockPrisma = {
  user: {
    findUnique: vi.fn(),
    create: vi.fn(),
  },
};

vi.mock('@/lib/prisma', () => ({
  prisma: mockPrisma,
}));

describe('/api/auth/register', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('POST', () => {
    const createRequest = (body: any) => {
      return new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
    };

    it('should successfully create a new user', async () => {
      const mockUser = {
        id: 'user123',
        email: 'test@example.com',
        password: 'hashedPassword123',
        name: 'Test User',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.user.findUnique.mockResolvedValue(null); // User doesn't exist
      vi.mocked(bcrypt.hash).mockResolvedValue('hashedPassword123');
      mockPrisma.user.create.mockResolvedValue(mockUser);

      const request = createRequest({
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe('Benutzer erfolgreich erstellt');
      expect(data.user).toEqual({
        id: 'user123',
        email: 'test@example.com',
        name: 'Test User',
        createdAt: mockUser.createdAt,
        updatedAt: mockUser.updatedAt,
      });
      expect(data.user.password).toBeUndefined(); // Password should be removed
      
      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 12);
      expect(mockPrisma.user.create).toHaveBeenCalledWith({
        data: {
          email: 'test@example.com',
          password: 'hashedPassword123',
          name: 'Test User',
        },
      });
    });

    it('should successfully create user without name', async () => {
      const mockUser = {
        id: 'user123',
        email: 'test@example.com',
        password: 'hashedPassword123',
        name: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.user.findUnique.mockResolvedValue(null);
      vi.mocked(bcrypt.hash).mockResolvedValue('hashedPassword123');
      mockPrisma.user.create.mockResolvedValue(mockUser);

      const request = createRequest({
        email: 'test@example.com',
        password: 'password123',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.user.name).toBeNull();
      expect(mockPrisma.user.create).toHaveBeenCalledWith({
        data: {
          email: 'test@example.com',
          password: 'hashedPassword123',
          name: null,
        },
      });
    });

    it('should return 400 when email is missing', async () => {
      const request = createRequest({
        password: 'password123',
        name: 'Test User',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Email und Passwort sind erforderlich');
      expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
    });

    it('should return 400 when password is missing', async () => {
      const request = createRequest({
        email: 'test@example.com',
        name: 'Test User',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Email und Passwort sind erforderlich');
      expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
    });

    it('should return 400 when both email and password are missing', async () => {
      const request = createRequest({
        name: 'Test User',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Email und Passwort sind erforderlich');
    });

    it('should return 400 when user already exists', async () => {
      const existingUser = {
        id: 'existing123',
        email: 'test@example.com',
        password: 'hashedPassword',
        name: 'Existing User',
      };

      mockPrisma.user.findUnique.mockResolvedValue(existingUser);

      const request = createRequest({
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Ein Benutzer mit dieser E-Mail-Adresse existiert bereits');
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
      expect(bcrypt.hash).not.toHaveBeenCalled();
      expect(mockPrisma.user.create).not.toHaveBeenCalled();
    });

    it('should handle database errors during user lookup', async () => {
      mockPrisma.user.findUnique.mockRejectedValue(new Error('Database connection failed'));

      const request = createRequest({
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Ein Fehler ist aufgetreten');
    });

    it('should handle database errors during user creation', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      vi.mocked(bcrypt.hash).mockResolvedValue('hashedPassword123');
      mockPrisma.user.create.mockRejectedValue(new Error('Database write failed'));

      const request = createRequest({
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Ein Fehler ist aufgetreten');
    });

    it('should handle bcrypt hashing errors', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      vi.mocked(bcrypt.hash).mockRejectedValue(new Error('Hashing failed'));

      const request = createRequest({
        email: 'test@example.com',
        password: 'password123',
        name: 'Test User',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Ein Fehler ist aufgetreten');
    });

    it('should handle invalid JSON in request body', async () => {
      const request = new NextRequest('http://localhost:3000/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: 'invalid-json',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Ein Fehler ist aufgetreten');
    });

    it('should handle empty request body', async () => {
      const request = createRequest({});

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Email und Passwort sind erforderlich');
    });

    it('should handle empty string values', async () => {
      const request = createRequest({
        email: '',
        password: '',
        name: 'Test User',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Email und Passwort sind erforderlich');
    });
  });
});