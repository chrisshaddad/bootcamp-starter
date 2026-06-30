import { Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';

/**
 * Password hashing using argon2id (OWASP-recommended).
 *
 * `verify` is written to run in (roughly) constant time relative to whether the
 * user exists: callers that don't have a stored hash should still call
 * `verifyAgainstDummy()` so an attacker can't distinguish "no such user" from
 * "wrong password" by response timing (user enumeration).
 */
@Injectable()
export class PasswordService {
  // argon2id with parameters above OWASP minimums (19 MiB, 2 iterations).
  private readonly options: argon2.Options = {
    type: argon2.argon2id,
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1,
  };

  // A precomputed valid hash of a random value, used to burn the same CPU as a
  // real verify when the target user has no password set.
  private dummyHashPromise: Promise<string> | null = null;

  async hash(password: string): Promise<string> {
    return argon2.hash(password, this.options);
  }

  async verify(hash: string, password: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, password);
    } catch {
      // Malformed/corrupt hash — treat as a failed verification, never throw.
      return false;
    }
  }

  /**
   * Spend comparable time to a real verify when there is no hash to check
   * against, then always return false. Mitigates timing-based user enumeration.
   */
  async verifyAgainstDummy(password: string): Promise<false> {
    if (!this.dummyHashPromise) {
      this.dummyHashPromise = argon2.hash(
        'argon2-dummy-password',
        this.options,
      );
    }
    const dummy = await this.dummyHashPromise;
    await this.verify(dummy, password);
    return false;
  }
}
