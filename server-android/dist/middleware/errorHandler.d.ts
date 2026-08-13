import { Request, Response, NextFunction } from 'express';
/**
 * Global error handler middleware
 */
export declare const errorHandler: (err: any, _req: Request, res: Response, _next: NextFunction) => void;
/**
 * Custom API error class
 */
export declare class ApiError extends Error {
    statusCode: number;
    constructor(statusCode: number, message: string);
}
//# sourceMappingURL=errorHandler.d.ts.map