-- Default media types and field templates

-- Insert default media types
INSERT INTO `media_types` (`name`) VALUES ('CD'), ('DVD'), ('Bluray'), ('Vinyl');
--> statement-breakpoint

-- CD fields
INSERT INTO `media_type_fields` (`type_id`, `field_key`, `field_label`, `field_type`, `required`, `display_order`) 
SELECT id, 'artist', 'Artist', 'text', 0, 0 FROM media_types WHERE name = 'CD'
UNION ALL
SELECT id, 'year', 'Year', 'number', 0, 1 FROM media_types WHERE name = 'CD'
UNION ALL
SELECT id, 'genre', 'Genre', 'text', 0, 2 FROM media_types WHERE name = 'CD';
--> statement-breakpoint

-- DVD fields
INSERT INTO `media_type_fields` (`type_id`, `field_key`, `field_label`, `field_type`, `required`, `display_order`)
SELECT id, 'director', 'Director', 'text', 0, 0 FROM media_types WHERE name = 'DVD'
UNION ALL
SELECT id, 'actors', 'Actors', 'textarea', 0, 1 FROM media_types WHERE name = 'DVD'
UNION ALL
SELECT id, 'year', 'Year', 'number', 0, 2 FROM media_types WHERE name = 'DVD'
UNION ALL
SELECT id, 'genre', 'Genre', 'text', 0, 3 FROM media_types WHERE name = 'DVD'
UNION ALL
SELECT id, 'rating', 'Rating', 'rating', 0, 4 FROM media_types WHERE name = 'DVD';
--> statement-breakpoint

-- Bluray fields
INSERT INTO `media_type_fields` (`type_id`, `field_key`, `field_label`, `field_type`, `required`, `display_order`)
SELECT id, 'director', 'Director', 'text', 0, 0 FROM media_types WHERE name = 'Bluray'
UNION ALL
SELECT id, 'actors', 'Actors', 'textarea', 0, 1 FROM media_types WHERE name = 'Bluray'
UNION ALL
SELECT id, 'year', 'Year', 'number', 0, 2 FROM media_types WHERE name = 'Bluray'
UNION ALL
SELECT id, 'genre', 'Genre', 'text', 0, 3 FROM media_types WHERE name = 'Bluray'
UNION ALL
SELECT id, 'rating', 'Rating', 'rating', 0, 4 FROM media_types WHERE name = 'Bluray';
--> statement-breakpoint

-- Vinyl fields
INSERT INTO `media_type_fields` (`type_id`, `field_key`, `field_label`, `field_type`, `required`, `display_order`)
SELECT id, 'artist', 'Artist', 'text', 0, 0 FROM media_types WHERE name = 'Vinyl'
UNION ALL
SELECT id, 'year', 'Year', 'number', 0, 1 FROM media_types WHERE name = 'Vinyl'
UNION ALL
SELECT id, 'genre', 'Genre', 'text', 0, 2 FROM media_types WHERE name = 'Vinyl'
UNION ALL
SELECT id, 'rpm', 'RPM', 'select', 0, 3 FROM media_types WHERE name = 'Vinyl';
--> statement-breakpoint

-- Add options for Vinyl RPM field
UPDATE `media_type_fields` 
SET `options` = '["33","45","78"]'
WHERE `field_key` = 'rpm' AND `type_id` = (SELECT id FROM media_types WHERE name = 'Vinyl');

