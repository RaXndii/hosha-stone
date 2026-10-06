/**
 * The admin's only way to the server. Every call carries the session cookie
 * and, for anything that changes data, the X-HS-Admin header the server
 * requires. Failures come back as ApiError with a message written for the
 * owner and, for forms, the fields that need attention.
 */
export class ApiError extends Error {
  constructor(status, message, fields) {
    super(message)
    this.status = status
    this.fields = fields || {}
  }
}

const OFFLINE = 'Can’t reach the server. Check the connection — nothing was saved.'
let onUnauthorized = () => {}
export const setUnauthorizedHandler = (fn) => { onUnauthorized = fn }

async function request(method, path, body) {
  let res
  try {
    res = await fetch(`/api/admin${path}`, {
      method,
      credentials: 'same-origin',
      headers: {
        Accept: 'application/json',
        ...(method !== 'GET' ? { 'X-HS-Admin': '1' } : {}),
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
  } catch {
    throw new ApiError(0, OFFLINE)
  }
  let data = null
  try { data = await res.json() } catch { /* not json */ }
  if (!res.ok) {
    if (res.status === 401 && !path.startsWith('/login') && !path.startsWith('/setup')) onUnauthorized()
    throw new ApiError(res.status, data?.error || `The server answered ${res.status}.`, data?.fields)
  }
  return data
}

export const api = {
  get: (p) => request('GET', p),
  post: (p, b = {}) => request('POST', p, b),
  patch: (p, b) => request('PATCH', p, b),
  put: (p, b) => request('PUT', p, b),
  del: (p, b) => request('DELETE', p, b),
}

/** Multipart upload with progress (fetch cannot report upload progress). */
export function upload(path, formData, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', `/api/admin${path}`)
    xhr.withCredentials = true
    xhr.setRequestHeader('X-HS-Admin', '1')
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress?.(e.loaded / e.total)
    xhr.onerror = () => reject(new ApiError(0, OFFLINE))
    xhr.onload = () => {
      let data = null
      try { data = JSON.parse(xhr.responseText) } catch { /* not json */ }
      if (xhr.status === 401) onUnauthorized()
      if (xhr.status >= 200 && xhr.status < 300) resolve(data)
      else if (data?.results) resolve(data) // some photos failed; the results say which
      else reject(new ApiError(xhr.status, data?.error || 'The upload failed.', data?.fields))
    }
    xhr.send(formData)
  })
}
