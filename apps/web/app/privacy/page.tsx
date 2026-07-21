import type { Metadata } from 'next';
import { LegalPage, LegalSection } from '@/components/legal-page';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'How Coordly collects, uses, and protects personal information.',
};

/**
 * Renders Coordly's public privacy policy page.
 */
export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      description="This policy explains what information Coordly handles and how it is used when organizations manage their members, events, and communications."
      effectiveDate="July 18, 2026"
    >
      <LegalSection title="Information we collect">
        <p>We may process the following information:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            Account details, including your name, email address, role, and
            organization.
          </li>
          <li>
            Optional profile details, such as a phone number and date of birth,
            when provided by you or your organization.
          </li>
          <li>
            Organization content, including member records, events,
            registrations, attendance, and announcements.
          </li>
          <li>
            Authentication data, including short-lived magic links and session
            records needed to keep you signed in securely.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="How we use information">
        <p>
          We use this information to authenticate users, provide
          organization-scoped access, operate member and event workflows, send
          service messages, maintain security, and support the service. We do
          not use Coordly data for advertising or sell personal information.
        </p>
      </LegalSection>

      <LegalSection title="Who can access information">
        <p>
          Information is available to authorized users within the relevant
          organization according to their role. Platform administrators may
          access information when needed to operate, secure, or support Coordly.
          Service providers may process limited information for hosting,
          database, and email delivery services. Information may also be
          disclosed when required by law or to protect users and the service.
        </p>
      </LegalSection>

      <LegalSection title="Cookies and sessions">
        <p>
          Coordly uses a strictly necessary session cookie to keep you signed in
          and a preference cookie to remember the sidebar state. The current
          application does not use advertising or analytics cookies.
        </p>
      </LegalSection>

      <LegalSection title="Retention and security">
        <p>
          Login sessions expire after seven days. Other information is retained
          while it is needed to provide the service, meet organization needs,
          resolve disputes, or satisfy legal obligations. We use access controls
          and organization-level data separation to protect information, but no
          system can guarantee absolute security.
        </p>
      </LegalSection>

      <LegalSection title="Your choices and rights">
        <p>
          You may ask to access, correct, or delete your personal information,
          subject to applicable law and legitimate retention requirements.
          Members should contact the administrator of the organization that
          provided their Coordly access. Organization administrators should
          contact their Coordly platform operator through the support channel
          provided during onboarding.
        </p>
      </LegalSection>

      <LegalSection title="Information about minors">
        <p>
          Organizations are responsible for obtaining any permissions required
          before adding information about minors and for applying appropriate
          safeguards to that information.
        </p>
      </LegalSection>

      <LegalSection title="Changes to this policy">
        <p>
          We may update this policy as Coordly evolves. Material changes will be
          communicated through the service or by the organization or platform
          operator responsible for your account.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
