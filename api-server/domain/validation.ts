import * as Joi from 'joi'
import { SchemaLike, ValidationOptions } from 'joi'

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
  obj: T,
  schema: SchemaLike,
  opts?: ValidationOptions
): T {
  const { error, value } = Joi.validate(obj, schema, opts)
  if (error) {
    throw error
  } else {
    return value
  }
}
