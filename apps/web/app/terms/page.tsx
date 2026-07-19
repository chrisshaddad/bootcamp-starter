import type { Metadata } from 'next';
import { LegalPage, LegalSection } from '@/components/legal-page';

export const metadata: Metadata = {
  title: 'Terms & Conditions',
  description: 'The terms that apply when using Coordly.',
};

/**
 * Renders Coordly's public terms and conditions page.
 */
export default function TermsPage() {
  return (
    <LegalPage
      title="Terms & Conditions"
      description="These terms govern access to Coordly unless your organization has a separate written agreement with its Coordly platform operator."
      effectiveDate="July 18, 2026"
    >
      <LegalSection title="Using Coordly">
        <p>
          By accessing Coordly, you agree to these terms and confirm that you
          are authorized to use the service for your organization. If you do not
          agree, do not use the service.
        </p>
      </LegalSection>

      <LegalSection title="Accounts and access">
        <p>
          You must provide accurate account information, protect your magic
          links and active sessions, and promptly report suspected unauthorized
          access to your organization administrator. You are responsible for
          activity performed through your account.
        </p>
      </LegalSection>

      <LegalSection title="Organization responsibilities">
        <p>
          Organizations control which users receive access and how member,
          event, attendance, and announcement information is managed. Each
          organization is responsible for having the necessary authority and
          permissions to add information to Coordly and for complying with laws
          that apply to its activities and events.
        </p>
      </LegalSection>

      <LegalSection title="Acceptable use">
        <p>You may not use Coordly to:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>Break the law or violate another person&apos;s rights.</li>
          <li>Access another account or organization without permission.</li>
          <li>Upload malicious code or interfere with service operation.</li>
          <li>Send deceptive, abusive, or unsolicited communications.</li>
          <li>
            Copy, reverse engineer, or misuse the service except where the law
            expressly permits it.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="Your content">
        <p>
          You and your organization retain ownership of content submitted to
          Coordly. You grant the platform operator a limited right to host,
          process, and display that content only as needed to provide, secure,
          and support the service. You are responsible for the accuracy and
          legality of content you submit.
        </p>
      </LegalSection>

      <LegalSection title="Service availability">
        <p>
          Coordly may change as features are improved or added. The platform
          operator may perform maintenance, address security issues, or suspend
          access when reasonably necessary. Continuous or error-free operation
          is not guaranteed.
        </p>
      </LegalSection>

      <LegalSection title="Suspension and termination">
        <p>
          Access may be suspended or ended when these terms are violated, when
          required by law, to protect the service or its users, or when the
          agreement with an organization ends. Provisions that reasonably need
          to continue after termination will remain in effect.
        </p>
      </LegalSection>

      <LegalSection title="Disclaimers and liability">
        <p>
          To the extent permitted by law, Coordly is provided without implied
          warranties and the platform operator is not responsible for indirect
          or consequential losses. Nothing in these terms excludes rights or
          liabilities that cannot legally be excluded or limited.
        </p>
      </LegalSection>

      <LegalSection title="Changes and questions">
        <p>
          These terms may be updated as the service evolves. Material changes
          will be communicated through the service or by the organization or
          platform operator responsible for your account. Members should direct
          questions to their organization administrator; organization
          administrators should use the support channel provided by their
          platform operator.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
