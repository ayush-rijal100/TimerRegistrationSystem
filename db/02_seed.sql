-- Roles
INSERT INTO roles (name) VALUES
('EMPLOYEE'),
('MANAGER'),
('ADMIN')
ON CONFLICT (name) DO NOTHING;

-- Users (sample)
-- bcrypt hash below is for password: password123
INSERT INTO users (full_name, email, password_hash, role_id, is_active)
SELECT 'Emp One', 'emp1@example.com', '$2a$10$loZjWV12i6PgTJZgJw9PqOpWhIhRk8RpokB9g/U1aFJR1BcABdIJ.', r.id, true FROM roles r WHERE r.name='EMPLOYEE'
ON CONFLICT (email) DO NOTHING;

INSERT INTO users (full_name, email, password_hash, role_id, is_active)
SELECT 'Manager One', 'manager1@example.com', '$2a$10$loZjWV12i6PgTJZgJw9PqOpWhIhRk8RpokB9g/U1aFJR1BcABdIJ.', r.id, true FROM roles r WHERE r.name='MANAGER'
ON CONFLICT (email) DO NOTHING;

INSERT INTO users (full_name, email, password_hash, role_id, is_active)
SELECT 'Admin One', 'admin1@example.com', '$2a$10$loZjWV12i6PgTJZgJw9PqOpWhIhRk8RpokB9g/U1aFJR1BcABdIJ.', r.id, true FROM roles r WHERE r.name='ADMIN'
ON CONFLICT (email) DO NOTHING;

-- Projects (sample)
INSERT INTO projects (project_code, project_name, is_active) VALUES
('PRJ-001', 'Internal Product Development', true),
('PRJ-002', 'Client Implementation', true)
ON CONFLICT (project_code) DO NOTHING;

-- User-Project mapping (employee + manager mapped to both projects) using cross join beween user and project .
INSERT INTO user_projects (user_id, project_id)
SELECT u.id, p.id
FROM users u
JOIN projects p ON p.project_code IN ('PRJ-001', 'PRJ-002')
WHERE u.email IN ('emp1@example.com', 'manager1@example.com')
ON CONFLICT (user_id, project_id) DO NOTHING;
