# BUILDLOG.md - AI Usage & Architecture Decisions Log

## Capstone Project
**Project Name**: Usage Metering & Billing Engine (`flyrank-capstone-metering-billing`)  
**Track**: Backend Development Capstone  
**Author**: Antigravity Pair Programmer  
**Date**: August 24, 2026  

---

## 1. Executive Summary & Design Overview
This document logs the design process, architectural decisions, security choices, and AI collaboration highlights during the construction of the Usage Metering & Billing Engine.

---

## 2. Where AI Helped
1. **Idempotency Strategy Design**: AI assisted in designing the database-backed `IdempotencyRecord` table and atomic Prisma transaction model to guarantee zero double-counting under retries.
2. **Pricing Math Formalization**: AI helped formulate the exact integer micro-cent pricing formulas for standard input tokens, discounted cached input tokens (50% off), output tokens, and reasoning tokens (billed at output rate).
3. **Stripe Test Webhook Handler**: AI generated the HMAC-SHA256 signature verification code and event deduplication flow for `/webhooks/stripe`.
4. **Test Suite Generation**: AI structured comprehensive Vitest test cases covering all 5 Acceptance Probes and security vulnerability edge cases.

---

## 3. Key Architectural & Security Choices
- **Zero Floats for Money**: Stored all currency amounts as integer micro-cents (`1 USD = 1,000,000 micro-cents`).
- **Strict Boundary Honesty**: Implemented clean HTTP `429 Too Many Requests` (quota limit) and HTTP `402 Payment Required` (lapsed plan) responses.
- **Raw Buffer Signature Verification**: Explicitly mounted raw body parsing on `/webhooks/stripe` before global `express.json()` middleware to ensure cryptographic HMAC signature checks never fail due to JSON parsing alterations.
- **Defensive Security Stack**: Integrated Helmet headers, rate limiting (100 req/min), Zod schema validation, strict tenant isolation, and sanitized error responses.

---

## 4. What Was Corrected / Refined
- **Initial Schema Assumption**: Initially considered storing costs as float cents, but changed to integer micro-cents to comply with financial correctness standards.
- **Webhook Middleware Ordering**: Ensured raw body parser for Stripe webhooks precedes standard JSON parsers so raw HMAC signature validation operates on exact request bytes.
