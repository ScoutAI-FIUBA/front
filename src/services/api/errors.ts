export class ApiResponseError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiResponseError'
    this.status = status
  }
}

export function isApiErrorStatus(error: unknown, status: number): boolean {
  return error instanceof ApiResponseError && error.status === status
}

export async function parseApiError(response: Response): Promise<string> {
  const text = await response.text()
  if (!text) return response.statusText || 'Error de servidor'

  try {
    const data = JSON.parse(text) as {
      error?: { message?: string; code?: string }
      detail?: string | { msg: string; loc?: string[] }[]
    }

    if (data.error?.code === 'INVALID_CLIP_RANGE') {
      return 'El rango del clip no es válido. Debe durar como máximo 30 segundos y quedar dentro del video.'
    }

    if (data.error?.code === 'CLIP_EXPORT_FAILED') {
      return 'No se pudo preparar la descarga del clip. Intentá nuevamente.'
    }

    if (data.error?.message) return data.error.message

    if (typeof data.detail === 'string') return data.detail

    if (Array.isArray(data.detail)) {
      return data.detail.map((item) => item.msg).join('. ')
    }
  } catch {
    /* plain text body */
  }

  return text
}
