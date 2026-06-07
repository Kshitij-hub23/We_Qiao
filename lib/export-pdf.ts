/**
 * Patient-details PDF export — one-click direct download.
 *
 * Renders a nicely formatted, self-contained HTML passport off-screen, rasterizes
 * it with html2canvas, and writes a real multi-page A4 PDF with jsPDF that the
 * browser downloads directly (no print dialog). Rasterizing via the browser means
 * Chinese (繁體中文) text renders with the system CJK font automatically.
 */

import type { PatientProfile } from "./profile";
import { localizeTerm, type Lang } from "./i18n";

export interface ExportData {
  profile: PatientProfile;
  role: string; // already-localized role label
  diseases: string[];
  western: string[];
  eastern: string[];
  lang: Lang;
}

/** HTML-escape a value so user-entered text can't break the markup. */
function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const STR = {
  en: {
    title: "Patient Health Passport",
    subtitle: "Reconciled medication record — Qiáo (橋)",
    patientId: "Patient ID",
    registered: "Registered",
    personal: "Personal details",
    name: "Name",
    dob: "Date of birth",
    gender: "Gender",
    blood: "Blood group",
    email: "Email",
    phone: "Phone",
    address: "Address",
    emergency: "Emergency contact",
    relationship: "Relationship",
    insurance: "Insurance",
    provider: "Provider",
    policyNo: "Policy number",
    conditions: "Medical conditions",
    western: "Western medicines",
    eastern: "Chinese medicines (TCM)",
    none: "None recorded.",
    generated: "Generated",
    disclaimer:
      "Synthetic demo data. Qiáo is a reconciliation tool — not a diagnosis, and not medical advice. Confirm all medicines with a pharmacist or clinician.",
  },
  zh: {
    title: "病人健康護照",
    subtitle: "已核對藥物紀錄 — Qiáo（橋）",
    patientId: "病人編號",
    registered: "註冊日期",
    personal: "個人資料",
    name: "姓名",
    dob: "出生日期",
    gender: "性別",
    blood: "血型",
    email: "電郵",
    phone: "電話",
    address: "地址",
    emergency: "緊急聯絡人",
    relationship: "關係",
    insurance: "保險",
    provider: "保險公司",
    policyNo: "保單編號",
    conditions: "病症",
    western: "西藥",
    eastern: "中藥（傳統中醫）",
    none: "暫無紀錄。",
    generated: "產生時間",
    disclaimer:
      "合成示範資料。Qiáo 是藥物核對工具 — 並非診斷，亦非醫療建議。請向藥劑師或醫生確認所有藥物。",
  },
} as const;

/** A label/value row inside a section grid. */
function row(label: string, value: string): string {
  return `
    <div class="row">
      <div class="label">${esc(label)}</div>
      <div class="value">${value ? esc(value) : "—"}</div>
    </div>`;
}

/** A medicine/condition list rendered as pills, or the empty placeholder. */
function pills(items: string[], lang: Lang, none: string): string {
  if (items.length === 0) return `<p class="empty">${esc(none)}</p>`;
  return `<div class="pills">${items
    .map((i) => `<span class="pill">${esc(localizeTerm(i, lang))}</span>`)
    .join("")}</div>`;
}

/** CSS for the passport (class-scoped; no `body`/`@page` rules). */
const PASSPORT_CSS = `
  .passport * { box-sizing: border-box; margin: 0; padding: 0; }
  .passport {
    width: 794px;
    padding: 48px 44px;
    background: #ffffff;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang HK",
      "Microsoft JhengHei", Roboto, Helvetica, Arial, sans-serif;
    color: #1c1917;
    font-size: 13px;
    line-height: 1.5;
  }
  .passport .header {
    display: flex; align-items: flex-start; justify-content: space-between;
    gap: 16px; padding-bottom: 16px; border-bottom: 3px solid #0f766e;
  }
  .passport .brand {
    font-size: 11px; letter-spacing: 0.14em; text-transform: uppercase;
    color: #0f766e; font-weight: 700;
  }
  .passport .patient-name {
    font-size: 32px; font-weight: 800; letter-spacing: -0.02em;
    margin: 4px 0 2px; color: #0c0a09;
  }
  .passport .doc-title { font-size: 13px; color: #57534e; }
  .passport .id-block { text-align: right; font-size: 11px; color: #57534e; white-space: nowrap; }
  .passport .id-block .pid {
    font-family: "SFMono-Regular", Consolas, "Liberation Mono", monospace;
    font-size: 13px; font-weight: 700; color: #0c0a09;
  }
  .passport .id-block .role {
    display: inline-block; margin-top: 4px; padding: 2px 8px; border-radius: 999px;
    background: #ccfbf1; color: #0f766e; font-weight: 700; font-size: 10px;
  }
  .passport .section { margin-top: 24px; }
  .passport .section-title {
    font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em;
    color: #0f766e; padding-bottom: 6px; margin-bottom: 12px; border-bottom: 1px solid #e7e5e4;
  }
  .passport .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 32px; }
  .passport .row { display: flex; gap: 10px; padding: 3px 0; }
  .passport .label { width: 120px; flex-shrink: 0; color: #78716c; font-weight: 600; }
  .passport .value { color: #1c1917; }
  .passport .pills { display: flex; flex-wrap: wrap; gap: 8px; }
  .passport .pill {
    display: inline-block; padding: 5px 12px; border-radius: 999px;
    background: #f5f5f4; border: 1px solid #e7e5e4; font-weight: 600; color: #292524;
  }
  .passport .meds-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
  .passport .meds-col h3 { font-size: 12px; font-weight: 700; margin-bottom: 8px; color: #1c1917; }
  .passport .meds-col.western h3 { color: #1d4ed8; }
  .passport .meds-col.eastern h3 { color: #b45309; }
  .passport .empty { color: #a8a29e; font-style: italic; }
  .passport .footer {
    margin-top: 28px; padding-top: 12px; border-top: 1px solid #e7e5e4;
    font-size: 10px; color: #a8a29e; line-height: 1.5;
  }
  .passport .footer .gen { color: #78716c; margin-bottom: 4px; }
`;

