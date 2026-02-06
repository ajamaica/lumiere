import hashlib
import zlib


def md5_encode(data: str) -> str:
    return hashlib.md5(data.encode()).hexdigest()

def sha256_encode(data: str) -> str:
    return hashlib.sha256(data.encode()).hexdigest()

def sha1_encode(data: str) -> str:
    return hashlib.sha1(data.encode()).hexdigest()

def sha256_encode(data: str) -> str:
    return hashlib.sha256(data.encode()).hexdigest()

def crc32_encode(data: str) -> str:
    return zlib.crc32(data.encode())
