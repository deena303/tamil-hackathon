# Script to cleanly update frontend/src/i18n.tsx
with open('frontend/src/i18n.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

type_addition = """  storagePrivacyNotice: string;
  btnRestoring: string;
  emptyDocumentBadge: string;
  allPagesSavedBadge: string;
  partialPagesSavedBadge: string;
  noOcrContentSavedTitle: string;
  noOcrContentSavedDesc: string;
  documentIntegrityTitle: string;
  documentIntegritySummary: string;
  documentIntegrityPendingNotice: string;
  firstSavedPageNavigated: string;
  integrityVerified: string;"""

en_addition = """    storagePrivacyNotice: '🔒 Privacy Guaranteed: Original scan files remain temporary and are never uploaded to cloud storage buckets.',
    btnRestoring: 'Opening…',
    emptyDocumentBadge: '0 OCR saved (Unprocessed)',
    allPagesSavedBadge: 'All pages saved',
    partialPagesSavedBadge: 'OCR pages saved',
    noOcrContentSavedTitle: 'No Saved OCR Results in Database',
    noOcrContentSavedDesc: 'Document metadata was recorded in Supabase, but no OCR page transcriptions exist yet. Upload the original file to process it.',
    documentIntegrityTitle: 'Document Integrity Check',
    documentIntegritySummary: 'pages with saved OCR results.',
    documentIntegrityPendingNotice: 'pages remain unprocessed. Upload original file to run OCR.',
    firstSavedPageNavigated: 'Navigated to first page with saved content (Page {page}).',
    integrityVerified: 'Verified in Supabase',"""

ta_addition = """    storagePrivacyNotice: '🔒 தனியுரிமை உறுதி: அசல் கோப்புகள் தற்காலிகமானவை மற்றும் கிளவுட் சேமிப்பகத்தில் சேமிக்கப்படுவதில்லை.',
    btnRestoring: 'திறக்கப்படுகிறது…',
    emptyDocumentBadge: '0 சேமிக்கப்பட்டது (செயல்படுத்தப்படவில்லை)',
    allPagesSavedBadge: 'அனைத்து பக்கங்களும் சேமிக்கப்பட்டன',
    partialPagesSavedBadge: 'பக்கங்கள் சேமிக்கப்பட்டன',
    noOcrContentSavedTitle: 'சூபாபேஸில் OCR முடிவுகள் இல்லை',
    noOcrContentSavedDesc: 'ஆவணப் பதிவு உள்ளது, ஆனால் சூபாபேஸில் பக்க உரை முடிவுகள் இன்னும் சேமிக்கப்படவில்லை. பிரித்தெடுக்க அசல் கோப்பைப் பதிவேற்றவும்.',
    documentIntegrityTitle: 'ஆவண ஒருமைப்பாடு சோதனை',
    documentIntegritySummary: 'பக்கங்கள் சேமிக்கப்பட்டுள்ளன.',
    documentIntegrityPendingNotice: 'பக்கங்கள் இன்னும் பிரித்தெடுக்கப்படவில்லை. அவற்றை இயக்க அசல் கோப்பைப் பதிவேற்றவும்.',
    firstSavedPageNavigated: 'சேமிக்கப்பட்ட உரையுடைய முதல் பக்கத்திற்குச் செல்லப்பட்டது (பக்கம் {page}).',
    integrityVerified: 'சூபாபேஸில் சரிபார்க்கப்பட்டது',"""

hi_addition = """    storagePrivacyNotice: '🔒 गोपनीयता गारंटी: मूल स्कैन फ़ाइलें अस्थायी हैं और उन्हें कभी भी क्लाउड स्टोरेज बकेट में अपलोड नहीं किया जाता है।',
    btnRestoring: 'खोला जा रहा है…',
    emptyDocumentBadge: '0 सहेजे गए (असंसाधित)',
    allPagesSavedBadge: 'सभी पृष्ठ सहेजे गए',
    partialPagesSavedBadge: 'पृष्ठ सहेजे गए',
    noOcrContentSavedTitle: 'सुपाबेस में कोई OCR परिणाम सहेजा नहीं गया',
    noOcrContentSavedDesc: 'दस्तावेज़ मेटाडेटा सुपाबेस में मौजूद है, लेकिन अभी तक कोई पृष्ठ OCR प्रतिलेखन नहीं सहेजा गया है। इसे प्रोसेस करने के लिए मूल फ़ाइल अपलोड करें।',
    documentIntegrityTitle: 'दस्तावेज़ अखंडता जांच',
    documentIntegritySummary: 'सहेजे गए OCR परिणामों वाले पृष्ठ।',
    documentIntegrityPendingNotice: 'पृष्ठ असंसाधित हैं। OCR चलाने के लिए मूल फ़ाइल अपलोड करें।',
    firstSavedPageNavigated: 'सहेजी गई सामग्री वाले पहले पृष्ठ पर ले जाया गया (पृष्ठ {page})।',
    integrityVerified: 'सुपाबेस में सत्यापित',"""

# Replace in interface Translations
content = content.replace("  storagePrivacyNotice: string;", type_addition, 1)

# Replace in en
en_marker = "    storagePrivacyNotice: '🔒 Privacy Guaranteed: Original scan files remain temporary and are never uploaded to cloud storage buckets.',"
content = content.replace(en_marker, en_addition, 1)

# Replace in ta
ta_marker = "    storagePrivacyNotice: '🔒 தனியுரிமை உறுதி: அசல் கோப்புகள் தற்காலிகமானவை மற்றும் கிளவுட் சேமிப்பகத்தில் சேமிக்கப்படுவதில்லை.',"
content = content.replace(ta_marker, ta_addition, 1)

# Replace in hi
hi_marker = "    storagePrivacyNotice: '🔒 गोपनीयता गारंटी: मूल स्कैन फ़ाइलें अस्थायी हैं और उन्हें कभी भी क्लाउड स्टोरेज बकेट में अपलोड नहीं किया जाता है।',"
content = content.replace(hi_marker, hi_addition, 1)

with open('frontend/src/i18n.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Updated i18n.tsx successfully")
