"use client"

import { useEffect, useState, useRef } from "react"
import { motion, AnimatePresence } from "motion/react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Send, Loader2, Upload, X, FileText, Image as ImageIcon, Globe, MessageCircle } from "lucide-react"
import { CountrySelector, COUNTRIES } from "./country-selector"
import { useI18n } from "@/lib/i18n-context"

interface AskInputProps {
  onSubmit: (question: string, file?: File, country?: string) => void
  isLoading?: boolean
  placeholder?: string
  initialValue?: string
  initialCountry?: string
  isFollowUp?: boolean
}

export function AskInput({ 
  onSubmit, 
  isLoading, 
  placeholder, 
  initialValue,
  initialCountry = "BG",
  isFollowUp = false
}: AskInputProps) {
  const { translate: tr } = useI18n()
  const [question, setQuestion] = useState(initialValue ?? "")
  const [file, setFile] = useState<File | null>(null)
  const [country, setCountry] = useState(initialCountry)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setQuestion(initialValue ?? "")
  }, [initialValue])

  useEffect(() => {
    setCountry(initialCountry)
  }, [initialCountry])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (question.trim() && !isLoading) {
      onSubmit(question.trim(), file || undefined, country)
      setQuestion("")
      setFile(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile && isValidFile(droppedFile)) {
      setFile(droppedFile)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile && isValidFile(selectedFile)) {
      setFile(selectedFile)
    }
  }

  const isValidFile = (file: File) => {
    const validTypes = ["application/pdf", "image/png", "image/jpeg", "image/jpg"]
    return validTypes.includes(file.type) && file.size <= 10 * 1024 * 1024 // 10MB limit
  }

  const removeFile = () => {
    setFile(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const getFileIcon = (file: File) => {
    if (file.type.startsWith("image/")) {
      return <ImageIcon className="h-5 w-5" />
    }
    return <FileText className="h-5 w-5" />
  }

  return (
    <Card 
      className={`p-6 transition-all ${isDragging ? "border-primary border-dashed bg-primary/5" : ""}`}
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Country Selector Row */}
        <div className="flex items-center gap-3 pb-2 border-b">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Globe className="h-4 w-4" />
            <span>{tr("askInput.country")}</span>
          </div>
          <CountrySelector 
            value={country} 
            onChange={setCountry} 
            disabled={isLoading}
          />
          <span className="text-xs text-muted-foreground ml-2 hidden sm:inline">
            {tr("askInput.selectCountryHelp")}
          </span>
          
          {/* Follow-up indicator */}
          <AnimatePresence>
            {isFollowUp && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="ml-auto"
              >
                <Badge variant="secondary" className="gap-1 bg-primary/10 text-primary border-primary/20">
                  <MessageCircle className="h-3 w-3" />
                  {tr("askInput.followUpMode")}
                </Badge>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Question Input */}
        <div className="relative">
          <Textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder={
              placeholder ||
              tr("askInput.placeholder", {
                country: COUNTRIES.find((c) => c.code === country)?.name || tr("askInput.selectCountry"),
              })
            }
            className="min-h-[120px] resize-none text-base pr-12"
            disabled={isLoading}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                handleSubmit(e)
              }
            }}
          />
          
          {/* Character count */}
          <div className="absolute bottom-3 right-12 text-xs text-muted-foreground">
            {question.length} / 2000
          </div>
        </div>

        {/* File attachment */}
        <AnimatePresence>
          {file && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50 border border-border"
            >
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                {getFileIcon(file)}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(file.size / 1024).toFixed(1)} KB
                </p>
              </div>

              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={removeFile}
                disabled={isLoading}
                className="h-8 w-8"
              >
                <X className="h-4 w-4" />
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Actions Row */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,image/png,image/jpeg,image/jpg"
              onChange={handleFileChange}
              className="hidden"
              id="file-upload"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading}
              className="gap-2"
            >
              <Upload className="h-4 w-4" />
              {tr("askInput.attach")}
            </Button>

            <span className="text-xs text-muted-foreground hidden md:inline">
              {tr("askInput.attachHelp")}
            </span>
          </div>

          <Button
            type="submit"
            disabled={!question.trim() || isLoading}
            className="gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {tr("askInput.analyzing")}
              </>
            ) : isFollowUp ? (
              <>
                <Send className="h-4 w-4" />
                {tr("askInput.askFollowUp")}
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                {tr("askInput.ask")}
              </>
            )}
          </Button>
        </div>
        
        {/* Quick tips when in follow-up mode */}
        <AnimatePresence>
          {isFollowUp && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="pt-2 border-t"
            >
              <p className="text-xs text-muted-foreground text-center">
                {tr("askInput.followUpTip")}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </form>

      {/* Drag overlay */}
      <AnimatePresence>
        {isDragging && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center rounded-lg border-2 border-dashed border-primary bg-primary/5"
          >
            <div className="text-center">
              <Upload className="h-8 w-8 mx-auto text-primary mb-2" />
              <p className="text-sm font-medium">{tr("askInput.dropHere")}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  )
}
