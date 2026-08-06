export type NameChangeDraft = {
  firstName: string;
  middleName: string;
  lastName: string;
  reason: string;
};

export type NameChangeRequest = {
  id: string;
  user_id: string;
  current_full_name: string | null;
  requested_first_name: string;
  requested_middle_name: string | null;
  requested_last_name: string;
  requested_full_name: string;
  reason: string;
  status: "pending" | "approved" | "rejected";
  reviewed_at: string | null;
  review_note: string | null;
  created_at: string;
};

export function cleanNamePart(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

export function validateNameChangeDraft(draft: NameChangeDraft): string | null {
  const firstName = cleanNamePart(draft.firstName);
  const middleName = cleanNamePart(draft.middleName);
  const lastName = cleanNamePart(draft.lastName);
  const reason = draft.reason.trim();

  if (!firstName || !lastName) return "First and last name are required.";
  if (firstName.length > 100 || middleName.length > 100 || lastName.length > 100) {
    return "Each part of the name must be 100 characters or fewer.";
  }
  if (reason.length < 20) return "Please explain the reason in at least 20 characters.";
  if (reason.length > 1000) return "The reason must be 1,000 characters or fewer.";
  return null;
}

export function displayRequestedName(draft: Pick<NameChangeDraft, "firstName" | "middleName" | "lastName">) {
  return [draft.firstName, draft.middleName, draft.lastName]
    .map(cleanNamePart)
    .filter(Boolean)
    .join(" ");
}
