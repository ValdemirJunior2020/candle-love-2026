import { ApiError } from '@/services/api';
export function errorMessage(error: unknown) { return error instanceof ApiError || error instanceof Error ? error.message : 'Something went wrong.'; }
