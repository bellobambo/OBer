function getField(body, ...names) {
  for (const name of names) {
    if (body[name] !== undefined && body[name] !== null) {
      return String(body[name]).trim();
    }
  }

  return "";
}

module.exports = {
  getField,
};
