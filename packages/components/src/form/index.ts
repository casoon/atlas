export interface FormField<T = unknown> {
  value: T;
  error?: string;
  touched: boolean;
  dirty: boolean;
}

export interface FormOptions<TValues extends Record<string, unknown>> {
  initialValues?: Partial<TValues>;
  validate?: (values: Partial<TValues>) => Partial<Record<keyof TValues, string>>;
  onSubmit?: (values: TValues) => void | Promise<void>;
  onChange?: (values: Partial<TValues>) => void;
}

export interface FormState<TValues extends Record<string, unknown>> {
  fields: ReadonlyMap<keyof TValues, FormField>;
  setValue: <K extends keyof TValues>(name: K, value: TValues[K]) => void;
  setTouched: (name: keyof TValues) => void;
  setError: (name: keyof TValues, error: string) => void;
  getField: (name: keyof TValues) => FormField | undefined;
  getValues: () => Partial<TValues>;
  validateForm: () => Partial<Record<keyof TValues, string>>;
  handleSubmit: () => void | Promise<void>;
  reset: () => void;
  subscribe: (callback: (values: Partial<TValues>) => void) => () => void;
  destroy: () => void;
}

/**
 * Creates a headless form state manager with validation and subscription support.
 *
 * @param options - Configuration options for the form
 * @returns A form state object with methods to manage form state
 *
 * @example
 * ```typescript
 * interface LoginForm {
 *   email: string;
 *   password: string;
 * }
 *
 * const form = createForm<LoginForm>({
 *   initialValues: { email: '', password: '' },
 *   validate: (values) => {
 *     const errors: Partial<Record<keyof LoginForm, string>> = {};
 *     if (!values.email) errors.email = 'Email is required';
 *     if (!values.password) errors.password = 'Password is required';
 *     return errors;
 *   },
 *   onSubmit: async (values) => {
 *     await loginUser(values);
 *   }
 * });
 *
 * // Subscribe to form changes
 * const unsubscribe = form.subscribe((values) => {
 *   console.log('Form values:', values);
 * });
 *
 * // Update field value
 * form.setValue('email', 'user@example.com');
 *
 * // Submit form
 * form.handleSubmit();
 * ```
 */
export function createForm<TValues extends Record<string, unknown>>(
  options: FormOptions<TValues> = {}
): FormState<TValues> {
  const { initialValues = {}, validate, onSubmit, onChange } = options;
  const fields = new Map<keyof TValues, FormField>();
  const subscribers = new Set<(values: Partial<TValues>) => void>();

  // Initialize fields
  for (const key in initialValues) {
    if (Object.prototype.hasOwnProperty.call(initialValues, key)) {
      const typedKey = key as keyof TValues;
      const initVals = initialValues as Record<keyof TValues, TValues[keyof TValues]>;
      fields.set(typedKey, {
        value: initVals[typedKey],
        touched: false,
        dirty: false
      });
    }
  }

  const notifySubscribers = () => {
    const values = getValues();
    onChange?.(values);
    subscribers.forEach((callback) => callback(values));
  };

  const setValue = <K extends keyof TValues>(name: K, value: TValues[K]) => {
    const field = fields.get(name) || {
      value: undefined,
      touched: false,
      dirty: false
    };
    fields.set(name, { ...field, value, dirty: true });
    notifySubscribers();
  };

  const setTouched = (name: keyof TValues) => {
    const field = fields.get(name);
    if (field) {
      fields.set(name, { ...field, touched: true });
      notifySubscribers();
    }
  };

  const setError = (name: keyof TValues, error: string) => {
    const field = fields.get(name);
    if (field) {
      fields.set(name, { ...field, error });
      notifySubscribers();
    }
  };

  const getField = (name: keyof TValues) => fields.get(name);

  const getValues = (): Partial<TValues> => {
    const values: Partial<TValues> = {};
    fields.forEach((field, name) => {
      values[name] = field.value as TValues[keyof TValues];
    });
    return values;
  };

  const validateForm = (): Partial<Record<keyof TValues, string>> => {
    if (!validate) return {};
    const errors = validate(getValues());
    fields.forEach((field, name) => {
      field.error = errors[name];
    });
    notifySubscribers();
    return errors;
  };

  const handleSubmit = async () => {
    const errors = validateForm();
    if (Object.keys(errors).length === 0) {
      await onSubmit?.(getValues() as TValues);
    }
  };

  const reset = () => {
    fields.clear();
    for (const key in initialValues) {
      if (Object.prototype.hasOwnProperty.call(initialValues, key)) {
        const typedKey = key as keyof TValues;
        const initVals = initialValues as Record<keyof TValues, TValues[keyof TValues]>;
        fields.set(typedKey, {
          value: initVals[typedKey],
          touched: false,
          dirty: false
        });
      }
    }
    notifySubscribers();
  };

  const subscribe = (callback: (values: Partial<TValues>) => void) => {
    subscribers.add(callback);
    // Call immediately with current state
    callback(getValues());
    // Return unsubscribe function
    return () => {
      subscribers.delete(callback);
    };
  };

  const destroy = () => {
    subscribers.clear();
    fields.clear();
  };

  return {
    get fields() {
      return fields as ReadonlyMap<keyof TValues, FormField>;
    },
    setValue,
    setTouched,
    setError,
    getField,
    getValues,
    validateForm,
    handleSubmit,
    reset,
    subscribe,
    destroy
  };
}