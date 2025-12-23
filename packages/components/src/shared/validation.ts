/**
 * Configuration Validation System
 *
 * Runtime validation for component options:
 * - Type checking
 * - Enum validation
 * - Range checking
 * - Custom validators
 * - Helpful error messages
 *
 * @module
 */

// ============================================================================
// Types
// ============================================================================

/** Validation result */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

/** Validation error */
export interface ValidationError {
  path: string;
  message: string;
  received: unknown;
  expected: string;
}

/** Validation warning (non-fatal) */
export interface ValidationWarning {
  path: string;
  message: string;
}

/** Schema types */
export type SchemaType = 'string' | 'number' | 'boolean' | 'object' | 'array' | 'function' | 'any';

/** Field schema definition */
export interface FieldSchema {
  /** Field type */
  type: SchemaType | SchemaType[];
  /** Is field required? */
  required?: boolean;
  /** Default value if not provided */
  default?: unknown;
  /** Allowed values (enum) */
  enum?: readonly unknown[];
  /** Minimum value (for numbers) */
  min?: number;
  /** Maximum value (for numbers) */
  max?: number;
  /** Minimum length (for strings/arrays) */
  minLength?: number;
  /** Maximum length (for strings/arrays) */
  maxLength?: number;
  /** Regex pattern (for strings) */
  pattern?: RegExp;
  /** Nested object schema */
  properties?: Schema;
  /** Array item schema */
  items?: FieldSchema;
  /** Custom validation function */
  validate?: (value: unknown, context: ValidationContext) => true | string;
  /** Description for error messages */
  description?: string;
  /** Deprecation warning */
  deprecated?: string | boolean;
  /** Alias for this field (maps old name to new) */
  alias?: string;
}

/** Schema definition */
export type Schema = Record<string, FieldSchema>;

/** Validation context */
export interface ValidationContext {
  path: string;
  value: unknown;
  root: unknown;
  schema: Schema;
}

/** Validation options */
export interface ValidationOptions {
  /** Throw on first error */
  throwOnError?: boolean;
  /** Log warnings to console */
  logWarnings?: boolean;
  /** Strip unknown properties */
  stripUnknown?: boolean;
  /** Apply default values */
  applyDefaults?: boolean;
  /** Coerce types when possible */
  coerceTypes?: boolean;
}

// ============================================================================
// Schema Builder (Fluent API)
// ============================================================================

/**
 * Schema builder for fluent API
 *
 * @example
 * ```typescript
 * const schema = {
 *   name: s.string().required(),
 *   age: s.number().min(0).max(120),
 *   role: s.enum(['admin', 'user', 'guest']).default('user'),
 *   settings: s.object({
 *     theme: s.enum(['light', 'dark']),
 *     notifications: s.boolean().default(true)
 *   })
 * };
 * ```
 */
class SchemaBuilder implements FieldSchema {
  type: SchemaType | SchemaType[] = 'any';
  required?: boolean;
  default?: unknown;
  enum?: readonly unknown[];
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  properties?: Schema;
  items?: FieldSchema;
  validate?: (value: unknown, context: ValidationContext) => true | string;
  description?: string;
  deprecated?: string | boolean;
  alias?: string;

  private constructor(type: SchemaType | SchemaType[]) {
    this.type = type;
  }

  static string(): SchemaBuilder {
    return new SchemaBuilder('string');
  }

  static number(): SchemaBuilder {
    return new SchemaBuilder('number');
  }

  static boolean(): SchemaBuilder {
    return new SchemaBuilder('boolean');
  }

  static object(properties?: Schema): SchemaBuilder {
    const builder = new SchemaBuilder('object');
    if (properties) {
      builder.properties = properties;
    }
    return builder;
  }

  static array(items?: FieldSchema): SchemaBuilder {
    const builder = new SchemaBuilder('array');
    if (items) {
      builder.items = items;
    }
    return builder;
  }

  static function(): SchemaBuilder {
    return new SchemaBuilder('function');
  }

  static any(): SchemaBuilder {
    return new SchemaBuilder('any');
  }

  static enum<T extends readonly unknown[]>(values: T): SchemaBuilder {
    const builder = new SchemaBuilder('any');
    builder.enum = values;
    return builder;
  }

