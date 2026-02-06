import urllib.parse
import json

CUSTOM_BASE64_ALPHABET = 'ZmserbBoHQtNP+wOcza/LpngG8yJq42KWYj0DSfdikx3VT16IlUAFM97hECvuRX5'


def base64_to_triplet(encoded, alphabet):
	"""将4个Base64字符解码为3字节的数值"""
	if len(encoded) < 4:
		return 0

	val = 0
	for char in encoded:
		if char == '=':
			break
		index = alphabet.index(char)
		val = (val << 6) + index

	# 填充到24位
	val <<= (6 * (4 - len(encoded)))
	return val


def b64_decode(encoded):
	"""解码自定义Base64字符串"""
	alphabet = CUSTOM_BASE64_ALPHABET
	result = []

	# 移除所有填充字符，但需要记录原始长度
	clean_encoded = encoded.replace('=', '')
	padding_count = len(encoded) - len(clean_encoded)

	# 处理每个4字符块
	for i in range(0, len(clean_encoded), 4):
		chunk = clean_encoded[i:i + 4]
		triplet_value = base64_to_triplet(chunk, alphabet)

		# 提取3个字节
		byte1 = (triplet_value >> 16) & 0xFF
		byte2 = (triplet_value >> 8) & 0xFF
		byte3 = triplet_value & 0xFF

		result.extend([byte1, byte2, byte3])

	# 根据填充调整结果长度
	if padding_count == 1:
		result.pop()  # 移除最后一个字节
	elif padding_count == 2:
		result = result[:-2]  # 移除最后两个字节

	return result


def decode_utf8(byte_array):
	"""将字节数组解码为URL编码的字符串"""
	result = []
	for byte in byte_array:
		if 32 <= byte <= 126 and byte not in [37]:  # 可打印ASCII字符，除了%
			result.append(chr(byte))
		else:
			# URL编码格式
			result.append(f'%{byte:02X}')

	return ''.join(result)


def decode_p(encoded_data):
	"""完整的解密函数"""
	# 1. 自定义Base64解码
	byte_array = b64_decode(encoded_data)

	# 2. 解码为URL编码字符串
	url_encoded_str = decode_utf8(byte_array)

	# 3. URL解码
	json_str = urllib.parse.unquote(url_encoded_str)

	# 4. 解析JSON
	try:
		return json.loads(json_str)
	except json.JSONDecodeError:
		return json_str


# 使用示例
if __name__ == "__main__":
	# 假设这是编码后的p值
	encoded_p = "2UQAPsHC+aIjqArjwjHjNsQhPsHCH0rjNsQhPaHCH0c1Pjh9HjIj2eHjwjQgynEDJ74AHjIj2ePjwjQhyoPTqBPT49pjHjIj2ecjwjHFN0qEN0ZjNsQh+aHCH0rEw/HAwn+Y+Aqly9T64oGhyopdP0+hJnRU2oSl8BlD2gm92nQkqAbx+/ZIPeZl+eWEweqjNsQh+jHCHjHVHdW7H0ijHjIj2eWjwjQQPAYUaBzdq9k6qB4Q4fpA8b878FSet9RQzLlTcSiM8/+n4MYP8F8LagY/P9Ql4FpUzfpS2BcI8nT1GFbC/L88JdbFyrSiafp/cDMra7pFLDDAa7+8J7QgabmFz7Qjp0mcwp4fanD68p40+fp8qgzELLbILrDA+9p3JpH9LLI3+LSk+d+DJfpSL98lnLYl49IUqgcMc0mrcDShtMmozBD6qM8FyFSh8o+h4g4U+obFyLSi4nbQz/+SPFlnPrDApSzQcA4SPopFJeQmzBMA/o8Szb+NqM+c4ApQzg8Ayp8FaDRl4AYs4g4fLomD8pzBpFRQ2ezLanSM+Skc47Qc4gcMag8VGLlj87PAqgzhagYSqAbn4FYQy7pTanTQ2npx87+8NM4L89L78p+l4BL6ze4AzB+IygmS8Bp8qDzFaLP98Lzn4AQQzLEAL7bFJBEVL7pwyS8Fag868nTl4e+0n04ApfuF8FSbL7SQyrLUtASrpLS92dDFa/YOanS0+Mkc4FbQ4fSM+Bu6qFzP8oP9Lo4naLP78p+D+9pxcpPFaLp9qA++qDMFpd4panSDqA+AN7+hnDESyp8FGf+p8np8pd49ag88Gn+S8np/4g49/BEmqM+M4MmQ2BlFagYyL9RM4FRdpd4Iq7HFyBppN9L9/o8Szbm7zDS987PlqfRAPLzyyLSk+7+xGfRAP94UzDSbPBLALoz9anSjLDRl4FROqgziagYSq7Yc4A4QyrbSpSmFyrSiN7+8qgz/z7b72nMc4FzQ4DS3a/+Q4ezYzMPFnaRSygpFyDSkJgQQzLRALM8F2DQ6zDF6wg8Sy0Sy4DSkzLEo4gzCqdpFJrS94fLALozp/7mN8p88+g+nqBMTanYdqM8DPo+3Lozcqob7JFSePBLI4g4manTd8gYxLd4Q4fpSLAq68n8n4b+QPA4Ay7b74LEDLSmQyrYIaL+dq7Y+89p3GaRSnLc9qMSc4bbQyLF6a/+g/pkl4BbQPAzpanV98p4/qBlFy0pAPb8FqDS3pfSILoqMLBMw8n8gO/FjNsQhwaHCN/HM+AZM+eGUPaIj2erIH0iINsQhP/rjwjQ1J7QTGnIjKc=="

	# 解码
	decoded_p = decode_p(encoded_p)
	print(decoded_p)