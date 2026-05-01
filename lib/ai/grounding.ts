import type { CountryComparison, RelocationJourney } from '@/lib/types';
import { t } from '@/lib/i18n';

type FinalizeCompareOptions = {
  question: string;
  language: string;
  groundedCountries: Array<{ code: string; name: string }>;
  omittedCountries: string[];
};

type FinalizeJourneyOptions = {
  language: string;
  countryName: string;
  groundedAreas: string[];
  missingAreas: string[];
};

const JOURNEY_PHASE_BUILDERS = [
  {
    phase: 'Before you leave',
    timeline: 'Before departure',
    matches: ['before you leave', 'before departure', 'pre-departure'],
  },
  {
    phase: 'First week in COUNTRY',
    timeline: 'Days 1-7',
    matches: ['first week', 'week 1', 'arrival week'],
  },
  {
    phase: 'First month',
    timeline: 'Weeks 2-4',
    matches: ['first month', 'month 1'],
  },
  {
    phase: 'First 3 months',
    timeline: 'Months 2-3',
    matches: ['first 3 months', 'first three months', 'months 2-3'],
  },
] as const;

function normalizeText(value: string | null | undefined): string {
  return (value || '').trim().toLowerCase();
}

function dedupeStrings(values: string[]): string[] {
  const seen = new Set<string>();
  const deduped: string[] = [];

  for (const value of values) {
    const normalized = normalizeText(value);
    if (!normalized || seen.has(normalized)) {
      continue;
    }

    seen.add(normalized);
    deduped.push(value.trim());
  }

  return deduped;
}

export function finalizeCountryComparison(
  comparison: CountryComparison,
  options: FinalizeCompareOptions,
): CountryComparison {
  const groundedCountryMap = new Map(
    options.groundedCountries.map((country) => [country.code, country.name]),
  );

  const seenCodes = new Set<string>();
  const countries = comparison.countries
    .filter((country) => groundedCountryMap.has(country.country_code))
    .filter((country) => {
      if (seenCodes.has(country.country_code)) {
        return false;
      }

      seenCodes.add(country.country_code);
      return true;
    })
    .map((country) => ({
      ...country,
      country_name: groundedCountryMap.get(country.country_code) || country.country_name,
      summary: country.summary.trim(),
      processing_time: country.processing_time?.trim() || null,
      typical_cost: country.typical_cost?.trim() || null,
      key_advantage: country.key_advantage?.trim() || null,
      key_disadvantage: country.key_disadvantage?.trim() || null,
    }));

  const missingGroundedCountries = options.groundedCountries
    .map((country) => country.code)
    .filter((code) => !seenCodes.has(code));

  const recommendationNotes = [
    ...options.omittedCountries.map(
      (code) =>
        t(options.language, 'compareExcludedCountry', { code }),
    ),
    ...missingGroundedCountries.map(
      (code) =>
        t(options.language, 'compareMissingStructuredCountry', { code }),
    ),
  ];

  const recommendation = dedupeStrings([
    comparison.recommendation.trim(),
    ...recommendationNotes,
  ]).join(' ');

  return {
    question_interpreted: comparison.question_interpreted.trim() || options.question,
    countries,
    recommendation:
      recommendation ||
      t(options.language, 'compareNoGroundedOutput'),
  };
}

export function finalizeRelocationJourney(
  journey: RelocationJourney,
  options: FinalizeJourneyOptions,
): RelocationJourney {
  const countryPhaseName = `First week in ${options.countryName}`;
  const phaseDefinitions = JOURNEY_PHASE_BUILDERS.map((definition) => ({
    ...definition,
    phase:
      definition.phase === 'First week in COUNTRY'
        ? countryPhaseName
        : definition.phase,
  }));

  const usedSourcePhases = new Set<number>();
  const globalTaskKeys = new Set<string>();
  const missingPhaseNames: string[] = [];

  const phases = phaseDefinitions.map((definition) => {
    const sourceIndex = journey.phases.findIndex((phase, index) => {
      if (usedSourcePhases.has(index)) {
        return false;
      }

      const normalized = normalizeText(phase.phase);
      return definition.matches.some((candidate) => normalized.includes(candidate));
    });

    if (sourceIndex === -1) {
      missingPhaseNames.push(definition.phase);
      return {
        phase: definition.phase,
        timeline: definition.timeline,
        tasks: [],
      };
    }

    usedSourcePhases.add(sourceIndex);
    const sourcePhase = journey.phases[sourceIndex];
    const localTaskKeys = new Set<string>();
    const tasks = sourcePhase.tasks.filter((task) => {
      const key = normalizeText(task.task);
      if (!key || localTaskKeys.has(key) || globalTaskKeys.has(key)) {
        return false;
      }

      localTaskKeys.add(key);
      globalTaskKeys.add(key);
      return true;
    });

    return {
      phase: definition.phase,
      timeline: sourcePhase.timeline.trim() || definition.timeline,
      tasks: tasks.map((task) => ({
        ...task,
        task: task.task.trim(),
        where: task.where?.trim() || null,
        estimated_time: task.estimated_time?.trim() || null,
      })),
    };
  });

  const warnings = dedupeStrings([
    ...journey.warnings.map((warning) => warning.trim()),
    ...(missingPhaseNames.length > 0
      ? [
          t(options.language, 'journeyMissingPhases', {
            phases: missingPhaseNames.join(', '),
          }),
        ]
      : []),
    ...(options.missingAreas.length > 0
      ? [
          t(options.language, 'journeyLimitedCoverage', {
            areas: options.missingAreas.join(', '),
          }),
        ]
      : []),
    ...(options.groundedAreas.length === 0
      ? [t(options.language, 'journeyNoStrongGrounding')]
      : []),
  ]);

  return {
    title: journey.title.trim() || `Relocation plan for ${options.countryName}`,
    phases,
    warnings,
    estimated_total_cost: journey.estimated_total_cost?.trim() || null,
  };
}
