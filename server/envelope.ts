import type { Response } from "express";

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function ok<T>(res: Response, data: T, status = 200) {
  return res.status(status).json({
    success: true,
    data,
  });
}

export function fail(res: Response, status: number, code: string, message: string) {
  return res.status(status).json({
    success: false,
    error: {
      code,
      message,
    },
  });
}
