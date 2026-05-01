"use client"

import { useMemo, useState } from "react"
import { motion, AnimatePresence } from "motion/react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { 
  ArrowRight, 
  Clock, 
  MapPin, 
  Home, 
  Briefcase, 
  Receipt,
  GraduationCap,
  Car,
  HeartPulse,
  CheckCircle2,
  Circle,
  FileText,
  Calendar,
  AlertCircle,
  Plus,
  Save,
  type LucideIcon
} from "lucide-react"
import Link from "next/link"
import { useI18n } from "@/lib/i18n-context"
import { useUserProcesses, type Process, type ProcessDocument, type ProcessStep } from "@/hooks/use-user-data"

type ProcessType = "residency" | "business" | "tax" | "education" | "driving" | "healthcare"

const processTypeConfig: Record<ProcessType, { icon: LucideIcon; color: string; bg: string }> = {
  residency: { icon: Home, color: "text-blue-600", bg: "bg-blue-100 dark:bg-blue-900/30" },
  business: { icon: Briefcase, color: "text-amber-600", bg: "bg-amber-100 dark:bg-amber-900/30" },
  tax: { icon: Receipt, color: "text-emerald-600", bg: "bg-emerald-100 dark:bg-emerald-900/30" },
  education: { icon: GraduationCap, color: "text-purple-600", bg: "bg-purple-100 dark:bg-purple-900/30" },
  driving: { icon: Car, color: "text-rose-600", bg: "bg-rose-100 dark:bg-rose-900/30" },
  healthcare: { icon: HeartPulse, color: "text-cyan-600", bg: "bg-cyan-100 dark:bg-cyan-900/30" },
}

