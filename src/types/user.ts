/**
 * User Type Definitions
 *
 * Types for user profiles and settings.
 */

/**
 * User profile data
 */
export interface UserProfile {
  id: string;
  email: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * User settings and preferences
 */
export interface UserSettings {
  language: 'en' | 'de';
  theme: 'dark' | 'light';
  notifications: {
    email: boolean;
    browser: boolean;
    positionAlerts: boolean;
  };
  defaultChain: string;
  defaultCurrency: string;
}
