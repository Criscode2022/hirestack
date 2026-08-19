import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Response } from 'express';
import { ILLEGAL_TRANSITION } from '@hirestack/shared';

@Catch()
export class HttpErrorFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    if (exception instanceof Error && exception.name === ILLEGAL_TRANSITION) {
      response.status(HttpStatus.CONFLICT).json({
        statusCode: 409,
        error: ILLEGAL_TRANSITION,
        message: exception.message,
      });
      return;
    }
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const payload = exception.getResponse();
      const body =
        typeof payload === 'string'
          ? { message: payload }
          : (payload as { message?: string | string[]; error?: string; details?: unknown });
      response.status(status).json({
        statusCode: status,
        error: body.error ?? exception.name,
        message: Array.isArray(body.message) ? body.message.join(', ') : (body.message ?? exception.message),
        details: body.details,
      });
      return;
    }
    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: 500,
      error: 'Internal Server Error',
      message: 'Unexpected error',
    });
  }
}
