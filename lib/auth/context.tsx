"use client"

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react"

export interface User {
  id: string
  email: string
  name: string
  createdAt: string
}

interface AuthContextType {
  user: User | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  register: (email: string, password: string, name: string) => Promise<{ success: boolean; error?: string }>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const AUTH_STORAGE_KEY = "formwise_auth_user"
const USERS_STORAGE_KEY = "formwise_users"

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const stored = localStorage.getItem(AUTH_STORAGE_KEY)
    if (stored) {
      try {
        setUser(JSON.parse(stored))
      } catch {
        localStorage.removeItem(AUTH_STORAGE_KEY)
      }
    }
    setIsLoading(false)
  }, [])

  const login = useCallback(async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 800))
    
    const usersStr = localStorage.getItem(USERS_STORAGE_KEY)
    const users: Array<User & { password: string }> = usersStr ? JSON.parse(usersStr) : []
    
    const foundUser = users.find(u => u.email === email && u.password === password)
    
    if (!foundUser) {
      return { success: false, error: "Invalid email or password" }
    }
    
    const { password: _, ...userWithoutPassword } = foundUser
    setUser(userWithoutPassword)
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(userWithoutPassword))
    
    return { success: true }
  }, [])

  const register = useCallback(async (email: string, password: string, name: string): Promise<{ success: boolean; error?: string }> => {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 800))
    
    const usersStr = localStorage.getItem(USERS_STORAGE_KEY)
    const users: Array<User & { password: string }> = usersStr ? JSON.parse(usersStr) : []
    
    if (users.some(u => u.email === email)) {
      return { success: false, error: "Email already registered" }
    }
    
    const newUser: User & { password: string } = {
      id: crypto.randomUUID(),
      email,
      name,
      password,
      createdAt: new Date().toISOString(),
    }
    
    users.push(newUser)
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users))
    
    const { password: _, ...userWithoutPassword } = newUser
    setUser(userWithoutPassword)
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(userWithoutPassword))
    
    return { success: true }
  }, [])

  const logout = useCallback(() => {
    setUser(null)
    localStorage.removeItem(AUTH_STORAGE_KEY)
  }, [])

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
