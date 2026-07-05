const INGREDIENT_CELL_DELIMITER = ', ';
const INGREDIENT_NAME_DELIMITER = ' - ';

export const WORKBOOK_PATH = '../moph_drugs.xlsx';

export function extractIngredientNames(value: string | null | undefined) {
  if (value === null || value === undefined) {
    return [];
  }

  const text = value.trim();

  if (text.length === 0) {
    return [];
  }

  return text
    .split(INGREDIENT_CELL_DELIMITER)
    .map((entry) => {
      const dashIndex = entry.indexOf(INGREDIENT_NAME_DELIMITER);
      const name = dashIndex === -1 ? entry : entry.slice(0, dashIndex);
      return name.trim();
    })
    .filter((name) => name.length > 0);
}
