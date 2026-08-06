import type { UserResponse } from '@repo/contracts';

export function isProfileComplete(user: UserResponse | undefined): boolean {
  if (!user) return false;
  if (user.accountType === 'SUPER_ADMIN') return true;

  let isComplete = false;

  if (user.accountType === 'DEVELOPER') {
    // If they have a headline, they finished step 2
    const headline = user.developerProfile?.headline?.trim();
    isComplete = Boolean(headline);
  } else if (user.accountType === 'HIRING') {
    // If they have a job title, they finished step 2
    const jobTitle = user.hiringProfile?.jobTitle?.trim();
    isComplete = Boolean(jobTitle);
  }

  console.log(
    `[DEBUG] Profile Check for ${user.email}:`,
    isComplete ? 'COMPLETE' : 'INCOMPLETE',
  );
  return isComplete;
}
