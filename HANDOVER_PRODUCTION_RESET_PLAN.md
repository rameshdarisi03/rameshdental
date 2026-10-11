# Client Handover & Day-Zero Firestore Data Reset Guide

> [!IMPORTANT]
> **Status: RECORDED FOR FUTURE HANDOVER (DO NOT EXECUTE NOW)**  
> All current test and demo data remains intact for Ongoing Quality Assurance, review, and demonstration purposes. Execute this reset procedure only when officially handing the platform over to the client for Day-Zero production launch.

---

## 1. Objective
Ensure that upon production handover, the Analytics Hub, Invoicing Hub, Appointment Register, and Patient Profiles reflect **clean, authentic clinic records from Day Zero (day of submission)**, with zero ghost records from development/testing.

---

## 2. Collections to Reset on Handover

| Collection Name | Contents to Purge | Impact on Analytics & Reports |
| :--- | :--- | :--- |
| `appointments` | All demo/test bookings, old status stamps (`approved`, `rejected`, `pending`), action history (`actionedByName`). | Resets Total Bookings, Approved Sessions, Cancellation Rates, Peak Hours, and Staff Workload stats to clean 0. |
| `invoices` | All test bills, dummy transactions, sample payment receipts. | Resets Billed Revenue, Paid Revenue, and Average Revenue per Session to clean ₹0. |
| `patients` | Demo patient profiles, dummy phones, simulated medical notes. | Resets New vs. Returning Patient Mix and Acquisition Channels. |
| `blocks` | Demo calendar time-off slots / doctor blackout intervals. | Clears doctors' schedules for live booking. |
| `notifications` | Internal test alerts and system reminders. | Clears activity bell notifications for staff. |

---

## 3. Critical Collections & Settings to PRESERVE (DO NOT DELETE)

> [!CAUTION]
> The following collections and records contain operational configurations and must **never** be deleted during the reset:

1. **Clinic Configurations (`clinic_config`)**:
   - Enrolled Therapists roster (Dr. Kinnera, Dr. Ridha, Dr. Ammulu John, Dr. Rakshitha).
   - Working hours, slot durations, clinic phone numbers, and emergency contact details.
   - Clinical service catalogs and pricing presets.
2. **Staff Credentials & Roles (`users` / staff logins)**:
   - Admin and Receptionist authentication credentials and role permissions.
3. **Static Content & Media Assets**:
   - Uploaded clinic gallery images, team bios, and published medical blog articles.

---

## 4. Standby Reset Script (For Future Execution)

When the client is ready for handover, you can instruct the assistant to execute the clean-slate reset:

```bash
# Example instruction when ready:
"Now execute the Day-Zero Firestore reset for client handover as documented in the Handover Guide."
```

The underlying script will perform batch-deletions on `appointments`, `invoices`, and demo `patients` while keeping `clinic_config` and staff logins untouched.

---

## 5. Verification Checklist After Future Reset

- [ ] **Analytics Hub (`/dashboard/analytics`)**:
  - Total Bookings: `0`
  - Billed Revenue: `₹0`
  - Cancellation Rate: `0%`
  - Staff Workload: All active therapists displayed at `0% utilization` with 0 approved / 0 rejected.
  - Traffic & Revenue Chart: Flat baseline ready to record live sessions.
- [ ] **Appointments Hub (`/dashboard/appointments`)**: Empty register ready for patient bookings.
- [ ] **Invoices Hub (`/dashboard/invoices`)**: Clean register, next invoice begins at fresh numbering.
- [ ] **Patient Hub (`/dashboard/patients`)**: Empty patient directory ready for real intake.
