-- Remap Discord test accounts to new TRS roles.
-- This uses temporary provider_user_id values first because provider_user_id is unique per provider.

UPDATE user_external_identity_links
SET provider_user_id = CONCAT('TEMP_REMAP_', user_id)
WHERE provider = 'DISCORD'
  AND user_id IN (
    SELECT id
    FROM users
    WHERE email IN ('admin1@example.com', 'manager1@example.com', 'emp1@example.com')
  );

UPDATE user_external_identity_links
SET provider_user_id = '1458399968749424784',
    provider_username = 'Admin Discord Account'
WHERE provider = 'DISCORD'
  AND user_id = (SELECT id FROM users WHERE email = 'admin1@example.com');

UPDATE user_external_identity_links
SET provider_user_id = '733215047114948609',
    provider_username = 'Manager Discord Account'
WHERE provider = 'DISCORD'
  AND user_id = (SELECT id FROM users WHERE email = 'manager1@example.com');

UPDATE user_external_identity_links
SET provider_user_id = '1176894455123554314',
    provider_username = 'Employee Discord Account'
WHERE provider = 'DISCORD'
  AND user_id = (SELECT id FROM users WHERE email = 'emp1@example.com');