  static oneOf(types: SchemaType[]): SchemaBuilder {
    return new SchemaBuilder(types);
  }

  setRequired(value = true): this {
    this.required = value;
    return this;
  }

  setDefault(value: unknown): this {
    this.default = value;
    return this;
  }

  setMin(value: number): this {
    this.min = value;
    return this;
  }

  setMax(value: number): this {
    this.max = value;
    return this;
  }

  setMinLength(value: number): this {
    this.minLength = value;
    return this;
  }

  setMaxLength(value: number): this {
    this.maxLength = value;
    return this;
  }

  setPattern(value: RegExp): this {
    this.pattern = value;
    return this;
  }

  setValidate(fn: (value: unknown, context: ValidationContext) => true | string): this {
    this.validate = fn;
    return this;
  }

  setDescription(value: string): this {
    this.description = value;
    return this;
  }

  setDeprecated(message?: string): this {
    this.deprecated = message || true;
    return this;
  }

  setAlias(name: string): this {
    this.alias = name;
    return this;
  }
}

/** Schema builder shorthand */
export const s = {
  string: () => SchemaBuilder.string(),
  number: () => SchemaBuilder.number(),
  boolean: () => SchemaBuilder.boolean(),
  object: (properties?: Schema) => SchemaBuilder.object(properties),
  array: (items?: FieldSchema) => SchemaBuilder.array(items),
  function: () => SchemaBuilder.function(),
  any: () => SchemaBuilder.any(),
  enum: <T extends readonly unknown[]>(values: T) => SchemaBuilder.enum(values),
  oneOf: (types: SchemaType[]) => SchemaBuilder.oneOf(types),
};

// ============================================================================
// Validation Implementation
// ============================================================================

/**
 * Validate a value against a schema
 *
 * @example
 * ```typescript
 * const schema = {
 *   ripple: { type: 'boolean', default: true },
 *   hover: { type: 'string', enum: ['none', 'lift', 'breathing'], default: 'breathing' },
 *   size: { type: 'number', min: 0, max: 100 }
 * };
 *
 * const result = validate({ ripple: true, hover: 'invalid' }, schema);
 * if (!result.valid) {
 *   console.error(result.errors);
 * }
 * ```
 */
