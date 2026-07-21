export const languageOptions = [
  { code: "en", label: "English" },
  { code: "hi", label: "हिन्दी" },
  { code: "es", label: "Español" },
  { code: "de", label: "Deutsch" }
] as const;

export type AppLanguage = (typeof languageOptions)[number]["code"];

export const languageNames: Record<AppLanguage, string> = {
  en: "English",
  hi: "Hindi",
  es: "Spanish",
  de: "German"
};

type Copy = {
  navHome: string;
  navClaim: string;
  navGuide: string;
  language: string;
  heroKicker: string;
  heroTitle: string;
  heroAccent: string;
  heroCopy: string;
  heroStart: string;
  heroHow: string;
  heroPrivacy: string;
  howKicker: string;
  howTitle: string;
  steps: Array<{ title: string; text: string }>;
  claimKicker: string;
  claimTitle: string;
  claimAccent: string;
  claimCopy: string;
  workflow: [string, string, string];
  quickContext: string;
  claimQuestion: string;
  claimQuestionHelp: string;
  lossTypes: [string, string, string, string];
  sampleKicker: string;
  sampleTitle: string;
  sampleCopy: string;
  sampleCta: string;
  uploadKicker: string;
  uploadTitle: string;
  uploadCopy: string;
  selectMedia: string;
  selectPolicy: string;
  analyze: string;
  temporary: string;
  guideIntro: string;
  guidePlaceholder: string;
  guideLive: string;
  guideOffline: string;
  guidePrompts: [string, string, string];
  intakeTitle: string;
  intakeIntro: string;
  intakeGreeting: string;
  intakePlaceholder: string;
  intakeOffline: string;
  startOver: string;
  unknown: string;
};

