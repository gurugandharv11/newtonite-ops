package com.newtonite.ops.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.newtonite.ops.exception.ConflictException;
import com.newtonite.ops.model.IdempotencyRecord;
import com.newtonite.ops.repository.IdempotencyRecordRepository;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.Optional;

@Service
public class IdempotencyService {

    private final IdempotencyRecordRepository idempotencyRecordRepository;
    private final ObjectMapper objectMapper;

    public IdempotencyService(IdempotencyRecordRepository idempotencyRecordRepository, ObjectMapper objectMapper) {
        this.idempotencyRecordRepository = idempotencyRecordRepository;
        this.objectMapper = objectMapper;
    }

    public String computePayloadHash(Object payload) {
        try {
            String json = objectMapper.writeValueAsString(payload);
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(json.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (Exception e) {
            throw new RuntimeException("Failed to compute request payload hash", e);
        }
    }

    @Transactional(readOnly = true)
    public Optional<IdempotencyRecord> findRecord(String idempotencyKey) {
        if (idempotencyKey == null || idempotencyKey.isBlank()) {
            return Optional.empty();
        }
        return idempotencyRecordRepository.findByIdempotencyKey(idempotencyKey.trim());
    }

    public void validateReplay(IdempotencyRecord record, String currentPayloadHash) {
        if (!record.getRequestHash().equals(currentPayloadHash)) {
            throw new ConflictException("Idempotency key reuse conflict: Key '" + record.getIdempotencyKey() +
                    "' was already used with a different request payload.");
        }
    }

    public String buildScopedKey(Long userId, String rawKey) {
        if (rawKey == null || rawKey.isBlank()) {
            return null;
        }
        return "u:" + (userId != null ? userId : "anon") + ":" + rawKey.trim();
    }

    @Transactional(propagation = Propagation.MANDATORY)
    public void saveRecord(String idempotencyKey, String requestHash, int status, Object responseBody) {
        if (idempotencyKey == null || idempotencyKey.isBlank()) {
            return;
        }
        try {
            String bodyJson = objectMapper.writeValueAsString(responseBody);
            IdempotencyRecord record = new IdempotencyRecord(idempotencyKey.trim(), requestHash, status, bodyJson);
            idempotencyRecordRepository.saveAndFlush(record);
        } catch (DataIntegrityViolationException e) {
            throw new ConflictException("Concurrent request with duplicate idempotency key detected.");
        } catch (Exception e) {
            throw new RuntimeException("Failed to serialize and save idempotency record", e);
        }
    }
}
