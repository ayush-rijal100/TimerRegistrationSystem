CREATE TABLE user_external_identity_links (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider VARCHAR(40) NOT NULL,
  provider_user_id VARCHAR(120) NOT NULL,
  provider_username VARCHAR(120),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  linked_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (provider, provider_user_id),
  UNIQUE (user_id, provider)
);

CREATE INDEX idx_external_identity_user ON user_external_identity_links(user_id);
CREATE INDEX idx_external_identity_lookup ON user_external_identity_links(provider, provider_user_id);