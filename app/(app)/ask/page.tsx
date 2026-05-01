"use client";

import { Suspense, useEffect, useState, useRef, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import { AskInput } from "@/components/app/ask-input";
import { AnswerDisplay } from "@/components/app/answer-display";
import { DocumentAnalysisDisplay } from "@/components/app/document-analysis-display";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Lightbulb, RotateCcw, AlertCircle, MessageCircle, ChevronRight, Clock, MapPin, History, RefreshCw, ShieldCheck, ClipboardList } from "lucide-react";
import type { BureaucracyResponse } from "@/lib/ai/schemas";
import { getCountryName } from "@/components/app/country-selector";
import { CountryCodeBadge, normalizeCountryCode } from "@/lib/countries";
import {
  answerToContextDigest,
  answerToDiffText,
  buildAnswerDiff,
  classifyAskTurn,
  inferProcedureTheme,
  makeContextTitle,
  makeId,
  type AnswerDiff,
  type ChatContextWindow,
} from "@/lib/chat-context";
import { createAskTurn } from "@/lib/ask-turn";
import { format } from "date-fns";
import { useI18n } from "@/lib/i18n-context";

import { useQuestionHistory, validateQuestion, type QuestionHistoryItem } from "@/hooks/use-question-history";
import { createProcessingProcess, createProcessFromResponse, useUserProcesses } from "@/hooks/use-user-data";

const TEMP_CHAT_STORAGE_KEY = "formwise-temporary-chat-enabled";

// Document Risk response type
interface DocumentRiskResponse {
  risk_level: "low" | "medium" | "high";
  summary: string;
  risks: Array<{
    clause: string;
    risk: string;
    severity: "low" | "medium" | "high";
    recommendation: string;
  }>;
  missing_clauses: string[];
  positive_points: string[];
  verdict: string;
  _rawContent?: string;
}

// Conversation message type
interface ConversationMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  country?: string;
  response?: BureaucracyResponse;
  documentAnalysis?: DocumentRiskResponse;
  temporary?: boolean;
}

// Suggested follow-up questions type
interface SuggestedFollowUp {
  question: string;
  category: string;
}

interface AskSubmitOptions {
  refinementContext?: string;
  originalQuestion?: string;
  forceSameContext?: boolean;
}

function formatDiffForChat(diff: AnswerDiff): string {
  if (diff.unchanged) return "No major changes from the previous answer."

  const lines = ["Updated answer. What changed:"]
  diff.changed.slice(0, 3).forEach((item) => lines.push(`Changed: ${item}`))
  diff.added.slice(0, 5).forEach((item) => lines.push(`Added: ${item}`))
  return lines.join("\n")
}

