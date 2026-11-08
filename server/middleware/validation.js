/**
 * Server-side validation with Joi.
 *
 * The specification requires it, and it is the only validation that can be
 * trusted: the browser checks can be bypassed completely.
 *
 * validate(schema) returns a middleware. On failure it replies with the same
 * shape the error handler uses, so the frontend has one error format to read.
 */
const Joi = require("joi");
const { removeTempFile } = require("./upload");

function validate(schema) {
  return async (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,   // report every problem at once
      stripUnknown: true   // silently drop fields the schema does not list
    });

    if (error) {
      /* multer has already written the file by the time this runs, so a
         rejected request must delete it or the folder fills with orphans. */
      if (req.file) await removeTempFile(req.file.path);

      const details = {};
      error.details.forEach(item => {
        details[item.path.join(".")] = item.message;
      });
      return res.status(400).json({ error: "Validation failed.", details });
    }

    req.body = value;
    next();
  };
}

/* Letters and spaces only, Arabic or Latin. */
const namePattern = /^[A-Za-z؀-ۿ\s]+$/;

const schemas = {
  register: Joi.object({
    firstName: Joi.string().trim().min(2).max(50).pattern(namePattern).required()
      .messages({ "string.pattern.base": "First name may contain letters only." }),
    lastName: Joi.string().trim().min(2).max(50).pattern(namePattern).required()
      .messages({ "string.pattern.base": "Last name may contain letters only." }),
    email: Joi.string().trim().lowercase().email().max(100).required(),
    password: Joi.string().min(6).max(128).required()
      .messages({ "string.min": "Password must be at least 6 characters long." }),
    location: Joi.string().trim().max(100).allow("").optional(),
    description: Joi.string().trim().max(500).allow("").optional(),
    occupation: Joi.string().trim().max(100).allow("").optional()
  }),

  login: Joi.object({
    email: Joi.string().trim().lowercase().email().required(),
    password: Joi.string().required()
  }),

  verifyOtp: Joi.object({
    email: Joi.string().trim().lowercase().email().required(),
    otp: Joi.string().trim().length(6).pattern(/^\d+$/).required()
      .messages({ "string.pattern.base": "The code must be 6 digits." })
  }),

  emailOnly: Joi.object({
    email: Joi.string().trim().lowercase().email().required()
  }),

  photo: Joi.object({
    title: Joi.string().trim().min(1).max(200).required()
      .messages({ "string.empty": "Title is required." }),
    description: Joi.string().trim().max(1000).allow("").optional()
  }),

  comment: Joi.object({
    comment: Joi.string().trim().min(1).max(500).required()
      .messages({ "string.empty": "Comment cannot be empty." })
  }),

  resetPassword: Joi.object({
    email: Joi.string().trim().lowercase().email().required(),
    otp: Joi.string().trim().length(6).pattern(/^\d+$/).required()
      .messages({ "string.pattern.base": "The code must be 6 digits." }),
    newPassword: Joi.string().min(6).max(128).required()
      .messages({ "string.min": "Password must be at least 6 characters long." })
  })
};

module.exports = { validate, schemas };
