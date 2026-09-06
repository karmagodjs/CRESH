import {
  DocumentListResponse,
  DocumentResponse,
  HealthResponse,
  MetricsResponse,
  QueryRequest,
  QueryResponse,
  ReadinessResponse,
} from "./types";

export function getApiBaseUrl(): string {
  if (typeof window !== "undefined" && (window as any).__CRI_API_URL__) {
    return (window as any).__CRI_API_URL__;
  }
  return process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";
}

export class ApiError extends Error {
  status: number;
  data: any;

  constructor(status: number, message: string, data?: any) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const baseUrl = getApiBaseUrl().replace(/\/+$/, "");
  const url = `${baseUrl}${endpoint}`;

  const res = await fetch(url, {
    ...options,
    headers: {
      Accept: "application/json",
      ...options?.headers,
    },
  });

  if (!res.ok) {
    let errorDetail = `Request failed with status ${res.status}`;
    let errorData = null;
    try {
      errorData = await res.json();
      if (errorData.detail) {
        errorDetail = typeof errorData.detail === "string" ? errorData.detail : JSON.stringify(errorData.detail);
      }
    } catch {
      // ignore json parse error
    }
    throw new ApiError(res.status, errorDetail, errorData);
  }

  return res.json() as Promise<T>;
}

export async function fetchDocuments(): Promise<DocumentListResponse> {
  return request<DocumentListResponse>("/documents");
}

export async function uploadDocument(file: File): Promise<DocumentResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const baseUrl = getApiBaseUrl().replace(/\/+$/, "");
  const res = await fetch(`${baseUrl}/documents/upload`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    let detail = `Upload failed with status ${res.status}`;
    try {
      const err = await res.json();
      if (err.detail) detail = err.detail;
    } catch {}
    throw new ApiError(res.status, detail);
  }

  return res.json();
}

export async function deleteDocument(documentId: string): Promise<{ status: string; message: string; deleted_document_id: string }> {
  return request<{ status: string; message: string; deleted_document_id: string }>(`/documents/${documentId}`, {
    method: "DELETE",
  });
}

export async function executeQuery(req: QueryRequest): Promise<QueryResponse> {
  return request<QueryResponse>("/query", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(req),
  });
}

export async function fetchHealth(): Promise<HealthResponse> {
  return request<HealthResponse>("/health");
}

export async function fetchReadiness(): Promise<ReadinessResponse> {
  return request<ReadinessResponse>("/ready");
}

export async function fetchMetrics(): Promise<MetricsResponse> {
  return request<MetricsResponse>("/metrics");
}
