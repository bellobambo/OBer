function getUniqueConflictMessage(error) {
  const context = [error?.constraint, error?.message, error?.details]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (context.includes("drivers_vehicle_id_unique_idx")) {
    return "A driver with this vehicle ID already exists.";
  }

  if (context.includes("drivers_license_number_unique_idx")) {
    return "A driver with this license number already exists.";
  }

  return "A user or driver with these account or vehicle details already exists.";
}

module.exports = { getUniqueConflictMessage };
