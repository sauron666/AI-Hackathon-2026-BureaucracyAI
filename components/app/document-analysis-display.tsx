"use client"

import { motion } from "motion/react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  ShieldAlert,
  FileText,
  ListChecks,
  ThumbsUp,
  Gavel
} from "lucide-react"

interface DocumentRisk {
  clause: string;
  risk: string;
  severity: "low" | "medium" | "high";
  recommendation: string;
}

interface DocumentAnalysisDisplayProps {
  analysis: {
    risk_level: "low" | "medium" | "high";
    summary: string;
    risks: DocumentRisk[];
    missing_clauses: string[];
    positive_points: string[];
    verdict: string;
    _rawContent?: string;
  }
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4 },
  },
}

export function DocumentAnalysisDisplay({ analysis }: DocumentAnalysisDisplayProps) {
  const getRiskLevelConfig = (level: string) => {
    switch (level) {
      case "high":
        return {
          color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-200",
          icon: ShieldAlert,
          label: "High Risk"
        };
      case "medium":
        return {
          color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200",
          icon: AlertTriangle,
          label: "Medium Risk"
        };
      case "low":
        return {
          color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-200",
          icon: CheckCircle2,
          label: "Low Risk"
        };
      default:
        return {
          color: "bg-gray-100 text-gray-800 border-gray-200",
          icon: AlertCircle,
          label: "Unknown Risk"
        };
    }
  }

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case "high":
        return <Badge variant="destructive" className="bg-red-100 text-red-800 hover:bg-red-100">High</Badge>;
      case "medium":
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Medium</Badge>;
      case "low":
        return <Badge variant="outline" className="bg-green-100 text-green-800 hover:bg-green-100">Low</Badge>;
      default:
        return <Badge variant="outline">{severity}</Badge>;
    }
  }

  const riskConfig = getRiskLevelConfig(analysis.risk_level)
  const RiskIcon = riskConfig.icon

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Risk Level Banner */}
      <motion.div variants={itemVariants}>
        <Card className={`border-l-4 ${analysis.risk_level === 'high' ? 'border-l-destructive' : analysis.risk_level === 'medium' ? 'border-l-yellow-500' : 'border-l-green-500'} overflow-hidden`}>
          <CardHeader className="pb-3 bg-muted/30">
            <div className="flex items-center gap-3">
              <div className={`h-12 w-12 rounded-full flex items-center justify-center ${riskConfig.color}`}>
                <RiskIcon className="h-6 w-6" />
              </div>
              <div>
                <CardTitle className="text-xl">{riskConfig.label}</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">Document Risk Assessment</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <p className="text-muted-foreground leading-relaxed">{analysis.summary}</p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Verdict Card */}
      <motion.div variants={itemVariants}>
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <Gavel className="h-6 w-6 text-primary flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold mb-1">Verdict</h4>
                <p className="text-foreground font-medium">{analysis.verdict}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Risks Section */}
      {analysis.risks && analysis.risks.length > 0 && (
        <motion.div variants={itemVariants}>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                Identified Risks ({analysis.risks.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-4">
                {analysis.risks.map((risk, index) => (
                  <div 
                    key={index} 
                    className={`p-4 rounded-lg border ${
                      risk.severity === 'high' 
                        ? 'bg-red-50 border-red-200 dark:bg-red-900/10' 
                        : risk.severity === 'medium'
                        ? 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/10'
                        : 'bg-muted/50 border-border'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="font-mono text-xs">
                          #{index + 1}
                        </Badge>
                        {getSeverityBadge(risk.severity)}
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <div>
                        <h5 className="text-sm font-medium text-muted-foreground mb-1">Clause</h5>
                        <p className="text-sm font-mono bg-background/50 p-2 rounded border-l-2 border-muted-foreground/30">
                          {risk.clause}
                        </p>
                      </div>
                      
                      <div>
                        <h5 className="text-sm font-medium text-muted-foreground mb-1">Risk Analysis</h5>
                        <p className="text-sm">{risk.risk}</p>
                      </div>
                      
                      <div className="flex items-start gap-2 p-2 bg-background/50 rounded border">
                        <AlertCircle className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                        <div>
                          <span className="text-sm font-medium text-primary">Recommendation: </span>
                          <span className="text-sm text-muted-foreground">{risk.recommendation}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Missing Clauses */}
      {analysis.missing_clauses && analysis.missing_clauses.length > 0 && (
        <motion.div variants={itemVariants}>
          <Card className="border-destructive/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5 text-destructive" />
                Missing Clauses ({analysis.missing_clauses.length})
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Standard clauses that should be present in this document
              </p>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid gap-2">
                {analysis.missing_clauses.map((clause, index) => (
                  <div 
                    key={index}
                    className="flex items-center gap-3 p-3 rounded-lg bg-destructive/5 border border-destructive/20"
                  >
                    <div className="h-6 w-6 rounded-full bg-destructive/10 flex items-center justify-center">
                      <span className="text-xs font-medium text-destructive">✗</span>
                    </div>
                    <span className="text-sm">{clause}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Positive Points */}
      {analysis.positive_points && analysis.positive_points.length > 0 && (
        <motion.div variants={itemVariants}>
          <Card className="border-green-500/20 bg-green-50/50 dark:bg-green-900/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <ThumbsUp className="h-5 w-5 text-green-600" />
                Positive Points ({analysis.positive_points.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid gap-2">
                {analysis.positive_points.map((point, index) => (
                  <div 
                    key={index}
                    className="flex items-center gap-3 p-3 rounded-lg bg-green-100/50 dark:bg-green-900/20 border border-green-200/50 dark:border-green-800/30"
                  >
                    <div className="h-6 w-6 rounded-full bg-green-500/20 flex items-center justify-center">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    </div>
                    <span className="text-sm">{point}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Action Button */}
      <motion.div variants={itemVariants}>
        <Card className="bg-muted">
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-3 justify-center">
              <Button variant="outline" className="gap-2">
                <FileText className="h-4 w-4" />
                Export Report
              </Button>
              <Button className="gap-2">
                <ListChecks className="h-4 w-4" />
                Create Checklist
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )
}
