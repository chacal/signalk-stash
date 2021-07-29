import * as Joi from 'joi'
import { ValidationOptions } from 'joi'

export const Schemas = {
  lat: Joi.number()
    .greater(-90)
    .less(90)
    .required(),
  lng: Joi.number()
    .greater(-180)
    .less(180)
    .required()
}

export function validate<T>(
  obj: any,
  schema: Joi.AnySchema,
  opts?: ValidationOptions
): T {
  const defaultOpts = { allowUnknown: true, abortEarly: false }
  const usedOpts = { ...defaultOpts, ...opts }

  const { error, value } = schema.validate(obj, usedOpts)
  if (error) {
    throw error
  } else {
    return value
  }
}