function AskPageInner() {
  const searchParams = useSearchParams();
  const { translate: tr, language } = useI18n();
  const localizeValidationMessage = useCallback((message: string) => {
    const validationKeyMap: Record<string, string> = {
      "Question is too short. Please provide more details.": "askPage.validation.questionTooShort",
      "Add more context about your situation": "askPage.validation.addMoreContext",
      "Include the type of procedure (e.g., visa, permit, certificate)": "askPage.validation.includeProcedureType",
      "No country selected. Please select a country.": "askPage.validation.noCountrySelected",
      "Select the country where you need this procedure": "askPage.validation.selectCountryForProcedure",
      "Question contains vague terms. Please be more specific.": "askPage.validation.vagueTerms",
      "Replace vague words with specific details": "askPage.validation.replaceVagueWords",
      "Please end your question with a question mark (?).": "askPage.validation.missingQuestionMark",
      "Please phrase your question clearly.": "askPage.validation.phraseClearly",
      "Start with 'How', 'What', 'Where', 'When', or 'Can'": "askPage.validation.startWithQuestionWord",
    };

    const key = validationKeyMap[message];
    return key ? tr(key) : message;
  }, [tr]);
  const processCopy = {
    waitingForAnswer: language === "bg" ? "Изчаква се отговор от FormWise" : language === "de" ? "Warten auf FormWise-Antwort" : "Waiting for FormWise answer",
    questionSubmitted: language === "bg" ? "Въпросът е изпратен" : language === "de" ? "Frage gesendet" : "Question submitted",
    questionSubmittedBody: language === "bg" ? "FormWise получи запитването и започна обработка." : language === "de" ? "FormWise hat die Anfrage erhalten und mit der Verarbeitung begonnen." : "FormWise received the request and started processing it.",
    answerGeneration: language === "bg" ? "Генериране на отговор" : language === "de" ? "Antwort wird erstellt" : "Answer generation",
    answerGenerationBody: language === "bg" ? "Търсят се източници и се подготвя отговор." : language === "de" ? "Quellen werden durchsucht und die Antwort wird vorbereitet." : "Searching sources and preparing the response.",
    autoCreatedNotes: language === "bg" ? "Създадено автоматично от последния въпрос." : language === "de" ? "Automatisch aus der letzten Frage erstellt." : "Auto-created from the latest question.",
    retryQuestion: language === "bg" ? "Опитай въпроса отново" : language === "de" ? "Frage erneut versuchen" : "Retry the question",
    processingFailedNotes: language === "bg" ? "Запитването не успя да бъде завършено за:" : language === "de" ? "Die Anfrage konnte nicht abgeschlossen werden für:" : "The request could not be completed for:",
  }
  const missingContextCopy = {
    title: language === "bg"
      ? "Повече контекст би подобрил този отговор"
      : language === "de"
        ? "Mehr Kontext würde diese Antwort verbessern"
        : tr("askPage.missingContextTitle"),
    body: language === "bg"
      ? "Моделът отговори предпазливо, но отбеляза детайли, които биха направили процедурата по-точна. Добави ги тук и FormWise ще продължи с пълния контекст."
      : language === "de"
        ? "Das Modell hat vorsichtig geantwortet, aber Details markiert, die das Verfahren genauer machen würden. Füge sie hier hinzu und FormWise macht mit dem vollständigen Kontext weiter."
        : tr("askPage.missingContextBody"),
    missingFields: language === "bg"
      ? "Липсващи полета"
      : language === "de"
        ? "Fehlende Angaben"
        : tr("askPage.missingFields"),
    clarifyingQuestions: language === "bg"
      ? "Уточняващи въпроси"
      : language === "de"
        ? "Klärende Fragen"
        : tr("askPage.clarifyingQuestions"),
    placeholder: language === "bg"
      ? "Пример: Аз съм гражданин на държава извън ЕС, в момента съм в София и кандидатствам за дългосрочно разрешение за пребиваване преди да изтече текущата ми виза..."
      : language === "de"
        ? "Beispiel: Ich bin kein EU-Bürger, befinde mich derzeit in Sofia und beantrage eine langfristige Aufenthaltserlaubnis, bevor mein aktuelles Visum abläuft..."
        : tr("askPage.contextPlaceholder"),
    send: language === "bg"
      ? "Изпрати с контекст"
      : language === "de"
        ? "Mit Kontext senden"
        : tr("askPage.sendWithContext"),
  };
  const initialQ = searchParams.get("q") ?? "";
  const historyId = searchParams.get("historyId");
  
  // Question history hook
  const { addQuestion, history, threads, saveChatTurn } = useQuestionHistory();
  const { addProcess, updateProcess, trackResponseAsProcess } = useUserProcesses();
  
  // State for loaded history item
  const [loadedHistoryItem, setLoadedHistoryItem] = useState<QuestionHistoryItem | null>(null);
  
  const suggestions = [
    tr("askPage.suggestions.s1"),
    tr("askPage.suggestions.s2"),
    tr("askPage.suggestions.s3"),
    tr("askPage.suggestions.s4"),
  ];
  const defaultFollowUps: Record<string, SuggestedFollowUp[]> = {
    default: [
      { question: tr("askPage.followUps.requirements"), category: tr("askPage.followUps.catRequirements") },
      { question: tr("askPage.followUps.timeline"), category: tr("askPage.followUps.catTimeline") },
      { question: tr("askPage.followUps.cost"), category: tr("askPage.followUps.catCosts") },
      { question: tr("askPage.followUps.location"), category: tr("askPage.followUps.catLocation") },
    ],
    visa: [
      { question: tr("askPage.followUps.visaWork"), category: tr("askPage.followUps.catWorkRights") },
      { question: tr("askPage.followUps.visaFamily"), category: tr("askPage.followUps.catFamily") },
      { question: tr("askPage.followUps.visaRejection"), category: tr("askPage.followUps.catRejection") },
    ],
    permit: [
      { question: tr("askPage.followUps.permitExtend"), category: tr("askPage.followUps.catExtension") },
      { question: tr("askPage.followUps.permitRenewal"), category: tr("askPage.followUps.catRenewal") },
      { question: tr("askPage.followUps.permitStatus"), category: tr("askPage.followUps.catStatusChange") },
    ],
  };
  const [isLoading, setIsLoading] = useState(false);
  const [bureaucracyResponse, setBureaucracyResponse] = useState<BureaucracyResponse & { _generatedAt?: string } | null>(null);
  const [documentAnalysis, setDocumentAnalysis] = useState<DocumentRiskResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastCountry, setLastCountry] = useState<string>("BG");
  const [prefill, setPrefill] = useState<string>(initialQ);
  const [needsMoreInfo, setNeedsMoreInfo] = useState<boolean>(false);
  const [temporaryChat, setTemporaryChat] = useState(false);
  const [missingContextText, setMissingContextText] = useState("");
  const [missingContextDetails, setMissingContextDetails] = useState<{
    originalQuestion: string;
    response?: BureaucracyResponse;
    missingContext: string[];
    followUpQuestions: string[];
  } | null>(null);
  const [lastSubmittedQuestion, setLastSubmittedQuestion] = useState("");
  const [trackedProcessIds, setTrackedProcessIds] = useState<string[]>([]);
  
  // Question validation state
  const [validationError, setValidationError] = useState<string | null>(null);
  const [validationSuggestions, setValidationSuggestions] = useState<string[]>([]);

  // Conversation history state
  const [conversationHistory, setConversationHistory] = useState<ConversationMessage[]>([]);
  const [currentQuestionId, setCurrentQuestionId] = useState<string | null>(null);
  const [showConversation, setShowConversation] = useState<boolean>(false);
  const [suggestedFollowUps, setSuggestedFollowUps] = useState<SuggestedFollowUp[]>(defaultFollowUps.default);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [activeContextId, setActiveContextId] = useState<string | null>(null);
  const [contextWindows, setContextWindows] = useState<ChatContextWindow[]>([]);
  const [answerDiff, setAnswerDiff] = useState<AnswerDiff | null>(null);
  
  const conversationEndRef = useRef<HTMLDivElement>(null);
  const answerSeparatorRef = useRef<HTMLDivElement>(null);
  const answerEndRef = useRef<HTMLDivElement>(null);
  const loadingAnchorRef = useRef<HTMLDivElement>(null);
  const skipNextConversationAutoScrollRef = useRef(false);
  const pendingHistoryAnswerScrollRef = useRef(false);
  const historyAnswerScrollFrameRef = useRef<number | null>(null);
  const generationFollowFrameRef = useRef<number | null>(null);
  const activeProcessIdRef = useRef<string | null>(null);

  const scrollToBottom = useCallback(() => {
    if (conversationEndRef.current) {
      conversationEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, []);

  const scrollToAnswer = useCallback(() => {
    if (answerSeparatorRef.current) {
      const targetTop = window.scrollY + answerSeparatorRef.current.getBoundingClientRect().top - 96;
      window.scrollTo({
        top: Math.max(targetTop, 0),
        behavior: "auto",
      });
    }
  }, []);

  const scrollToGeneratedPart = useCallback(() => {
    const target = answerSeparatorRef.current || loadingAnchorRef.current;
    if (!target) return;

    const targetTop = window.scrollY + target.getBoundingClientRect().top - 96;
    window.scrollTo({
      top: Math.max(targetTop, 0),
      behavior: "smooth",
    });
  }, []);

  const scrollToLoadingAnchor = useCallback(() => {
    loadingAnchorRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }, []);

  const scrollToAnswerEnd = useCallback((behavior: ScrollBehavior = "smooth") => {
    const target = answerEndRef.current || answerSeparatorRef.current;
    if (!target) return;

    target.scrollIntoView({
      behavior,
      block: "end",
    });
  }, []);

  const followActiveGeneration = useCallback((behavior: ScrollBehavior = "smooth") => {
    const target = isLoading
      ? loadingAnchorRef.current
      : answerEndRef.current || answerSeparatorRef.current || loadingAnchorRef.current;

    if (!target) return;

    target.scrollIntoView({
      behavior,
      block: isLoading ? "center" : "end",
    });
  }, [isLoading]);

  const loadContextWindow = useCallback((context: ChatContextWindow, threadId?: string) => {
    setActiveThreadId(threadId ?? activeThreadId);
    setActiveContextId(context.id);
    setLastCountry(normalizeCountryCode(context.country));
    setConversationHistory(context.messages.map((message) => ({
      id: message.id,
      role: message.role,
      content: message.content,
      timestamp: new Date(message.timestamp),
      country: message.country,
      response: message.response,
      temporary: message.temporary,
    })));
    setBureaucracyResponse(context.lastResponse ?? null);
    setLastSubmittedQuestion(
      context.messages.filter((message) => message.role === "user").at(-1)?.content ?? "",
    );
    setShowConversation(true);
    setAnswerDiff(null);
  }, [activeThreadId]);

  useEffect(() => {
    if (showConversation && conversationHistory.length > 0) {
      if (skipNextConversationAutoScrollRef.current) {
        skipNextConversationAutoScrollRef.current = false;
        return;
      }
      scrollToBottom();
    }
  }, [conversationHistory, showConversation, scrollToBottom]);

  useEffect(() => {
    if (!isLoading) {
      if (generationFollowFrameRef.current !== null) {
        window.cancelAnimationFrame(generationFollowFrameRef.current);
        generationFollowFrameRef.current = null;
      }
      return;
    }

    let lastRun = 0;
    const follow = (timestamp: number) => {
      if (timestamp - lastRun > 280) {
        followActiveGeneration("auto");
        lastRun = timestamp;
      }

      generationFollowFrameRef.current = window.requestAnimationFrame(follow);
    };

    generationFollowFrameRef.current = window.requestAnimationFrame(follow);

    return () => {
      if (generationFollowFrameRef.current !== null) {
        window.cancelAnimationFrame(generationFollowFrameRef.current);
        generationFollowFrameRef.current = null;
      }
    };
  }, [followActiveGeneration, isLoading]);

  useEffect(() => {
    if (isLoading || !bureaucracyResponse) return;

    let attempts = 0;
    const followRenderedAnswer = () => {
      scrollToAnswerEnd(attempts < 2 ? "smooth" : "auto");
      attempts += 1;

      if (attempts < 12) {
        generationFollowFrameRef.current = window.requestAnimationFrame(followRenderedAnswer);
      } else {
        generationFollowFrameRef.current = null;
      }
    };

    generationFollowFrameRef.current = window.requestAnimationFrame(followRenderedAnswer);

    return () => {
      if (generationFollowFrameRef.current !== null) {
        window.cancelAnimationFrame(generationFollowFrameRef.current);
        generationFollowFrameRef.current = null;
      }
    };
  }, [bureaucracyResponse, isLoading, scrollToAnswerEnd]);

  useEffect(() => {
    if (
      !pendingHistoryAnswerScrollRef.current ||
      !showConversation ||
      !loadedHistoryItem?.response ||
      !bureaucracyResponse ||
      conversationHistory.length === 0 ||
      !answerSeparatorRef.current
    ) {
      return;
    }

    let lastTop: number | null = null;
    let stableFrames = 0;
    let attempts = 0;

    const waitForStableLayout = () => {
      const separator = answerSeparatorRef.current;
      if (!separator) return;

      const currentTop = separator.getBoundingClientRect().top;
      if (lastTop !== null && Math.abs(currentTop - lastTop) < 1) {
        stableFrames += 1;
      } else {
        stableFrames = 0;
      }

      lastTop = currentTop;
      attempts += 1;

      if (stableFrames >= 3 || attempts >= 45) {
        scrollToAnswer();
        pendingHistoryAnswerScrollRef.current = false;
        historyAnswerScrollFrameRef.current = null;
        return;
      }

      historyAnswerScrollFrameRef.current = window.requestAnimationFrame(waitForStableLayout);
    };

    historyAnswerScrollFrameRef.current = window.requestAnimationFrame(waitForStableLayout);

    return () => {
      if (historyAnswerScrollFrameRef.current !== null) {
        window.cancelAnimationFrame(historyAnswerScrollFrameRef.current);
        historyAnswerScrollFrameRef.current = null;
      }
    };
  }, [bureaucracyResponse, conversationHistory.length, loadedHistoryItem, scrollToAnswer, showConversation]);

  useEffect(() => {
    const stored = localStorage.getItem(TEMP_CHAT_STORAGE_KEY);
    setTemporaryChat(stored === "true");
  }, []);

  const handleTemporaryChange = (checked: boolean) => {
    setTemporaryChat(checked);
    localStorage.setItem(TEMP_CHAT_STORAGE_KEY, String(checked));
    if (checked) {
      toast.info(tr("askPage.temporaryEnabled"), {
        description: tr("askPage.temporaryEnabledBody"),
      });
    }
  };

  // Load history item when historyId is provided
  useEffect(() => {
    if (historyId && history.length > 0) {
      const item = history.find(h => h.id === historyId);
      if (item) {
        const thread = item.threadId ? threads.find((entry) => entry.id === item.threadId) : null;
        const context = thread?.contexts.find((entry) => entry.id === item.contextId) ?? thread?.contexts[0];

        pendingHistoryAnswerScrollRef.current = false;
        setLoadedHistoryItem(item);
        setPrefill("");
        setLastCountry(normalizeCountryCode(item.country));
        setShowConversation(true);
        skipNextConversationAutoScrollRef.current = true;

        if (thread && context) {
          setContextWindows(thread.contexts);
          loadContextWindow(context, thread.id);
          toast.info(tr("askPage.loadedFromHistory"), {
            description: tr("askPage.loadedFromHistoryBody"),
          });
          pendingHistoryAnswerScrollRef.current = Boolean(context.lastResponse);
          return;
        }
        
        // Load the response
        if (item.response) {
          setBureaucracyResponse(item.response as BureaucracyResponse & { _generatedAt?: string });
        }
        
        // Add to conversation history
        const userMessage: ConversationMessage = {
          id: item.id,
          role: "user",
          content: item.fullQuestion,
          timestamp: new Date(item.timestamp),
          country: item.country,
          response: item.response as BureaucracyResponse,
        };
        const assistantMessage: ConversationMessage | null = item.response ? {
          id: `history-assistant-${item.id}`,
          role: "assistant",
          content: (item.response.summary as string | undefined) || (item.response._rawContent as string | undefined) || tr("askPage.responseReceived"),
          timestamp: new Date(item.timestamp + 1),
          country: item.country,
          response: item.response as BureaucracyResponse,
        } : null;
        const migratedContext: ChatContextWindow = {
          id: item.contextId || `ctx-${item.id}`,
          title: makeContextTitle(item.fullQuestion, item.response as BureaucracyResponse | undefined),
          themeKey: inferProcedureTheme(item.fullQuestion, item.response as BureaucracyResponse | undefined),
          country: normalizeCountryCode(item.country),
          language: item.language,
          createdAt: item.timestamp,
          updatedAt: item.timestamp,
          messages: [
            {
              id: userMessage.id,
              role: "user",
              content: userMessage.content,
              timestamp: userMessage.timestamp.getTime(),
              country: userMessage.country,
              response: userMessage.response,
            },
            ...(assistantMessage ? [{
              id: assistantMessage.id,
              role: "assistant" as const,
              content: assistantMessage.content,
              timestamp: assistantMessage.timestamp.getTime(),
              country: assistantMessage.country,
              response: assistantMessage.response,
            }] : []),
          ],
          lastResponse: item.response as BureaucracyResponse | undefined,
          lastGoodResponse: item.response as BureaucracyResponse | undefined,
          lastAnswerText: answerToDiffText(item.response as BureaucracyResponse | undefined),
          canonicalQuestion: item.fullQuestion,
          contextDigest: answerToContextDigest(item.response as BureaucracyResponse | undefined),
          searchQuery: item.fullQuestion,
          sessionId: (item.response as BureaucracyResponse | undefined)?._sessionId,
        };
        setContextWindows([migratedContext]);
        setActiveContextId(migratedContext.id);
        setActiveThreadId(item.threadId || `thread-${item.id}`);
        setConversationHistory(assistantMessage ? [userMessage, assistantMessage] : [userMessage]);
        setLastSubmittedQuestion(item.fullQuestion);
        
        toast.info(tr("askPage.loadedFromHistory"), {
          description: tr("askPage.loadedFromHistoryBody"),
        });

        pendingHistoryAnswerScrollRef.current = Boolean(item.response);
      }
    }
  }, [historyId, history, threads, tr, loadContextWindow]);

  const handleSubmit = async (question: string, file?: File, country?: string) => {
    // Validate that country is selected
    if (!country) {
      toast.error(tr("askPage.selectCountry"), {
        description: tr("askPage.selectCountryDescription"),
      });
      return;
    }

    setIsLoading(true);
    setError(null);
    setLastCountry(country);
    setLastSubmittedQuestion(question);
    setPrefill("");
    setBureaucracyResponse(null);
    setDocumentAnalysis(null);
    setMissingContextDetails(null);
    setMissingContextText("");
    setTrackedProcessIds([]);
    setNeedsMoreInfo(false);

    // Generate unique ID for this question
    const questionId = `q-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    setCurrentQuestionId(questionId);

    if (!temporaryChat) {
      const processingProcess = createProcessingProcess(question, country, questionId, {
        waitingForAnswer: processCopy.waitingForAnswer,
        questionSubmitted: processCopy.questionSubmitted,
        questionSubmittedBody: processCopy.questionSubmittedBody,
        answerGeneration: processCopy.answerGeneration,
        answerGenerationBody: processCopy.answerGenerationBody,
        autoCreatedNotes: processCopy.autoCreatedNotes,
      });
      addProcess(processingProcess);
      activeProcessIdRef.current = processingProcess.id;
      setTrackedProcessIds([processingProcess.id]);
    } else {
      activeProcessIdRef.current = null;
    }

    // Add user message to conversation
    const userMessage: ConversationMessage = {
      id: questionId,
      role: "user",
      content: question,
      timestamp: new Date(),
      country,
    };

    if (showConversation) {
      setConversationHistory(prev => [...prev, userMessage]);
      scrollToBottom();
    }

    const countryName = getCountryName(country);
    
    const loadingToast = toast.loading(tr("askPage.loadingFor", { country: countryName }), {
      description: tr("askPage.loadingDescription"),
    });

    try {
      let documentText: string | undefined;
      
      // Extract text from attached file using server-side API (PDF, DOCX)
      if (file) {
        try {
          const formData = new FormData();
          formData.append('file', file);
          
          const extractRes = await fetch("/api/extract-text", {
            method: "POST",
            body: formData,
          });
          
          if (extractRes.ok) {
            const extractData = await extractRes.json();
            documentText = extractData.text;
          } else {
            console.error("File extraction failed:", await extractRes.text());
            toast.warning("Could not read file content", {
              description: "Sending question without file content.",
            });
          }
        } catch (err) {
          console.error("File extraction error:", err);
          toast.warning("Could not read file content", {
            description: "Sending question without file content.",
          });
        }
      }

      // Determine if this is a follow-up question
      const isFollowUp = showConversation && conversationHistory.length > 0;

      // Build conversation history for API
      const apiHistory = conversationHistory.slice(-10).map(msg => ({
        role: msg.role,
        content: msg.content,
      }));

      // Call the analyze API with country and conversation context
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: documentText || question,
          country: country,
          language,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to analyze");
      }

      const data = await res.json();

      // Check if the response indicates insufficient information
      if (data._needsMoreInfo || (data.risk_level === 'unknown' && data._rawContent?.includes('more specific'))) {
        setNeedsMoreInfo(true);
        setError(tr("askPage.needSpecificInfo", { country: countryName }));
        toast.dismiss(loadingToast);
        toast.info(tr("askPage.detailPrompt"), {
          description: tr("askPage.moreInfoBody", { country: countryName }),
        });
        return;
      }

      // Check if it's document analysis response (has risk_level) or procedure response (has steps)
      if (data.risk_level) {
        // Document risk analysis response - save to localStorage
        addQuestion(documentText || question, data, country, language, true);
        setDocumentAnalysis(data);
        toast.success(tr("askPage.analysisComplete"), {
          id: loadingToast,
          description: tr("askPage.analysisDoneFor", { country: countryName }),
        });
      } else if (data.response) {
        // Bureaucracy procedure response (wrapped in response)
        setBureaucracyResponse(data.response);
        toast.success(tr("askPage.answerReady"), {
          id: loadingToast,
          description: tr("askPage.procedureInfoFor", { country: countryName }),
        });
      } else if (data.procedureName || data.steps) {
        // Direct procedure response
        setBureaucracyResponse(data);
        toast.success(tr("askPage.answerReady"), {
          id: loadingToast,
          description: tr("askPage.procedureInfoFor", { country: countryName }),
        });
      } else {
        // Unexpected response format
        setNeedsMoreInfo(true);
        setError(tr("askPage.missingSpecificInfo", { country: countryName }));
        toast.dismiss(loadingToast);
      }

    } catch (err) {
      console.error("Analysis error:", err);
      setError(tr("askPage.failedAnalyze"));
      toast.error(tr("askPage.failedAnswer"), {
        id: loadingToast,
        description: tr("askPage.checkConnection"),
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle follow-up question from suggestion
  const handleFollowUp = async (followUpQuestion: string) => {
    if (!lastCountry) {
      toast.error(tr("askPage.selectCountryFirst"));
      return;
    }
    setPrefill(followUpQuestion);
    await handleInputSubmit(followUpQuestion, undefined, lastCountry);
  };

  const handleMissingContextSubmit = async () => {
    if (!missingContextDetails || !missingContextText.trim()) return;

    const visiblePrompt = `${tr("askPage.contextSupplied")}\n${missingContextText.trim()}`;
    const originalQuestion = missingContextDetails.originalQuestion;
    const refinementContext = missingContextText.trim();
    setMissingContextDetails(null);
    setMissingContextText("");
    await handleInputSubmit(originalQuestion, undefined, lastCountry, visiblePrompt, {
      refinementContext,
      originalQuestion,
      forceSameContext: true,
    });
  };

  // Handle submitting from input (with conversation context)
  const handleInputSubmit = async (
    question: string,
    file?: File,
    country?: string,
    displayQuestion?: string,
    options: AskSubmitOptions = {},
  ) => {
    if (!country) {
      toast.error(tr("askPage.selectCountry"), {
        description: tr("askPage.selectCountryDescription"),
      });
      return;
    }

    const normalizedCountry = normalizeCountryCode(country);
    const visibleMessage = displayQuestion || question;
    const canonicalQuestion = options.originalQuestion || question;
    const requestedTurnType = options.refinementContext
      ? "refinement"
      : contextWindows.length > 0
        ? "follow_up"
        : "new_question";

    // Validate question before submitting
    const validation = validateQuestion(canonicalQuestion, normalizedCountry);
    if (!displayQuestion && !validation.isValid) {
      const localizedMissingInfo = validation.missingInfo.map(localizeValidationMessage);
      const localizedSuggestions = validation.suggestions.map(localizeValidationMessage);

      setValidationError(localizedMissingInfo.join(" "));
      setValidationSuggestions(localizedSuggestions);
      setError(localizedMissingInfo[0] || tr("askPage.detailPrompt"));
      setNeedsMoreInfo(true);
      
      toast.warning(tr("askPage.validation.needsMoreDetailsTitle"), {
        description: localizedMissingInfo[0] || tr("askPage.validation.pleaseBeMoreSpecific"),
      });
      return;
    }
    
    // Clear validation state
    setValidationError(null);
    setValidationSuggestions([]);
    setNeedsMoreInfo(false);

    setIsLoading(true);
    setError(null);
    setLastCountry(normalizedCountry);
    setLastSubmittedQuestion(canonicalQuestion);
    setPrefill("");
    setDocumentAnalysis(null);
    setMissingContextDetails(null);
    setMissingContextText("");
    setTrackedProcessIds([]);
    setAnswerDiff(null);

    // Generate unique ID for this question
    const questionId = makeId("q");
    setCurrentQuestionId(questionId);

    if (!temporaryChat) {
      const processingProcess = createProcessingProcess(canonicalQuestion, normalizedCountry, questionId, {
        waitingForAnswer: processCopy.waitingForAnswer,
        questionSubmitted: processCopy.questionSubmitted,
        questionSubmittedBody: processCopy.questionSubmittedBody,
        answerGeneration: processCopy.answerGeneration,
        answerGenerationBody: processCopy.answerGenerationBody,
        autoCreatedNotes: processCopy.autoCreatedNotes,
      });
      addProcess(processingProcess);
      activeProcessIdRef.current = processingProcess.id;
      setTrackedProcessIds([processingProcess.id]);
    } else {
      activeProcessIdRef.current = null;
    }

    const routeDecision = classifyAskTurn({
      contexts: contextWindows,
      activeContextId,
      canonicalQuestion,
      visibleMessage,
      country: normalizedCountry,
      turnType: requestedTurnType,
    });
    const nextThreadId = activeThreadId || makeId("thread");
    const existingContext = routeDecision.contextId
      ? contextWindows.find((context) => context.id === routeDecision.contextId)
      : undefined;
    const nextContextId = existingContext?.id || makeId("ctx");
    const baseMessages = existingContext?.messages ?? [];
    const previousResponse = existingContext?.lastGoodResponse ?? existingContext?.lastResponse ?? (routeDecision.shouldCreate ? null : bureaucracyResponse);
    const previousAnswerText = existingContext?.lastAnswerText ?? answerToDiffText(previousResponse);
    const contextDigest = existingContext?.contextDigest || answerToContextDigest(previousResponse);
    const baseSearchQuery = existingContext?.searchQuery || existingContext?.canonicalQuestion || "";
    const turnSearchQuery = routeDecision.shouldCreate
      ? canonicalQuestion
      : options.refinementContext
        ? baseSearchQuery || canonicalQuestion
        : [baseSearchQuery, canonicalQuestion]
            .filter((part, index, parts): part is string => Boolean(part) && parts.indexOf(part) === index)
            .join(" - ") || canonicalQuestion;
    const askTurn = createAskTurn({
      text: canonicalQuestion,
      visibleMessage,
      canonicalQuestion,
      turnType: routeDecision.shouldCreate ? "new_question" : requestedTurnType,
      refinementContext: options.refinementContext,
      contextDigest,
      searchQuery: turnSearchQuery,
      conversationHistory: baseMessages.slice(-12).map((message) => ({
        role: message.role,
        content: message.content,
      })),
    });
    const contextTitle = existingContext?.title || makeContextTitle(askTurn.canonicalQuestion);

    setActiveThreadId(nextThreadId);
    setActiveContextId(nextContextId);

    if (existingContext && existingContext.id !== activeContextId) {
      setBureaucracyResponse(existingContext.lastResponse ?? null);
    } else if (routeDecision.shouldCreate) {
      setBureaucracyResponse(null);
    }

    if (!existingContext) {
      const newContext: ChatContextWindow = {
        id: nextContextId,
        title: contextTitle,
        themeKey: routeDecision.themeKey,
        country: normalizedCountry,
        language,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        messages: [],
        canonicalQuestion: askTurn.canonicalQuestion,
        contextDigest: askTurn.contextDigest,
        searchQuery: askTurn.searchQuery,
      };
      setContextWindows((prev) => [newContext, ...prev]);
    }

    // Add user message to conversation
    const userMessage: ConversationMessage = {
      id: questionId,
      role: "user",
      content: askTurn.visibleMessage,
      timestamp: new Date(),
      country: normalizedCountry,
      temporary: temporaryChat,
    };

    setConversationHistory([
      ...baseMessages.map((message) => ({
        id: message.id,
        role: message.role,
        content: message.content,
        timestamp: new Date(message.timestamp),
        country: message.country,
        response: message.response,
        temporary: message.temporary,
      })),
      userMessage,
    ]);
    setShowConversation(true);

    requestAnimationFrame(() => {
      requestAnimationFrame(scrollToLoadingAnchor);
    });

    const countryName = getCountryName(normalizedCountry);
    
    const loadingToast = toast.loading(tr("askPage.searchingFor", { country: countryName }), {
      description: tr("askPage.providingGuidance"),
    });

    try {
      let documentText: string | undefined;
      
      if (file) {
        try {
          const formData = new FormData();
          formData.append('file', file);
          
          const extractRes = await fetch("/api/extract-text", {
            method: "POST",
            body: formData,
          });
          
          if (extractRes.ok) {
            const extractData = await extractRes.json();
            documentText = extractData.text;
          }
        } catch (err) {
          console.error("File extraction error:", err);
        }
      }

      const contextMessages = baseMessages.slice(-12).map(msg => ({
        role: msg.role,
        content: msg.content,
      }));

      // Call the ask API with conversation history
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: documentText || askTurn.canonicalQuestion,
          country: normalizedCountry,
          language,
          conversationHistory: contextMessages,
          isFollowUp: askTurn.turnType !== "new_question",
          sessionId: existingContext?.sessionId,
          contextId: nextContextId,
          previousAnswer: askTurn.contextDigest || previousAnswerText || undefined,
          previousResponseSummary: askTurn.contextDigest || previousResponse?.summary || previousResponse?._rawContent,
          refinementContext: askTurn.refinementContext,
          originalQuestion: askTurn.canonicalQuestion,
          turn: {
            ...askTurn,
            contextDigest: askTurn.contextDigest || undefined,
          },
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to process question");
      }

      const data = await res.json();

      if (data.response) {
        const response = data.response as BureaucracyResponse;
        const nextAnswerText = answerToDiffText(response);
        const diffSummary = previousAnswerText ? buildAnswerDiff(previousAnswerText, nextAnswerText) : null;
        setAnswerDiff(diffSummary);

        // Add assistant response to conversation
        const assistantMessage: ConversationMessage = {
          id: makeId("a"),
          role: "assistant",
          content: diffSummary && !diffSummary.unchanged
            ? formatDiffForChat(diffSummary)
            : response.summary || response._rawContent || tr("askPage.responseReceived"),
          timestamp: new Date(),
          country: normalizedCountry,
          response,
          temporary: temporaryChat,
        };

        const nextContextMessages = [
          ...baseMessages,
          {
            id: userMessage.id,
            role: userMessage.role,
            content: userMessage.content,
            timestamp: userMessage.timestamp.getTime(),
            country: userMessage.country,
            temporary: userMessage.temporary,
          },
          {
            id: assistantMessage.id,
            role: assistantMessage.role,
            content: assistantMessage.content,
            timestamp: assistantMessage.timestamp.getTime(),
            country: assistantMessage.country,
            response,
            temporary: assistantMessage.temporary,
            diffSummary: diffSummary ?? undefined,
          },
        ];

        const updatedContext: ChatContextWindow = {
          ...(existingContext ?? {
            id: nextContextId,
            title: makeContextTitle(askTurn.canonicalQuestion, response),
            themeKey: inferProcedureTheme(askTurn.canonicalQuestion, response),
            country: normalizedCountry,
            language,
            createdAt: Date.now(),
          }),
          id: nextContextId,
          title: existingContext?.title || makeContextTitle(askTurn.canonicalQuestion, response),
          themeKey: inferProcedureTheme(askTurn.canonicalQuestion, response),
          country: normalizedCountry,
          language,
          updatedAt: Date.now(),
          messages: nextContextMessages,
          lastResponse: response,
          lastGoodResponse: response,
          lastAnswerText: nextAnswerText,
          canonicalQuestion: askTurn.canonicalQuestion,
          contextDigest: answerToContextDigest(response),
          searchQuery: askTurn.searchQuery,
          sessionId: response._sessionId || existingContext?.sessionId,
        };

        // Save to localStorage history
        addQuestion(askTurn.canonicalQuestion, response as unknown as Record<string, unknown>, normalizedCountry, language, false, {
          temporary: temporaryChat,
          id: temporaryChat ? undefined : questionId,
          threadId: nextThreadId,
          contextId: nextContextId,
        });

        saveChatTurn({
          temporary: temporaryChat,
          threadId: nextThreadId,
          contextId: nextContextId,
          questionId,
          question: askTurn.canonicalQuestion,
          displayQuestion: askTurn.visibleMessage,
          assistantContent: assistantMessage.content,
          response,
          country: normalizedCountry,
          language,
          sessionId: updatedContext.sessionId,
          themeKey: updatedContext.themeKey,
          contextTitle: updatedContext.title,
          canonicalQuestion: askTurn.canonicalQuestion,
          contextDigest: updatedContext.contextDigest,
          searchQuery: askTurn.searchQuery,
          diffSummary: diffSummary ?? undefined,
        });

        setContextWindows((prev) => [
          updatedContext,
          ...prev.filter((context) => context.id !== nextContextId),
        ]);
        setConversationHistory([
          ...nextContextMessages.map((message) => ({
            id: message.id,
            role: message.role,
            content: message.content,
            timestamp: new Date(message.timestamp),
            country: message.country,
            response: message.response,
            temporary: message.temporary,
          })),
        ]);
        setBureaucracyResponse(response);

        if (!temporaryChat && activeProcessIdRef.current) {
          const tracked = createProcessFromResponse(askTurn.canonicalQuestion, response, normalizedCountry);
          updateProcess(activeProcessIdRef.current, {
            ...tracked,
            id: activeProcessIdRef.current,
            progress: 25,
            sourceQuestionId: questionId,
            origin: "auto",
          });
        }

        if (response.needsMoreContext || response.missingContext?.length || response.followUpQuestions?.length) {
          setNeedsMoreInfo(true);
          setMissingContextDetails({
            originalQuestion: askTurn.canonicalQuestion,
            response,
            missingContext: response.missingContext ?? [],
            followUpQuestions: response.followUpQuestions ?? [],
          });
        }

        // Update suggested follow-ups based on procedure type
        const procedureName = response.procedureName?.toLowerCase() || '';
        if (procedureName.includes('visa')) {
          setSuggestedFollowUps([...defaultFollowUps.visa, ...defaultFollowUps.default]);
        } else if (procedureName.includes('permit')) {
          setSuggestedFollowUps([...defaultFollowUps.permit, ...defaultFollowUps.default]);
        } else {
          setSuggestedFollowUps(defaultFollowUps.default);
        }

        toast.success(tr("askPage.detailedReady"), {
          id: loadingToast,
          description: tr("askPage.detailedInfoFor", {
            country: countryName,
            procedure: response.procedureName,
          }),
        });
        requestAnimationFrame(() => {
          requestAnimationFrame(() => scrollToAnswerEnd("smooth"));
        });
      } else if (data.error) {
        throw new Error(data.error);
      }
    } catch (err) {
      console.error("Ask error:", err);
      if (!temporaryChat && activeProcessIdRef.current) {
        updateProcess(activeProcessIdRef.current, {
          status: "waiting",
          nextStep: processCopy.retryQuestion,
          notes: `${processCopy.processingFailedNotes} ${canonicalQuestion}`,
        });
      }
      setError(tr("askPage.failedAnswer"));
      toast.error(tr("askPage.failedAnswer"), {
        id: loadingToast,
        description: tr("askPage.checkConnection"),
      });
    } finally {
      setIsLoading(false);
      scrollToBottom();
    }
  };

  // Prefill if a question came in via ?q=. History restores the full conversation above.
  useEffect(() => {
    if (initialQ && !historyId) {
      setPrefill(initialQ);
    }
  }, [initialQ, historyId]);

  const handleReset = () => {
    setBureaucracyResponse(null);
    setDocumentAnalysis(null);
    setError(null);
    setPrefill("");
    setNeedsMoreInfo(false);
    setConversationHistory([]);
    setShowConversation(false);
    setCurrentQuestionId(null);
    setLoadedHistoryItem(null);
    setMissingContextDetails(null);
    setMissingContextText("");
    setLastSubmittedQuestion("");
    setTrackedProcessIds([]);
    setActiveThreadId(null);
    setActiveContextId(null);
    setContextWindows([]);
    setAnswerDiff(null);
    pendingHistoryAnswerScrollRef.current = false;
    if (historyAnswerScrollFrameRef.current !== null) {
      window.cancelAnimationFrame(historyAnswerScrollFrameRef.current);
      historyAnswerScrollFrameRef.current = null;
    }
    activeProcessIdRef.current = null;
  };

  const toggleConversation = () => {
    setShowConversation(prev => !prev);
  };

  const handleNewContext = () => {
    const contextId = makeId("ctx");
    const threadId = activeThreadId || makeId("thread");
    const now = Date.now();
    const nextContext: ChatContextWindow = {
      id: contextId,
      title: "New context",
      themeKey: "general",
      country: normalizeCountryCode(lastCountry),
      language,
      createdAt: now,
      updatedAt: now,
      messages: [],
    };

    setActiveThreadId(threadId);
    setActiveContextId(contextId);
    setContextWindows((prev) => [nextContext, ...prev]);
    setConversationHistory([]);
    setBureaucracyResponse(null);
    setAnswerDiff(null);
    setShowConversation(false);
  };

  const handleContextSelect = (context: ChatContextWindow) => {
    loadContextWindow(context, activeThreadId ?? undefined);
    requestAnimationFrame(() => {
      requestAnimationFrame(scrollToGeneratedPart);
    });
  };

  const handleTrackProcess = () => {
    if (!bureaucracyResponse || temporaryChat) return;
    const sourceQuestionId = loadedHistoryItem?.id ?? currentQuestionId ?? undefined;
    const tracked = trackResponseAsProcess(
      lastSubmittedQuestion || bureaucracyResponse.procedureName,
      bureaucracyResponse,
      lastCountry,
      sourceQuestionId,
    );
    setTrackedProcessIds(prev => [...prev, tracked.id]);
    toast.success(tr("askPage.processTracked"), {
      description: tracked.name,
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-2"
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{tr("askPage.title")}</h1>
            <p className="text-muted-foreground">
              {tr("askPage.subtitle")}
            </p>
          </div>

          <div className="flex flex-col items-end gap-2 sm:flex-row sm:items-center">
            <div
              className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs shadow-sm transition-colors ${
                temporaryChat
                  ? "border-amber-400/60 bg-amber-50 text-amber-900 dark:bg-amber-950/30 dark:text-amber-200"
                  : "border-border bg-background/80 text-muted-foreground"
              }`}
              title={tr("askPage.temporaryChatDescription")}
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{tr("askPage.temporaryChatShort")}</span>
              <Switch checked={temporaryChat} onCheckedChange={handleTemporaryChange} className="scale-75" />
            </div>

            {conversationHistory.length > 0 && (
              <Button
                variant={showConversation ? "default" : "outline"}
                size="sm"
                onClick={toggleConversation}
                className="gap-2"
              >
                <MessageCircle className="h-4 w-4" />
                {showConversation ? tr("askPage.hideHistory") : tr("askPage.showHistory")}
                {conversationHistory.length > 0 && (
                  <Badge variant="secondary" className="ml-1">
                    {conversationHistory.length}
                  </Badge>
                )}
              </Button>
            )}
          </div>
        </div>
      </motion.div>

      {/* Conversation History Panel */}
      <AnimatePresence>
        {showConversation && conversationHistory.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <Card className="max-h-[500px] overflow-y-auto">
              <CardHeader className="pb-3 sticky top-0 bg-card z-10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MessageCircle className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg">
                      {loadedHistoryItem ? tr("askPage.continuingFromHistory") : tr("askPage.historyTitle")}
                    </CardTitle>
                    {loadedHistoryItem && (
                      <Badge variant="outline" className="gap-1 text-xs">
                        <History className="h-3 w-3 mr-1" />
                        <CountryCodeBadge code={loadedHistoryItem.country} />
                      </Badge>
                    )}
                  </div>
                  <Button variant="ghost" size="sm" onClick={handleReset} className="gap-2">
                    <RotateCcw className="h-4 w-4" />
                    {tr("common.clear")}
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {conversationHistory.map((msg, index) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-lg p-4 ${
                        msg.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs font-medium ${
                          msg.role === 'user' ? 'text-primary-foreground/70' : 'text-muted-foreground'
                        }`}>
                          {msg.role === 'user' ? tr("askPage.you") : 'FormWise'}
                        </span>
                        <span className={`text-xs ${
                          msg.role === 'user' ? 'text-primary-foreground/50' : 'text-muted-foreground/50'
                        }`}>
                          {format(msg.timestamp, 'HH:mm')}
                        </span>
                        {msg.temporary && (
                          <Badge variant="outline" className="h-5 text-[10px]">
                            {tr("askPage.notSaved")}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>

                      {msg.role === 'assistant' && msg.response && (
                        <div className="mt-3 pt-3 border-t border-border/20">
                          <div className="flex flex-wrap gap-2 text-xs">
                            {msg.response.officeInfo?.name && (
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {msg.response.officeInfo.name}
                              </span>
                            )}
                            {msg.response.totalEstimatedTime && (
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {msg.response.totalEstimatedTime}
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
                <div ref={conversationEndRef} />
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <AskInput
          key={prefill || 'fresh'}
          onSubmit={handleInputSubmit}
          isLoading={isLoading}
          initialValue={prefill}
          initialCountry={lastCountry}
          isFollowUp={showConversation && conversationHistory.length > 0}
        />
      </motion.div>

      {(missingContextDetails || validationError) && !isLoading && (
        <Card className="border-amber-500/50 bg-amber-50 dark:bg-amber-950/20">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <AlertCircle className="h-5 w-5 text-amber-600" />
              {missingContextDetails ? missingContextCopy.title : tr("askPage.validation.needsMoreDetailsTitle")}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {missingContextDetails ? missingContextCopy.body : validationError}
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {missingContextDetails && (
              <div className="flex flex-wrap gap-2">
                {[...missingContextDetails.missingContext, ...missingContextDetails.followUpQuestions].map((item) => (
                  <Button
                    key={item}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setMissingContextText((prev) => prev ? `${prev}\n${item}: ` : `${item}: `)}
                    className="h-auto whitespace-normal text-left"
                  >
                    {item}
                  </Button>
                ))}
              </div>
            )}
            {!missingContextDetails && validationSuggestions.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {validationSuggestions.map((suggestion) => (
                  <Badge key={suggestion} variant="secondary" className="whitespace-normal">
                    {suggestion}
                  </Badge>
                ))}
              </div>
            )}
            {missingContextDetails && (
              <>
                <Textarea
                  value={missingContextText}
                  onChange={(event) => setMissingContextText(event.target.value)}
                  placeholder={missingContextCopy.placeholder}
                  className="min-h-[110px] bg-background"
                />
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" onClick={() => setMissingContextDetails(null)}>
                    {tr("common.close")}
                  </Button>
                  <Button onClick={handleMissingContextSubmit} disabled={!missingContextText.trim()} className="gap-2">
                    <MessageCircle className="h-4 w-4" />
                    {missingContextCopy.send}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Suggestions - only show when no response */}
      <AnimatePresence>
        {!bureaucracyResponse && !documentAnalysis && !isLoading && !error && conversationHistory.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-3"
          >
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Lightbulb className="h-4 w-4" />
              <span>{tr("askPage.suggestionsLabel")}</span>
            </div>

            <div className="flex flex-wrap gap-2">
              {suggestions.map((suggestion) => (
                <Button
                  key={suggestion}
                  variant="outline"
                  size="sm"
                  onClick={() => handleInputSubmit(suggestion, undefined, lastCountry || "BG")}
                  className="text-sm"
                >
                  {suggestion}
                </Button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading State */}
      <AnimatePresence>
        {isLoading && (
          <motion.div
            ref={loadingAnchorRef}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <Card className="p-12">
              <CardContent className="flex flex-col items-center justify-center gap-4 pt-6">
                <div className="relative">
                  <Loader2 className="h-10 w-10 animate-spin text-primary" />
                  <div className="absolute inset-0 h-10 w-10 animate-ping rounded-full bg-primary/20" />
                </div>
                <div className="text-center">
                  <p className="font-medium">{tr("askPage.searchingSources")}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {tr("askPage.compiling")}
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error State - More Info Needed */}
      <AnimatePresence>
        {error && !isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <Card className="p-6 border-amber-500/50 bg-amber-50 dark:bg-amber-950/20">
              <CardContent className="flex flex-col items-center justify-center gap-4 pt-6">
                <AlertCircle className="h-10 w-10 text-amber-600" />
                <div className="text-center max-w-md">
                  <p className="font-medium text-amber-800 dark:text-amber-200">{error}</p>
                  {needsMoreInfo && (
                    <div className="text-sm text-muted-foreground mt-2">
                      {tr("askPage.moreInfoTips.intro")}
                      <ul className="mt-2 text-left list-disc list-inside text-xs">
                        <li>{tr("askPage.moreInfoTips.one")}</li>
                        <li>{tr("askPage.moreInfoTips.two")}</li>
                        <li>{tr("askPage.moreInfoTips.three")}</li>
                      </ul>
                    </div>
                  )}
                </div>
                <Button
                  variant="outline"
                  className="mt-2 gap-2"
                  onClick={() => setNeedsMoreInfo(false)}
                >
                  <RotateCcw className="h-4 w-4" />
                  {tr("common.tryAgain")}
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Document Analysis Display */}
      <AnimatePresence>
        {documentAnalysis && !isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-4"
          >
            <Separator />
            <DocumentAnalysisDisplay analysis={documentAnalysis} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bureaucracy Procedure Display */}
      <AnimatePresence>
        {bureaucracyResponse && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            <div ref={answerSeparatorRef} className="scroll-mt-24">
              <Separator />
            </div>
            
            {/* Response meta info */}
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <Badge variant="outline">
                  {getCountryName(lastCountry)}
                </Badge>
                {bureaucracyResponse._generatedAt && (
                  <span>
                    {tr("askPage.lastUpdated", {
                      date: format(new Date(bureaucracyResponse._generatedAt), 'MMM d, yyyy'),
                    })}
                  </span>
                )}
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleTrackProcess}
                  disabled={temporaryChat || trackedProcessIds.length > 0}
                  className="gap-2"
                  title={temporaryChat ? tr("askPage.trackingDisabledTemporary") : undefined}
                >
                  <ClipboardList className="h-4 w-4" />
                  {trackedProcessIds.length > 0 ? tr("askPage.trackedProcess") : tr("askPage.trackProcess")}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleConversation}
                  className="gap-2"
                >
                  <MessageCircle className="h-4 w-4" />
                  {tr("askPage.viewInChat")}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleReset}
                  className="gap-2"
                >
                  <RotateCcw className="h-4 w-4" />
                  {tr("askPage.newQuestion")}
                </Button>
              </div>
            </div>

            {answerDiff && (
              <Card className="border-primary/30 bg-primary/5">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <RefreshCw className="h-5 w-5 text-primary" />
                    What changed
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {answerDiff.unchanged ? (
                    <p className="text-sm text-muted-foreground">
                      No major changes from the previous answer.
                    </p>
                  ) : (
                    <>
                      {answerDiff.changed.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-sm font-medium">Updated</p>
                          <ul className="space-y-1 text-sm text-muted-foreground">
                            {answerDiff.changed.map((item) => (
                              <li key={item}>- {item}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {answerDiff.added.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-sm font-medium">Added</p>
                          <ul className="space-y-1 text-sm text-muted-foreground">
                            {answerDiff.added.map((item) => (
                              <li key={item}>- {item}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            )}

            <AnswerDisplay response={bureaucracyResponse} />
            <div ref={answerEndRef} className="h-px scroll-mb-6" />

            {/* Suggested Follow-up Questions */}
            <Card className="bg-gradient-to-r from-primary/5 to-accent/5 border-primary/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Lightbulb className="h-5 w-5 text-primary" />
                  {tr("askPage.followUpTitle")}
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  {tr("askPage.followUpSubtitle")}
                </p>
              </CardHeader>

              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {suggestedFollowUps.map((followUp, index) => (
                    <Button
                      key={`${followUp.category}-${index}`}
                      variant="outline"
                      size="sm"
                      onClick={() => handleFollowUp(followUp.question)}
                      disabled={isLoading}
                      className="text-left justify-start h-auto py-2 px-3"
                    >
                      <div className="flex flex-col items-start">
                        <span className="text-xs text-muted-foreground mb-1">{followUp.category}</span>
                        <span>{followUp.question}</span>
                      </div>
                      <ChevronRight className="h-4 w-4 ml-auto flex-shrink-0" />
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function AskPage() {
  return (
    <Suspense
      fallback={<div className="text-muted-foreground">Loading...</div>}
    >
      <AskPageInner />
    </Suspense>
  );
}
