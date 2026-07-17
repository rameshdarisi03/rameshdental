# Gait Physio Clinic - AI Developer Skills & Knowledge Base

This document records the specific design patterns, technical decisions, configuration rules, and domain integrations learned during the Gait Physio Clinic project.

---

## 🎨 Theme & Styling System
*   **Theme Aesthetic:** Sleek, high-end editorial clinical design with a balanced mix of professional greens, warm neutral sands, and deep charcoal.
*   **Harmonious Color Palette:**
    *   **Teal/Green Primary:** `#2f5c4f` (Deep Teal) / Hover: `#24493e` (Used for actions, primary accents).
    *   **Warm Sand Secondary:** `#efe6dd` (Dark Warm Sand) / `#f7f4f0` (Light Sand) (Used for takeaways, background sections, side cards).
    *   **Typography:** Google Fonts Outfit & Inter.
*   **Image Alignment Rule:** When rendering dynamic thumbnails or editorial article cards, always use Next.js `<Image>` wrapped in relative layout elements with `object-cover object-top` to prevent cutting off patient/clinician faces.

---

## 💬 WhatsApp Integration & Number Sanitization
*   **Click-to-Chat Format:** Utilizes `https://wa.me/<PhoneNumber>?text=<EncodedMessage>` to initiate conversations with unsaved numbers.
*   **Phone Cleaning Rules:**
    1. Strip all non-digit characters (`replace(/\D/g, "")`).
    2. Check and remove any leading zeros (e.g. `09290...` becomes `9290...`).
    3. Prefix Indian phone numbers with `91` if they are exactly 10 digits.
    4. Provide fallback verification to prevent routing errors.
*   **Pre-Approval Confirmation Dialog Flow:** Status changes to Firestore must occur *after* confirmation. The approval action triggers a confirm modal with a "Notify patient via WhatsApp" checkbox. If checked, updates Firestore and fires the `wa.me/` redirect; if unchecked, updates Firestore silently.

---

## 📲 Code Word: `SAND-SMS-FREE`
*   **Concept:** Free-of-cost fallback manual messaging using the browser's native SMS URI scheme routing through the sender's mobile phone plan.
*   **Details:**
    *   **Android/Windows Format:** `sms:<PhoneNumber>?body=<Message>`
    *   **iOS Format:** `sms:<PhoneNumber>&body=<Message>`
    *   *Implementation Strategy:* To be triggered via the keyword *"Implement SAND-SMS-FREE"*.

---

## 📋 Git Commit Standard
*   **Commit Author:** Always commit and push changes using:
    *   **Email:** `rameshdarisi03@gmail.com`
    *   **Username:** `rameshdarisi03`
