// Replaces {token} placeholders in a template with values from a recipient row.
// Supports {name}, {email}, and any custom column from the uploaded excel,
// e.g. {company}, {city} -- matched case-insensitively.
export function fillTemplate(template, recipient) {
  const values = {
    name: recipient.name || '',
    email: recipient.email || '',
    ...(recipient.custom_fields || {}),
  };

  return template.replace(/{\s*([\w]+)\s*}/g, (match, key) => {
    const lookupKey = Object.keys(values).find(
      (k) => k.toLowerCase() === key.toLowerCase()
    );
    return lookupKey !== undefined ? String(values[lookupKey]) : match;
  });
}