/** Inner markup for the passport (without the surrounding document chrome). */
function buildBody(data: ExportData, generatedAt: string): string {
  const { profile: p, role, diseases, western, eastern, lang } = data;
  const s = STR[lang];
  const term = (v: string) => localizeTerm(v, lang);

  return `
  <div class="header">
    <div>
      <div class="brand">${esc(s.subtitle)}</div>
      <div class="patient-name">${esc(p.fullName)}</div>
      <div class="doc-title">${esc(s.title)}</div>
    </div>
    <div class="id-block">
      <div>${esc(s.patientId)}</div>
      <div class="pid">${esc(p.patientId)}</div>
      <div class="role">${esc(role)}</div>
      <div style="margin-top:8px">${esc(s.registered)}: ${esc(p.registrationDate || "—")}</div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">${esc(s.personal)}</div>
    <div class="grid">
      ${row(s.dob, p.dateOfBirth)}
      ${row(s.gender, term(p.gender))}
      ${row(s.blood, p.bloodGroup)}
      ${row(s.email, p.email)}
      ${row(s.phone, p.phone)}
      ${row(s.address, p.address)}
    </div>
  </div>

  <div class="section">
    <div class="section-title">${esc(s.emergency)}</div>
    <div class="grid">
      ${row(s.name, term(p.emergencyContactName))}
      ${row(s.phone, p.emergencyContactPhone)}
      ${row(s.relationship, term(p.emergencyContactRelation))}
    </div>
  </div>

  <div class="section">
    <div class="section-title">${esc(s.insurance)}</div>
    <div class="grid">
      ${row(s.provider, p.insuranceProvider)}
      ${row(s.policyNo, p.insurancePolicyNo)}
    </div>
  </div>

  <div class="section">
    <div class="section-title">${esc(s.conditions)}</div>
    ${pills(diseases, lang, s.none)}
  </div>

  <div class="section">
    <div class="section-title">${esc(s.western)} · ${esc(s.eastern)}</div>
    <div class="meds-grid">
      <div class="meds-col western">
        <h3>${esc(s.western)}</h3>
        ${pills(western, lang, s.none)}
      </div>
      <div class="meds-col eastern">
        <h3>${esc(s.eastern)}</h3>
        ${pills(eastern, lang, s.none)}
      </div>
    </div>
  </div>

  <div class="footer">
    <div class="gen">${esc(s.generated)}: ${esc(generatedAt)}</div>
    ${esc(s.disclaimer)}
  </div>`;
}

/**
 * Render the passport off-screen, rasterize it, and download a real A4 PDF in
 * one click. Splits across multiple pages if the content is taller than one page.
 */
export async function exportPatientPdf(data: ExportData): Promise<void> {
  // Load the heavy libs lazily so they're only pulled in when an export happens.
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import("html2canvas"),
    import("jspdf"),
  ]);

  const generatedAt = new Date().toLocaleString(
    data.lang === "zh" ? "zh-HK" : "en-GB",
  );

  // Off-screen host: rendered (so fonts/layout resolve) but out of view.
  const host = document.createElement("div");
  host.style.cssText =
    "position:fixed;left:-10000px;top:0;width:794px;background:#ffffff;z-index:-1;";
  host.innerHTML = `<style>${PASSPORT_CSS}</style><div class="passport">${buildBody(
    data,
    generatedAt,
  )}</div>`;
  document.body.appendChild(host);

  try {
    const node = host.querySelector(".passport") as HTMLElement;
    const canvas = await html2canvas(node, {
      scale: 2, // crisp on retina / when zoomed
      backgroundColor: "#ffffff",
      useCORS: true,
    });

    const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const imgW = pageW;
    const imgH = (canvas.height * imgW) / canvas.width;

    const img = canvas.toDataURL("image/png");

    if (imgH <= pageH) {
      pdf.addImage(img, "PNG", 0, 0, imgW, imgH);
    } else {
      // Taller than one page — slice across pages by shifting the image up.
      let remaining = imgH;
      let position = 0;
      while (remaining > 0) {
        pdf.addImage(img, "PNG", 0, position, imgW, imgH);
        remaining -= pageH;
        position -= pageH;
        if (remaining > 0) pdf.addPage();
      }
    }

    const safeName = data.profile.fullName.replace(/[^\w一-鿿 -]/g, "").trim();
    pdf.save(`Qiao-${safeName || "patient"}-${data.profile.patientId}.pdf`);
  } finally {
    document.body.removeChild(host);
  }
}
