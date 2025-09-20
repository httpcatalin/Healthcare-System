export type UserRole = "admin" | "doctor" | "nurse"

export interface User {
  id: string
  email: string
  name: string
  role: UserRole
  clinicId: string
  avatar?: string
}

export interface AuthState {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
}

// Mock authentication - in real app this would connect to your backend
export const mockUsers: User[] = [
  {
    id: "1",
    email: "admin@clinic.com",
    name: "Dr. Sarah Johnson",
    role: "admin",
    clinicId: "clinic-1",
    avatar: "/caring-doctor.png",
  },
  {
    id: "2",
    email: "doctor@clinic.com",
    name: "Dr. Michael Chen",
    role: "doctor",
    clinicId: "clinic-1",
    avatar: "/caring-doctor.png",
  },
  {
    id: "3",
    email: "nurse@clinic.com",
    name: "Nurse Emily Davis",
    role: "nurse",
    clinicId: "clinic-1",
    avatar: "/diverse-nurses-team.png",
  },
]

export const login = async (email: string, password: string): Promise<User> => {
  // Simulate API call
  await new Promise((resolve) => setTimeout(resolve, 1000))

  const user = mockUsers.find((u) => u.email === email)
  if (!user || password !== "password123") {
    throw new Error("Invalid credentials")
  }

  // Store in localStorage for persistence
  localStorage.setItem("healthcare_user", JSON.stringify(user))
  return user
}

export const logout = async (): Promise<void> => {
  localStorage.removeItem("healthcare_user")
}

export const getCurrentUser = (): User | null => {
  if (typeof window === "undefined") return null

  const stored = localStorage.getItem("healthcare_user")
  return stored ? JSON.parse(stored) : null
}

export const hasPermission = (user: User | null, requiredRole: UserRole[]): boolean => {
  if (!user) return false
  return requiredRole.includes(user.role)
}
