# Implemented Endpoints

**Short-term Forecast API (VilageFcstInfoService_2.0)**:
- ✅ `/getUltraSrtNcst` - Ultra-short-term observation (현재 날씨)
- ✅ `/getUltraSrtFcst` - Ultra-short-term forecast (6시간 예보)
- ✅ `/getVilageFcst` - Short-term forecast (3일 예보)
- ❌ `/getFcstVersion` - Forecast version query (미구현)

**Weather Warnings API (WthrWrnInfoService)**:
- ✅ `/getPwnStatus` - Warning status summary (특보현황조회)
- ❌ `/getWthrWrnList` - Warning list (기상특보목록조회)
- ❌ `/getWthrWrnMsg` - Warning message (기상특보통보문조회)
- ❌ `/getWthrInfoList` - Weather info list (기상정보목록조회)
- ❌ `/getWthrInfo` - Weather info (기상정보문조회)
- ❌ `/getWthrBrkNewsList` - Breaking news list (기상속보목록조회)
- ❌ `/getWthrBrkNews` - Breaking news (기상속보조회)
- ❌ `/getWthrPwnList` - Preliminary warning list (기상예비특보목록조회)
- ❌ `/getWthrPwn` - Preliminary warning (기상예비특보조회)
- ❌ `/getPwnCd` - Warning code (특보코드조회)

**Mid-term Forecast API (MidFcstInfoService)**:
- ✅ `/getMidFcst` - Mid-term outlook (중기전망조회)
- ❌ `/getMidLandFcst` - Mid-term land forecast (중기육상예보조회, 4-10일 육상날씨)
- ❌ `/getMidTa` - Mid-term temperature (중기기온조회, 4-10일 최저/최고기온)
- ❌ `/getMidSeaFcst` - Mid-term sea forecast (중기해상예보조회, 4-10일 해상날씨/파고)