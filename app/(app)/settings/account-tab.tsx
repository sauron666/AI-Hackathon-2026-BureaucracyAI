"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/lib/auth/context"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { AlertTriangle, LogOut, Trash2 } from "lucide-react"

export function AccountTab() {
  const { user, logout } = useAuth()
  const router = useRouter()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [name, setName] = useState(user?.name || "")
  const [email, setEmail] = useState(user?.email || "")

  const handleLogout = async () => {
    await logout()
    router.push("/")
  }

  const handleDelete = async () => {
    // Phase 2: server endpoint /api/account/delete handles Supabase deletion.
    // For local fallback we just clear localStorage.
    try {
      const res = await fetch("/api/account/delete", { method: "DELETE" })
      if (!res.ok) {
        // local fallback
        if (typeof window !== "undefined") {
          const usersStr = localStorage.getItem("formwise_users")
          if (usersStr && user) {
            const users = JSON.parse(usersStr) as Array<{ email: string }>
            const filtered = users.filter((u) => u.email !== user.email)
            localStorage.setItem("formwise_users", JSON.stringify(filtered))
          }
        }
      }
    } catch {
      // network error — best-effort local cleanup
      if (typeof window !== "undefined") {
        const usersStr = localStorage.getItem("formwise_users")
        if (usersStr && user) {
          const users = JSON.parse(usersStr) as Array<{ email: string }>
          const filtered = users.filter((u) => u.email !== user.email)
          localStorage.setItem("formwise_users", JSON.stringify(filtered))
        }
      }
    }
    await logout()
    toast.success("Account deleted")
    router.push("/")
  }

  if (!user) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-muted-foreground">
          Sign in to manage your account.
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>
            Account info shown on your dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Display name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full sm:w-[420px]"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full sm:w-[420px]"
            />
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="outline">Phase 1</Badge>
            <span>
              Edit-on-server lands with real backend auth (Phase 2). For now, name/email
              are read from local storage.
            </span>
          </div>
          <Button disabled className="gap-2">
            Save (Phase 2)
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Password</CardTitle>
          <CardDescription>
            Phase 1 stores credentials in localStorage. Real password change requires the
            backend auth from Phase 2.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-amber-500/40 bg-amber-50 p-3 text-sm dark:bg-amber-950/20">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 mt-0.5 text-amber-600" />
              <div className="space-y-1">
                <p className="font-medium">Insecure auth (development only)</p>
                <p className="text-xs text-muted-foreground">
                  Current passwords are kept in <code>localStorage</code>. This is fine
                  for local dev but unsuitable for production. Phase 2 swaps in proper
                  Argon2id hashing + HttpOnly session cookies.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sign out</CardTitle>
          <CardDescription>End the session on this device.</CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={handleLogout} className="gap-2">
            <LogOut className="h-4 w-4" /> Sign out
          </Button>
        </CardContent>
      </Card>

      <Separator />

      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle className="text-destructive">Delete account</CardTitle>
          <CardDescription>
            Permanently remove your account and all locally stored history. Cannot be undone.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {!confirmDelete ? (
            <Button
              variant="destructive"
              onClick={() => setConfirmDelete(true)}
              className="gap-2"
            >
              <Trash2 className="h-4 w-4" /> Delete my account
            </Button>
          ) : (
            <div className="flex flex-col sm:flex-row gap-2">
              <Button variant="destructive" onClick={handleDelete} className="gap-2">
                <Trash2 className="h-4 w-4" /> Yes, delete forever
              </Button>
              <Button variant="outline" onClick={() => setConfirmDelete(false)}>
                Cancel
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
