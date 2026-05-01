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
import { Loader2, ArrowRight, Check } from "lucide-react"

export default function RegisterPage() {
  const router = useRouter()
  const { register } = useAuth()
  const { translate: tr } = useI18n()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    if (formData.password.length < 6) {
      setError(tr("auth.register.passwordTooShort"))
      setIsLoading(false)
      return
    }

    const result = await register(formData.email, formData.password, formData.name)
    
    if (result.success) {
      router.push("/dashboard")
    } else {
      setError(result.error || tr("auth.register.failed"))
    }
    
    setIsLoading(false)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value,
    }))
  }

  const features = [
    tr("auth.register.features.one"),
    tr("auth.register.features.two"),
    tr("auth.register.features.three"),
    tr("auth.register.features.four"),
  ]

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full max-w-md"
    >
      <Card className="border-border/50 shadow-xl bg-card/80 backdrop-blur-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">{tr("auth.register.title")}</CardTitle>
          <CardDescription>
            {tr("auth.register.subtitle")}
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
              <Label htmlFor="name">{tr("common.fullName")}</Label>
              <Input
                id="name"
                name="name"
                type="text"
                placeholder={tr("auth.register.namePlaceholder")}
                value={formData.name}
                onChange={handleChange}
                required
                disabled={isLoading}
                className="h-11"
              />
            </div>

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
              <Label htmlFor="password">{tr("common.password")}</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder={tr("auth.register.passwordPlaceholder")}
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
                  {tr("auth.register.creating")}
                </>
              ) : (
                <>
                  {tr("common.createAccount")}
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </form>

          {/* Features list */}
          <div className="mt-6 pt-6 border-t border-border">
            <p className="text-sm font-medium mb-3">{tr("auth.register.benefitsTitle")}</p>
            <ul className="space-y-2">
              {features.map((feature) => (
                <li key={feature} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Check className="h-4 w-4 text-accent" />
                  {feature}
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-6 text-center text-sm">
            <span className="text-muted-foreground">{tr("auth.register.already")} </span>
            <Link href="/login" className="text-primary hover:underline font-medium">
              {tr("common.logIn")}
            </Link>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
