"use client";

/**
 * Lightweight i18n for Qiáo — English + Traditional Chinese (Hong Kong).
 * A single dictionary + a context provider. Components call useT() and look up
 * keys; the language choice persists in localStorage. This is intentionally
 * dependency-free and easy to extend.
 */

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export type Lang = "en" | "zh";
const STORAGE_KEY = "qiao:lang";

type Strings = Record<string, string>;

const EN: Strings = {
  // common
  "common.cancel": "Cancel",
  "common.save": "Save",
  "common.done": "Done",
  "common.signOut": "Sign out",
  "common.loading": "Loading…",
  "common.none": "None recorded.",
  "common.add": "Add",

  // brand
  "brand.tagline": "Medication safety bridge — TCM × Western",

  // roles
  "role.patient": "Patient",
  "role.caretaker": "Caretaker",
  "role.practitioner": "Practitioner",
  "role.caregiver": "Caregiver",

  // language
  "lang.label": "Language",
  "lang.en": "EN",
  "lang.zh": "中文",

  // login
  "login.signIn": "Sign in",
  "login.subtitle": "Access your health record",
  "login.email": "Email",
  "login.password": "Password",
  "login.submit": "Sign in →",
  "login.submitting": "Signing in…",
  "login.error": "Incorrect email or password.",
  "login.demoAccounts": "Demo accounts",
  "login.demoPassword": "Password for all accounts:",
  "login.demoHint": "Click a name to auto-fill.",
  "login.disclaimer": "Qiáo uses synthetic demo data only. Not a diagnostic tool.",

  // dashboard
  "dash.checkInteractions": "Check interactions",
  "dash.checkHint": "Add both WM and TCM medicines to run a check",
  "dash.age": "Age",
  "stat.conditions": "Conditions",
  "stat.western": "Western meds",
  "stat.tcm": "TCM medicines",
  "stat.total": "Total medicines",
  "card.conditions.title": "Medical conditions",
  "card.conditions.subtitle": "Diagnoses and ongoing conditions",
  "card.conditions.placeholder": "e.g. Hypertension",
  "card.conditions.empty": "No conditions recorded yet.",
  "card.western.title": "Western medicines",
  "card.western.subtitle": "Conventional pharmaceutical drugs",
  "card.western.placeholder": "e.g. Warfarin",
  "card.western.empty": "No Western medicines recorded yet.",
  "card.tcm.title": "Chinese medicines (TCM)",
  "card.tcm.subtitle": "Herbs, formulas and supplements",
  "card.tcm.placeholder": "e.g. Danshen",
  "card.tcm.empty": "No TCM medicines recorded yet.",
  "dash.addRx.title": "Add a new prescription",
  "dash.addRx.subtitle":
    "Upload or paste a prescription — OCR extraction coming soon. Run a full conflict check with your updated medicine list.",
  "disclaimer.recon":
    "Qiáo surfaces known, sourced interactions and hands the decision to a human. It is a reconciliation tool — not a diagnosis, and not medical advice.",

  // med list card
  "medlist.add": "Add",
  "medlist.addHint": "Press Enter to add · Esc to cancel",

  // delete confirmation
  "confirm.cannotUndo": "This cannot be undone.",
  "confirm.medicalWarning":
    "Deleting medical information may affect future records and the interaction checks and recommendations Qiáo can provide. Please confirm you want to remove this permanently.",
  "confirm.deletePermanently": "Delete permanently",
  "confirm.ok": "OK",
  "confirm.deleteNoun.diseases": "Delete medical condition",
  "confirm.deleteNoun.western": "Delete Western medicine",
  "confirm.deleteNoun.eastern": "Delete Chinese medicine",
  "confirm.deleteNoun.allergies": "Delete allergy",
  "confirm.deleteNoun.treatment": "Delete treatment record",

  // profile
  "profile.edit": "Edit details",
  "profile.patientId": "Patient ID",
  "profile.registered": "Registered {date} · Role: {role}",
  "section.personal": "Personal details",
  "section.emergency": "Emergency contact",
  "section.insurance": "Insurance",
  "section.insurance.sub": "If applicable",
  "field.dob": "Date of birth",
  "field.gender": "Gender",
  "field.blood": "Blood group",
  "field.email": "Email",
  "field.phone": "Phone",
  "field.address": "Address",
  "field.name": "Name",
  "field.relationship": "Relationship",
  "field.provider": "Provider",
  "field.policyNo": "Policy number",
  "profile.disclaimer":
    "Synthetic demo data only. Qiáo is a reconciliation tool — not a diagnosis, and not medical advice.",

  // caregivers
  "cg.title": "Caregivers",
  "cg.subtitle": "Trusted people who can view your record",
  "cg.add": "Add caregiver",
  "cg.form.name": "Full name",
  "cg.form.email": "Email (login)",
  "cg.form.relationship": "Relationship",
  "cg.permissions": "Access permissions",
  "perm.profile": "Profile & contact details",
  "perm.prescriptions": "Prescriptions",
  "perm.medications": "Medication schedule",
  "perm.history": "Medical history",
  "cg.inviteLink": "Invite & link",
  "cg.empty": "No caregivers linked yet.",
  "cg.linked": "Linked {date}",
  "cg.fallbackRole": "Caregiver",
  "cg.remove": "Remove",
  "cg.invited.title": "Caregiver invited & linked",
  "cg.invited.context":
    "Temporary password: {pw} — share this securely. They sign in at the login page with their email and this password.",
  "cg.revoke.title": "Revoke caregiver access",
  "cg.revoke.context":
    "They will immediately lose access and will no longer be able to sign in to view this record.",
  "cg.revoke.confirm": "Revoke access",

  // caregiver view
  "cgv.viewingAs": "Viewing patient record as caregiver",
  "cgv.readonlyNote":
    "You have read-only access to the sections permitted by {name}.",
  "cgv.section.profile": "Profile & contact",
  "cgv.section.meds": "Current medications",
  "cgv.section.rx": "Prescriptions",
  "cgv.section.history": "Medical history",
  "cgv.rx.empty":
    "No uploaded prescription files on record. Medication lists are shown under “Current medications”.",
  "cgv.emergency": "Emergency contact",
  "cgv.western": "Western medicines",
  "cgv.tcm": "Chinese medicines (TCM)",
  "cgv.allergies": "Allergies",
  "cgv.conditions": "Conditions",
  "cgv.noPerms":
    "You don’t currently have permission to view any sections of this record. Please ask the patient to grant access.",
  "cgv.disclaimer":
    "Read-only caregiver access. Qiáo is a reconciliation tool — not a diagnosis, and not medical advice.",

  // intake / checker
  "intake.title": "Enter the medicines",
  "intake.instructions":
    "Add each Western drug and each Chinese medicine (TCM) separately. Press Enter or comma after each name.",
  "intake.western": "Western medicines",
  "intake.westernHint": "e.g. warfarin",
  "intake.westernPh": "Type a drug name…",
  "intake.tcm": "Chinese medicines (TCM)",
  "intake.tcmHint": "e.g. danshen",
  "intake.tcmPh": "Type a herb or formula…",
  "intake.addAnother": "Add another…",
  "intake.rxType": "Prescription type",
  "intake.rxTypeReq": "Required when attaching files",
  "rx.western": "Western Medicine",
  "rx.westernHint": "Pharmaceutical drugs",
  "rx.tcm": "Traditional Chinese Medicine",
  "rx.tcmHint": "Herbs & formulas",
  "intake.needType":
    "Select a prescription type for your attached file(s) to continue.",
  "intake.ready": "Ready to check.",
  "intake.needMeds":
    "Add at least one Western and one Chinese medicine to check for interactions.",
  "intake.review": "Review & check →",
  "confirm.title": "Confirm before checking",
  "confirm.subtitle": "These two lists will be sent to the conflict engine.",
  "confirm.filesAttached": "{n} file(s) attached",
  "confirm.filesAs": " as {type}",
  "confirm.filesKept": " (kept for your reference; not analysed).",
  "confirm.back": "← Back to edit",
  "confirm.run": "Confirm & check for conflicts",
  "results.found": "{n} interaction(s) found",
  "results.sortedBy":
    "Sorted by severity. Share these with a pharmacist or clinician.",
  "results.checkAnother": "Check another patient",
  "results.back": "← Back to my medicines",

  // intake — OCR add-to-profile flow
  "intake.addTitle": "Add medicines",
  "intake.ocrInstructions":
    "Upload a photo of a prescription, or type the medicines below. We'll read the text so you can confirm it, then sort it into Western and Chinese (TCM) medicines.",
  "intake.rxText": "Prescription text",
  "intake.extracting": "extracting…",
  "intake.rxPlaceholder":
    "e.g. warfarin 5mg daily, 丹参茶, dong quai — or upload a photo above",
  "intake.addToProfile": "Confirm & add to profile",
  "intake.adding": "Adding…",
  "intake.myMeds": "My medicines",
  "intake.check": "Check for conflicts →",
  "intake.ocrDone": "Text extracted — review and edit it below, then add it.",
  "intake.ocrEmpty": "No text was found in that image.",
  "intake.added": "Added {n} medicine(s) to your profile.",
  "intake.noNew": "No new recognized medicines to add.",
  "intake.ocrError": "Could not read that image.",
  "intake.stdError": "Could not standardize that text.",

  // attach
  "attach.title": "Attach prescriptions",
  "attach.optional": "(optional)",
  "attach.drop": "Drop files or click to browse",
  "attach.types": "JPG, PNG, WebP or PDF · not analysed yet",
  "attach.typesOcr": "JPG, PNG, WebP or PDF · text extracted automatically",

  // engine status
  "engine.online": "Engine online",
  "engine.offline": "Engine offline",
  "engine.checking": "Checking…",

  // states
  "empty.title": "No known interactions found",
  "empty.body1":
    "None of the entered medicines matched a known interaction in the database. This is ",
  "empty.emphasis": "not",
  "empty.body2":
    " a guarantee of safety — always confirm with a pharmacist or clinician.",
  "error.title": "Couldn’t complete the check",
  "error.retry": "Try again",
  "loading.checking": "Checking for interactions…",

  // doctor portal
  "doctor.title": "Patients",
  "doctor.subtitle": "Patients under your care",
  "doctor.count": "{n} patients",
  "doctor.empty": "No patients assigned yet.",
  "doctor.back": "← All patients",
  "doctor.details": "Patient details",
  "doctor.editing":
    "You're editing this patient's record. Changes save to their profile and appear when they sign in.",
  "doctor.runCheck": "Check interactions",
  "doctor.checkHint":
    "Run a deterministic check on this patient's current Western + Chinese medicines.",

  // severity
  "sev.contraindicated": "Contraindicated",
  "sev.major": "Major",
  "sev.moderate": "Moderate",
  "sev.minor": "Minor",
};

