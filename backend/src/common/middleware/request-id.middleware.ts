import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { NextFunction, Request, Response } from 'express';

export const REQUEST_ID_HEADER = 'X-Request-Id';

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  private readonly logger = new Logger(RequestIdMiddleware.name);

  use(request: Request, response: Response, next: NextFunction): void {
    const requestId = request.header(REQUEST_ID_HEADER) ?? randomUUID();
    request.headers[REQUEST_ID_HEADER.toLowerCase()] = requestId;
    response.setHeader(REQUEST_ID_HEADER, requestId);
    const startedAt = Date.now();

    response.on('finish', () => {
      this.logger.log({
        requestId,
        method: request.method,
        path: request.originalUrl,
        statusCode: response.statusCode,
        durationMs: Date.now() - startedAt,
      });
    });

    next();
  }
}
