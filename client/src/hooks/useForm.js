import { useCallback, useState } from "react";

/**
 * Minimal form state helper shared by every form in the app.
 *
 * - `handleChange` works for inputs, selects, textareas and checkboxes by `name`.
 * - Editing a field clears its error so the message disappears as the user fixes it.
 *
 * @template {Record<string, any>} T
 * @param {T} initialValues
 */
export default function useForm(initialValues) {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});

  const setField = useCallback((name, value) => {
    setValues((previous) => ({ ...previous, [name]: value }));
    setErrors((previous) => {
      if (!previous[name]) return previous;
      const { [name]: _removed, ...rest } = previous;
      return rest;
    });
  }, []);

  const handleChange = useCallback(
    (event) => {
      const { name, value, type, checked } = event.target;
      setField(name, type === "checkbox" ? checked : value);
    },
    [setField]
  );

  const reset = useCallback((nextValues = initialValues) => {
    setValues(nextValues);
    setErrors({});
    // initialValues is only the fallback; callers pass explicit values when it changes.
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return { values, errors, setErrors, setValues, setField, handleChange, reset };
}
