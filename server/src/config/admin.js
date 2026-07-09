function parseEmailList(value) {
  return String(value || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

module.exports = {
  allowedEmails: parseEmailList(process.env.ADMIN_EMAILS),
};
