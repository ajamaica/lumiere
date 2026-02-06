#!/usr/bin/env python3
"""
keys_crypto.py - simple AES-GCM encryption/decryption of API keys
Usage:
  python3 keys_crypto.py encrypt --in plain.txt --out secret.bin
  python3 keys_crypto.py decrypt --in secret.bin --out plain.txt

This uses a password-based key derivation (PBKDF2) and stores salt+nonce+ciphertext in the output file.

WARNING: This is intended for convenience in the skill workspace. For production use, integrate with a secure KMS or OS key store.
"""

import argparse
import base64
import json
import os
import sys
from hashlib import sha256

from Crypto.Cipher import AES
from Crypto.Protocol.KDF import PBKDF2
from Crypto.Random import get_random_bytes

ITERATIONS = 200000
SALT_SIZE = 16
NONCE_SIZE = 12
KEY_LEN = 32


def derive_key(password: str, salt: bytes) -> bytes:
    return PBKDF2(password, salt, dkLen=KEY_LEN, count=ITERATIONS, hmac_hash_module=sha256)


def encrypt(password: str, data: bytes) -> bytes:
    salt = get_random_bytes(SALT_SIZE)
    key = derive_key(password.encode(), salt)
    cipher = AES.new(key, AES.MODE_GCM, nonce=get_random_bytes(NONCE_SIZE))
    ciphertext, tag = cipher.encrypt_and_digest(data)
    out = salt + cipher.nonce + tag + ciphertext
    return out


def decrypt(password: str, blob: bytes) -> bytes:
    salt = blob[:SALT_SIZE]
    nonce = blob[SALT_SIZE:SALT_SIZE+NONCE_SIZE]
    tag = blob[SALT_SIZE+NONCE_SIZE:SALT_SIZE+NONCE_SIZE+16]
    ciphertext = blob[SALT_SIZE+NONCE_SIZE+16:]
    key = derive_key(password.encode(), salt)
    cipher = AES.new(key, AES.MODE_GCM, nonce=nonce)
    data = cipher.decrypt_and_verify(ciphertext, tag)
    return data


def cmd_encrypt(args):
    with open(args.infile, 'rb') as f:
        data = f.read()
    password = os.environ.get('KEYS_CRYPTO_PW')
    if not password:
        password = input('Enter encryption password: ')
    blob = encrypt(password, data)
    with open(args.outfile, 'wb') as f:
        f.write(blob)
    print(f'Wrote encrypted file to {args.outfile}')


def cmd_decrypt(args):
    with open(args.infile, 'rb') as f:
        blob = f.read()
    password = os.environ.get('KEYS_CRYPTO_PW')
    if not password:
        password = input('Enter decryption password: ')
    data = decrypt(password, blob)
    with open(args.outfile, 'wb') as f:
        f.write(data)
    print(f'Wrote decrypted file to {args.outfile}')


def main():
    parser = argparse.ArgumentParser()
    sub = parser.add_subparsers()

    pe = sub.add_parser('encrypt')
    pe.add_argument('--in', dest='infile', required=True)
    pe.add_argument('--out', dest='outfile', required=True)
    pe.set_defaults(func=cmd_encrypt)

    pd = sub.add_parser('decrypt')
    pd.add_argument('--in', dest='infile', required=True)
    pd.add_argument('--out', dest='outfile', required=True)
    pd.set_defaults(func=cmd_decrypt)

    args = parser.parse_args()
    if not hasattr(args, 'func'):
        parser.print_help()
        sys.exit(2)
    args.func(args)


if __name__ == '__main__':
    main()
