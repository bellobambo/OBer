module.exports = {
  tokenSecret: process.env.AUTH_TOKEN_SECRET || "change-this-secret",
  tokenTtlSeconds: Number(process.env.AUTH_TOKEN_TTL_SECONDS || 60 * 60 * 24 * 7),
};