const ZH: Strings = {
  // common
  "common.cancel": "取消",
  "common.save": "儲存",
  "common.done": "完成",
  "common.signOut": "登出",
  "common.loading": "載入中…",
  "common.none": "暫無紀錄。",
  "common.add": "新增",

  // brand
  "brand.tagline": "藥物安全橋樑 — 中醫 × 西醫",

  // roles
  "role.patient": "病人",
  "role.caretaker": "看護者",
  "role.practitioner": "醫師",
  "role.caregiver": "照顧者",

  // language
  "lang.label": "語言",
  "lang.en": "EN",
  "lang.zh": "中文",

  // login
  "login.signIn": "登入",
  "login.subtitle": "存取您的健康紀錄",
  "login.email": "電郵",
  "login.password": "密碼",
  "login.submit": "登入 →",
  "login.submitting": "登入中…",
  "login.error": "電郵或密碼不正確。",
  "login.demoAccounts": "示範帳戶",
  "login.demoPassword": "所有帳戶的密碼：",
  "login.demoHint": "點擊名稱自動填入。",
  "login.disclaimer": "Qiáo 僅使用合成示範資料，並非診斷工具。",

  // dashboard
  "dash.checkInteractions": "檢查相互作用",
  "dash.checkHint": "請同時加入西藥及中藥以進行檢查",
  "dash.age": "年齡",
  "stat.conditions": "病症",
  "stat.western": "西藥",
  "stat.tcm": "中藥",
  "stat.total": "藥物總數",
  "card.conditions.title": "病症",
  "card.conditions.subtitle": "診斷及長期病症",
  "card.conditions.placeholder": "例如：高血壓",
  "card.conditions.empty": "暫未記錄病症。",
  "card.western.title": "西藥",
  "card.western.subtitle": "傳統西方藥物",
  "card.western.placeholder": "例如：華法林",
  "card.western.empty": "暫未記錄西藥。",
  "card.tcm.title": "中藥（傳統中醫）",
  "card.tcm.subtitle": "草藥、方劑及補充品",
  "card.tcm.placeholder": "例如：丹參",
  "card.tcm.empty": "暫未記錄中藥。",
  "dash.addRx.title": "新增處方",
  "dash.addRx.subtitle":
    "上載或貼上處方 — 文字辨識功能即將推出。以更新後的藥物清單進行完整的相互作用檢查。",
  "disclaimer.recon":
    "Qiáo 列出已知並具來源的相互作用，並將決定權交予人類。它是藥物核對工具 — 並非診斷，亦非醫療建議。",

  // med list card
  "medlist.add": "新增",
  "medlist.addHint": "按 Enter 新增 · 按 Esc 取消",

  // delete confirmation
  "confirm.cannotUndo": "此操作無法復原。",
  "confirm.medicalWarning":
    "刪除醫療資訊可能影響日後的紀錄，以及 Qiáo 所能提供的相互作用檢查與建議。請確認您要永久移除此項目。",
  "confirm.deletePermanently": "永久刪除",
  "confirm.ok": "確定",
  "confirm.deleteNoun.diseases": "刪除病症",
  "confirm.deleteNoun.western": "刪除西藥",
  "confirm.deleteNoun.eastern": "刪除中藥",
  "confirm.deleteNoun.allergies": "刪除過敏紀錄",
  "confirm.deleteNoun.treatment": "刪除治療紀錄",

  // profile
  "profile.edit": "編輯資料",
  "profile.patientId": "病人編號",
  "profile.registered": "註冊日期 {date} · 角色：{role}",
  "section.personal": "個人資料",
  "section.emergency": "緊急聯絡人",
  "section.insurance": "保險",
  "section.insurance.sub": "如適用",
  "field.dob": "出生日期",
  "field.gender": "性別",
  "field.blood": "血型",
  "field.email": "電郵",
  "field.phone": "電話",
  "field.address": "地址",
  "field.name": "姓名",
  "field.relationship": "關係",
  "field.provider": "保險公司",
  "field.policyNo": "保單編號",
  "profile.disclaimer":
    "僅為合成示範資料。Qiáo 是藥物核對工具 — 並非診斷，亦非醫療建議。",

  // caregivers
  "cg.title": "照顧者",
  "cg.subtitle": "可查看您紀錄的可信任人士",
  "cg.add": "新增照顧者",
  "cg.form.name": "全名",
  "cg.form.email": "電郵（登入用）",
  "cg.form.relationship": "關係",
  "cg.permissions": "存取權限",
  "perm.profile": "個人及聯絡資料",
  "perm.prescriptions": "處方",
  "perm.medications": "用藥時間表",
  "perm.history": "病歷",
  "cg.inviteLink": "邀請並連結",
  "cg.empty": "暫未連結任何照顧者。",
  "cg.linked": "連結於 {date}",
  "cg.fallbackRole": "照顧者",
  "cg.remove": "移除",
  "cg.invited.title": "已邀請並連結照顧者",
  "cg.invited.context":
    "臨時密碼：{pw} — 請安全地分享。對方可於登入頁面以其電郵及此密碼登入。",
  "cg.revoke.title": "撤銷照顧者存取權",
  "cg.revoke.context": "對方將立即失去存取權，並無法再登入查看此紀錄。",
  "cg.revoke.confirm": "撤銷存取權",

  // caregiver view
  "cgv.viewingAs": "以照顧者身分查看病人紀錄",
  "cgv.readonlyNote": "您擁有 {name} 所授權範圍的唯讀存取權。",
  "cgv.section.profile": "個人及聯絡資料",
  "cgv.section.meds": "目前用藥",
  "cgv.section.rx": "處方",
  "cgv.section.history": "病歷",
  "cgv.rx.empty": "紀錄中沒有已上載的處方檔案。藥物清單顯示於「目前用藥」。",
  "cgv.emergency": "緊急聯絡人",
  "cgv.western": "西藥",
  "cgv.tcm": "中藥（傳統中醫）",
  "cgv.allergies": "過敏",
  "cgv.conditions": "病症",
  "cgv.noPerms": "您目前沒有權限查看此紀錄的任何部分。請要求病人授予存取權。",
  "cgv.disclaimer":
    "照顧者唯讀存取。Qiáo 是藥物核對工具 — 並非診斷，亦非醫療建議。",

  // intake / checker
  "intake.title": "輸入藥物",
  "intake.instructions":
    "分別加入每種西藥及中藥。每個名稱後按 Enter 或逗號。",
  "intake.western": "西藥",
  "intake.westernHint": "例如：華法林",
  "intake.westernPh": "輸入藥物名稱…",
  "intake.tcm": "中藥（傳統中醫）",
  "intake.tcmHint": "例如：丹參",
  "intake.tcmPh": "輸入草藥或方劑…",
  "intake.addAnother": "再加入…",
  "intake.rxType": "處方類型",
  "intake.rxTypeReq": "附加檔案時必填",
  "rx.western": "西藥",
  "rx.westernHint": "西方藥物",
  "rx.tcm": "傳統中醫藥",
  "rx.tcmHint": "草藥及方劑",
  "intake.needType": "請為已附加的檔案選擇處方類型以繼續。",
  "intake.ready": "可以開始檢查。",
  "intake.needMeds": "請至少加入一種西藥及一種中藥以檢查相互作用。",
  "intake.review": "檢視並檢查 →",
  "confirm.title": "檢查前確認",
  "confirm.subtitle": "這兩個清單將傳送至相互作用引擎。",
  "confirm.filesAttached": "已附加 {n} 個檔案",
  "confirm.filesAs": "，類型為 {type}",
  "confirm.filesKept": "（僅供參考，不會被分析）。",
  "confirm.back": "← 返回編輯",
  "confirm.run": "確認並檢查相互作用",
  "results.found": "發現 {n} 項相互作用",
  "results.sortedBy": "按嚴重程度排序。請與藥劑師或醫生分享。",
  "results.checkAnother": "檢查另一位病人",
  "results.back": "← 返回我的藥物",

  // intake — OCR add-to-profile flow
  "intake.addTitle": "新增藥物",
  "intake.ocrInstructions":
    "上載處方相片，或於下方輸入藥物。我們會辨識文字供您確認，再分類為西藥及中藥。",
  "intake.rxText": "處方文字",
  "intake.extracting": "辨識中…",
  "intake.rxPlaceholder": "例如：warfarin 5mg、丹參茶、當歸 — 或於上方上載相片",
  "intake.addToProfile": "確認並加入紀錄",
  "intake.adding": "新增中…",
  "intake.myMeds": "我的藥物",
  "intake.check": "檢查相互作用 →",
  "intake.ocrDone": "已辨識文字 — 請於下方檢視及編輯，然後加入。",
  "intake.ocrEmpty": "在該相片中找不到文字。",
  "intake.added": "已將 {n} 種藥物加入您的紀錄。",
  "intake.noNew": "沒有可新增的已識別藥物。",
  "intake.ocrError": "無法讀取該相片。",
  "intake.stdError": "無法標準化該文字。",

  // attach
  "attach.title": "附加處方",
  "attach.optional": "（選填）",
  "attach.drop": "拖放檔案或點擊瀏覽",
  "attach.types": "JPG、PNG、WebP 或 PDF · 暫不分析",
  "attach.typesOcr": "JPG、PNG、WebP 或 PDF · 自動辨識文字",

  // engine status
  "engine.online": "引擎已連線",
  "engine.offline": "引擎離線",
  "engine.checking": "檢查中…",

  // states
  "empty.title": "未發現已知相互作用",
  "empty.body1": "所輸入的藥物均未在資料庫中匹配到已知的相互作用。這",
  "empty.emphasis": "並不",
  "empty.body2": "代表絕對安全 — 請務必向藥劑師或醫生確認。",
  "error.title": "無法完成檢查",
  "error.retry": "再試一次",
  "loading.checking": "正在檢查相互作用…",

  // doctor portal
  "doctor.title": "病人列表",
  "doctor.subtitle": "您負責的病人",
  "doctor.count": "{n} 位病人",
  "doctor.empty": "尚未分配病人。",
  "doctor.back": "← 所有病人",
  "doctor.details": "病人資料",
  "doctor.editing": "您正在編輯此病人的紀錄。變更會儲存至其個人檔案，並在其登入時顯示。",
  "doctor.runCheck": "檢查相互作用",
  "doctor.checkHint": "對此病人目前的西藥與中藥進行確定性相互作用檢查。",

  // severity
  "sev.contraindicated": "禁用",
  "sev.major": "嚴重",
  "sev.moderate": "中度",
  "sev.minor": "輕微",
};

