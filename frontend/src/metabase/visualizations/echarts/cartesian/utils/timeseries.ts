import _ from "underscore";

import type { Dayjs } from "dayjs";
import dayjs from "dayjs";
import type {
  DateTimeAbsoluteUnit,
  RawSeries,
  RowValue,
} from "metabase-types/api";
import type {
  CartesianChartDateTimeAbsoluteUnit,
  TimeSeriesInterval,
} from "metabase/visualizations/echarts/cartesian/model/types";
import { parseTimestamp } from "metabase/lib/time";
import type { Formatter } from "metabase/visualizations/types";
import type { ContinuousDomain } from "metabase/visualizations/shared/types/scale";

const getApproximateUnitDurationMs = (
  unit: CartesianChartDateTimeAbsoluteUnit,
) => {
  switch (unit) {
    case "ms":
      return 1;
    case "second":
      return 1000;
    case "minute":
      return 60 * 1000;
    case "hour":
      return 60 * 60 * 1000;
    case "day":
      return 24 * 60 * 60 * 1000;
    case "week":
      return 7 * 24 * 60 * 60 * 1000;
    case "month":
      return 28 * 24 * 60 * 60 * 1000;
    case "quarter":
      return 3 * 30 * 24 * 60 * 60 * 1000;
    case "year":
      return 365 * 24 * 60 * 60 * 1000;
    default:
      throw Error(`Unsupported unit ${unit}`);
  }
};

export const getTimeSeriesIntervalDuration = ({
  unit,
  count,
}: TimeSeriesInterval) => {
  return getApproximateUnitDurationMs(unit) * count;
};

export const tryGetDate = (rowValue: RowValue): Dayjs | null => {
  if (typeof rowValue === "boolean") {
    return null;
  }
  const date = dayjs(rowValue);
  return date.isValid() ? date : null;
};

// mostly matches
// https://github.com/mbostock/d3/wiki/Time-Scales
// https://github.com/mbostock/d3/wiki/Time-Intervals
// Use UTC methods to avoid issues with daylight savings
// NOTE: smaller modulos within an interval type must be multiples of larger ones (e.x. can't do both 2 days and 7 days i.e. week)
//
// Count and time interval for axis.ticks()
//
export const TIMESERIES_INTERVALS: (TimeSeriesInterval & {
  testFn: (date: Dayjs) => number;
})[] = [
  { unit: "ms", count: 1, testFn: (_d: Dayjs) => 0 }, //  (0) millisecond
  { unit: "second", count: 1, testFn: (d: Dayjs) => d.millisecond() }, //  (1) 1 second
  { unit: "second", count: 5, testFn: (d: Dayjs) => d.second() % 5 }, //  (2) 5 seconds
  { unit: "second", count: 15, testFn: (d: Dayjs) => d.second() % 15 }, //  (3) 15 seconds
  { unit: "second", count: 30, testFn: (d: Dayjs) => d.second() % 30 }, //  (4) 30 seconds
  { unit: "minute", count: 1, testFn: (d: Dayjs) => d.second() }, //  (5) 1 minute
  { unit: "minute", count: 5, testFn: (d: Dayjs) => d.minute() % 5 }, //  (6) 5 minutes
  { unit: "minute", count: 15, testFn: (d: Dayjs) => d.minute() % 15 }, //  (7) 15 minutes
  { unit: "minute", count: 30, testFn: (d: Dayjs) => d.minute() % 30 }, //  (8) 30 minutes
  { unit: "hour", count: 1, testFn: (d: Dayjs) => d.minute() }, //  (9) 1 hour
  { unit: "hour", count: 3, testFn: (d: Dayjs) => d.hour() % 3 }, // (10) 3 hours
  { unit: "hour", count: 6, testFn: (d: Dayjs) => d.hour() % 6 }, // (11) 6 hours
  { unit: "hour", count: 12, testFn: (d: Dayjs) => d.hour() % 12 }, // (12) 12 hours
  { unit: "day", count: 1, testFn: (d: Dayjs) => d.hour() }, // (13) 1 day
  { unit: "week", count: 1, testFn: (d: Dayjs) => d.day() }, // (14) 1 week
  { unit: "month", count: 1, testFn: (d: Dayjs) => d.date() }, // (15) 1 month
  { unit: "month", count: 3, testFn: (d: Dayjs) => d.month() % 3 }, // (16) 3 months / 1 quarter
  { unit: "year", count: 1, testFn: (d: Dayjs) => d.month() }, // (17) 1 year
  { unit: "year", count: 5, testFn: (d: Dayjs) => d.year() % 5 }, // (18) 5 year
  { unit: "year", count: 10, testFn: (d: Dayjs) => d.year() % 10 }, // (19) 10 year
  { unit: "year", count: 50, testFn: (d: Dayjs) => d.year() % 50 }, // (20) 50 year
  { unit: "year", count: 100, testFn: (d: Dayjs) => d.year() % 100 }, // (21) 100 year
];

