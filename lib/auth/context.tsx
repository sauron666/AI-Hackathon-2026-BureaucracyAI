"use client"

/**
 * Auth context.
 *
 * Two backends:
 *   - "supabase": real auth, server-side sessions, secure password storage
 *   - "local":    localStorage fallback for hackathon-style demos
 *
 * The choice is made at module load by checking the public Supabase env vars.
 * Once you set NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY, the
 * app automatically uses Supabase. No code changes needed.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react"
import { getBrowserSupabase } from "@/lib/supabase/client"

export interface User {
  id: string
  email: string
  name: string
  createdAt: string
}

interface AuthContextType {
  user: User | null
  isLoading: boolean
  /** Which backend is in use. Useful for tests + Settings UI surface. */
  backend: "supabase" | "local"
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  register: (email: string, password: string, name: string) => Promise<{ success: boolean; error?: string }>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const AUTH_STORAGE_KEY = "formwise_auth_user"
const USERS_STORAGE_KEY = "formwise_users"

const supabaseConfigured =
  typeof window !== "undefined" &&
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // ----------- Supabase backend -----------
  useEffect(() => {
    if (!supabaseConfigured) return
    const supabase = getBrowserSupabase()
    if (!supabase) return

    let mounted = true

    const hydrate = async () => {
      const { data } = await supabase.auth.getUser()
      if (!mounted) return
      if (data.user) {
        setUser({
          id: data.user.id,
          email: data.user.email ?? "",
          name:
            (data.user.user_metadata?.name as string | undefined) ??
            data.user.email?.split("@")[0] ??
            "",
          createdAt: data.user.created_at ?? new Date().toISOString(),
        })
      } else {
        setUser(null)
      }
      setIsLoading(false)
    }

    hydrate()

    const { data: subscription } = supabase.auth.onAuthStateChange(
      (_event: string, session: { user?: { id: string; email?: string; user_metadata?: { name?: string }; created_at?: string } } | null) => {
        if (!session?.user) {
          setUser(null)
          return
        }
        setUser({
          id: session.user.id,
          email: session.user.email ?? "",
          name:
            (session.user.user_metadata?.name as string | undefined) ??
            session.user.email?.split("@")[0] ??
            "",
          createdAt: session.user.created_at ?? new Date().toISOString(),
        })
      },
    )

    return () => {
      mounted = false
      subscription.subscription.unsubscribe()
    }
  }, [])

  // ----------- localStorage backend -----------
  useEffect(() => {
    if (supabaseConfigured) return
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

  const login = useCallback(
    async (email: string, password: string) => {
      if (supabaseConfigured) {
        const supabase = getBrowserSupabase()
        if (!supabase) return { success: false, error: "Auth not available" }
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (error) return { success: false, error: error.message }
        if (!data.user) return { success: false, error: "No user returned" }
        return { success: true }
      }

      // Local fallback
      await new Promise((resolve) => setTimeout(resolve, 600))
      const usersStr = localStorage.getItem(USERS_STORAGE_KEY)
      const users: Array<User & { password: string }> = usersStr
        ? JSON.parse(usersStr)
        : []
      const found = users.find((u) => u.email === email && u.password === password)
      if (!found) return { success: false, error: "Invalid email or password" }
      const { password: _, ...rest } = found
      setUser(rest)
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(rest))
      return { success: true }
    },
    [],
  )

  const register = useCallback(
    async (email: string, password: string, name: string) => {
      if (supabaseConfigured) {
        const supabase = getBrowserSupabase()
        if (!supabase) return { success: false, error: "Auth not available" }
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { name } },
        })
        if (error) return { success: false, error: error.message }
        if (!data.user) {
          return {
            success: false,
            error: "Check your email to confirm the account",
          }
        }
        return { success: true }
      }

      // Local fallback
      await new Promise((resolve) => setTimeout(resolve, 600))
      const usersStr = localStorage.getItem(USERS_STORAGE_KEY)
      const users: Array<User & { password: string }> = usersStr
        ? JSON.parse(usersStr)
        : []
      if (users.some((u) => u.email === email)) {
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
      const { password: _, ...rest } = newUser
      setUser(rest)
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(rest))
      return { success: true }
    },
    [],
  )

  const logout = useCallback(async () => {
    if (supabaseConfigured) {
      const supabase = getBrowserSupabase()
      if (supabase) await supabase.auth.signOut()
    }
    setUser(null)
    localStorage.removeItem(AUTH_STORAGE_KEY)
  }, [])

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        backend: supabaseConfigured ? "supabase" : "local",
        login,
        register,
        logout,
      }}
    >
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
