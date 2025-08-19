-- Enforce input constraints for users table
-- - cedula: only digits
-- - nombre, primer_apellido, segundo_apellido, posicion: letters (incl. accents) and spaces; non-empty after trim
-- - segundo_nombre: same pattern as names when not null

ALTER TABLE users
  ADD CONSTRAINT users_cedula_digits_check CHECK (cedula ~ '^[0-9]+$');

-- Use explicit accented chars in the regex; adjust if your collation differs
ALTER TABLE users
  ADD CONSTRAINT users_nombre_letters_check CHECK (
    char_length(btrim(nombre)) > 0 AND nombre ~ '^[A-Za-zÁÉÍÓÚáéíóúÑñ ]+$'
  );

ALTER TABLE users
  ADD CONSTRAINT users_primer_apellido_letters_check CHECK (
    char_length(btrim(primer_apellido)) > 0 AND primer_apellido ~ '^[A-Za-zÁÉÍÓÚáéíóúÑñ ]+$'
  );

ALTER TABLE users
  ADD CONSTRAINT users_segundo_apellido_letters_check CHECK (
    char_length(btrim(segundo_apellido)) > 0 AND segundo_apellido ~ '^[A-Za-zÁÉÍÓÚáéíóúÑñ ]+$'
  );

ALTER TABLE users
  ADD CONSTRAINT users_posicion_letters_check CHECK (
    char_length(btrim(posicion)) > 0 AND posicion ~ '^[A-Za-zÁÉÍÓÚáéíóúÑñ ]+$'
  );

ALTER TABLE users
  ADD CONSTRAINT users_segundo_nombre_letters_check CHECK (
    segundo_nombre IS NULL OR segundo_nombre ~ '^[A-Za-zÁÉÍÓÚáéíóúÑñ ]+$'
  );

-- Note: If existing data violates these constraints, run cleanup updates before applying.
-- Example cleanup (review before executing):
-- UPDATE users SET
--   cedula = regexp_replace(cedula, '[^0-9]', '', 'g'),
--   nombre = btrim(regexp_replace(nombre, '\s+', ' ', 'g')),
--   primer_apellido = btrim(regexp_replace(primer_apellido, '\s+', ' ', 'g')),
--   segundo_apellido = btrim(regexp_replace(segundo_apellido, '\s+', ' ', 'g')),
--   posicion = btrim(regexp_replace(posicion, '\s+', ' ', 'g')),
--   segundo_nombre = NULLIF(btrim(regexp_replace(COALESCE(segundo_nombre,''), '\s+', ' ', 'g')), '')
-- WHERE true;
