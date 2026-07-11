import PageHeader from "@/components/public/PageHeader";

export default function Terms() {
  return (
    <div className="flex flex-col w-full">
      <PageHeader
        title="Terms & Conditions"
        description="Effective Date: July 09, 2026. Review our terms regarding bookings, schedules, and clinical policies."
      />

      <section className="py-20 bg-white dark:bg-slate-900">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 prose prose-slate dark:prose-invert space-y-6">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            By accessing this website and utilizing our online booking tool, you agree to comply with and be bound by the following clinic policies.
          </p>

          <h3 className="text-lg font-bold text-slate-900 dark:text-white pt-4 border-t border-slate-100 dark:border-slate-805">1. Booking Requests vs. Confirmations</h3>
          <p className="text-sm text-slate-655 dark:text-slate-350 leading-relaxed">
            Submitting a date and time slot request via our online booking engine does <strong>not</strong> constitute a finalized booking. The appointment is officially scheduled only after our front desk staff verifies clinic availability and changes the status to 'Approved', triggering a WhatsApp confirmation message.
          </p>

          <h3 className="text-lg font-bold text-slate-900 dark:text-white pt-4">2. Cancellation & Rescheduling</h3>
          <p className="text-sm text-slate-655 dark:text-slate-350 leading-relaxed">
            We request that patients cancel or reschedule appointments at least 12 hours in advance. This allows us to re-allocate the slot to other patients in need of physiotherapy.
          </p>

          <h3 className="text-lg font-bold text-slate-900 dark:text-white pt-4">3. Accurate Information</h3>
          <p className="text-sm text-slate-655 dark:text-slate-350 leading-relaxed">
            Patients are required to provide active and accurate contact information (specifically mobile numbers that support WhatsApp) to ensure they receive confirmations and schedule change alerts.
          </p>

          <h3 className="text-lg font-bold text-slate-900 dark:text-white pt-4">4. Liability Limitation</h3>
          <p className="text-sm text-slate-655 dark:text-slate-350 leading-relaxed">
            Gait Physio Clinic is not responsible for any issues resulting from technical failures of third-party networks (e.g. mobile networks or WhatsApp messaging services) that prevent the delivery of confirmation alerts.
          </p>
        </div>
      </section>
    </div>
  );
}
