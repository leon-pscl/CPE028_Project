import { Link } from 'react-router-dom'

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-canvas">
      <div className="mx-auto max-w-3xl px-6 py-16 sm:px-10 lg:px-16">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm font-semibold text-ink hover:opacity-70 transition-opacity mb-10"
        >
          ← Back to Home
        </Link>

        <h1 className="font-display text-4xl font-extrabold tracking-tight text-ink mb-2">
          Privacy Policy
        </h1>
        <p className="text-sm text-ink mb-10">Last Updated: June 2026</p>

        <div className="prose-ink space-y-8 text-base leading-relaxed">
          <section>
            <h2 className="text-xl font-bold text-ink mb-3">1. Introduction</h2>
            <p>
              Welcome to RevTech. We are committed to protecting your privacy and ensuring that your
              personal information is handled responsibly, securely, and transparently.
            </p>
            <p className="mt-3">
              This Privacy Policy explains how we collect, use, store, disclose, and protect
              information when you access or use our platform. Rev-Tech is a web-based service
              designed to assist users in determining whether an electronic device should be repaired
              or recycled through user-provided information and machine learning-assisted assessment.
            </p>
            <p className="mt-3">
              By using the platform, you acknowledge that you have read and understood this Privacy
              Policy.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-ink mb-3">2. Information We Collect</h2>

            <h3 className="text-lg font-semibold text-ink mb-2">2.1 Account Information</h3>
            <p>When creating an account, we may collect:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>Email address</li>
              <li>Encrypted authentication credentials</li>
            </ul>

            <h3 className="text-lg font-semibold text-ink mb-2 mt-4">
              2.2 Device Assessment Information
            </h3>
            <p>To generate repairability and recycling recommendations, we may collect:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>Device brand</li>
              <li>Device model</li>
              <li>Device category</li>
              <li>Device age</li>
              <li>Reported device issues</li>
              <li>Assessment responses submitted through questionnaires</li>
              <li>Device repair history</li>
            </ul>

            <h3 className="text-lg font-semibold text-ink mb-2 mt-4">2.3 Uploaded Images</h3>
            <p>
              Users may voluntarily upload photographs of their devices for analysis. Uploaded images
              may contain physical condition of the device, visible damage, device components, and
              other information visible within the uploaded image.
            </p>
            <p className="mt-2">
              Users are encouraged to remove or obscure personal information appearing in photographs
              before submission.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-ink mb-3">3. How We Use Your Information</h2>
            <p>We use collected information to:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>Create and manage user accounts</li>
              <li>Authenticate users</li>
              <li>Generate repair-or-recycle recommendations</li>
              <li>Improve platform functionality</li>
              <li>Enhance system security</li>
              <li>Conduct analytics and research</li>
              <li>Monitor system performance</li>
              <li>Prevent abuse, fraud, or unauthorized activity</li>
              <li>Train, validate, and improve machine learning models</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-ink mb-3">
              4. Use of Uploaded Images for Machine Learning
            </h2>
            <p>
              Uploaded device images may be used to improve the accuracy, reliability, and
              performance of our machine learning systems. Images may be processed by automated
              algorithms, stored within secured databases, included in training datasets, used for
              model evaluation and validation, and analyzed to improve future repairability
              assessments.
            </p>
            <p className="mt-3">
              Whenever possible, images are processed in a manner that minimizes unnecessary personal
              information. By uploading images to the platform, you grant RevTech a non-exclusive
              right to use such images for system improvement, research, testing, and machine learning
              development purposes.
            </p>
            <p className="mt-3">
              Users may request deletion of their uploaded content as described in Section 9.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-ink mb-3">
              5. Legal Basis for Processing
            </h2>
            <p>We process personal information based on one or more of the following:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>User consent</li>
              <li>Contractual necessity to provide services</li>
              <li>Legitimate interests in operating and improving the platform</li>
              <li>Compliance with applicable legal obligations</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-ink mb-3">
              6. Data Sharing and Disclosure
            </h2>
            <p>We do not sell personal information. Information may be shared only with:</p>
            <ul className="list-disc pl-6 mt-2 space-y-1">
              <li>Authorized service providers supporting platform operations</li>
              <li>Cloud hosting and database providers</li>
              <li>Security and monitoring providers</li>
              <li>Legal authorities when required by law</li>
              <li>
                Successors or acquirers in the event of a merger, acquisition, or transfer of assets
              </li>
            </ul>
            <p className="mt-3">
              All third-party service providers are required to maintain appropriate security
              measures.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-ink mb-3">7. Data Security</h2>
            <p>
              We implement reasonable administrative and technical safeguards to protect information
              against unauthorized access, disclosure, alteration, or destruction. These safeguards
              may include encryption in transit, encryption at rest, access controls, authentication
              mechanisms, activity monitoring, and secure cloud infrastructure.
            </p>
            <p className="mt-3">
              While we strive to protect information, no method of transmission or storage can be
              guaranteed to be completely secure.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-ink mb-3">8. Data Retention</h2>
            <p>
              We retain information only for as long as necessary to provide platform services,
              improve machine learning systems, meet legal and regulatory requirements, resolve
              disputes, and enforce our agreements. Retention periods may vary depending on the type
              of information involved.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-ink mb-3">9. Your Rights</h2>
            <p>
              Subject to applicable law, users may have the right to access their personal
              information, correct inaccurate information, request deletion of personal information,
              withdraw consent where applicable, request a copy of their data, and object to certain
              forms of processing.
            </p>
            <p className="mt-3">
              Requests may be submitted through the contact information provided below.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-ink mb-3">
              10. Philippine Data Privacy Act Compliance
            </h2>
            <p>
              RevTech is committed to handling personal information in accordance with Republic Act
              No. 10173 (Data Privacy Act of 2012) and applicable regulations issued by the National
              Privacy Commission.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-ink mb-3">
              11. Changes to this Privacy Policy
            </h2>
            <p>
              We may update this Privacy Policy from time to time. Material changes will be
              communicated through the platform or other appropriate means. Continued use of the
              platform after updates constitutes acceptance of the revised Privacy Policy.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-ink mb-3">12. Contact Information</h2>
            <p>For privacy-related inquiries, requests, or concerns, contact us at support@rev.tech</p>
          </section>
        </div>
      </div>
    </div>
  )
}
