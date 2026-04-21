const BASE = "/api";

function getToken() {
  return localStorage.getItem("shuddhi_token");
}

function authHeaders() {
  const t = getToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
}

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...authHeaders(), ...options.headers },
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

/* ── Auth ── */
export async function login(password) {
  const data = await request("/auth/login", { method: "POST", body: { password } });
  localStorage.setItem("shuddhi_token", data.token);
  return data;
}

export function logout() {
  localStorage.removeItem("shuddhi_token");
}

export async function verifyToken() {
  try {
    await request("/auth/verify");
    return true;
  } catch {
    logout();
    return false;
  }
}

/* ── Projects ── */
export const getProjects   = ()     => request("/projects");
export const getProject    = (id)   => request(`/projects/${id}`);
export const createProject = (body) => request("/projects",      { method: "POST",   body });
export const updateProject = (id, body) => request(`/projects/${id}`, { method: "PUT", body });
export const deleteProject = (id)   => request(`/projects/${id}`, { method: "DELETE" });

/* ── Photos ── */
export const addPhoto    = (projectId, body) =>
  request(`/projects/${projectId}/photos`, { method: "POST", body });

export const deletePhoto = (projectId, photoId) =>
  request(`/projects/${projectId}/photos/${photoId}`, { method: "DELETE" });

export const updatePhoto = (projectId, photoId, body) =>
  request(`/projects/${projectId}/photos/${photoId}`, { method: "PATCH", body });
