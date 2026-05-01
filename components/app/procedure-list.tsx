"use client"

import { useMemo, useState } from "react"
import { motion } from "motion/react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { ArrowLeft, Search, Clock, FileText, ChevronRight } from "lucide-react"
import type { Category } from "./browse-categories"
import { useI18n } from "@/lib/i18n-context"

interface Procedure {
  id: string
  name: string
  description: string
  difficulty: "easy" | "moderate" | "complex"
  estimatedTime: string
  documentsRequired: number
}

const proceduresByCategory: Record<string, Procedure[]> = {
  residency: [
    {
      id: "res-1",
      name: "Long-term Residence Permit",
      description: "Apply for a long-term residence permit for stays over 90 days",
      difficulty: "moderate",
      estimatedTime: "2-4 weeks",
      documentsRequired: 8,
    },
    {
      id: "res-2",
      name: "Permanent Residence",
      description: "Apply for permanent residence after 5 years of continuous stay",
      difficulty: "complex",
      estimatedTime: "1-3 months",
      documentsRequired: 12,
    },
    {
      id: "res-3",
      name: "Family Reunification Visa",
      description: "Bring family members to join you in the country",
      difficulty: "complex",
      estimatedTime: "2-6 months",
      documentsRequired: 15,
    },
    {
      id: "res-4",
      name: "Address Registration",
      description: "Register your residential address with local authorities",
      difficulty: "easy",
      estimatedTime: "1-2 days",
      documentsRequired: 3,
    },
  ],
  work: [
    {
      id: "work-1",
      name: "Work Permit Application",
      description: "Apply for authorization to work in the country",
      difficulty: "moderate",
      estimatedTime: "2-4 weeks",
      documentsRequired: 10,
    },
    {
      id: "work-2",
      name: "Blue Card (EU)",
      description: "EU Blue Card for highly qualified workers",
      difficulty: "complex",
      estimatedTime: "1-2 months",
      documentsRequired: 12,
    },
    {
      id: "work-3",
      name: "Freelance Registration",
      description: "Register as a freelancer or self-employed individual",
      difficulty: "moderate",
      estimatedTime: "1-3 weeks",
      documentsRequired: 7,
    },
  ],
  business: [
    {
      id: "biz-1",
      name: "Company Registration (LLC)",
      description: "Register a limited liability company",
      difficulty: "moderate",
      estimatedTime: "1-2 weeks",
      documentsRequired: 8,
    },
    {
      id: "biz-2",
      name: "Tax ID Registration",
      description: "Obtain a tax identification number for your business",
      difficulty: "easy",
      estimatedTime: "3-5 days",
      documentsRequired: 4,
    },
    {
      id: "biz-3",
      name: "Business License",
      description: "Obtain required licenses for your business activity",
      difficulty: "moderate",
      estimatedTime: "2-4 weeks",
      documentsRequired: 6,
    },
  ],
  healthcare: [
    {
      id: "health-1",
      name: "Health Insurance Registration",
      description: "Register for mandatory health insurance coverage",
      difficulty: "easy",
      estimatedTime: "1-2 weeks",
      documentsRequired: 4,
    },
    {
      id: "health-2",
      name: "GP Registration",
      description: "Register with a general practitioner",
      difficulty: "easy",
      estimatedTime: "1-3 days",
      documentsRequired: 2,
    },
  ],
  education: [
    {
      id: "edu-1",
      name: "University Enrollment",
      description: "Apply for admission to a university",
      difficulty: "moderate",
      estimatedTime: "1-3 months",
      documentsRequired: 10,
    },
    {
      id: "edu-2",
      name: "Diploma Recognition",
      description: "Get your foreign diploma recognized",
      difficulty: "complex",
      estimatedTime: "1-4 months",
      documentsRequired: 8,
    },
  ],
  driving: [
    {
      id: "drive-1",
      name: "Driver License Exchange",
      description: "Exchange your foreign driver's license",
      difficulty: "moderate",
      estimatedTime: "2-4 weeks",
      documentsRequired: 5,
    },
    {
      id: "drive-2",
      name: "Vehicle Registration",
      description: "Register a vehicle in your name",
      difficulty: "moderate",
      estimatedTime: "1-2 weeks",
      documentsRequired: 6,
    },
  ],
  travel: [
    {
      id: "travel-1",
      name: "Passport Application",
      description: "Apply for a new passport",
      difficulty: "easy",
      estimatedTime: "2-4 weeks",
      documentsRequired: 4,
    },
    {
      id: "travel-2",
      name: "Travel Document for Refugees",
      description: "Apply for travel documents as a refugee or asylum seeker",
      difficulty: "complex",
      estimatedTime: "1-3 months",
      documentsRequired: 8,
    },
  ],
  general: [
    {
      id: "gen-1",
      name: "Birth Certificate Request",
      description: "Request a copy of your birth certificate",
      difficulty: "easy",
      estimatedTime: "1-2 weeks",
      documentsRequired: 2,
    },
    {
      id: "gen-2",
      name: "Criminal Record Certificate",
      description: "Obtain a criminal record certificate",
      difficulty: "easy",
      estimatedTime: "1-3 weeks",
      documentsRequired: 3,
    },
    {
      id: "gen-3",
      name: "Notarized Document Translation",
      description: "Get official documents translated and notarized",
      difficulty: "easy",
      estimatedTime: "3-7 days",
      documentsRequired: 2,
    },
  ],
}

