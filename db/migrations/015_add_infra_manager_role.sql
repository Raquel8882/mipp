-- Add role infra_manager for managing infrastructure reports
INSERT INTO public.roles (slug, name, description)
VALUES ('infra_manager', 'Gestor de infraestructura', 'Puede ver y responder reportes de infraestructura; además, conserva opciones de usuario normal')
ON CONFLICT (slug) DO UPDATE
SET name = EXCLUDED.name,
	description = EXCLUDED.description;
