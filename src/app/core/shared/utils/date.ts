const padDatePart = (value: number): string => String(value).padStart(2, '0');

export const formatDateOnly = (date: Date): string => {
  return `${date.getFullYear()}-${padDatePart(date.getMonth() + 1)}-${padDatePart(date.getDate())}`;
};