interface ProcedureListProps {
  category: Category
  onBack: () => void
  onSelectProcedure: (procedure: Procedure) => void
}

function getLocalizedProcedures(language: string, categoryId: string, procedures: Procedure[]) {
  const localized: Record<string, Record<string, Partial<Record<string, { name: string; description: string }>>>> = {
    bg: {
      residency: {
        "res-1": { name: "Разрешение за дългосрочно пребиваване", description: "Кандидатствай за разрешение за дългосрочно пребиваване при престой над 90 дни" },
        "res-2": { name: "Постоянно пребиваване", description: "Кандидатствай за постоянно пребиваване след 5 години непрекъснат престой" },
        "res-3": { name: "Виза за събиране на семейство", description: "Доведи членове на семейството си да живеят с теб в страната" },
        "res-4": { name: "Адресна регистрация", description: "Регистрирай адреса си пред местните власти" },
      },
      work: {
        "work-1": { name: "Заявление за разрешение за работа", description: "Кандидатствай за право да работиш в страната" },
        "work-2": { name: "Синя карта (ЕС)", description: "Синя карта на ЕС за висококвалифицирани работници" },
        "work-3": { name: "Регистрация като свободна професия", description: "Регистрирай се като фрийлансър или самонаето лице" },
      },
      business: {
        "biz-1": { name: "Регистрация на фирма (ООД)", description: "Регистрирай дружество с ограничена отговорност" },
        "biz-2": { name: "Регистрация за данъчен номер", description: "Получи данъчен идентификационен номер за бизнеса си" },
        "biz-3": { name: "Бизнес лиценз", description: "Получи необходимите лицензи за своята дейност" },
      },
      healthcare: {
        "health-1": { name: "Регистрация за здравно осигуряване", description: "Регистрирай се за задължително здравно осигуряване" },
        "health-2": { name: "Регистрация при личен лекар", description: "Запиши се при общопрактикуващ лекар" },
      },
      education: {
        "edu-1": { name: "Записване в университет", description: "Кандидатствай за прием в университет" },
        "edu-2": { name: "Признаване на диплома", description: "Получи признаване на чуждестранната си диплома" },
      },
      driving: {
        "drive-1": { name: "Смяна на шофьорска книжка", description: "Подмени чуждестранната си шофьорска книжка" },
        "drive-2": { name: "Регистрация на превозно средство", description: "Регистрирай автомобил на свое име" },
      },
      travel: {
        "travel-1": { name: "Заявление за паспорт", description: "Кандидатствай за нов паспорт" },
        "travel-2": { name: "Документ за пътуване за бежанци", description: "Кандидатствай за документи за пътуване като бежанец или търсещ убежище" },
      },
      general: {
        "gen-1": { name: "Заявка за акт за раждане", description: "Поискай копие от акта си за раждане" },
        "gen-2": { name: "Свидетелство за съдимост", description: "Получи свидетелство за съдимост" },
        "gen-3": { name: "Нотариално заверен превод на документ", description: "Направи официален превод и нотариална заверка на документи" },
      },
    },
    de: {
      residency: {
        "res-1": { name: "Langfristige Aufenthaltserlaubnis", description: "Beantrage eine langfristige Aufenthaltserlaubnis für Aufenthalte über 90 Tage" },
        "res-2": { name: "Daueraufenthalt", description: "Beantrage einen Daueraufenthalt nach 5 Jahren ununterbrochenem Aufenthalt" },
        "res-3": { name: "Visum zur Familienzusammenführung", description: "Hole Familienmitglieder nach, damit sie mit dir im Land leben können" },
        "res-4": { name: "Adressanmeldung", description: "Melde deine Wohnadresse bei den lokalen Behörden an" },
      },
      work: {
        "work-1": { name: "Antrag auf Arbeitserlaubnis", description: "Beantrage die Erlaubnis, im Land zu arbeiten" },
        "work-2": { name: "Blaue Karte (EU)", description: "EU-Blaue Karte für hochqualifizierte Fachkräfte" },
        "work-3": { name: "Freiberufliche Anmeldung", description: "Registriere dich als Freiberufler oder Selbstständiger" },
      },
      business: {
        "biz-1": { name: "Firmenregistrierung (GmbH)", description: "Registriere eine Gesellschaft mit beschränkter Haftung" },
        "biz-2": { name: "Steuernummer-Registrierung", description: "Erhalte eine steuerliche Identifikationsnummer für dein Unternehmen" },
        "biz-3": { name: "Gewerbelizenz", description: "Erhalte die erforderlichen Lizenzen für deine Geschäftstätigkeit" },
      },
      healthcare: {
        "health-1": { name: "Registrierung der Krankenversicherung", description: "Melde dich für die verpflichtende Krankenversicherung an" },
        "health-2": { name: "Hausarzt-Anmeldung", description: "Melde dich bei einem Hausarzt an" },
      },
      education: {
        "edu-1": { name: "Universitätszulassung", description: "Bewirb dich für die Aufnahme an einer Universität" },
        "edu-2": { name: "Diplomanerkennung", description: "Lass dein ausländisches Diplom anerkennen" },
      },
      driving: {
        "drive-1": { name: "Umtausch des Führerscheins", description: "Tausche deinen ausländischen Führerschein um" },
        "drive-2": { name: "Fahrzeugzulassung", description: "Melde ein Fahrzeug auf deinen Namen an" },
      },
      travel: {
        "travel-1": { name: "Reisepassantrag", description: "Beantrage einen neuen Reisepass" },
        "travel-2": { name: "Reisedokument für Flüchtlinge", description: "Beantrage Reisedokumente als Flüchtling oder Asylsuchender" },
      },
      general: {
        "gen-1": { name: "Geburtsurkunde anfordern", description: "Fordere eine Kopie deiner Geburtsurkunde an" },
        "gen-2": { name: "Führungszeugnis", description: "Beantrage ein Führungszeugnis" },
        "gen-3": { name: "Beglaubigte Dokumentenübersetzung", description: "Lass Dokumente offiziell übersetzen und beglaubigen" },
      },
    },
  }

  return procedures.map((procedure) => ({
    ...procedure,
    ...(localized[language]?.[categoryId]?.[procedure.id] ?? {}),
  }))
}

