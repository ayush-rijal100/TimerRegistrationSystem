export type DateRangeResult = {
  startDate: string;
  endDate: string;
  label: string;
};

const monthNameToNumber: Record<string, number> = {
  january: 0,
  jan: 0,
  february: 1,
  feb: 1,
  march: 2,
  mar: 2,
  april: 3,
  apr: 3,
  may: 4,
  june: 5,
  jun: 5,
  july: 6,
  jul: 6,
  august: 7,
  aug: 7,
  september: 8,
  sep: 8,
  sept: 8,
  october: 9,
  oct: 9,
  november: 10,
  nov: 10,
  december: 11,
  dec: 11
};

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function startOfWeek(date: Date): Date {
  const copy = new Date(date);
  const day = copy.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  copy.setDate(copy.getDate() + diff);
  return copy;
}

function endOfWeek(date: Date): Date {
  const start = startOfWeek(date);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return end;
}

function startOfMonth(year: number, monthIndex: number): Date {
  return new Date(year, monthIndex, 1);
}

function endOfMonth(year: number, monthIndex: number): Date {
  return new Date(year, monthIndex + 1, 0);
}

export function parseDateRange(message: string): DateRangeResult {
  const normalized = message.toLowerCase();
  const today = new Date();

  if (normalized.includes("yesterday")) {
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    return {
      startDate: formatDate(yesterday),
      endDate: formatDate(yesterday),
      label: "yesterday"
    };
  }

  // ADDED: Natural-language current month support.
  // Example: "show my time entries this month"
  if (normalized.includes("this month") || normalized.includes("current month")) {
    return {
      startDate: formatDate(startOfMonth(today.getFullYear(), today.getMonth())),
      endDate: formatDate(endOfMonth(today.getFullYear(), today.getMonth())),
      label: "this month"
    };
  }

  if (normalized.includes("this week") || normalized.includes("week")) {
    return {
      startDate: formatDate(startOfWeek(today)),
      endDate: formatDate(endOfWeek(today)),
      label: "this week"
    };
  }

  const explicitRange = message.match(/(\d{4}-\d{2}-\d{2})\s+(?:to|until|-)\s+(\d{4}-\d{2}-\d{2})/);

  if (explicitRange) {
    return {
      startDate: explicitRange[1],
      endDate: explicitRange[2],
      label: `${explicitRange[1]} to ${explicitRange[2]}`
    };
  }

  // ADDED: Month-name range support.
  // Examples:
  // - "from 2026 april to 2026 june"
  // - "from april 2026 to june 2026"
  const yearMonthRange = normalized.match(
    /(?:from\s+)?(?:(\d{4})\s+)?([a-z]+)\s+(?:(\d{4})\s+)?(?:to|until|-)\s+(?:(\d{4})\s+)?([a-z]+)\s*(\d{4})?/
  );

  if (yearMonthRange) {
    const startYearText = yearMonthRange[1] ?? yearMonthRange[3] ?? yearMonthRange[4] ?? yearMonthRange[6];
    const endYearText = yearMonthRange[4] ?? yearMonthRange[6] ?? startYearText;
    const startMonth = monthNameToNumber[yearMonthRange[2]];
    const endMonth = monthNameToNumber[yearMonthRange[5]];

    if (startMonth !== undefined && endMonth !== undefined) {
      const startYear = Number(startYearText ?? today.getFullYear());
      const endYear = Number(endYearText ?? startYear);

      return {
        startDate: formatDate(startOfMonth(startYear, startMonth)),
        endDate: formatDate(endOfMonth(endYear, endMonth)),
        label: `${yearMonthRange[2]} ${startYear} to ${yearMonthRange[5]} ${endYear}`
      };
    }
  }

  const singleDate = message.match(/\d{4}-\d{2}-\d{2}/);

  if (singleDate) {
    return {
      startDate: singleDate[0],
      endDate: singleDate[0],
      label: singleDate[0]
    };
  }

  const hasDayMonthPattern = /\b\d{1,2}(?:st|nd|rd|th)?\s+(january|jan|february|feb|march|mar|april|apr|may|june|jun|july|jul|august|aug|september|sep|sept|october|oct|november|nov|december|dec)\b/.test(normalized);

  const singleMonth = !hasDayMonthPattern
    ? normalized.match(
        /(?:^|\s)(?:for\s+)?(?:the\s+)?(?:month\s+of\s+)?(january|jan|february|feb|march|mar|april|apr|may|june|jun|july|jul|august|aug|september|sep|sept|october|oct|november|nov|december|dec)(?:\s+(\d{4}))?(?:\s|$)/
      )
    : null;

  if (singleMonth) {
    const monthIndex = monthNameToNumber[singleMonth[1]];
    const year = Number(singleMonth[2] ?? today.getFullYear());

    if (monthIndex !== undefined) {
      return {
        startDate: formatDate(startOfMonth(year, monthIndex)),
        endDate: formatDate(endOfMonth(year, monthIndex)),
        label: `${singleMonth[1]} ${year}`
      };
    }
  }

  
  return {
    startDate: formatDate(today),
    endDate: formatDate(today),
    label: "today"
  };
}
