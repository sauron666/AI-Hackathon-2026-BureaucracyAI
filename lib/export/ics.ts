"use client"

/**
 * iCalendar (.ics) export.
 *
 * Generates RFC-5545 compliant calendar files so users can drop their
 * tracked process deadlines into Google Calendar, Outlook, Apple Calendar.
 *
 * Each step with a date becomes a VEVENT.
 */

interface CalendarEvent {
  uid: string
  title: string
  description?: string
  start: Date
  end?: Date
  location?: string
  url?: string
  /** Reminders in minutes before start. */
  remindersMinutes?: number[]
}

function pad(n: number): string {
  return String(n).padStart(2, "0")
}

function formatDate(d: Date, allDay: boolean): string {
  if (allDay) {
    return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}`
  }
  return (
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
    `T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
  )
}

function escapeText(s: string): string {
  return s
    .replaceAll("\\", "\\\\")
    .replaceAll(",", "\\,")
    .replaceAll(";", "\\;")
    .replaceAll("\n", "\\n")
    .replaceAll("\r", "")
}

function fold(line: string): string {
  // RFC 5545 says lines must be <= 75 octets. Fold by inserting CRLF + space.
  if (line.length <= 75) return line
  const out: string[] = []
  for (let i = 0; i < line.length; i += 73) {
    out.push((i === 0 ? "" : " ") + line.slice(i, i + 73))
  }
  return out.join("\r\n")
}

function buildEvent(event: CalendarEvent): string {
  const allDay = !event.end && event.start.getUTCHours() === 0 && event.start.getUTCMinutes() === 0
  const lines: string[] = ["BEGIN:VEVENT"]
  lines.push(`UID:${event.uid}`)
  lines.push(`DTSTAMP:${formatDate(new Date(), false)}`)

  if (allDay) {
    lines.push(`DTSTART;VALUE=DATE:${formatDate(event.start, true)}`)
    const endDate = event.end ?? new Date(event.start.getTime() + 24 * 3600 * 1000)
    lines.push(`DTEND;VALUE=DATE:${formatDate(endDate, true)}`)
  } else {
    lines.push(`DTSTART:${formatDate(event.start, false)}`)
    lines.push(`DTEND:${formatDate(event.end ?? new Date(event.start.getTime() + 3600 * 1000), false)}`)
  }

  lines.push(`SUMMARY:${escapeText(event.title)}`)
  if (event.description) lines.push(`DESCRIPTION:${escapeText(event.description)}`)
  if (event.location) lines.push(`LOCATION:${escapeText(event.location)}`)
  if (event.url) lines.push(`URL:${event.url}`)

  for (const min of event.remindersMinutes ?? []) {
    lines.push("BEGIN:VALARM")
    lines.push("ACTION:DISPLAY")
    lines.push(`DESCRIPTION:${escapeText(event.title)}`)
    lines.push(`TRIGGER:-PT${min}M`)
    lines.push("END:VALARM")
  }

  lines.push("END:VEVENT")
  return lines.map(fold).join("\r\n")
}

export function buildICS(events: CalendarEvent[], calendarName = "FormWise"): string {
  const header = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:-//FormWise//${calendarName}//EN`,
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeText(calendarName)}`,
  ]
  return [
    ...header,
    ...events.map(buildEvent),
    "END:VCALENDAR",
  ].join("\r\n")
}

/** Trigger a download in the browser. */
export function downloadICS(filename: string, content: string): void {
  const blob = new Blob([content], { type: "text/calendar;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename.endsWith(".ics") ? filename : `${filename}.ics`
  document.body.appendChild(a)
  a.click()
  setTimeout(() => {
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, 100)
}