export function validate(
  value: unknown,
  schema: Schema,
  options: ValidationOptions = {}
): ValidationResult {
  const { logWarnings = true, applyDefaults = true, coerceTypes = false } = options;

  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  if (typeof value !== 'object' || value === null) {
    errors.push({
      path: '',
      message: 'Value must be an object',
      received: value,
      expected: 'object',
    });
    return { valid: false, errors, warnings };
  }

  const obj = value as Record<string, unknown>;

  // Check each field in schema
  for (const [key, fieldSchema] of Object.entries(schema)) {
    const fieldValue = obj[key];
    const path = key;

    // Handle aliases
    if (fieldSchema.alias && obj[fieldSchema.alias] !== undefined && fieldValue === undefined) {
      obj[key] = obj[fieldSchema.alias];
      warnings.push({
        path: fieldSchema.alias,
        message: `"${fieldSchema.alias}" is deprecated, use "${key}" instead`,
      });
    }

    // Check deprecated
    if (fieldSchema.deprecated && fieldValue !== undefined) {
      const msg =
        typeof fieldSchema.deprecated === 'string'
          ? fieldSchema.deprecated
          : `"${key}" is deprecated`;
      warnings.push({ path, message: msg });
    }

    // Apply defaults
    if (applyDefaults && fieldValue === undefined && fieldSchema.default !== undefined) {
      obj[key] =
        typeof fieldSchema.default === 'function' ? fieldSchema.default() : fieldSchema.default;
      continue;
    }

    // Check required
    if (fieldSchema.required && fieldValue === undefined) {
      errors.push({
        path,
        message: `"${key}" is required`,
        received: undefined,
        expected: fieldSchema.description || String(fieldSchema.type),
      });
      continue;
    }

    // Skip if undefined and not required
    if (fieldValue === undefined) {
      continue;
    }

    // Type coercion
    let coercedValue: unknown = fieldValue;
    if (coerceTypes) {
      coercedValue = coerceType(fieldValue, fieldSchema.type);
      if (coercedValue !== fieldValue) {
        (obj as Record<string, unknown>)[key] = coercedValue;
      }
    }

    // Validate field
    const fieldErrors = validateField(coercedValue, fieldSchema, path, obj);
    errors.push(...fieldErrors);
  }

  // Log warnings
  if (logWarnings && warnings.length > 0) {
    for (const warning of warnings) {
      console.warn(`[Atlas Validation] ${warning.path}: ${warning.message}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/** Validate a single field */
function validateField(
  value: unknown,
  schema: FieldSchema,
  path: string,
  root: unknown
): ValidationError[] {
  const errors: ValidationError[] = [];

  // Type check
  const types = Array.isArray(schema.type) ? schema.type : [schema.type];
  if (!types.includes('any') && !types.some((t) => checkType(value, t))) {
    errors.push({
      path,
      message: `Expected ${types.join(' | ')}, got ${typeof value}`,
      received: value,
      expected: types.join(' | '),
    });
    return errors; // Don't continue if type is wrong
  }

  // Enum check
  if (schema.enum && !schema.enum.includes(value)) {
    errors.push({
      path,
      message: `Invalid value "${value}". Expected one of: ${schema.enum.join(', ')}`,
      received: value,
      expected: schema.enum.join(' | '),
    });
  }

  // Number range
  if (typeof value === 'number') {
    if (schema.min !== undefined && value < schema.min) {
      errors.push({
        path,
        message: `Value ${value} is less than minimum ${schema.min}`,
        received: value,
        expected: `>= ${schema.min}`,
      });
    }
    if (schema.max !== undefined && value > schema.max) {
      errors.push({
        path,
        message: `Value ${value} is greater than maximum ${schema.max}`,
        received: value,
        expected: `<= ${schema.max}`,
      });
    }
  }

  // String/Array length
  if (typeof value === 'string' || Array.isArray(value)) {
    const len = value.length;
    if (schema.minLength !== undefined && len < schema.minLength) {
      errors.push({
        path,
        message: `Length ${len} is less than minimum ${schema.minLength}`,
        received: value,
        expected: `length >= ${schema.minLength}`,
      });
    }
    if (schema.maxLength !== undefined && len > schema.maxLength) {
      errors.push({
        path,
        message: `Length ${len} is greater than maximum ${schema.maxLength}`,
        received: value,
        expected: `length <= ${schema.maxLength}`,
      });
    }
  }

  // Pattern check
  if (typeof value === 'string' && schema.pattern && !schema.pattern.test(value)) {
    errors.push({
      path,
      message: `Value does not match pattern ${schema.pattern}`,
      received: value,
      expected: `matching ${schema.pattern}`,
    });
  }

  // Nested object
  if (typeof value === 'object' && value !== null && schema.properties) {
    const nested = validate(value, schema.properties, { logWarnings: false });
    for (const error of nested.errors) {
      errors.push({
        ...error,
        path: `${path}.${error.path}`,
      });
    }
  }

  // Array items
  if (Array.isArray(value) && schema.items) {
    for (let i = 0; i < value.length; i++) {
      const itemErrors = validateField(value[i], schema.items, `${path}[${i}]`, root);
      errors.push(...itemErrors);
    }
  }

  // Custom validation
  if (schema.validate) {
    const context: ValidationContext = { path, value, root, schema: {} };
    const result = schema.validate(value, context);
    if (result !== true) {
      errors.push({
        path,
        message: result,
        received: value,
        expected: schema.description || 'valid value',
      });
    }
  }

  return errors;
}

/** Check if value matches type */
function checkType(value: unknown, type: SchemaType): boolean {
  switch (type) {
    case 'string':
      return typeof value === 'string';
    case 'number':
      return typeof value === 'number' && !Number.isNaN(value);
    case 'boolean':
      return typeof value === 'boolean';
    case 'object':
      return typeof value === 'object' && value !== null && !Array.isArray(value);
    case 'array':
      return Array.isArray(value);
    case 'function':
      return typeof value === 'function';
    case 'any':
      return true;
    default:
      return false;
  }
}

/** Coerce value to expected type */
function coerceType(value: unknown, type: SchemaType | SchemaType[]): unknown {
  const targetType = Array.isArray(type) ? type[0] : type;

  if (checkType(value, targetType)) {
    return value;
  }

  switch (targetType) {
    case 'string':
      return String(value);
    case 'number': {
      const num = Number(value);
      return Number.isNaN(num) ? value : num;
    }
    case 'boolean':
      if (value === 'true' || value === '1') return true;
      if (value === 'false' || value === '0') return false;
      return Boolean(value);
    default:
      return value;
  }
}

// ============================================================================
// Validation Decorator
// ============================================================================

/**
 * Create a validated component factory
 *
 * @example
 * ```typescript
 * const schema = {
 *   ripple: { type: 'boolean', default: true },
 *   hover: { type: 'string', enum: ['none', 'lift', 'breathing'] }
 * };
 *
 * const createButton = withValidation(
 *   (element, options) => {
 *     // Create button logic
 *     return buttonState;
 *   },
 *   schema
 * );
 *
 * // Now options are validated before the factory runs
 * const button = createButton(el, { hover: 'invalid' });
 * // Console warning: Invalid value "invalid" for hover...
 * ```
 */
export function withValidation<TOptions extends Record<string, unknown>, TResult>(
  factory: (element: HTMLElement, options: TOptions) => TResult,
  schema: Schema,
  validationOptions: ValidationOptions = {}
): (element: HTMLElement, options?: Partial<TOptions>) => TResult {
  return (element: HTMLElement, options?: Partial<TOptions>): TResult => {
    const opts = { ...options } as TOptions;
    const result = validate(opts, schema, {
      applyDefaults: true,
      logWarnings: true,
      ...validationOptions,
    });

    if (!result.valid) {
      for (const error of result.errors) {
        console.error(`[Atlas Validation] ${error.path}: ${error.message}`);
      }

      if (validationOptions.throwOnError) {
        throw new Error(`Validation failed: ${result.errors.map((e) => e.message).join(', ')}`);
      }
    }

    return factory(element, opts);
  };
}

// ============================================================================
// Pre-built Schemas for Common Options
// ============================================================================

/** Common animation options schema */
export const animationOptionsSchema: Schema = {
  duration: {
    type: 'number',
    min: 0,
    max: 10000,
    default: 200,
    description: 'Animation duration in milliseconds',
  },
  easing: {
    type: 'string',
    default: 'ease',
    description: 'CSS easing function',
  },
  delay: {
    type: 'number',
    min: 0,
    default: 0,
    description: 'Animation delay in milliseconds',
  },
};

/** Common size options schema */
export const sizeOptionsSchema: Schema = {
  size: {
    type: 'string',
    enum: ['xs', 'sm', 'md', 'lg', 'xl'] as const,
    default: 'md',
    description: 'Component size',
  },
};

/** Common state options schema */
export const stateOptionsSchema: Schema = {
  disabled: {
    type: 'boolean',
    default: false,
    description: 'Whether component is disabled',
  },
  loading: {
    type: 'boolean',
    default: false,
    description: 'Whether component is in loading state',
  },
};

// ============================================================================
// Attribute Parsing
// ============================================================================

/**
 * Parse data attributes into typed options
 *
 * @example
 * ```typescript
 * // HTML: <button data-atlas="button" data-ripple="true" data-size="lg">
 * const options = parseDataAttributes(button, schema);
 * // { ripple: true, size: 'lg' }
 * ```
 */
export function parseDataAttributes(element: HTMLElement, schema: Schema): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, fieldSchema] of Object.entries(schema)) {
    const attrName = `data-${camelToKebab(key)}`;
    const attrValue = element.getAttribute(attrName);

    if (attrValue === null) {
      if (fieldSchema.default !== undefined) {
        result[key] = fieldSchema.default;
      }
      continue;
    }

    // Parse based on type
    const types = Array.isArray(fieldSchema.type) ? fieldSchema.type : [fieldSchema.type];

    if (types.includes('boolean')) {
      result[key] = attrValue === '' || attrValue === 'true';
    } else if (types.includes('number')) {
      const num = parseFloat(attrValue);
      result[key] = Number.isNaN(num) ? attrValue : num;
    } else if (fieldSchema.enum) {
      result[key] = fieldSchema.enum.includes(attrValue) ? attrValue : fieldSchema.default;
    } else {
      result[key] = attrValue;
    }
  }

  return result;
}

/** Convert camelCase to kebab-case */
function camelToKebab(str: string): string {
  return str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
}