const statusConfig = {
  "in-progress": { labelKey: "common.inProgress", className: "bg-primary/10 text-primary border-primary/20" },
  "waiting": { labelKey: "common.waiting", className: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800" },
  "completed": { labelKey: "common.completed", className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800" },
}

const documentStatusConfig: Record<ProcessDocument["status"], { labelKey: string; icon: LucideIcon; className: string }> = {
  submitted: { labelKey: "common.submitted", icon: CheckCircle2, className: "text-green-600" },
  pending: { labelKey: "common.pending", icon: Clock, className: "text-amber-600" },
  missing: { labelKey: "common.missing", icon: AlertCircle, className: "text-red-600" },
}

export function OngoingProcesses() {
  const { translate: tr } = useI18n()
  const { processes, isLoaded, updateProcess } = useUserProcesses()
  const [selectedProcess, setSelectedProcess] = useState<Process | null>(null)
  const [newDocumentName, setNewDocumentName] = useState("")
  const visibleProcesses = useMemo(
    () => [...processes].sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0)).slice(0, 3),
    [processes],
  )

  const calculateProgress = (process: Process) => {
    const totalItems = process.steps.length + process.documents.length
    if (totalItems === 0) return process.progress

    const completedSteps = process.steps.filter((step) => step.status === "completed").length
    const submittedDocuments = process.documents.filter((doc) => doc.status === "submitted").length
    return Math.round(((completedSteps + submittedDocuments) / totalItems) * 100)
  }

  const getNextStep = (process: Process) => {
    return process.steps.find((step) => step.status === "current")?.name
      || process.steps.find((step) => step.status === "upcoming")?.name
      || process.steps[process.steps.length - 1]?.name
      || process.nextStep
  }

  const persistSelectedProcess = (nextProcess: Process) => {
    const progress = calculateProgress(nextProcess)
    const normalizedProcess: Process = {
      ...nextProcess,
      progress,
      status: progress >= 100 ? "completed" : nextProcess.status === "completed" ? "in-progress" : nextProcess.status,
      nextStep: getNextStep(nextProcess),
    }
    setSelectedProcess(normalizedProcess)
    updateProcess(normalizedProcess.id, normalizedProcess)
  }

  const updateStepStatus = (stepId: string, status: ProcessStep["status"]) => {
    if (!selectedProcess) return

    const steps = selectedProcess.steps.map((step) => {
      if (step.id === stepId) return { ...step, status }
      if (status === "current" && step.status === "current") return { ...step, status: "upcoming" as const }
      return step
    })

    persistSelectedProcess({ ...selectedProcess, steps })
  }

  const updateDocumentStatus = (documentId: string, status: ProcessDocument["status"]) => {
    if (!selectedProcess) return

    persistSelectedProcess({
      ...selectedProcess,
      documents: selectedProcess.documents.map((doc) => doc.id === documentId ? { ...doc, status } : doc),
    })
  }

  const updateNotes = (notes: string) => {
    if (!selectedProcess) return
    persistSelectedProcess({ ...selectedProcess, notes })
  }

  const addDocument = () => {
    if (!selectedProcess || !newDocumentName.trim()) return

    const document: ProcessDocument = {
      id: `d-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: newDocumentName.trim(),
      status: "missing",
    }
    persistSelectedProcess({ ...selectedProcess, documents: [...selectedProcess.documents, document] })
    setNewDocumentName("")
  }

  if (!isLoaded) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{tr("processes.title")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 rounded-lg bg-muted animate-pulse" />
          ))}
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card className="h-full">
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle>{tr("processes.title")}</CardTitle>
          <Button variant="ghost" size="sm" asChild className="gap-1">
            <Link href="/history">
              {tr("common.viewAll")}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {visibleProcesses.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">{tr("processes.empty")}</p>
              <Button asChild className="mt-4">
                <Link href="/ask">{tr("processes.startInquiry")}</Link>
              </Button>
            </div>
          ) : (
            visibleProcesses.map((process, index) => {
              const typeConfig = processTypeConfig[process.type]
              const TypeIcon = typeConfig.icon
              
              return (
                <motion.div
                  key={process.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => setSelectedProcess(process)}
                  className="group cursor-pointer rounded-lg border border-border p-3 transition-all duration-300 hover:border-primary/30 hover:shadow-md"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div className="flex gap-3 flex-1">
                      {/* Process Type Icon */}
                      <div className={`shrink-0 h-10 w-10 rounded-lg ${typeConfig.bg} flex items-center justify-center transition-transform duration-300 group-hover:scale-110`}>
                        <TypeIcon className={`h-5 w-5 ${typeConfig.color}`} />
                      </div>
                      
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-medium">{process.name}</h4>
                          <Badge 
                            variant="outline" 
                            className={statusConfig[process.status].className}
                          >
                            {tr(statusConfig[process.status].labelKey)}
                          </Badge>
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                          {process.dueDate && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3.5 w-3.5" />
                              {process.dueDate}
                            </span>
                          )}
                          {process.location && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3.5 w-3.5" />
                              {process.location}
                            </span>
                          )}
                        </div>
                        
                        <p className="text-sm">
                          <span className="text-muted-foreground">{tr("processes.next")} </span>
                          <span className="font-medium">{process.nextStep}</span>
                        </p>
                      </div>
                    </div>
                    
                    <div className="sm:w-32 space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{tr("processes.progress")}</span>
                        <span className="font-medium">{process.progress}%</span>
                      </div>
                      <Progress value={process.progress} className="h-2" />
                    </div>
                  </div>
                </motion.div>
              )
            })
          )}
        </CardContent>
      </Card>

      {/* Process Detail Dialog */}
      <Dialog open={!!selectedProcess} onOpenChange={() => setSelectedProcess(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {selectedProcess && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <div className={`h-12 w-12 rounded-xl ${processTypeConfig[selectedProcess.type].bg} flex items-center justify-center`}>
                    {(() => {
                      const TypeIcon = processTypeConfig[selectedProcess.type].icon
                      return <TypeIcon className={`h-6 w-6 ${processTypeConfig[selectedProcess.type].color}`} />
                    })()}
                  </div>
                  <div>
                    <DialogTitle className="text-xl">{selectedProcess.name}</DialogTitle>
                    <DialogDescription className="flex items-center gap-2 mt-1">
                      <Badge 
                        variant="outline" 
                        className={statusConfig[selectedProcess.status].className}
                      >
                        {tr(statusConfig[selectedProcess.status].labelKey)}
                      </Badge>
                      <span>{tr("processes.percentComplete", { percent: String(selectedProcess.progress) })}</span>
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-6 mt-4">
                {/* Progress Bar */}
                <div>
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-muted-foreground">{tr("processes.overallProgress")}</span>
                    <span className="font-medium">{selectedProcess.progress}%</span>
                  </div>
                  <Progress value={selectedProcess.progress} className="h-3" />
                </div>

                {/* Key Info */}
                <div className="grid gap-4 sm:grid-cols-2">
                  {selectedProcess.dueDate && (
                    <div className="p-3 rounded-lg bg-secondary/50">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                        <Calendar className="h-4 w-4" />
                        {tr("processes.nextDeadline")}
                      </div>
                      <p className="font-medium">{selectedProcess.dueDate}</p>
                    </div>
                  )}
                  {selectedProcess.estimatedCompletion && (
                    <div className="p-3 rounded-lg bg-secondary/50">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                        <Clock className="h-4 w-4" />
                        {tr("processes.estimatedCompletion")}
                      </div>
                      <p className="font-medium">{selectedProcess.estimatedCompletion}</p>
                    </div>
                  )}
                  {selectedProcess.location && (
                    <div className="p-3 rounded-lg bg-secondary/50">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                        <MapPin className="h-4 w-4" />
                        {tr("processes.location")}
                      </div>
                      <p className="font-medium">{selectedProcess.location}</p>
                    </div>
                  )}
                </div>

                {/* Notes */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Save className="h-4 w-4" />
                    {tr("processes.notes")}
                  </div>
                  <Textarea
                    value={selectedProcess.notes ?? ""}
                    onChange={(event) => updateNotes(event.target.value)}
                    placeholder={tr("processes.notesPlaceholder")}
                    className="min-h-[90px]"
                  />
                </div>

                {/* Steps Timeline */}
                <div>
                  <h4 className="font-semibold mb-4 flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    {tr("processes.steps")}
                  </h4>
                  <div className="space-y-1">
                    {selectedProcess.steps.map((step, index) => (
                      <motion.div
                        key={step.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="flex gap-3"
                      >
                        {/* Timeline line and dot */}
                        <div className="flex flex-col items-center">
                          <div className={`h-6 w-6 rounded-full flex items-center justify-center shrink-0 ${
                            step.status === "completed" 
                              ? "bg-green-100 dark:bg-green-900/30" 
                              : step.status === "current"
                                ? "bg-primary/20 ring-2 ring-primary"
                                : "bg-secondary"
                          }`}>
                            {step.status === "completed" ? (
                              <CheckCircle2 className="h-4 w-4 text-green-600" />
                            ) : step.status === "current" ? (
                              <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                            ) : (
                              <Circle className="h-3 w-3 text-muted-foreground" />
                            )}
                          </div>
                          {index < selectedProcess.steps.length - 1 && (
                            <div className={`w-0.5 flex-1 min-h-[24px] ${
                              step.status === "completed" ? "bg-green-300 dark:bg-green-800" : "bg-border"
                            }`} />
                          )}
                        </div>
                        
                        {/* Step content */}
                        <div className="pb-4 flex-1">
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                            <p className={`font-medium ${
                              step.status === "upcoming" ? "text-muted-foreground" : ""
                            }`}>
                              {step.name}
                            </p>
                            <div className="flex items-center gap-2">
                              {step.date && (
                                <span className="text-xs text-muted-foreground">{step.date}</span>
                              )}
                              <Select
                                value={step.status}
                                onValueChange={(value) => updateStepStatus(step.id, value as ProcessStep["status"])}
                              >
                                <SelectTrigger size="sm" className="w-[132px]">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="completed">{tr("common.completed")}</SelectItem>
                                  <SelectItem value="current">{tr("processes.current")}</SelectItem>
                                  <SelectItem value="upcoming">{tr("processes.upcoming")}</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          {step.description && (
                            <p className="text-sm text-muted-foreground mt-0.5">{step.description}</p>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>

                {/* Documents Checklist */}
                <div>
                  <h4 className="font-semibold mb-4 flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    {tr("processes.documents")}
                  </h4>
                  <div className="space-y-2">
                    {selectedProcess.documents.map((doc, index) => {
                      const statusConf = documentStatusConfig[doc.status]
                      const StatusIcon = statusConf.icon
                      
                      return (
                        <motion.div
                          key={doc.id}
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.03 }}
                          className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-secondary/30 transition-colors"
                        >
                          <span className="text-sm">{doc.name}</span>
                          <Select
                            value={doc.status}
                            onValueChange={(value) => updateDocumentStatus(doc.id, value as ProcessDocument["status"])}
                          >
                            <SelectTrigger size="sm" className={`w-[132px] ${statusConf.className}`}>
                              <StatusIcon className="h-4 w-4" />
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="submitted">{tr("common.submitted")}</SelectItem>
                              <SelectItem value="pending">{tr("common.pending")}</SelectItem>
                              <SelectItem value="missing">{tr("common.missing")}</SelectItem>
                            </SelectContent>
                          </Select>
                        </motion.div>
                      )
                    })}
                    <div className="flex flex-col gap-2 rounded-lg border border-dashed border-border p-3 sm:flex-row">
                      <Input
                        value={newDocumentName}
                        onChange={(event) => setNewDocumentName(event.target.value)}
                        placeholder={tr("processes.newDocumentPlaceholder")}
                      />
                      <Button type="button" onClick={addDocument} disabled={!newDocumentName.trim()} className="gap-2">
                        <Plus className="h-4 w-4" />
                        {tr("processes.addDocument")}
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                  <Button className="flex-1" asChild>
                    <Link href="/ask">{tr("processes.askQuestion")}</Link>
                  </Button>
                  <Button variant="outline" onClick={() => setSelectedProcess(null)}>
                    {tr("common.close")}
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
