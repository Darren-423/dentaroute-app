const CASE_ID_OFFSET = 1000;

export const toPublicCaseId = (internalId: number): string => {
  return String(CASE_ID_OFFSET + internalId);
};

export const toInternalCaseId = (publicId: string): number | null => {
  const parsed = Number(publicId);

  if (!Number.isInteger(parsed) || parsed <= CASE_ID_OFFSET) {
    return null;
  }

  const internalId = parsed - CASE_ID_OFFSET;
  return internalId >= 1 ? internalId : null;
};