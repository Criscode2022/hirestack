import { Injectable, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { proxyToUpstream, shouldProxyPath, shouldUseUpstream } from './upstream';

@Injectable()
export class UpstreamProxyMiddleware implements NestMiddleware {
  async use(req: Request, res: Response, next: NextFunction) {
    if (!shouldUseUpstream() || !shouldProxyPath(req.originalUrl)) {
      next();
      return;
    }
    try {
      await proxyToUpstream(req, res);
    } catch (error) {
      if (res.headersSent) {
        return;
      }
      res.status(502).json({
        statusCode: 502,
        error: 'Bad Gateway',
        message: error instanceof Error ? error.message : 'Upstream API is unavailable',
      });
    }
  }
}
