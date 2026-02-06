def base64_encode(data: bytes, custom_alphabet: str = None) -> bytes:
    """Base64 编码
    
    将输入的字节序列编码为Base64字符串。可选使用自定义字母表进行编码。
    
    Args:
        str: 要编码的字节序列
        custom_alphabet: 可选的自定义Base64字母表，长度必须为64个字符。
                        默认使用标准Base64字母表 (A-Z, a-z, 0-9, +/)
    
    Returns:
        编码后的Base64字符串
    """
    # 标准 Base64 编码表 (64个字符)
    STANDARD_ALPHABET = b'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
    
    # 如果传入了自定义编码表，使用它
    ALPHABET = custom_alphabet.encode() if custom_alphabet else STANDARD_ALPHABET
    ENCODE_TRANS = bytes.maketrans(STANDARD_ALPHABET, ALPHABET)
    
    # 标准 Base64 编码
    from base64 import b64encode
    return b64encode(data).translate(ENCODE_TRANS)






def base64_decode(encoded_str: str | bytes, custom_alphabet: str = None) -> bytes:
    """Base64 解码
    
    将Base64编码的字符串解码为原始字节序列。如果编码时使用了自定义字母表，
    解码时需要提供相同的字母表。
    
    Args:
        encoded_str: Base64编码的字符串
        custom_alphabet: 解码使用的自定义Base64字母表，必须与编码时使用的相同。
                        默认使用标准Base64字母表 (A-Z, a-z, 0-9, +/)
    
    Returns:
        解码后的字节序列
        
    Raises:
        binascii.Error: 如果输入的Base64字符串格式不正确
    """
    # 标准 Base64 编码表 (64个字符)
    standard_alphabet = b'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
    
    # 如果传入了自定义编码表，使用它
    alphabet = custom_alphabet.encode() if custom_alphabet else standard_alphabet
    
    # 将自定义编码转换为标准 Base64 编码表
    decode_trans = bytes.maketrans(alphabet, standard_alphabet)
    
    # 先将自定义编码转换为标准编码，然后再解码
    if type(encoded_str) == str:
        encoded = encoded_str.encode()
    else:
        encoded = encoded_str
    
    from base64 import b64decode
    decoded_str = b64decode(encoded.translate(decode_trans))
    
    return decoded_str

def hex_encode(data: bytes) -> str:
    """Hex 编码"""
    return data.hex()

def hex_decode(encoded_data: str) -> bytes:
    """Hex 解码"""
    return bytes.fromhex(encoded_data)

def url_encode(data: str) -> str:
    """URL 编码"""
    from urllib.parse import quote
    return quote(data)

def url_decode(encoded_data: str) -> str:
    """URL 解码"""
    from urllib.parse import unquote
    return unquote(encoded_data)
