import xlsx from 'xlsx';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Parses an uploaded excel buffer into recipient rows.
// Expects at least "name" and "email" columns (case-insensitive).
// Any other columns are kept as custom_fields for use as extra placeholders.
export function parseRecipientsFromExcel(fileBuffer) {
  const workbook = xlsx.read(fileBuffer, { type: 'buffer' });
  const firstSheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[firstSheetName];
  const rows = xlsx.utils.sheet_to_json(sheet, { defval: '' });

  const recipients = [];
  const errors = [];

  rows.forEach((row, index) => {
    // normalize keys to lowercase for lookup, keep originals for custom_fields
    const normalized = {};
    for (const key of Object.keys(row)) {
      normalized[key.trim().toLowerCase()] = row[key];
    }

    const name = normalized.name?.toString().trim() || '';
    const email = normalized.email?.toString().trim() || '';

    if (!email || !EMAIL_REGEX.test(email)) {
      errors.push({ row: index + 2, reason: `Invalid or missing email: "${email}"` });
      return;
    }

    const customFields = { ...normalized };
    delete customFields.name;
    delete customFields.email;

    recipients.push({ name, email, custom_fields: customFields });
  });

  return { recipients, errors };
}
