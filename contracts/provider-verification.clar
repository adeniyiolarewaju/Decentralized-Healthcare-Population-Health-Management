;; Provider Verification Contract
;; Validates healthcare entities and their credentials

(define-data-var admin principal tx-sender)

;; Provider status enum
(define-constant STATUS_PENDING u0)
(define-constant STATUS_VERIFIED u1)
(define-constant STATUS_REVOKED u2)

;; Provider data structure
(define-map providers
  principal
  {
    name: (string-ascii 100),
    license-number: (string-ascii 50),
    specialty: (string-ascii 50),
    status: uint,
    verification-date: uint
  }
)

;; Register a new provider (can only be done by the provider themselves)
(define-public (register-provider (name (string-ascii 100)) (license-number (string-ascii 50)) (specialty (string-ascii 50)))
  (begin
    (asserts! (not (is-some (map-get? providers tx-sender))) (err u1)) ;; Provider doesn't already exist
    (ok (map-set providers tx-sender {
      name: name,
      license-number: license-number,
      specialty: specialty,
      status: STATUS_PENDING,
      verification-date: u0
    }))
  )
)

;; Verify a provider (admin only)
(define-public (verify-provider (provider-address principal))
  (begin
    (asserts! (is-eq tx-sender (var-get admin)) (err u403)) ;; Only admin can verify
    (asserts! (is-some (map-get? providers provider-address)) (err u404)) ;; Provider must exist
    (ok (map-set providers provider-address
      (merge (unwrap-panic (map-get? providers provider-address))
        {
          status: STATUS_VERIFIED,
          verification-date: block-height
        }
      )
    ))
  )
)

;; Revoke a provider's verification (admin only)
(define-public (revoke-provider (provider-address principal))
  (begin
    (asserts! (is-eq tx-sender (var-get admin)) (err u403)) ;; Only admin can revoke
    (asserts! (is-some (map-get? providers provider-address)) (err u404)) ;; Provider must exist
    (ok (map-set providers provider-address
      (merge (unwrap-panic (map-get? providers provider-address))
        {
          status: STATUS_REVOKED,
          verification-date: block-height
        }
      )
    ))
  )
)

;; Check if a provider is verified
(define-read-only (is-verified-provider (provider-address principal))
  (match (map-get? providers provider-address)
    provider (is-eq (get status provider) STATUS_VERIFIED)
    false
  )
)

;; Get provider details
(define-read-only (get-provider-details (provider-address principal))
  (map-get? providers provider-address)
)

;; Transfer admin rights (admin only)
(define-public (transfer-admin (new-admin principal))
  (begin
    (asserts! (is-eq tx-sender (var-get admin)) (err u403))
    (ok (var-set admin new-admin))
  )
)
