export function getToken() {
  return localStorage.getItem("token");
}

export function getRole() {
  return localStorage.getItem("role");
}

export function logout() {
  localStorage.removeItem("token");
  localStorage.removeItem("role");
  window.location.href = "/";
}

