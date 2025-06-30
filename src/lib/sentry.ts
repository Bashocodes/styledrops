import * as Sentry from "@sentry/react";
import { BrowserTracing } from "@sentry/tracing";

// Initialize Sentry
export const initSentry = () => {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  
  if (!dsn) {
    console.warn('Sentry DSN not found. Error tracking will be disabled.');
    return;
  }

  try {
    Sentry.init({
      dsn,
      integrations: [
        new BrowserTracing({
          // Set tracing origins to connect sentry for performance monitoring
          tracePropagationTargets: [
            "localhost",
            /^https:\/\/.*\.netlify\.app/,
            /^https:\/\/.*\.supabase\.co/,
          ],
        }),
      ],
      // Performance Monitoring
      tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0, // Reduce in production
      // Release Health
      autoSessionTracking: true,
      // Environment
      environment: import.meta.env.MODE,
      // Debug mode only in development
      debug: import.meta.env.DEV,
      // Capture unhandled promise rejections
      captureUnhandledRejections: true,
      // Additional options
      beforeSend(event, hint) {
        // Filter out development errors if needed
        if (import.meta.env.DEV) {
          console.log('Sentry Event:', event, hint);
        }
        return event;
      },
    });
  } catch (error) {
    console.error('Failed to initialize Sentry:', error);
  }
};

// Helper functions for manual error reporting
export const captureError = (error: Error, context?: Record<string, any>) => {
  try {
    Sentry.withScope((scope) => {
      if (context) {
        Object.keys(context).forEach(key => {
          scope.setTag(key, context[key]);
        });
      }
      Sentry.captureException(error);
    });
  } catch (sentryError) {
    console.error('Failed to capture error with Sentry:', sentryError);
    console.error('Original error:', error);
  }
};

export const captureMessage = (message: string, level: Sentry.SeverityLevel = 'info') => {
  try {
    Sentry.captureMessage(message, level);
  } catch (error) {
    console.error('Failed to capture message with Sentry:', error);
  }
};

export const setUserContext = (user: { id: string; email?: string; username?: string }) => {
  try {
    Sentry.setUser({
      id: user.id,
      email: user.email,
      username: user.username,
    });
  } catch (error) {
    console.error('Failed to set user context with Sentry:', error);
  }
};

export const addBreadcrumb = (message: string, category?: string, data?: Record<string, any>) => {
  try {
    Sentry.addBreadcrumb({
      message,
      category: category || 'custom',
      data,
      level: 'info',
    });
  } catch (error) {
    console.error('Failed to add breadcrumb with Sentry:', error);
  }
};