async function create(client, driver) {
  return client.query(
    `INSERT INTO drivers (user_id, driver_code)
     VALUES ($1, $2)`,
    [driver.userId, driver.driverCode]
  );
}

module.exports = {
  create,
};
