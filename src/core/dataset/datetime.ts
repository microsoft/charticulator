// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
/**
 * Parse a date string.
 *
 * Expected formats: DateFormat TimeFormat TimezoneFormat
 * - DateFormats:
 *   - YYYY-MM, YYYY-MM-DD
 *   - MM/YYYY, MM/DD/YYYY
 * - TimeFormats:
 *   - HH:MM, HH:MM:SS
 *   - HH:MM{am/pm}, HH:MM:SS{am/pm}
 * - TimezoneFormat:
 *   - +HH:MM, -HH:MM
 *
 * If no timezone is specified, UTC is assumed
 *
 * @param str the date string
 * @returns the parsed Date's unix timestamp (in milliseconds) or null if unable to parse
 */
export function parseDate(str: string) {
  str = str.trim();

  // Just try a simple parse first, then try regex matching
  const date = Date.parse(str);
  if (!isNaN(date)) {
    return date;
  }

  let m;
  // Overall pass
  m = str.match(
    /^(((\d{4})-(\d{2})(-(\d{2}))?|(\d{2})(\/(\d{2}))?\/(\d{4}))( +((\d{2}):(\d{2})(:(\d{2}))?(am|pm)?)( +(([+-]\d{2}):(\d{2})))?)?|(\d{2}):(\d{2})(:(\d{2}))?(am|pm)?)$/i
  );
  if (m) {
    let year = 1970,
      month = 1,
      day = 1,
      hour = 0,
      minute = 0,
      second = 0;
    // Date string
    if (m[2] != undefined) {
      // ((\d{4})-(\d{2})(-(\d{2}))?|((\d{2})\/)?(\d{2})\/(\d{4}))
      if (m[3] != undefined) {
        // (\d{4})-(\d{2})(-(\d{2}))?
        year = +m[3];
        month = +m[4];
        if (m[6] != undefined) {
          day = +m[6];
        }
      }
      if (m[10] != undefined) {
        // ((\d{2})\/)?(\d{2})\/(\d{4}))
        year = +m[10];
        month = +m[7];
        if (m[9] != undefined) {
          day = +m[9];
        }
      }
    }
    // Time string
    let ampm: string;
    if (m[12] != undefined) {
      hour = +m[13];
      minute = +m[14];
      if (m[16] != undefined) {
        second = +m[16];
      }
      if (m[17] != undefined) {
        ampm = m[17].toLowerCase();
      }
    }
    if (m[22] != undefined) {
      hour = +m[22];
      minute = +m[23];
      if (m[25] != undefined) {
        second = +m[25];
      }
      if (m[26] != undefined) {
        ampm = m[26].toLowerCase();
      }
    }
    if (ampm == "am") {
      if (hour < 1 || hour > 12) {
        return null;
      }
      if (hour == 12) {
        hour = 0;
      }
    } else if (ampm == "pm") {
      if (hour < 1 || hour > 12) {
        return null;
      }
      if (hour != 12) {
        hour += 12;
      }
    }
    let timestamp = Date.UTC(year, month - 1, day, hour, minute, second, 0);
    if (timestamp == null || isNaN(timestamp)) {
      return null;
    }
    if (m[20] != undefined) {
      const offsetHours = +m[20].slice(1);
      const offsetMinutes = +m[21];
      const offsetMS = (offsetHours * 60 + offsetMinutes) * 60000;
      if (m[20][0] == "+") {
        timestamp += offsetMS;
      } else {
        timestamp -= offsetMS;
      }
    }
    return timestamp;
  } else {
    return null;
  }
}

export const monthNames = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec"
];

const monthNameMap: { [name: string]: string } = {
  jan: "Jan",
  january: "Jan",

  feb: "Feb",
  february: "Feb",

  mar: "Mar",
  march: "Mar",

  apr: "Apr",
  april: "Apr",

  may: "May",

  jun: "Jun",
  june: "Jun",

  jul: "Jul",
  july: "Jul",

  aug: "Aug",
  august: "Aug",

  sep: "Sep",
  sept: "Sep",
  september: "Sep",

  oct: "Oct",
  october: "Oct",

  nov: "Nov",
  november: "Nov",

  dec: "Dec",
  december: "Dec"
};

/** Check if a string is a month name, if yes, return a normalized version */
export function testAndNormalizeMonthName(str: string) {
  if (str.endsWith(".")) {
    str = str.substr(0, str.length - 1);
  }
  str = str.toLowerCase();
  return monthNameMap[str];
}
