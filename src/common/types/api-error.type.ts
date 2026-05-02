// src/common/types/api-error.type.ts
export interface ApiErrorResponse {
  success: false;
  statusCode: number;
  error: string;
  message: string | string[];
  path: string;
  //   timestamp: string;
}
