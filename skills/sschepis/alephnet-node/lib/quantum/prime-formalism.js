/**
 * Prime Resonance Formalism - Core Mathematical Structures
 * Implements Prime Hilbert Spaces, Complex Amplitudes, and Resonance Operators.
 * Based on "Prime-Resonant Keytriplets and Symbolic Field Evolution" (Schepis).
 */

'use strict'

const crypto = require('crypto')

// ============================================================================
// COMPLEX NUMBERS
// ============================================================================

class Complex {
  constructor(re, im) {
    this.re = re
    this.im = im
  }

  add(other) {
    return new Complex(this.re + other.re, this.im + other.im)
  }
  sub(other) {
    return new Complex(this.re - other.re, this.im - other.im)
  }

  mul(other) {
    return new Complex(
      this.re * other.re - this.im * other.im,
      this.re * other.im + this.im * other.re,
    )
  }

  scale(scalar) {
    return new Complex(this.re * scalar, this.im * scalar)
  }

  conjugate() {
    return new Complex(this.re, -this.im)
  }

  magnitude() {
    return Math.sqrt(this.re * this.re + this.im * this.im)
  }

  phase() {
    return Math.atan2(this.im, this.re)
  }

  static fromPolar(r, theta) {
    return new Complex(r * Math.cos(theta), r * Math.sin(theta))
  }

  static zero() {
    return new Complex(0, 0)
  }
}

// ============================================================================
// PRIME HILBERT SPACE (Hp)
// ============================================================================

/**
 * A state in Prime Hilbert Space.
 * |Ψ⟩ = Σ α_p |p⟩
 */
class PrimeHilbertState {
  constructor(primes = []) {
    this.amplitudes = new Map() // p -> Complex
    this.primes = primes.sort((a, b) => a - b)

    // Initialize with zero amplitudes
    for (const p of primes) {
      this.amplitudes.set(p, Complex.zero())
    }
  }

  setAmplitude(p, complexAmp) {
    if (this.amplitudes.has(p)) {
      this.amplitudes.set(p, complexAmp)
    }
  }

  getAmplitude(p) {
    return this.amplitudes.get(p) || Complex.zero()
  }

  /**
   * Calculate Inner Product ⟨Ψ|Φ⟩
   * @param {PrimeHilbertState} other
   * @returns {Complex}
   */
  inner(other) {
    let result = Complex.zero()

    // Iterate over intersection of prime bases
    for (const p of this.primes) {
      if (other.amplitudes.has(p)) {
        const alpha = this.getAmplitude(p)
        const beta = other.getAmplitude(p)

        // ⟨Ψ|Φ⟩ = Σ α_p* β_p
        result = result.add(alpha.conjugate().mul(beta))
      }
    }
    return result
  }

  /**
   * Normalize the state so Σ|α_p|² = 1
   */
  normalize() {
    let sumSq = 0
    for (const amp of this.amplitudes.values()) {
      const mag = amp.magnitude()
      sumSq += mag * mag
    }

    const norm = Math.sqrt(sumSq)
    if (norm < 1e-10) return this // Zero vector

    for (const [p, amp] of this.amplitudes) {
      this.amplitudes.set(p, amp.scale(1.0 / norm))
    }
    return this
  }

  /**
   * Calculate Symbolic Entropy
   * S(Ψ) = -Σ |α_p|² log(|α_p|²)
   */
  entropy() {
    let s = 0
    for (const amp of this.amplitudes.values()) {
      const prob = Math.pow(amp.magnitude(), 2)
      if (prob > 1e-10) {
        s -= prob * Math.log(prob)
      }
    }
    return s
  }

  /**
   * Evolution Operator U(Δt)
   * α_p(t + Δt) = α_p(t) * e^(i * (2π * log_p(κ) * Δt + ε_p))
   */
  evolve(dt, kappa = 137.035999, noiseFn = () => 0) {
    const newState = new PrimeHilbertState(this.primes)

    for (const p of this.primes) {
      const alpha = this.getAmplitude(p)

      // Phase shift Δθ = 2π * log_p(κ) * Δt
      // Using natural log for frequency scaling
      const freq = Math.log(kappa) / Math.log(p)
      const phaseShift = 2 * Math.PI * freq * dt + noiseFn(p)

      const rotation = Complex.fromPolar(1.0, phaseShift)
      newState.setAmplitude(p, alpha.mul(rotation))
    }

    return newState.normalize()
  }

  /**
   * Projection Operator P
   * Masks phases, exposing only prime magnitudes (attenuated)
   */
  project(attenuationFactors = {}) {
    const projected = new PrimeHilbertState(this.primes)

    for (const p of this.primes) {
      const alpha = this.getAmplitude(p)
      const sp = attenuationFactors[p] || 1.0 // Attenuation factor s_p

      // Projecting |K_priv⟩ -> |K_res⟩
      // We lose specific phase information, often setting random or zero phase for public view
      // Formalism says: K_res = Σ (s_p * α_p) * e^(i * θ_random) |p⟩

      const mag = alpha.magnitude() * sp
      // For public resonance key, we might scramble the phase to hide the private state's exact evolution
      const theta = Math.random() * 2 * Math.PI

      projected.setAmplitude(p, Complex.fromPolar(mag, theta))
    }

    return projected.normalize()
  }

  toJSON() {
    const data = {}
    for (const p of this.primes) {
      const amp = this.getAmplitude(p)
      data[p] = { re: amp.re, im: amp.im }
    }
    return data
  }

  static fromJSON(data) {
    const primes = Object.keys(data)
      .map(Number)
      .sort((a, b) => a - b)
    const state = new PrimeHilbertState(primes)
    for (const p of primes) {
      state.setAmplitude(p, new Complex(data[p].re, data[p].im))
    }
    return state.normalize()
  }
}

// ============================================================================
// PRIME UTILS
// ============================================================================

function generatePrimes(count) {
  const primes = []
  let n = 2
  while (primes.length < count) {
    if (isPrime(n)) primes.push(n)
    n++
  }
  return primes
}

function isPrime(num) {
  for (let i = 2, s = Math.sqrt(num); i <= s; i++) if (num % i === 0) return false
  return num > 1
}

/**
 * Prime-Entropy Preserving Hash H(S || ID)
 * Maps a seed string to a PrimeHilbertState
 */
function hashToState(seed, primeCount = 64) {
  const primes = generatePrimes(primeCount)
  const state = new PrimeHilbertState(primes)

  // Use SHA-512 for high entropy
  const hash = crypto.createHash('sha512').update(seed).digest()

  // Map hash bytes to amplitudes
  // We need 2 * primeCount values (re, im)
  // We'll expand the hash if needed using HKDF logic or simple counter

  for (let i = 0; i < primeCount; i++) {
    const p = primes[i]

    // Simple extraction from hash buffer (wrapping around)
    const b1 = hash[i % hash.length]
    const b2 = hash[(i + 1) % hash.length]

    // Map 0-255 to -1.0 to 1.0
    const re = b1 / 127.5 - 1.0
    const im = b2 / 127.5 - 1.0

    state.setAmplitude(p, new Complex(re, im))
  }

  return state.normalize()
}

module.exports = {
  Complex,
  PrimeHilbertState,
  hashToState,
  generatePrimes,
}
