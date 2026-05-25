UPDATE users
SET password_hash = '$2a$10$loZjWV12i6PgTJZgJw9PqOpWhIhRk8RpokB9g/U1aFJR1BcABdIJ.'
WHERE email IN ('emp1@example.com', 'manager1@example.com', 'admin1@example.com');