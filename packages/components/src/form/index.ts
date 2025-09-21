export interface FormField {
  value: any;
  error?: string;
  touched: boolean;
  dirty: boolean;
}

export interface FormOptions {
  initialValues?: Record<string, any>;
  validate?: (values: Record<string, any>) => Record<string, string>;
  onSubmit?: (values: Record<string, any>) => void;
}

export function createForm(options: FormOptions = {}) {
  const { initialValues = {}, validate, onSubmit } = options;
  const fields = new Map<string, FormField>();
  
  Object.keys(initialValues).forEach(key => {
    fields.set(key, { value: initialValues[key], touched: false, dirty: false });
  });

  const setValue = (name: string, value: any) => {
    const field = fields.get(name) || { value: undefined, touched: false, dirty: false };
    fields.set(name, { ...field, value, dirty: true });
  };

  const setTouched = (name: string) => {
    const field = fields.get(name);
    if (field) fields.set(name, { ...field, touched: true });
  };

  const getField = (name: string) => fields.get(name);
  const getValues = () => Object.fromEntries(Array.from(fields.entries()).map(([k, v]) => [k, v.value]));
  
  const validateForm = () => {
    if (!validate) return {};
    const errors = validate(getValues());
    fields.forEach((field, name) => {
      field.error = errors[name];
    });
    return errors;
  };

  const handleSubmit = () => {
    const errors = validateForm();
    if (Object.keys(errors).length === 0) {
      onSubmit?.(getValues());
    }
  };

  return { fields, setValue, setTouched, getField, getValues, validateForm, handleSubmit };
}