// mapping from Metabase "unit" to d3 intervals above
const INTERVAL_INDEX_BY_UNIT: Record<DateTimeAbsoluteUnit, number> = {
  minute: 5,
  hour: 9,
  day: 13,
  week: 14,
  month: 15,
  quarter: 16,
  year: 17,
};

export function minTimeseriesUnit(
  units: (DateTimeAbsoluteUnit | null)[],
): DateTimeAbsoluteUnit | null {
  return units.reduce(
    (minUnit, unit) =>
      unit != null &&
      (minUnit == null ||
        INTERVAL_INDEX_BY_UNIT[unit] < INTERVAL_INDEX_BY_UNIT[minUnit])
        ? unit
        : minUnit,
    null,
  );
}

export function computeTimeseriesDataInverval(
  xValues: RowValue[],
  unit: DateTimeAbsoluteUnit | null,
) {
  if (unit && INTERVAL_INDEX_BY_UNIT[unit] != null) {
    return TIMESERIES_INTERVALS[INTERVAL_INDEX_BY_UNIT[unit]];
  }

  // Always use 'day' when there's just one value.
  if (xValues.length === 1) {
    return TIMESERIES_INTERVALS.find(i => i.unit === "day");
  }

  // run each interval's test function on each value
  const valueLists = xValues.map(xValue => {
    const parsed = parseTimestamp(xValue);
    return TIMESERIES_INTERVALS.map(interval => interval.testFn(parsed));
  });

  // count the number of different values for each interval
  const intervalCounts = _.zip(...valueLists).map(l => new Set(l).size);

  // find the first interval that has multiple values. we'll subtract 1 to get the previous item later
  let index = intervalCounts.findIndex(size => size !== 1);

  // special case to check: did we get tripped up by the week interval?
  const weekIndex = TIMESERIES_INTERVALS.findIndex(i => i.unit === "week");
  if (index === weekIndex && intervalCounts[weekIndex + 1] === 1) {
    index = intervalCounts.findIndex(
      (size, index) => size !== 1 && index > weekIndex,
    );
  }

  // if we ran off the end of intervals, return the last one
  if (index === -1) {
    return TIMESERIES_INTERVALS[TIMESERIES_INTERVALS.length - 1];
  }

  // index currently points to the first item with multiple values, so move it to the previous interval
  return TIMESERIES_INTERVALS[index - 1];
}

// ------------------------- Computing the TIMESERIES_INTERVALS entry to use for a chart ------------------------- //

/// The number of milliseconds between each tick for an entry in TIMESERIES_INTERVALS.
/// For example a "5 seconds" interval would have a tick "distance" of 5000 milliseconds.
function intervalTickDistanceMilliseconds(interval: TimeSeriesInterval) {
  // add COUNT nuumber of INTERVALS to the UNIX timestamp 0. e.g. add '5 hours' to 0. Then get the new timestamp
  // (in milliseconds). Since we added to 0 this will be the interval between each tick
  return dayjs(0).add(interval.count, interval.unit).valueOf();
}