export const copy: Record<AppLanguage, Copy> = {
  en: {
    navHome: "Home", navClaim: "Claim", navGuide: "Guide", language: "Language",
    heroKicker: "Built for the policyholder", heroTitle: "Find your footing.", heroAccent: "Document everything.", heroCopy: "After a fire, flood, or storm, insurers ask for an itemized list of everything you lost. ClaimSight builds it from the photos and walkthroughs you already have — priced, checked against your actual policy, and ready to submit in minutes, not weeks.", heroStart: "Start a sample claim", heroHow: "See how it works", heroPrivacy: "Temporary workspace · Delete anytime · Never a payout guarantee",
    howKicker: "From evidence to clarity", howTitle: "Document what happened.\nSee what your policy actually says.",
    steps: [
      { title: "Start with what you have", text: "A walkthrough video, a handful of photos, or old listing images are enough to begin." },
      { title: "Build the inventory", text: "ClaimSight identifies your possessions room by room — and keeps every uncertainty visible instead of guessing." },
      { title: "Read your policy, clearly", text: "Limits, sub-limits, exclusions, deductibles, and ACV vs. replacement-cost terms — quoted word-for-word from your policy." },
      { title: "Export with confidence", text: "Review every item, see where sub-limits may cut your payout, and download an insurer-ready inventory." }
    ],
    claimKicker: "A calmer place to start", claimTitle: "Let’s make a clear", claimAccent: "record of what you had.", claimCopy: "Start with a sample to see the whole journey, or set up a temporary workspace for your own evidence.", workflow: ["Start", "Review", "Export"], quickContext: "Quick context", claimQuestion: "What brought you here?", claimQuestionHelp: "This labels your workspace only. It never changes the policy analysis.", lossTypes: ["Fire", "Water", "Storm", "Other loss"], sampleKicker: "Recommended first", sampleTitle: "Try a sample claim", sampleCopy: "Explore a completed 16-item inventory, synthetic homeowner policy, pricing ranges, and a jewelry sub-limit gap.", sampleCta: "Open sample claim", uploadKicker: "Your evidence", uploadTitle: "Start an upload", uploadCopy: "Files are held in a temporary workspace and can be deleted immediately. Live analysis requires an administrator-configured Gemini key.", selectMedia: "Select photos or video", selectPolicy: "Select policy PDF", analyze: "Analyze temporary workspace", temporary: "Temporary workspace expires in 24 hours. You can delete it now at any time.",
    guideIntro: "I’m your ClaimSight guide. Ask about the evidence-to-claim workflow, what to review, or how a term like ACV works.", guidePlaceholder: "Ask about your claim…", guideLive: "AI help for this workspace", guideOffline: "Guidance mode · add API key for live AI", guidePrompts: ["What should I upload?", "What does ACV mean?", "Why review every item?"], intakeTitle: "Tell me what happened. I’ll build the first draft.", intakeIntro: "I keep uncertain brand, model, age, and condition details as unknown. You can change everything before the draft is created.", intakeGreeting: "I’ll build a first draft with you, one small step at a time. What kind of loss are you documenting—fire, water, storm, or another loss?", intakePlaceholder: "Answer in your own words…", intakeOffline: "Guidance mode · add API key for live AI", startOver: "Start over", unknown: "unknown"
  },
  hi: {
    navHome: "होम", navClaim: "दावा", navGuide: "सहायता", language: "भाषा",
    heroKicker: "पॉलिसीधारक के लिए", heroTitle: "अपनी स्थिति संभालें।", heroAccent: "अपने घर का दस्तावेज़ बनाएं।", heroCopy: "ClaimSight आपके पास मौजूद फ़ोटो और वॉकथ्रू को शांत, साक्ष्य-आधारित घरेलू सामान के दावे में बदलता है—और बताता है कि आपकी पॉलिसी कहाँ कम पड़ सकती है।", heroStart: "नमूना दावा शुरू करें", heroHow: "यह कैसे काम करता है", heroPrivacy: "अस्थायी कार्यक्षेत्र · कभी भी हटाएं · भुगतान की कोई गारंटी नहीं",
    howKicker: "साक्ष्य से स्पष्टता तक", howTitle: "क्या हुआ, उसे दर्ज करें।\nदेखें आपकी पॉलिसी क्या कहती है।",
    steps: [
      { title: "साक्ष्य से शुरू करें", text: "वॉकथ्रू वीडियो, फ़ोटो या पुरानी लिस्टिंग तस्वीरें शुरुआत के लिए पर्याप्त हैं।" },
      { title: "सूची बनाएं", text: "ClaimSight दिखाई देने वाले सामान को कमरे के अनुसार पहचानता है और अनिश्चितता स्पष्ट रखता है।" },
      { title: "पॉलिसी पढ़ें", text: "सीमाएं, अपवाद, डिडक्टिबल और ACV/बदलाव लागत की शर्तें समीक्षा के लिए दिखती हैं।" },
      { title: "स्पष्टता से दावा करें", text: "सामान की समीक्षा करें, संभावित उप-सीमा अंतर देखें और निर्यात करें।" }
    ],
    claimKicker: "शुरू करने के लिए एक शांत जगह", claimTitle: "आइए एक स्पष्ट", claimAccent: "रिकॉर्ड बनाएं कि आपके पास क्या था।", claimCopy: "पूरा सफ़र देखने के लिए नमूने से शुरू करें या अपने साक्ष्य के लिए अस्थायी कार्यक्षेत्र बनाएं।", workflow: ["शुरू", "समीक्षा", "निर्यात"], quickContext: "त्वरित संदर्भ", claimQuestion: "आपको यहाँ क्या लाया?", claimQuestionHelp: "यह केवल आपके कार्यक्षेत्र को लेबल करता है। यह पॉलिसी विश्लेषण नहीं बदलता।", lossTypes: ["आग", "पानी", "तूफ़ान", "अन्य नुकसान"], sampleKicker: "पहले यह देखें", sampleTitle: "नमूना दावा आज़माएं", sampleCopy: "16 वस्तुओं की सूची, नमूना गृहस्वामी पॉलिसी, मूल्य सीमा और आभूषण उप-सीमा अंतर देखें।", sampleCta: "नमूना दावा खोलें", uploadKicker: "आपका साक्ष्य", uploadTitle: "अपलोड शुरू करें", uploadCopy: "फ़ाइलें अस्थायी कार्यक्षेत्र में रखी जाती हैं और तुरंत हटाई जा सकती हैं। लाइव विश्लेषण के लिए एडमिन द्वारा कॉन्फ़िगर की गई Gemini key चाहिए।", selectMedia: "फ़ोटो या वीडियो चुनें", selectPolicy: "पॉलिसी PDF चुनें", analyze: "अस्थायी कार्यक्षेत्र का विश्लेषण करें", temporary: "अस्थायी कार्यक्षेत्र 24 घंटे में समाप्त होता है। आप इसे कभी भी हटा सकते हैं।",
    guideIntro: "मैं आपका ClaimSight सहायक हूँ। साक्ष्य-से-दावा प्रक्रिया, समीक्षा या ACV जैसे शब्दों के बारे में पूछें।", guidePlaceholder: "अपने दावे के बारे में पूछें…", guideLive: "इस कार्यक्षेत्र के लिए AI सहायता", guideOffline: "मार्गदर्शन मोड · लाइव AI के लिए API key जोड़ें", guidePrompts: ["मुझे क्या अपलोड करना चाहिए?", "ACV का क्या अर्थ है?", "हर वस्तु की समीक्षा क्यों करें?"], intakeTitle: "बताइए क्या हुआ। मैं पहला ड्राफ़्ट बनाऊँगा।", intakeIntro: "मैं अनिश्चित ब्रांड, मॉडल, उम्र और स्थिति को अज्ञात रखता हूँ। ड्राफ़्ट बनाने से पहले आप सब बदल सकते हैं।", intakeGreeting: "मैं आपके साथ एक-एक छोटे कदम में पहला ड्राफ़्ट बनाऊँगा। आप किस प्रकार के नुकसान का दस्तावेज़ बना रहे हैं—आग, पानी, तूफ़ान या कुछ और?", intakePlaceholder: "अपने शब्दों में जवाब दें…", intakeOffline: "मार्गदर्शन मोड · लाइव AI के लिए API key जोड़ें", startOver: "फिर से शुरू करें", unknown: "अज्ञात"
  },
  es: {
    navHome: "Inicio", navClaim: "Reclamo", navGuide: "Guía", language: "Idioma",
    heroKicker: "Hecho para el titular de la póliza", heroTitle: "Encuentra tu equilibrio.", heroAccent: "Documenta tu hogar.", heroCopy: "ClaimSight convierte las fotos y recorridos que ya tienes en un reclamo de contenidos tranquilo y basado en evidencia, y muestra dónde tu póliza podría no alcanzar.", heroStart: "Iniciar reclamo de ejemplo", heroHow: "Ver cómo funciona", heroPrivacy: "Espacio temporal · Elimina cuando quieras · Sin garantía de pago",
    howKicker: "De la evidencia a la claridad", howTitle: "Documenta lo que pasó.\nMira lo que dice tu póliza.",
    steps: [
      { title: "Empieza con evidencia", text: "Un video de recorrido, fotos o imágenes antiguas de un anuncio son suficientes para comenzar." },
      { title: "Crea el inventario", text: "ClaimSight identifica pertenencias visibles por habitación y mantiene visible la incertidumbre." },
      { title: "Lee la póliza", text: "Los límites, exclusiones, deducibles y términos de ACV o costo de reemplazo se muestran para revisión." },
      { title: "Presenta con claridad", text: "Revisa artículos, identifica posibles brechas y exporta un inventario listo para la aseguradora." }
    ],
    claimKicker: "Un lugar más tranquilo para empezar", claimTitle: "Hagamos un registro claro", claimAccent: "de lo que tenías.", claimCopy: "Comienza con un ejemplo para ver el proceso completo o crea un espacio temporal para tu propia evidencia.", workflow: ["Inicio", "Revisión", "Exportar"], quickContext: "Contexto rápido", claimQuestion: "¿Qué te trae aquí?", claimQuestionHelp: "Esto solo etiqueta tu espacio de trabajo. No cambia el análisis de la póliza.", lossTypes: ["Incendio", "Agua", "Tormenta", "Otra pérdida"], sampleKicker: "Recomendado primero", sampleTitle: "Prueba un reclamo de ejemplo", sampleCopy: "Explora un inventario de 16 artículos, una póliza sintética, rangos de precios y una brecha para joyas.", sampleCta: "Abrir reclamo de ejemplo", uploadKicker: "Tu evidencia", uploadTitle: "Iniciar una carga", uploadCopy: "Los archivos se guardan en un espacio temporal y pueden eliminarse de inmediato. El análisis en vivo requiere una clave Gemini configurada por un administrador.", selectMedia: "Seleccionar fotos o video", selectPolicy: "Seleccionar PDF de póliza", analyze: "Analizar espacio temporal", temporary: "El espacio temporal vence en 24 horas. Puedes eliminarlo en cualquier momento.",
    guideIntro: "Soy tu guía de ClaimSight. Pregunta sobre el flujo de evidencia al reclamo, qué revisar o términos como ACV.", guidePlaceholder: "Pregunta sobre tu reclamo…", guideLive: "Ayuda con IA para este espacio", guideOffline: "Modo de orientación · agrega una clave API para IA en vivo", guidePrompts: ["¿Qué debo subir?", "¿Qué significa ACV?", "¿Por qué revisar cada artículo?"], intakeTitle: "Cuéntame qué pasó. Haré el primer borrador.", intakeIntro: "Mantengo como desconocidos la marca, modelo, antigüedad y condición cuando no son seguros. Puedes cambiar todo antes de crear el borrador.", intakeGreeting: "Haré un primer borrador contigo, paso a paso. ¿Qué tipo de pérdida estás documentando: incendio, agua, tormenta u otra?", intakePlaceholder: "Responde con tus propias palabras…", intakeOffline: "Modo de orientación · agrega una clave API para IA en vivo", startOver: "Empezar de nuevo", unknown: "desconocido"
  },
  de: {
    navHome: "Start", navClaim: "Schaden", navGuide: "Hilfe", language: "Sprache",
    heroKicker: "Für Versicherungsnehmer", heroTitle: "Finde wieder Halt.", heroAccent: "Dokumentiere dein Zuhause.", heroCopy: "ClaimSight macht aus vorhandenen Fotos und Rundgängen eine ruhige, beleggestützte Hausrat-Schadenliste und zeigt, wo deine Police möglicherweise nicht ausreicht.", heroStart: "Beispielschaden starten", heroHow: "So funktioniert es", heroPrivacy: "Temporärer Arbeitsbereich · Jederzeit löschen · Keine Zahlungsgarantie",
    howKicker: "Von Belegen zu Klarheit", howTitle: "Dokumentiere, was passiert ist.\nSieh, was deine Police sagt.",
    steps: [
      { title: "Mit Belegen beginnen", text: "Ein Rundgangsvideo, Fotos oder alte Inseratsbilder reichen für den Anfang." },
      { title: "Inventar erstellen", text: "ClaimSight erkennt sichtbare Gegenstände nach Räumen und macht Unsicherheiten sichtbar." },
      { title: "Police lesen", text: "Grenzen, Ausschlüsse, Selbstbehalte sowie ACV- und Wiederbeschaffungskostenterms werden zur Prüfung angezeigt." },
      { title: "Klar einreichen", text: "Prüfe die Gegenstände, erkenne mögliche Teil-Limit-Lücken und exportiere ein versicherungsfähiges Inventar." }
    ],
    claimKicker: "Ein ruhigerer Anfang", claimTitle: "Erstellen wir einen klaren", claimAccent: "Nachweis dessen, was du hattest.", claimCopy: "Starte mit einem Beispiel, um den gesamten Ablauf zu sehen, oder richte einen temporären Arbeitsbereich für deine Belege ein.", workflow: ["Start", "Prüfen", "Export"], quickContext: "Kurzer Kontext", claimQuestion: "Was führt dich hierher?", claimQuestionHelp: "Dies beschriftet nur deinen Arbeitsbereich. Die Policenanalyse ändert sich nicht.", lossTypes: ["Feuer", "Wasser", "Sturm", "Anderer Schaden"], sampleKicker: "Zuerst empfohlen", sampleTitle: "Beispielschaden ausprobieren", sampleCopy: "Erkunde ein Inventar mit 16 Artikeln, eine synthetische Hausratversicherung, Preisbereiche und eine Schmuck-Limit-Lücke.", sampleCta: "Beispielschaden öffnen", uploadKicker: "Deine Belege", uploadTitle: "Upload starten", uploadCopy: "Dateien werden in einem temporären Arbeitsbereich gespeichert und können sofort gelöscht werden. Für die Live-Analyse ist ein vom Administrator konfigurierter Gemini-Key erforderlich.", selectMedia: "Fotos oder Video auswählen", selectPolicy: "Police als PDF auswählen", analyze: "Temporären Arbeitsbereich analysieren", temporary: "Der temporäre Arbeitsbereich läuft in 24 Stunden ab. Du kannst ihn jederzeit löschen.",
    guideIntro: "Ich bin dein ClaimSight-Hilfeassistent. Frage nach dem Ablauf von Belegen zum Schaden, Prüfungen oder Begriffen wie ACV.", guidePlaceholder: "Frage zu deinem Schaden…", guideLive: "KI-Hilfe für diesen Arbeitsbereich", guideOffline: "Hinweismodus · API-Key für Live-KI hinzufügen", guidePrompts: ["Was soll ich hochladen?", "Was bedeutet ACV?", "Warum jeden Artikel prüfen?"], intakeTitle: "Erzähl mir, was passiert ist. Ich erstelle den ersten Entwurf.", intakeIntro: "Unsichere Angaben zu Marke, Modell, Alter und Zustand bleiben unbekannt. Du kannst alles vor dem Erstellen ändern.", intakeGreeting: "Ich erstelle mit dir Schritt für Schritt einen ersten Entwurf. Welche Art Schaden dokumentierst du—Feuer, Wasser, Sturm oder etwas anderes?", intakePlaceholder: "Antworte mit deinen eigenen Worten…", intakeOffline: "Hinweismodus · API-Key für Live-KI hinzufügen", startOver: "Neu beginnen", unknown: "unbekannt"
  }
};
