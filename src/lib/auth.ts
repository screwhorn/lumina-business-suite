// Simple authentication system for demo
// In production, this would use proper JWT/session management

const ADMIN_PASSWORD = "admin123"; // In production, this would be hashed

interface User {
  id: string;
  username: string;
  role: string;
}

export const login = (password: string): User | null => {
  if (password === ADMIN_PASSWORD) {
    const user = { id: "admin", username: "Administrator", role: "admin" };
    localStorage.setItem("user", JSON.stringify(user));
    return user;
  }
  return null;
};

export const logout = (): void => {
  localStorage.removeItem("user");
};

export const getCurrentUser = (): User | null => {
  const userStr = localStorage.getItem("user");
  if (userStr) {
    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  }
  return null;
};

export const isAuthenticated = (): boolean => {
  return getCurrentUser() !== null;
};