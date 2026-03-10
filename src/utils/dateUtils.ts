/**
 * Genera la lista de meses para el año escolar.
 * El año escolar va desde Febrero hasta Diciembre del mismo año.
 * Si estamos en Enero, muestra el año anterior (año escolar en curso).
 */
export function generateSchoolYearMonths(): string[] {
  const months = [
    "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // 1-12 (Enero = 1)

  // Si estamos en Enero, el año escolar en curso es el año anterior
  const schoolYear = currentMonth === 1 ? currentYear - 1 : currentYear;

  return months.map(m => `${m} ${schoolYear}`);
}

/**
 * Retorna el string del mes actual dentro del año escolar.
 * Si el mes actual no está en la lista (Enero), devuelve el primero de la lista.
 */
export function getCurrentSchoolYearMonth(): string {
  const months = generateSchoolYearMonths();

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonthName = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ][now.getMonth()];
  const schoolYear = now.getMonth() === 0 ? currentYear - 1 : currentYear;
  const currentMonthStr = `${currentMonthName} ${schoolYear}`;

  // Si el mes actual está en la lista, seleccionarlo; si no, el primero (Febrero)
  return months.includes(currentMonthStr) ? currentMonthStr : months[0];
}

/**
 * Extrae año y mes de un string como "Marzo 2026"
 */
export function parseMonthYear(monthYearString: string): { year: number; month: number } {
  const parts = monthYearString.split(" ");
  const monthName = parts[0];
  const year = parseInt(parts[1], 10);

  const monthMap: Record<string, number> = {
    "Enero": 1, "Febrero": 2, "Marzo": 3, "Abril": 4,
    "Mayo": 5, "Junio": 6, "Julio": 7, "Agosto": 8,
    "Septiembre": 9, "Octubre": 10, "Noviembre": 11, "Diciembre": 12
  };

  return { year, month: monthMap[monthName] || 1 };
}
