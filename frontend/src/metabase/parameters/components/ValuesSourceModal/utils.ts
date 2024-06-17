import { parse } from "csv-parse/browser/esm/sync";
import { stringify } from "csv-stringify/browser/esm/sync";

const NEW_LINE = "\n";

export const getValuesText = (values: string[] = []) => {
  return stringify(values, {
    delimiter: ", ",
    newline: NEW_LINE,
    quote: '"',
    escape: "\\",
  });
};

export const getStaticValues = (
  value: string,
): [string, string | undefined][] => {
  try {
    const strings = parse(value, {
      delimiter: [","],
      skip_empty_lines: true,
      relax_column_count: true,
      relax_quotes: true,
      trim: true,
      quote: '"',
      escape: "\\",
      columns: ["value", "label"],
      ignore_last_delimiters: true,
    }).map(row => [row.value, row.label]);

    return strings;
  } catch (err) {
    return [];
  }
};
