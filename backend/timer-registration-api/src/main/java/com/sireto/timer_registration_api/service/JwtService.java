package com.sireto.timer_registration_api.service;

import com.auth0.jwt.JWT;
import com.auth0.jwt.JWTVerifier;
import com.auth0.jwt.algorithms.Algorithm;
import com.auth0.jwt.exceptions.JWTVerificationException;
import com.auth0.jwt.interfaces.DecodedJWT;
import com.sireto.timer_registration_api.entity.User;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.Date;

@Service
public class JwtService {

    private final String jwtSecret;
    private final long jwtExpirationMs;

    public JwtService(
            @Value("${app.jwt.secret}") String jwtSecret,
            @Value("${app.jwt.expiration-ms}") long jwtExpirationMs
    ) {
        this.jwtSecret = jwtSecret;
        this.jwtExpirationMs = jwtExpirationMs;
    }

    public String generateToken(User user) {
        Date now = new Date();
        Date expiry = new Date(now.getTime() + jwtExpirationMs);

        return JWT.create()
                .withSubject(user.getEmail())
                .withIssuedAt(now)
                .withExpiresAt(expiry)
                .withClaim("userId", user.getId())
                .withClaim("role", user.getRole().getName())
                .sign(Algorithm.HMAC256(jwtSecret));
    }

    // sign/verify both use same secret + algo
 private JWTVerifier getVerifier() {
        return JWT.require(Algorithm.HMAC256(jwtSecret)).build();
    }

    // verifies signature + expiry + token structure
private DecodedJWT verifyAndDecode(String token) {
        return getVerifier().verify(token);
    }

        //used by filter to safely check token validity
 public boolean isTokenValid(String token) {
        try {
            verifyAndDecode(token);
            return true;
        } catch (JWTVerificationException ex) {
            return false;
        }
    }

  //extract authenticated user identity from token subject
    public String extractEmail(String token) {
        return verifyAndDecode(token).getSubject();
    }
 // extract role claim for Spring Security authorities
    public String extractRole(String token) {
        return verifyAndDecode(token).getClaim("role").asString();
    }


}