/**
 * Meta WhatsApp Cloud API — Batch Template Approval Dispatcher
 * Ramesh Dental Clinic
 * 
 * Usage:
 * npx tsx scripts/submit-whatsapp-templates.ts
 */

import * as fs from "fs";
import * as path from "path";

// Zero-dependency environment loader (.env, .env.local)
function loadEnvFile(filename: string) {
  const fullPath = path.resolve(process.cwd(), filename);
  if (fs.existsSync(fullPath)) {
    const lines = fs.readFileSync(fullPath, "utf-8").split("\n");
    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) continue;
      const eqIdx = line.indexOf("=");
      if (eqIdx !== -1) {
        const key = line.slice(0, eqIdx).trim();
        let val = line.slice(eqIdx + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }
}

loadEnvFile(".env.local");
loadEnvFile(".env");

import {
  RAMESH_DENTAL_WHATSAPP_TEMPLATES,
  submitTemplateToMeta,
} from "../src/lib/whatsappTemplatesConfig";

async function main() {
  console.log("==================================================================");
  console.log("🦷 RAMESH DENTAL CLINIC — META WHATSAPP TEMPLATE APPROVAL ENGINE");
  console.log("==================================================================\n");

  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const wabaId = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  console.log("🔍 Checking Environment Credentials:");
  console.log(`• WHATSAPP_ACCESS_TOKEN: ${accessToken ? "CONFIGURED (" + accessToken.slice(0, 10) + "...)" : "MISSING ❌"}`);
  console.log(`• WHATSAPP_BUSINESS_ACCOUNT_ID: ${wabaId ? "CONFIGURED (" + wabaId + ")" : "MISSING ❌"}`);
  console.log(`• WHATSAPP_PHONE_NUMBER_ID: ${phoneId ? "CONFIGURED (" + phoneId + ")" : "MISSING ❌"}\n`);

  if (!accessToken || !wabaId) {
    console.error("❌ ERROR: WhatsApp credentials are not configured in .env or environment.");
    console.error("Please ensure WHATSAPP_ACCESS_TOKEN and WHATSAPP_BUSINESS_ACCOUNT_ID are defined.");
    console.error("\nTemplate Definitions are verified and ready to submit as soon as credentials are supplied.");
    process.exit(1);
  }

  console.log(`🚀 Submitting ${RAMESH_DENTAL_WHATSAPP_TEMPLATES.length} Dental Templates to Meta Graph API (v21.0)...\n`);

  let approvedOrPendingCount = 0;
  let alreadyExistsCount = 0;
  let failedCount = 0;

  for (let i = 0; i < RAMESH_DENTAL_WHATSAPP_TEMPLATES.length; i++) {
    const tmpl = RAMESH_DENTAL_WHATSAPP_TEMPLATES[i];
    process.stdout.write(`[${i + 1}/${RAMESH_DENTAL_WHATSAPP_TEMPLATES.length}] Submitting '${tmpl.name}' (${tmpl.category})... `);

    const res = await submitTemplateToMeta(tmpl, { accessToken, wabaId });

    if (res.success && res.status !== "ALREADY_EXISTS") {
      console.log(`✅ SUBMITTED (ID: ${res.templateId || "OK"}, Status: ${res.status})`);
      approvedOrPendingCount++;
    } else if (res.status === "ALREADY_EXISTS") {
      console.log(`ℹ️ ALREADY EXISTS on Meta Account`);
      alreadyExistsCount++;
    } else {
      console.log(`❌ FAILED: ${res.error}`);
      failedCount++;
    }
  }

  console.log("\n==================================================================");
  console.log("📋 SUBMISSION SUMMARY:");
  console.log(`• Newly Submitted for Approval: ${approvedOrPendingCount}`);
  console.log(`• Already Existed: ${alreadyExistsCount}`);
  console.log(`• Failed: ${failedCount}`);
  console.log("==================================================================\n");
}

main().catch((err) => {
  console.error("Fatal error during WhatsApp template submission:", err);
  process.exit(1);
});
