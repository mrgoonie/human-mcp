import type { Request, Response, NextFunction } from "express";
import type { SecurityConfig } from "../types.js";

export function createSecurityMiddleware(config?: SecurityConfig) {
  return async (req: Request, res: Response, next: NextFunction) => {
    // DNS Rebinding Protection
    if (config?.enableDnsRebindingProtection) {
      const host = req.headers.host?.split(':')[0];
      const allowedHosts = config.allowedHosts || ['127.0.0.1', 'localhost'];
      
      if (host && !allowedHosts.includes(host)) {
        res.status(403).json({
          error: 'Forbidden: Invalid host'
        });
        return;
      }
    }

    // Rate Limiting (basic implementation)
    if (config?.enableRateLimiting) {
      // Implement rate limiting logic here
      // Could use express-rate-limit package
    }

    // Secret-based authentication (optional)
    if (config?.secret) {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({
          error: 'Unauthorized: Missing authentication'
        });
        return;
      }
      
      const token = authHeader.substring(7);
      if (token !== config.secret) {
        res.status(401).json({
          error: 'Unauthorized: Invalid token'
        });
        return;
      }
    }

    next();
  };
}