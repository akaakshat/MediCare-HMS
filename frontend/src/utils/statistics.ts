export const average = (values: Array<number | string | null | undefined>) => {
  const numericValues = values
    .map((value) => Number(value ?? 0))
    .filter((value) => Number.isFinite(value));

  if (numericValues.length === 0) return 0;
  return numericValues.reduce((sum, value) => sum + value, 0) / numericValues.length;
};

export const formatConfidenceLabel = (confidence: number) => {
  if (confidence >= 85) return 'Very High';
  if (confidence >= 70) return 'High';
  if (confidence >= 50) return 'Medium';
  return 'Low';
};

export const formatReliabilityLabel = (score: number) => {
  if (score >= 85) return 'Reliable';
  if (score >= 65) return 'Sometimes Late';
  return 'Frequently Late';
};