/// Return the number of ticks we can expect to see over a time range using the TIMESERIES_INTERVALS entry interval.
/// for example a "5 seconds" interval over a time range of a minute should have an expected tick count of 20.
function expectedTickCount(
  interval: TimeSeriesInterval,
  timeRangeMilliseconds: number,
) {
  return Math.ceil(
    timeRangeMilliseconds / intervalTickDistanceMilliseconds(interval),
  );
}

/// Get the appropriate tick interval option from the TIMESERIES_INTERVALS above based on the xAxis bucketing
/// and the max number of ticks we want to show (itself calculated from chart width).
function timeseriesTicksInterval(
  xInterval: TimeSeriesInterval,
  timeRangeMilliseconds: number,
  maxTickCount: number,
) {
  // first we want to find out where in TIMESERIES_INTERVALS we should start looking for a good match. Find the
  // interval with a matching interval and count (e.g. `hour` and `1`) and we'll start there.
  let initialIndex = _.findIndex(TIMESERIES_INTERVALS, ({ unit, count }) => {
    return unit === xInterval.unit && count === xInterval.count;
  });
  // if we weren't able to find soemthing matching then we'll start from the beginning and try everything
  if (initialIndex === -1) {
    initialIndex = 0;
  }

  // now starting at the TIMESERIES_INTERVALS entry in question, calculate the expected tick count for that interval
  // based on the time range we are displaying. If the expected tick count is less than or equal to the target
  // maxTickCount, we can go ahead and use this interval. Otherwise continue on to the next larger interval, for
  // example every 3 hours instead of every one hour. Continue until we find something with an interval large enough
  // to keep the total tick count under the max tick count
  for (const interval of _.rest(TIMESERIES_INTERVALS, initialIndex)) {
    if (expectedTickCount(interval, timeRangeMilliseconds) <= maxTickCount) {
      return interval;
    }
  }

  // If we still failed to find an interval that will produce less ticks than the max then fall back to the largest
  // tick interval (every 100 years)
  return TIMESERIES_INTERVALS[TIMESERIES_INTERVALS.length - 1];
}

/// return the maximum number of ticks to show for a timeseries chart of a given width
function maxTicksForChartWidth(chartWidth: number, tickFormat: Formatter) {
  const PIXELS_PER_CHARACTER = 7;
  // if there isn't enough buffer, the labels are hidden in LineAreaBarPostRender
  const TICK_BUFFER_PIXELS = 20;

  // day of week and month names vary in length, but it's slow to check all of them
  // as an approximation we just use a specific date which was long in my locale
  const formattedValue = tickFormat(new Date(2019, 8, 4));
  const pixelsPerTick =
    formattedValue.length * PIXELS_PER_CHARACTER + TICK_BUFFER_PIXELS;
  return Math.floor(chartWidth / pixelsPerTick); // round down so we don't end up with too many ticks
}

/// return the range, in milliseconds, of the xDomain. ("Range" in this sense refers to the total "width"" of the
/// chart in millisecodns.)
function timeRangeMilliseconds(xDomain: ContinuousDomain) {
  const startTime = xDomain[0]; // these are UNIX timestamps in milliseconds
  const endTime = xDomain[1];
  return endTime - startTime;
}

/// return the appropriate entry in TIMESERIES_INTERVALS for a given chart with domain, interval, and width.
/// The entry is used to calculate how often a tick should be displayed for this chart (e.g. one tick every 5 minutes)
export function computeTimeseriesTicksInterval(
  xDomain: ContinuousDomain,
  xInterval: TimeSeriesInterval,
  chartWidth: number,
  tickFormat: Formatter,
) {
  return timeseriesTicksInterval(
    xInterval,
    timeRangeMilliseconds(xDomain),
    maxTicksForChartWidth(chartWidth, tickFormat),
  );
}

// We should always have results_timezone, but just in case we fallback to UTC
export const DEFAULT_TIMEZONE = "Etc/UTC";

export function getTimezone(series: RawSeries) {
  const { results_timezone } = series[0].data;

  return results_timezone || DEFAULT_TIMEZONE;
}