const DICT: Record<Lang, Strings> = { en: EN, zh: ZH };

/**
 * Clinical-term glossary for the demo. Stored record values stay canonical
 * (English) so the engine lookup and delete-by-value keep working; this maps
 * them to Chinese for *display only*. Keyed by lowercased English term.
 * Unknown terms fall back to the raw string.
 */
const GLOSSARY: Record<string, string> = {
  // conditions
  "atrial fibrillation": "心房顫動",
  "type 2 diabetes": "二型糖尿病",
  "hypertension": "高血壓",
  "high cholesterol": "高膽固醇",
  "osteoarthritis": "骨關節炎",
  "chronic kidney disease": "慢性腎病",
  // western medicines
  "warfarin": "華法林",
  "metformin": "二甲雙胍",
  "amlodipine": "氨氯地平",
  "aspirin": "阿士匹靈",
  "atorvastatin": "阿托伐他汀",
  "ibuprofen": "布洛芬",
  "paracetamol": "撲熱息痛",
  "lisinopril": "賴諾普利",
  "furosemide": "呋塞米",
  // TCM
  "danshen": "丹參",
  "dong quai": "當歸",
  "ginkgo": "銀杏",
  "ginseng": "人參",
  "huang qi": "黃芪",
  "astragalus": "黃芪",
  "gan cao": "甘草",
  "licorice": "甘草",
  // allergies
  "penicillin": "青黴素",
  "sulfa drugs": "磺胺類藥物",
  "aspirin allergy": "阿士匹靈過敏",
  // gender
  "female": "女",
  "male": "男",
  // relationships
  "son-in-law / caretaker": "女婿／看護",
  "mother-in-law": "岳母",
  "daughter": "女兒",
  "son": "兒子",
  "spouse": "配偶",
};

