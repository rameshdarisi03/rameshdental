import PageHeader from "@/components/public/PageHeader";

export default function Privacy() {
  return (
    <div className="flex flex-col w-full">
      <PageHeader
        title="Privacy Policy"
        description="Effective Date: July 09, 2026. Review how Gait Physio Clinic collects, stores, and protects your information."
      />

      <section className="py-20 bg-white dark:bg-slate-900">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 prose prose-slate dark:prose-invert space-y-6">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            At Gait Physio Clinic, we take the confidentiality of your health and personal information very seriously. This policy documents how we handle the name, phone number, and clinical notes you submit during online booking.
          </p>

          <h3 className="text-lg font-bold text-slate-900 dark:text-white pt-4 border-t border-slate-100 dark:border-slate-805">1. Information We Collect</h3>
          <p className="text-sm text-slate-600 dark:text-slate-350 leading-relaxed">
            When you request an appointment, we collect:
          </p>
          <ul className="list-disc pl-5 text-sm text-slate-605 dark:text-slate-350 space-y-1">
            <li>Your full name</li>
            <li>Your mobile/WhatsApp number</li>
            <li>Your email address</li>
            <li>Preferred treatment types and optional clinical notes</li>
          </ul>

          <h3 className="text-lg font-bold text-slate-900 dark:text-white pt-4">2. How We Use Your Information</h3>
          <p className="text-sm text-slate-655 dark:text-slate-350 leading-relaxed">
            Your contact details are solely used to schedule, review, and confirm appointments. If approved, we prefill the WhatsApp confirmation template to notify you. We do not distribute, sell, or rent your database records to third-party marketing companies.
          </p>

          <h3 className="text-lg font-bold text-slate-900 dark:text-white pt-4">3. Data Security</h3>
          <p className="text-sm text-slate-655 dark:text-slate-350 leading-relaxed">
            Your appointment logs are stored in our secure Firebase database. Access is strictly limited to authorized clinic administrators and receptionists who possess valid credentials.
          </p>

          <h3 className="text-lg font-bold text-slate-900 dark:text-white pt-4">4. Patient Rights</h3>
          <p className="text-sm text-slate-655 dark:text-slate-350 leading-relaxed">
            If you wish to review, modify, or request the deletion of your historical booking logs from our system, please contact our front desk coordinator at info@gaitphysioclinic.com.
          </p>
        </div>
      </section>
    </div>
  );
}
