// Set required environment variables before any test modules are loaded
process.env.JWT_SECRET = "test-jwt-secret-at-least-32-characters-long!!";
process.env.JWT_REFRESH_SECRET = "test-refresh-secret-at-least-32-characters!!";
