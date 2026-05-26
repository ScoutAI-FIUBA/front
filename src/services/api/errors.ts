export async function parseApiError(response: Response): Promise<string> {
  const text = await response.text()
  if (!text) return response.statusText || 'Error de servidor'

  try {
    const data = JSON.parse(text) as {
      error?: { message?: string; code?: string }
      detail?: string | { msg: string; loc?: string[] }[]
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
