const INGREDIENT_CELL_DELIMITER = ', ';
const INGREDIENT_NAME_DELIMITER = ' - ';

export const WORKBOOK_PATH = '../moph_drugs.xlsx';

export function extractIngredientNames(value: string | null | undefined) {
  if (value === null || value === undefined) {
    return [];
  }

  const names: string[] = [];
  let start = 0;
  const text = value.trim();

  while (start < text.length) {
    const dashIndex = text.indexOf(INGREDIENT_NAME_DELIMITER, start);

    if (dashIndex === -1) {
      break;
    }

    const name = text.slice(start, dashIndex).trim();

    if (name.length > 0) {
      names.push(name);
    }

    const nextSeparatorIndex = text.indexOf(
      INGREDIENT_CELL_DELIMITER,
      dashIndex + INGREDIENT_NAME_DELIMITER.length,
    );

    if (nextSeparatorIndex === -1) {
      break;
    }

    start = nextSeparatorIndex + INGREDIENT_CELL_DELIMITER.length;
  }

  return names;
}
