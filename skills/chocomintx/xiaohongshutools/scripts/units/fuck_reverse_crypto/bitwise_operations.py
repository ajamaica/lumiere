
def unsigned_left_shift(value, shift):
    """无符号左移"""
    return (value << shift) & 0xFFFFFFFF


def unsigned_right_shift(value, shift):
    """无符号右移"""
    return (value & 0xFFFFFFFF) >> shift