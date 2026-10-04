import { ApiNetworkError, ApiResponseError, ApiTimeoutError } from '../../services/api/errors.ts'

export const INVALID_CREDENTIALS_MESSAGE = 'El correo o la contraseña no son correctos.'
export const LOGIN_NETWORK_MESSAGE =
  'No pudimos conectarnos. Revisá tu conexión e intentá nuevamente.'
export const LOGIN_SERVER_MESSAGE =
  'No pudimos iniciar sesión por un problema del servidor. Intentá nuevamente en unos minutos.'
export const LOGIN_FALLBACK_MESSAGE = 'No pudimos iniciar sesión. Intentá nuevamente.'

export function loginErrorMessage(error: unknown): string {
  if (error instanceof ApiResponseError && error.status === 401) {
    return INVALID_CREDENTIALS_MESSAGE
  }
  if (error instanceof ApiTimeoutError) return error.message
  if (error instanceof ApiNetworkError) return LOGIN_NETWORK_MESSAGE
  if (error instanceof ApiResponseError && error.status >= 500) return LOGIN_SERVER_MESSAGE
  return LOGIN_FALLBACK_MESSAGE
}

export function googleLoginErrorMessage(error: unknown): string {
  if (error instanceof ApiTimeoutError) return error.message
  if (error instanceof ApiNetworkError) return LOGIN_NETWORK_MESSAGE
  if (error instanceof ApiResponseError && error.status >= 500) return LOGIN_SERVER_MESSAGE
  return 'No pudimos iniciar sesión con Google. Intentá nuevamente.'
}
