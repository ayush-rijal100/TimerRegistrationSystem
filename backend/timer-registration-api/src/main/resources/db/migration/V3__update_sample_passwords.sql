UPDATE users
SET password_hash = '$2a$10$K7L1OJ45/4YVndTQW6Ku2eJwOHQse3Njr9L7xRupH05nG6Uu4KcpW'
WHERE email IN ('emp1@example.com', 'manager1@example.com', 'admin1@example.com');