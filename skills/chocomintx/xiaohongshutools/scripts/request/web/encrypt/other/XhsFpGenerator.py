import time
import random
import secrets, hashlib

class XhsFpGenerator:
    """小红书 指纹生成器"""

    def __init__(self):
        pass

    @staticmethod
    def __weighted_random_choice(options, weights):
        """
        根据权重随机选择一个候选项

        Args:
            options (list): 候选项列表
            weights (list): 对应的权重列表（无需归一化）

        Returns:
            any: 随机选中的候选项 注意返回字符串类型
        """
        return f"{random.choices(options, weights=weights, k=1)[0]}"

    @staticmethod
    def __get_renderer_info():
        renderer_info_list = [
            "Google Inc. (Intel)|ANGLE (Intel, Intel(R) HD Graphics 400 (0x00000166) Direct3D11 vs_5_0 ps_5_0, D3D11)",
            "Google Inc. (Intel)|ANGLE (Intel, Intel(R) HD Graphics 4400 (0x00001112) Direct3D11 vs_5_0 ps_5_0, D3D11)",
            "Google Inc. (Intel)|ANGLE (Intel, Intel(R) HD Graphics 4600 (0x00000412) Direct3D11 vs_5_0 ps_5_0, D3D11)",
            "Google Inc. (Intel)|ANGLE (Intel, Intel(R) HD Graphics 520 (0x1912) Direct3D11 vs_5_0 ps_5_0, D3D11)",
            "Google Inc. (Intel)|ANGLE (Intel, Intel(R) HD Graphics 530 (0x00001912) Direct3D11 vs_5_0 ps_5_0, D3D11)",
            "Google Inc. (Intel)|ANGLE (Intel, Intel(R) HD Graphics 550 (0x00001512) Direct3D11 vs_5_0 ps_5_0, D3D11)",
            "Google Inc. (Intel)|ANGLE (Intel, Intel(R) HD Graphics 6000 (0x1606) Direct3D11 vs_5_0 ps_5_0, D3D11)",
            "Google Inc. (Intel)|ANGLE (Intel, Intel(R) Iris(TM) Graphics 540 (0x1912) Direct3D11 vs_5_0 ps_5_0, D3D11)",
            "Google Inc. (Intel)|ANGLE (Intel, Intel(R) Iris(TM) Graphics 550 (0x1913) Direct3D11 vs_5_0 ps_5_0, D3D11)",
            "Google Inc. (Intel)|ANGLE (Intel, Intel(R) Iris(TM) Plus Graphics 640 (0x161C) Direct3D11 vs_5_0 ps_5_0, D3D11)",
            "Google Inc. (Intel)|ANGLE (Intel, Intel(R) UHD Graphics 600 (0x3E80) Direct3D11 vs_5_0 ps_5_0, D3D11)",
            "Google Inc. (Intel)|ANGLE (Intel, Intel(R) UHD Graphics 620 (0x00003EA0) Direct3D11 vs_5_0 ps_5_0, D3D11)",
            "Google Inc. (Intel)|ANGLE (Intel, Intel(R) UHD Graphics 630 (0x00003E9B) Direct3D11 vs_5_0 ps_5_0, D3D11)",
            "Google Inc. (Intel)|ANGLE (Intel, Intel(R) UHD Graphics 655 (0x00009BC8) Direct3D11 vs_5_0 ps_5_0, D3D11)",
            "Google Inc. (Intel)|ANGLE (Intel, Intel(R) Iris(R) Xe Graphics (0x000046A8) Direct3D11 vs_5_0 ps_5_0, D3D11)",
            "Google Inc. (Intel)|ANGLE (Intel, Intel(R) Iris(R) Xe Graphics (0x00009A49) Direct3D11 vs_5_0 ps_5_0, D3D11)",
            "Google Inc. (Intel)|ANGLE (Intel, Intel(R) Iris(R) Xe MAX Graphics (0x00009BC0) Direct3D11 vs_5_0 ps_5_0, D3D11)",
            "Google Inc. (Intel)|ANGLE (Intel, Intel Arc A370M (0x0000AF51) Direct3D11 vs_5_0 ps_5_0, D3D11)",
            "Google Inc. (Intel)|ANGLE (Intel, Intel Arc A380 (0x0000AF41) Direct3D11 vs_5_0 ps_5_0, D3D11)",
            "Google Inc. (Intel)|ANGLE (Intel, Intel Arc A380M (0x0000AF5E) Direct3D11 vs_5_0 ps_5_0, D3D11)",
            "Google Inc. (Intel)|ANGLE (Intel, Intel Arc A550 (0x0000AF42) Direct3D11 vs_5_0 ps_5_0, D3D11)",
            "Google Inc. (Intel)|ANGLE (Intel, Intel Arc A770 (0x0000AF43) Direct3D11 vs_5_0 ps_5_0, D3D11)",
            "Google Inc. (Intel)|ANGLE (Intel, Intel Arc A770M (0x0000AF50) Direct3D11 vs_5_0 ps_5_0, D3D11)",
            "Google Inc. (Intel)|ANGLE (Intel, Mesa Intel(R) Graphics (RPL‑P GT1) (0x0000A702) OpenGL 4.6)",
            "Google Inc. (Intel)|ANGLE (Intel, Mesa Intel(R) UHD Graphics 770 (0x00004680) OpenGL 4.6)",
            "Google Inc. (Intel)|ANGLE (Intel, Mesa Intel(R) HD Graphics 4400 (0x00001122) OpenGL 4.6)",
            "Google Inc. (Intel)|ANGLE (Intel, Mesa Intel(R) Graphics (ADL‑S GT1) (0x0000A0A1) OpenGL 4.6)",
            "Google Inc. (Intel)|ANGLE (Intel, Mesa Intel(R) Graphics (RKL GT1) (0x0000A9A1) OpenGL 4.6)",
            "Google Inc. (Intel)|ANGLE (Intel, Mesa Intel(R) UHD Graphics (CML GT2) (0x00009A14) OpenGL 4.6)",
            "Google Inc. (Intel)|ANGLE (Intel, Intel(R) HD Graphics 3000 (0x00001022) Direct3D9Ex vs_3_0 ps_3_0, igdumd64.dll)",
            "Google Inc. (Intel)|ANGLE (Intel, Intel(R) HD Graphics Family (0x00000A16) Direct3D11 vs_5_0 ps_5_0, D3D11)",
            "Google Inc. (Intel)|ANGLE (Intel, Intel(R) Iris Pro OpenGL Engine, OpenGL 4.1)",
            "Google Inc. (Intel)|ANGLE (Intel, Intel(R) Iris(TM) Plus Graphics 645 (0x1616) Direct3D11 vs_5_0 ps_5_0, D3D11)",
            "Google Inc. (Intel)|ANGLE (Intel, Intel(R) Iris(TM) Plus Graphics 655 (0x161E) Direct3D11 vs_5_0 ps_5_0, D3D11)",
            "Google Inc. (Intel)|ANGLE (Intel, Intel(R) UHD Graphics 730 (0x0000A100) Direct3D11 vs_5_0 ps_5_0, D3D11)",
            "Google Inc. (Intel)|ANGLE (Intel, Intel(R) UHD Graphics 805 (0x0000B0A0) Direct3D11 vs_5_0 ps_5_0, D3D11)",

            "Google Inc. (AMD)|ANGLE (AMD, AMD Radeon Vega 3 Graphics (0x000015E0) Direct3D11 vs_5_0 ps_5_0, D3D11)",
            "Google Inc. (AMD)|ANGLE (AMD, AMD Radeon Vega 8 Graphics (0x000015D8) Direct3D11 vs_5_0 ps_5_0, D3D11)",
            "Google Inc. (AMD)|ANGLE (AMD, AMD Radeon Vega 11 Graphics (0x000015DD) Direct3D11 vs_5_0 ps_5_0, D3D11)",
            "Google Inc. (AMD)|ANGLE (AMD, AMD Radeon Graphics (0x00001636) Direct3D11 vs_5_0 ps_5_0, D3D11)",
            "Google Inc. (AMD)|ANGLE (AMD, AMD Radeon RX 5500 XT Direct3D11 vs_5_0 ps_5_0, D3D11)",
            "Google Inc. (AMD)|ANGLE (AMD, AMD Radeon RX 560 (0x000067EF) Direct3D11 vs_5_0 ps_5_0, D3D11)",
            "Google Inc. (AMD)|ANGLE (AMD, AMD Radeon RX 570 (0x000067DF) Direct3D11 vs_5_0 ps_5_0, D3D11)",
            "Google Inc. (AMD)|ANGLE (AMD, AMD Radeon RX 580 2048SP (0x00006FDF) Direct3D11 vs_5_0 ps_5_0, D3D11)",
            "Google Inc. (AMD)|ANGLE (AMD, AMD Radeon RX 590 (0x000067FF) Direct3D11 vs_5_0 ps_5_0, D3D11)",
            "Google Inc. (AMD)|ANGLE (AMD, AMD Radeon RX 6600 (0x000073FF) Direct3D11 vs_5_0 ps_5_0, D3D11)",
            "Google Inc. (AMD)|ANGLE (AMD, AMD Radeon RX 6600 XT (0x000073FF) Direct3D11 vs_5_0 ps_5_0, D3D11)",
            "Google Inc. (AMD)|ANGLE (AMD, AMD Radeon RX 6650 XT Direct3D11 vs_5_0 ps_5_0, D3D11)",
            "Google Inc. (AMD)|ANGLE (AMD, AMD Radeon RX 6700 XT (0x000073DF) Direct3D11 vs_5_0 ps_5_0, D3D11)",
            "Google Inc. (AMD)|ANGLE (AMD, AMD Radeon RX 6800 (0x000073BF) Direct3D11 vs_5_0 ps_5_0, D3D11)",
            "Google Inc. (AMD)|ANGLE (AMD, AMD Radeon RX 6900 XT (0x000073C2) Direct3D11 vs_5_0 ps_5_0, D3D11)",
            "Google Inc. (AMD)|ANGLE (AMD, AMD Radeon RX 7700 XT Direct3D11 vs_5_0 ps_5_0, D3D11)",
            "Google Inc. (AMD)|ANGLE (AMD, AMD Radeon Pro 5300M OpenGL Engine, OpenGL 4.1)",
            "Google Inc. (AMD)|ANGLE (AMD, AMD Radeon Pro 5500 XT OpenGL Engine, OpenGL 4.1)",
            "Google Inc. (AMD)|ANGLE (AMD, AMD Radeon R7 370 Series (0x00006811) Direct3D11 vs_5_0 ps_5_0, D3D11)",
            "Google Inc. (AMD)|ANGLE (AMD, ATI Technologies Inc. AMD Radeon RX Vega 64 OpenGL Engine, OpenGL 4.1)",

            "Google Inc. (NVIDIA)|ANGLE (NVIDIA, NVIDIA GeForce GTX 1050 (0x00001C81) Direct3D11 vs_5_0 ps_5_0, D3D11)",
            "Google Inc. (NVIDIA)|ANGLE (NVIDIA, NVIDIA GeForce GTX 1050 Ti (0x00001C8C) Direct3D11 vs_5_0 ps_5_0, D3D11)",
            "Google Inc. (NVIDIA)|ANGLE (NVIDIA, NVIDIA GeForce GTX 1060 6GB (0x000010DE) Direct3D11 vs_5_0 ps_5_0, D3D11)",
            "Google Inc. (NVIDIA)|ANGLE (NVIDIA, NVIDIA GeForce GTX 1070 (0x00001B81) Direct3D11 vs_5_0 ps_5_0, D3D11)",
            "Google Inc. (NVIDIA)|ANGLE (NVIDIA, NVIDIA GeForce GTX 1080 (0x00001B80) Direct3D11 vs_5_0 ps_5_0, D3D11)",
            "Google Inc. (NVIDIA)|ANGLE (NVIDIA, NVIDIA GeForce RTX 2060 (0x00001F06) Direct3D11 vs_5_0 ps_5_0, D3D11)",
            "Google Inc. (NVIDIA)|ANGLE (NVIDIA, NVIDIA GeForce RTX 2060 SUPER (0x00001F06) Direct3D11 vs_5_0 ps_5_0, D3D11)",
            "Google Inc. (NVIDIA)|ANGLE (NVIDIA, NVIDIA GeForce RTX 2070 (0x00001F10) Direct3D11 vs_5_0 ps_5_0, D3D11)",
            "Google Inc. (NVIDIA)|ANGLE (NVIDIA, NVIDIA GeForce RTX 2070 SUPER (0x00001F10) Direct3D11 vs_5_0 ps_5_0, D3D11)",
            "Google Inc. (NVIDIA)|ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 (0x0000250F) Direct3D11 vs_5_0 ps_5_0, D3D11)",
            "Google Inc. (NVIDIA)|ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 Ti (0x00002489) Direct3D11 vs_5_0 ps_5_0, D3D11)",
            "Google Inc. (NVIDIA)|ANGLE (NVIDIA, NVIDIA GeForce RTX 3070 (0x00002488) Direct3D11 vs_5_0 ps_5_0, D3D11)",
            "Google Inc. (NVIDIA)|ANGLE (NVIDIA, NVIDIA GeForce RTX 3070 Ti (0x000028A5) Direct3D11 vs_5_0 ps_5_0, D3D11)",
            "Google Inc. (NVIDIA)|ANGLE (NVIDIA, NVIDIA GeForce RTX 3080 (0x00002206) Direct3D11 vs_5_0 ps_5_0, D3D11)",
            "Google Inc. (NVIDIA)|ANGLE (NVIDIA, NVIDIA GeForce RTX 3080 Ti (0x00002208) Direct3D11 vs_5_0 ps_5_0, D3D11)",
            "Google Inc. (NVIDIA)|ANGLE (NVIDIA, NVIDIA GeForce RTX 3090 (0x00002204) Direct3D11 vs_5_0 ps_5_0, D3D11)",
            "Google Inc. (NVIDIA)|ANGLE (NVIDIA, NVIDIA GeForce RTX 4060 (0x00002882) Direct3D11 vs_5_0 ps_5_0, D3D11)",
            "Google Inc. (NVIDIA)|ANGLE (NVIDIA, NVIDIA GeForce RTX 4060 Ti (0x00002803) Direct3D11 vs_5_0 ps_5_0, D3D11)",
            "Google Inc. (NVIDIA)|ANGLE (NVIDIA, NVIDIA GeForce RTX 4070 (0x00002786) Direct3D11 vs_5_0 ps_5_0, D3D11)",
            "Google Inc. (NVIDIA)|ANGLE (NVIDIA, NVIDIA GeForce RTX 4070 Ti (0x00002857) Direct3D11 vs_5_0 ps_5_0, D3D11)",
            "Google Inc. (NVIDIA)|ANGLE (NVIDIA, NVIDIA GeForce RTX 4080 (0x00002819) Direct3D11 vs_5_0 ps_5_0, D3D11)",
            "Google Inc. (NVIDIA)|ANGLE (NVIDIA, NVIDIA GeForce RTX 4090 (0x00002684) Direct3D11 vs_5_0 ps_5_0, D3D11)",
            "Google Inc. (NVIDIA)|ANGLE (NVIDIA, NVIDIA Quadro RTX 5000 Ada Generation (0x000026B2) Direct3D11 vs_5_0 ps_5_0, D3D11)",
            "Google Inc. (NVIDIA)|ANGLE (NVIDIA, NVIDIA Quadro P400 (0x00001CB3) Direct3D11 vs_5_0 ps_5_0, D3D11)",

            "Google Inc. (Google)|ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero) (0x0000C0DE)), SwiftShader driver)",
            "Google Inc. (Google)|ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero)), SwiftShader driver)",
            "Google Inc. (Google)|ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device), SwiftShader driver)",
        ]

        return random.choice(renderer_info_list).split("|")

    @staticmethod
    def __get_width_and_height():
        width, height = XhsFpGenerator.__weighted_random_choice(["1366;768", "1600;900", "1920;1080", "2560;1440", "3840;2160", "7680;4320"], [0.25, 0.15, 0.35, 0.15, 0.08, 0.02]).split(';')
        if random.choice([True, False]):
            availWidth = int(width) - int(XhsFpGenerator.__weighted_random_choice([0, 30, 60, 80], [0.1, 0.4, 0.3, 0.2]))
            availHeight = height
        else:
            availWidth = width
            availHeight = int(height) - int(XhsFpGenerator.__weighted_random_choice([30, 60, 80, 100], [0.2, 0.5, 0.2, 0.1]))

        return width, height, availWidth, availHeight

    @staticmethod
    def get_fingerprint(cookies: dict, user_agent: str) -> dict:
        cookie_string = "; ".join(f"{k}={v}" for k, v in cookies.items())

        # 窗口大小预设
        width, height, availWidth, availHeight = XhsFpGenerator.__get_width_and_height()

        # 隐身模式预设
        is_incognito_mode = XhsFpGenerator.__weighted_random_choice(['true', 'false'], [0.95, 0.05])

        vendor, renderer = XhsFpGenerator.__get_renderer_info()

        x78_y = random.randint(2350, 2450)
        fp = {
            "x1": user_agent, # ua
            "x2": "false", # navigator.webdriver # 自动化
            "x3": "zh-CN", # navigator.language # 语言 固定值
            "x4": XhsFpGenerator.__weighted_random_choice([16, 24, 30, 32], [0.05, 0.6, 0.05, 0.3]), # screen.colorDepth # 屏幕色深 24bit
            "x5": XhsFpGenerator.__weighted_random_choice([1, 2, 4, 8, 12, 16], [0.10, 0.25, 0.4, 0.2, 0.03, 0.01]), # navigator.deviceMemory # 设备内存
            "x6": "24", # screen.pixelDepth # 屏幕的像素深度（通常与 colorDepth 相同，如 24）
            "x7": f"{vendor},{renderer}", # canvas获取显卡信息
            "x8": XhsFpGenerator.__weighted_random_choice([2, 4, 6, 8, 12, 16, 24, 32], [0.1, 0.4, 0.2, 0.15, 0.08, 0.04, 0.02, 0.01]), # navigator.hardwareConcurrency 返回设备的 逻辑CPU核心数（如 12）。
            "x9": f"{width};{height}", # screen.width 和 screen.height 返回屏幕分辨率（如 2560x1440）。
            "x10": f"{availWidth};{availHeight}", # screen.availWidth 和 screen.availHeight 返回浏览器窗口的 可用显示区域大小（去掉任务栏）。
            "x11": "-480", # new Date().getTimezoneOffset() 返回本地时间与UTC的 分钟差（如 -480）。
            "x12": "Asia/Hong_Kong", # Intl.DateTimeFormat().resolvedOptions().timeZone 返回浏览器设定的 系统时区ID（如 'Asia/Hong_Kong'）
            "x13": is_incognito_mode, # window.sessionStorage 检测浏览器是否支持 会话存储（Session Storage）。 # 隐私模式是 false
            "x14": is_incognito_mode, # window.localStorage 检测浏览器是否支持 本地存储（Local Storage）。 # 隐私模式是 false
            "x15": is_incognito_mode, # window.indexedDB 检测浏览器是否支持 IndexedDB（浏览器内置的NoSQL数据库）。
            "x16": "false", # document.body.addBehavior 是 旧版IE特有方法（IE6~IE10）。 现代浏览器 不存在此方法，返回 undefined 或报错。 固定值
            "x17": "false", # window.openDatabase 检测浏览器是否支持 WebSQL（已废弃的浏览器数据库API）。现代浏览器 已移除支持，返回 undefined。 固定值
            "x18": "un", # navigator.cpuClass 是 旧版IE浏览器（IE4~IE11） 特有的属性，用于检测CPU类型（如 "x86"、"68k"、"Alpha"）。 现代浏览器 不存在此属性，返回 undefined 或 被模拟的值（如 "NOT_AVAILABLE"）。 固定值
            "x19": "Win32", # navigator.platform 返回 操作系统平台标识（如 "Win32"、"MacIntel"）。 固定值 不必多些其他系统，UA固定WINDOWS平台即可
            "x20": "", # document.querySelectorAll('[src^="chrome://"]') 检测是否存在 Chrome内部资源链接 固定值
            "x21": "PDF Viewer,Chrome PDF Viewer,Chromium PDF Viewer,Microsoft Edge PDF Viewer,WebKit built-in PDF", # navigator.plugins 返回浏览器安装的 插件列表（如PDF查看器、Flash等）。 固定值
            "x22": hashlib.md5(secrets.token_bytes(32)).hexdigest(), #
            "x23": "false", # DOM操作环境检测 固定值
            "x24": "false", # navigator.languages 是否==undefined 固定值
            "x25": "false", # screen.height / screen.availHeight 差异是否过大 固定值
            "x26": "false", # 什么都没做 固定值
            "x27": "false", # 什么都没做 固定值
            "x28": "0,false,false", # 触屏检测 maxTouchPoints ， document.createEvent("TouchEvent"); ， 'ontouchstart' in window; 固定值 
            "x29": "4,7,8", # 太长了懒得翻了 固定值
            "x30": "swf object not loaded", #  检测 Flash（SWF）对象是否成功加载 Boolean(navigator.plugins['Shockwave Flash']); 固定值
            # "x32": "0", # 暂无
            "x33": "0", # 判断是否是微信内置浏览器 固定值
            "x34": "0", # 判断渲染器是否是Brian Paul（虚拟） 固定值
            "x35": "0", # 判断是否加载 Modernizr 固定值
            "x36": f"{random.randint(1, 20)}", # 判断window.history.length 历史堆栈长度
            "x37": "0|0|0|0|0|0|0|0|0|1|0|0|0|0|0|0|0|0|1|0|0|0|0|0", # 环境监测 太长了懒得看 固定值
            "x38": "0|0|1|0|1|0|0|0|0|0|1|0|1|0|1|0|0|0|0|0|0|0|0|0|0|0|0|0|0|0|0|0|0|0|0|0|0|0|0", # 环境监测 太长了懒得看 固定值
            "x39": 0, #小红书抽风这里写死成0了 f"{random.randint(1, 5)}", # localStorage.getItem('sc');  刷新一次页面 +1    1-5 随机即可 # 2025-9-7 18:17:39 注: 之前是p1 现在变成 sc
            "x40": "0", # localStorage.getItem('ptt');  但正常使用并无该值 固定0
            "x41": "0", # localStorage.getItem('pst');  但正常使用并无该值 固定0
            "x42": "3.4.3", # 所使用的Finggerprint.js版本 固定值
            "x43": "742cc32c", # 通过一张图片的hash值来检测浏览器是否被篡改 固定值
            "x44": f"{int(time.time() * 1000)}", # 当前时间戳(毫秒)
            "x45": "__SEC_CAV__1-1-1-1-1|__SEC_WSA__|", # 前端风控 SDK 的打点信息 如果有风控会是__SEC_WSA__|之类的  固定值
            "x46": "false", # navigator.__proto__.hasOwnProperty('webdriver'); 和 Object.getOwnPropertyDescriptor(Navigator.prototype, 'webdriver'); // true → 风控触发
            "x47": "1|0|0|0|0|0", # 识别不同浏览器的「独占特征」  固定值
            "x48": "", # 什么都没做 固定值
            "x49": '{list:[],type:}', # 什么都没做 固定值
            "x50": "", # 固定值
            "x51": "", # 固定值
            "x52": "", # 固定值
            "x55": "380,380,360,400,380,400,420,380,400,400,360,360,440,420", # 很长 懒得看 固定即可
            "x56": f"{vendor}|{renderer}|{hashlib.md5(secrets.token_bytes(32)).hexdigest()}|35", # x7 | Fingerprint2.x64hash128(WebGLRenderingContext.getSupportedExtensions()) | WebGLRenderingContext.getSupportedExtensions().length
            "x57": cookie_string, # Cookie(略)
            "x58": "180", # document.getElementsByTagName('div') // div标签数量 固定值
            "x59": "2", # performance.getEntriesByType("resource").length   // 资源加载数量 固定值
            "x60": "63", # 风控分 固定值
            "x61": "1291", # Object.getOwnPropertyNames(window) .length  // window对象属性数量 固定值
            "x62": "2047", # HOOK检测 1,1,1,1,1,1,1,1,1,1,1  11个1(通过) 组成二进制2047 固定值
            "x63": "0", # JS VMP文件换行检测 固定值
            "x64": "0", # HOOK ToString检测 CPU核心数量检测 固定值
            "x65": "0", # 异常点分值 0 固定值
            "x66": { # navigator.userAgent
                "referer": "",
                "location": "https://www.xiaohongshu.com/explore",
                "frame": 0
            }, 
            "x67": "1|0", # 环境检测  固定值
            "x68": "0", # 固定值 
            "x69": "326|1292|30", # 暂无  第一个会变化 是 Object.keys(window)  固定值
            "x70": [ 
                "location" # Object.keys(document); 固定值
            ], 
            "x71": "true", # 环境检测  固定值
            "x72": "complete", # document.readyState 固定值
            "x73": "1191", # document.getElementsByTagName ('*') 固定值
            "x74": "0|0|0", # 环境检测  固定值
            "x75": "Google Inc.", # Navigator.vendor 固定值
            "x76": "true", # navigator.cookieEnabled
            "x77": "1|1|1|1|1|1|1|1|1|1", # 环境检测  固定值
            "x78": {
                "x": 0,
                "y": x78_y,
                "left": 0,
                "right": 290.828125,
                "bottom": x78_y+18,
                "height": 18,
                "top": x78_y,
                "width": 290.828125,
                "font": "system-ui, \"Apple Color Emoji\", \"Segoe UI Emoji\", \"Segoe UI Symbol\", \"Noto Color Emoji\", -apple-system, \"Segoe UI\", Roboto, Ubuntu, Cantarell, \"Noto Sans\", sans-serif, BlinkMacSystemFont, \"Helvetica Neue\", Arial, \"PingFang SC\", \"PingFang TC\", \"PingFang HK\", \"Microsoft Yahei\", \"Microsoft JhengHei\""
            }, # 不好模拟 可以固定
            "x82": "_0x17a2|_0x1954", # 新建一个iframe，然后获取iframe的contentWindow对象，再获取contentWindow对象的window对象，对比差异 固定值
            "x31": "124.04347527516074", # 固定值
            "x79": "144|599565058866", # navigator.webkitTemporaryStorage.queryUsageAndQuota(used, granted)  // 随机数|599565058866 固定值
            "x53": hashlib.md5(secrets.token_bytes(32)).hexdigest(), #"235c6559af50acefe4755120d05570a0"  if "edg/" in user_agent else "993da9a681fd3994c9f53de11f2903b3", # speechSynthesis.getVoices()  Fingerprint2.x64hash128 edge是235c6559af50acefe4755120d05570a0 chrome是993da9a681fd3994c9f53de11f2903b3
            "x54": "10311144241322244122", # 固定值 
            "x80": "1|[object FileSystemDirectoryHandle]", # 固定值
        }

        fp = {'x1': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36', 'x2': 'false', 'x3': 'zh-CN', 'x4': '24', 'x5': '8', 'x6': '24', 'x7': 'Google Inc. (NVIDIA),ANGLE (NVIDIA, NVIDIA GeForce RTX 4060 (0x00002882) Direct3D11 vs_5_0 ps_5_0, D3D11)', 'x8': '12', 'x9': '2560;1440', 'x10': '2560;1392', 'x11': '-480', 'x12': 'Asia/Shanghai', 'x13': 'true', 'x14': 'true', 'x15': 'true', 'x16': 'false', 'x17': 'false', 'x18': 'un', 'x19': 'Win32', 'x20': '', 'x21': 'PDF Viewer,Chrome PDF Viewer,Chromium PDF Viewer,Microsoft Edge PDF Viewer,WebKit built-in PDF', 'x22': 'c8e2f6ff2a07957f70a18cde6b905ebb', 'x23': 'false', 'x24': 'false', 'x25': 'false', 'x26': 'false', 'x27': 'false', 'x28': '0,false,false', 'x29': '4,7,8', 'x30': 'swf object not loaded', 'x33': '0', 'x34': '0', 'x35': '0', 'x36': '10', 'x37': '0|0|0|0|0|0|0|0|0|1|0|0|0|0|0|0|0|0|1|0|0|0|0|0', 'x38': '0|0|1|0|1|0|0|0|0|0|1|0|1|0|1|0|0|0|0|0|0|0|0|0|0|0|0|0|0|0|0|0|0|0|0|0|0|0|0', 'x39': '6', 'x40': '0', 'x41': '0', 'x42': '3.4.3', 'x43': '742cc32c', 'x44': '1758515175443', 'x45': '__SEC_CAV__1-1-1-1-1|__SEC_WSA__|', 'x46': 'false', 'x47': '1|0|0|0|0|0', 'x48': '', 'x49': '{list:[],type:}', 'x50': '', 'x51': '', 'x52': '', 'x55': '340,340,340,380,360,420,360,360,340,360,340,340,360,440', 'x56': 'Google Inc. (NVIDIA)|ANGLE (NVIDIA, NVIDIA GeForce RTX 4060 (0x00002882) Direct3D11 vs_5_0 ps_5_0, D3D11)|0ebc53d03ea89d69525d81de558e2544|35', 'x57': 'abRequestId=9de2891c-0a67-51dd-b749-b85bb6435b9c; webBuild=4.81.0; xsecappid=xhs-pc-web; a1=1996fac1652qhpep2lhhtq8ay9yy5iep6gd22ffi050000299679; webId=e1b691a826bb747ade49823114291378; loadts=1758515174315', 'x58': '59', 'x59': '2', 'x60': '63', 'x61': '1290', 'x62': '2047', 'x63': '0', 'x64': '0', 'x65': '0', 'x66': {'referer': 'https://www.xiaohongshu.com/explore/68bff99c000000001d02e2cd?xsec_token=ABo18yU0Y74__BpvENJX-t9Jv3vtnvfG7RfVlE8s7JjCk=&xsec_sour', 'location': 'https://www.xiaohongshu.com/login?redirectPath=https%253A%252F%252Fwww.xiaohongshu.com%252Fexplore%252F68bff99c000000001d02e2cd%', 'frame': 0}, 'x67': '1|0', 'x68': '0', 'x69': '325|1291|30', 'x70': ['location'], 'x71': 'true', 'x72': 'complete', 'x73': '726', 'x74': '0|0|0', 'x75': 'Google Inc.', 'x76': 'true', 'x77': '1|1|1|1|1|1|1|1|1|1', 'x78': {'x': 0, 'y': -1, 'left': 0, 'right': 290.828125, 'bottom': 17, 'height': 18, 'top': -1, 'width': 290.828125, 'font': 'system-ui, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji", -apple-system, "Segoe UI", Roboto, Ubuntu, Cantarell, "Noto Sans", sans-serif, BlinkMacSystemFont, "Helvetica Neue", Arial, "PingFang SC", "PingFang TC", "PingFang HK", "Microsoft Yahei", "Microsoft JhengHei"'}, 'x82': '__SSR__|_0x5763|_0x133c', 'x31': '124.04347527516074', 'x79': '144|599565058866', 'x53': '993da9a681fd3994c9f53de11f2903b3', 'x54': '10311144241322244122', 'x80': '1|[object FileSystemDirectoryHandle]'}
        return fp
    
    @staticmethod
    def update_fingerprint(fp: dict, cookies: dict, url: str) -> None:
        cookie_string = "; ".join(f"{k}={v}" for k, v in cookies.items())

        fp.update({
            "x39": 0, #小红书抽风这里写死成0了 str(int(fp["x39"]) + 1), # localStorage.getItem('p1');  刷新一次页面 +1
            "x44": f"{time.time() * 1000}", # 当前时间戳(毫秒)
            "x57": cookie_string, # Cookie(略),
            "x66": { # navigator.userAgent
                "referer": "https://www.xiaohongshu.com/explore",
                "location": url,
                "frame": 0
            }
        })
