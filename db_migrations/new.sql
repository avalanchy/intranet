-- add jira to tracker.type
BEGIN;
ALTER type tracker_type_enum RENAME to old__tracker_type_enum;
CREATE type tracker_type_enum as enum ('bugzilla', 'trac', 'cookie_trac', 'igozilla', 'bitbucket', 'rockzilla', 'pivotaltracker', 'harvest', 'unfuddle', 'github', 'jira');
ALTER TABLE tracker ALTER COLUMN type TYPE tracker_type_enum USING type::text::tracker_type_enum;
DROP type old__tracker_type_enum;
COMMIT;
-- add jira to tracker.type