"use client"

import { useState } from "react"
import { motion } from "motion/react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/lib/auth/context"
import { useI18n } from "@/lib/i18n-context"
import { Loader2, ArrowRight } from "lucide-react"

export default function LoginPage() {
  const router = useRouter()
  const { login } = useAuth()
  const { translate: tr } = useI18n()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    const result = await login(formData.email, formData.password)
    
    if (result.success) {
      router.push("/dashboard")
    } else {
      setError(result.error || tr("auth.login.failed"))
    }
    
    setIsLoading(false)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value,
    }))
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full max-w-md"
    >
      <Card className="border-border/50 shadow-xl bg-card/80 backdrop-blur-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">{tr("auth.login.title")}</CardTitle>
          <CardDescription>
            {tr("auth.login.subtitle")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm"
              >
                {error}
              </motion.div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">{tr("common.email")}</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="you@example.com"
                value={formData.email}
                onChange={handleChange}
                required
                disabled={isLoading}
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">{tr("common.password")}</Label>
                <Link 
                  href="#" 
                  className="text-sm text-primary hover:underline"
                >
                  {tr("auth.login.forgot")}
                </Link>
              </div>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder={tr("auth.login.passwordPlaceholder")}
                value={formData.password}
                onChange={handleChange}
                required
                disabled={isLoading}
                className="h-11"
              />
            </div>

            <Button
              type="submit"
              className="w-full h-11 gap-2"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {tr("auth.login.loggingIn")}
                </>
              ) : (
                <>
                  {tr("common.logIn")}
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">{tr("auth.login.orContinue")}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" type="button" disabled className="h-11">
                Google
              </Button>
              <Button variant="outline" type="button" disabled className="h-11">
                GitHub
              </Button>
            </div>
            <p className="text-center text-xs text-muted-foreground">
              {tr("auth.login.socialSoon")}
            </p>
          </form>

          <div className="mt-6 text-center text-sm">
            <span className="text-muted-foreground">{tr("auth.login.noAccount")} </span>
            <Link href="/register" className="text-primary hover:underline font-medium">
              {tr("common.signUp")}
            </Link>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
