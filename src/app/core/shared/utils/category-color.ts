const categoryColorMap: Record<string, string> = {
  orange: '#f4511e',
  teal: '#009688',
  amber: '#ffb300',
  purple: '#7e57c2',
  pink: '#ec407a',
  green: '#2ca45c',
  yellow: '#fdd835',
  blue: '#1e88e5',
  neutral: 'var(--mat-sys-outline)',
};

export const getCategoryColorValue = (color?: string): string => {
  if (!color) return categoryColorMap['neutral'];

  const normalizedColor = color.trim().toLowerCase();
  return categoryColorMap[normalizedColor] ?? color;
};