/** Translate a stored clinical/demographic term for display (zh only). */
export function localizeTerm(term: string, lang: Lang): string {
  if (lang !== "zh" || !term) return term;
  return GLOSSARY[term.trim().toLowerCase()] ?? term;
}

export type TFunc = (key: string, vars?: Record<string, string | number>) => string;

interface Ctx {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: TFunc;
  /** Localize a stored clinical/demographic term for display. */
  term: (value: string) => string;
}

const LangContext = createContext<Ctx | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  // Restore saved choice after mount (avoids SSR/client hydration mismatch).
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as Lang | null;
    if (saved === "en" || saved === "zh") setLangState(saved);
  }, []);

  function setLang(l: Lang) {
    setLangState(l);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, l);
      document.documentElement.lang = l === "zh" ? "zh-Hant" : "en";
    }
  }

  const t: TFunc = (key, vars) => {
    let str = DICT[lang][key] ?? DICT.en[key] ?? key;
    if (vars) {
      for (const [k, v] of Object.entries(vars)) {
        str = str.replaceAll(`{${k}}`, String(v));
      }
    }
    return str;
  };

  const term = (value: string) => localizeTerm(value, lang);

  return (
    <LangContext.Provider value={{ lang, setLang, t, term }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang(): Ctx {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error("useLang must be used within LanguageProvider");
  return ctx;
}

/** Convenience hook when a component only needs the translate function. */
export function useT(): TFunc {
  return useLang().t;
}

/** Convenience hook for localizing stored clinical/demographic terms. */
export function useTerm(): (value: string) => string {
  return useLang().term;
}