export function ProcedureList({ category, onBack, onSelectProcedure }: ProcedureListProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const { language } = useI18n()

  const copy = {
    procedures: language === "bg" ? "процедури" : language === "de" ? "Verfahren" : "procedures",
    searchPlaceholder: language === "bg" ? "Търси процедури..." : language === "de" ? "Verfahren suchen..." : "Search procedures...",
    emptyTitle: language === "bg" ? "Няма намерени процедури" : language === "de" ? "Keine Verfahren gefunden" : "No procedures found",
    emptyBody: language === "bg" ? "Опитай да промениш критериите за търсене." : language === "de" ? "Versuche, deine Suchkriterien anzupassen." : "Try adjusting your search criteria.",
    documents: language === "bg" ? "документа" : language === "de" ? "Dokumente" : "documents",
    easy: language === "bg" ? "Лесно" : language === "de" ? "Einfach" : "Easy",
    moderate: language === "bg" ? "Средно" : language === "de" ? "Mittel" : "Moderate",
    complex: language === "bg" ? "Сложно" : language === "de" ? "Komplex" : "Complex",
  }

  const difficultyConfig = {
    easy: { label: copy.easy, className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" },
    moderate: { label: copy.moderate, className: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400" },
    complex: { label: copy.complex, className: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400" },
  }

  const procedures = useMemo(
    () => getLocalizedProcedures(language, category.id, proceduresByCategory[category.id] || []),
    [language, category.id],
  )

  const filteredProcedures = procedures.filter((proc) =>
    proc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    proc.description.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-3">
          <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${category.color}`}>
            <category.icon className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">{category.name}</h2>
            <p className="text-sm text-muted-foreground">{category.procedureCount} {copy.procedures}</p>
          </div>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder={copy.searchPlaceholder}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="space-y-3">
        {filteredProcedures.length === 0 ? (
          <Card className="p-8">
            <CardContent className="flex flex-col items-center justify-center pt-6 text-center">
              <Search className="mb-4 h-10 w-10 text-muted-foreground" />
              <h3 className="font-medium">{copy.emptyTitle}</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {copy.emptyBody}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredProcedures.map((procedure, index) => (
            <motion.div
              key={procedure.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card
                className="group cursor-pointer transition-all hover:border-primary/50 hover:shadow-md"
                onClick={() => onSelectProcedure(procedure)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-medium">{procedure.name}</h3>
                        <Badge
                          variant="outline"
                          className={difficultyConfig[procedure.difficulty].className}
                        >
                          {difficultyConfig[procedure.difficulty].label}
                        </Badge>
                      </div>
                      <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">
                        {procedure.description}
                      </p>
                      <div className="mt-2 flex items-center gap-4">
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {procedure.estimatedTime}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <FileText className="h-3 w-3" />
                          {procedure.documentsRequired} {copy.documents}
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground transition-colors group-hover:text-primary" />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))
        )}
      </div>
    </motion.div>
  )
}
