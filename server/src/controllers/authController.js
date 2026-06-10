const pool = require("../db");
const Driver = require("../models/driverModel");
const User = require("../models/userModel");
const { sendError, sendSuccess } = require("../utils/response");
const {
  createAuthToken,
  createVerificationCode,
  getVerificationExpiry,
  hashPassword,
  verifyAuthToken,
  verifyPassword,
} = require("../utils/security");
const {
  validateLogin,
  validatePasswordReset,
  validatePasswordResetRequest,
  validatePhoneVerification,
  validateRegistration,
  validateResendVerification,
} = require("../validators/authValidator");

async function register(req, res) {
  const { data, errors } = validateRegistration(req.body);

  if (errors.length > 0) {
    return sendError(res, 400, "Validation failed.", errors);
  }

  const verificationCode = createVerificationCode();
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const userResult = await User.create(client, {
      role: data.role,
      email: data.email,
      phone: data.phone,
      passwordHash: hashPassword(data.password),
      phoneVerificationCode: verificationCode,
      phoneVerificationExpiresAt: getVerificationExpiry(),
    });

    if (data.role === "DRIVER") {
      await Driver.create(client, {
        userId: userResult.rows[0].id,
        driverCode: data.driverCode,
      });
    }

    await client.query("COMMIT");

    return sendSuccess(res, 201, "Registration created. Verify the phone number with the code sent to the user.", {
      user: User.toResponse(userResult.rows[0]),
      verificationCode,
    });
  } catch (error) {
    await client.query("ROLLBACK");

    if (error.code === "23505") {
      return sendError(res, 409, "A user with this email, phone number, or driver code already exists.");
    }

    return sendError(res, 500, "Unable to register user.", error.message);
  } finally {
    client.release();
  }
}

async function verifyPhone(req, res) {
  const { data, errors } = validatePhoneVerification(req.body);

  if (errors.length > 0) {
    return sendError(res, 400, "Validation failed.", errors);
  }

  try {
    const userResult = await User.verifyPhone(data.phone, data.code);

    if (userResult.rowCount === 0) {
      return sendError(res, 400, "Invalid or expired verification code.");
    }

    return sendSuccess(res, 200, "Phone number verified successfully.", {
      user: User.toResponse(userResult.rows[0]),
    });
  } catch (error) {
    return sendError(res, 500, "Unable to verify phone number.", error.message);
  }
}

async function login(req, res) {
  const { data, errors } = validateLogin(req.body);

  if (errors.length > 0) {
    return sendError(res, 400, "Validation failed.", errors);
  }

  try {
    const userResult = await User.findByLogin(data.login);

    if (userResult.rowCount === 0) {
      return sendError(res, 401, "Invalid login credentials.");
    }

    const user = userResult.rows[0];

    if (!verifyPassword(data.password, user.password_hash)) {
      return sendError(res, 401, "Invalid login credentials.");
    }

    if (!user.phone_verified) {
      return sendError(res, 403, "Verify phone number before logging in.");
    }

    delete user.password_hash;

    return sendSuccess(res, 200, "Login successful.", {
      tokenType: "Bearer",
      token: createAuthToken(user),
      user: User.toResponse(user),
    });
  } catch (error) {
    return sendError(res, 500, "Unable to login.", error.message);
  }
}

async function me(req, res) {
  const authorization = req.get("authorization") || "";
  const [scheme, token] = authorization.split(" ");

  if (scheme !== "Bearer" || !token) {
    return sendError(res, 401, "Bearer token is required.");
  }

  let payload;

  try {
    payload = verifyAuthToken(token);
  } catch (_error) {
    payload = null;
  }

  if (!payload) {
    return sendError(res, 401, "Invalid or expired token.");
  }

  try {
    const userResult = await User.findPublicById(payload.sub);

    if (userResult.rowCount === 0) {
      return sendError(res, 401, "Invalid or expired token.");
    }

    return sendSuccess(res, 200, "Authenticated user loaded successfully.", {
      user: User.toResponse(userResult.rows[0]),
    });
  } catch (error) {
    return sendError(res, 500, "Unable to load authenticated user.", error.message);
  }
}

async function requestPasswordReset(req, res) {
  const { data, errors } = validatePasswordResetRequest(req.body);

  if (errors.length > 0) {
    return sendError(res, 400, "Validation failed.", errors);
  }

  const resetCode = createVerificationCode();

  try {
    const existingUserResult = await User.findByLogin(data.login);

    if (existingUserResult.rowCount > 0) {
      await User.setPasswordResetCode(
        existingUserResult.rows[0].id,
        resetCode,
        getVerificationExpiry()
      );
    }

    return sendSuccess(res, 200, "If the account exists, a password reset code has been sent.", {
      ...(existingUserResult.rowCount > 0 ? { resetCode } : {}),
    });
  } catch (error) {
    return sendError(res, 500, "Unable to request password reset.", error.message);
  }
}

async function resetPassword(req, res) {
  const { data, errors } = validatePasswordReset(req.body);

  if (errors.length > 0) {
    return sendError(res, 400, "Validation failed.", errors);
  }

  try {
    const existingUserResult = await User.findByLogin(data.login);

    if (
      existingUserResult.rowCount === 0 ||
      existingUserResult.rows[0].password_reset_code !== data.code ||
      existingUserResult.rows[0].password_reset_expires_at <= new Date()
    ) {
      return sendError(res, 400, "Invalid or expired password reset code.");
    }

    const userResult = await User.updatePassword(
      existingUserResult.rows[0].id,
      hashPassword(data.password)
    );

    return sendSuccess(res, 200, "Password reset successfully.", {
      user: User.toResponse(userResult.rows[0]),
    });
  } catch (error) {
    return sendError(res, 500, "Unable to reset password.", error.message);
  }
}

async function resendVerificationCode(req, res) {
  const { data, errors } = validateResendVerification(req.body);

  if (errors.length > 0) {
    return sendError(res, 400, "Validation failed.", errors);
  }

  const verificationCode = createVerificationCode();

  try {
    const existingUserResult = await User.findByLogin(data.phone);

    if (existingUserResult.rowCount > 0 && !existingUserResult.rows[0].phone_verified) {
      await User.updatePhoneVerificationCode(
        existingUserResult.rows[0].id,
        verificationCode,
        getVerificationExpiry()
      );
    }

    return sendSuccess(res, 200, "If the account exists and is not verified, a new verification code has been sent.", {
      ...(existingUserResult.rowCount > 0 && !existingUserResult.rows[0].phone_verified ? { verificationCode } : {}),
    });
  } catch (error) {
    return sendError(res, 500, "Unable to resend verification code.", error.message);
  }
}

module.exports = {
  login,
  me,
  register,
  requestPasswordReset,
  resendVerificationCode,
  resetPassword,
  verifyPhone,
};
