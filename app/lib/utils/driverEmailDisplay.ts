/** Matches synthetic emails created when a chauffeur applies without an address (see driver.service applyAsChauffeur). */
const CHAUFFEUR_APPLY_PLACEHOLDER_DOMAIN = "@chauffeur-apply.traflinq.com";

export function isPlaceholderChauffeurApplyEmail(email: string | null | undefined): boolean {
    if (!email) return false;
    const e = email.trim().toLowerCase();
    return e.startsWith("pending.") && e.endsWith(CHAUFFEUR_APPLY_PLACEHOLDER_DOMAIN);
}

/** Use in UI instead of raw DB email when the applicant did not supply one. */
export function displayDriverEmail(email: string | null | undefined): string {
    if (!email) return "—";
    if (isPlaceholderChauffeurApplyEmail(email)) return "Not provided";
    return email;
}
