export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

async function request<T>(method: string, url: string, body?: unknown): Promise<T> {
  const res = await fetch(`/api${url}`, {
    method,
    credentials: 'include',
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const e = data?.error ?? {};
    throw new ApiError(res.status, e.code ?? 'ERROR', e.message ?? `Request failed (${res.status})`, e.details);
  }
  return data as T;
}

export const api = {
  get: <T>(url: string) => request<T>('GET', url),
  post: <T>(url: string, body?: unknown) => request<T>('POST', url, body ?? {}),
  put: <T>(url: string, body: unknown) => request<T>('PUT', url, body),
  patch: <T>(url: string, body: unknown) => request<T>('PATCH', url, body),
  del: <T = void>(url: string) => request<T>('DELETE', url),

  /** Multipart upload with progress (XHR, since fetch has no upload progress). */
  upload<T>(url: string, files: File[], fields: Record<string, string>, onProgress?: (pct: number) => void): Promise<T> {
    return new Promise((resolve, reject) => {
      const form = new FormData();
      Object.entries(fields).forEach(([k, v]) => form.append(k, v)); // fields before files
      files.forEach((f) => form.append('files', f));
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `/api${url}`);
      xhr.withCredentials = true;
      xhr.upload.onprogress = (e) => e.lengthComputable && onProgress?.(Math.round((e.loaded / e.total) * 100));
      xhr.onload = () => {
        let data: { error?: { code?: string; message?: string } } = {};
        try {
          data = JSON.parse(xhr.responseText);
        } catch {
          /* empty */
        }
        if (xhr.status >= 200 && xhr.status < 300) resolve(data as T);
        else reject(new ApiError(xhr.status, data.error?.code ?? 'UPLOAD', data.error?.message ?? 'Upload failed'));
      };
      xhr.onerror = () => reject(new ApiError(0, 'NETWORK', 'Network error during upload'));
      xhr.send(form);
    });
  },
};

export const fileUrl = (id: string, inline = false) => `/api/files/${id}/download${inline ? '?inline=1' : ''}`;

export function errorMessage(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error) return err.message;
  return 'Something went wrong';
}
