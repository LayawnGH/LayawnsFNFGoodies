#pragma header

// CRT-Lottes adaptation for Psych Engine / OpenFL.
// Based on Timothy Lottes' public-domain CRT shader.
// Original: https://github.com/libretro/glsl-shaders/blob/master/crt/shaders/crt-lottes.glsl
//
// This version adds built-in anti-aliasing that mimics FNF's sprite
// "antialiasing = true" (bilinear smoothing between art pixels), so your
// sprites can stay on antialiasing = false and still get the soft look.

// --- Tuning ---
#define PIXEL_SCALE 6.0
#define BLOOM_AMOUNT 0.15
#define MASK_TYPE 3.0

// Source anti-aliasing (like FNF's sprite antialiasing on scaled-up pixel art).
// This is the BOTTOM layer: it softens the art pixels themselves, before the
// beam, scanlines, mask and bloom are applied, so none of those get blurred.
//   0.0 = hard pixels (cheapest)
//   1.0 = matches FNF's bilinear antialiasing on average (default)
//   up to 2.0 = softer
// Costs 5 texture reads per beam tap instead of 1.
// Can be switched off at runtime per camera with the `aaDisable` uniform.
#define AA_AMOUNT 1.0

uniform float warpX;
uniform float warpY;
uniform float hardScan;
uniform float hardPix;
uniform float maskDark;
uniform float maskLight;
uniform float brightBoost;
uniform float bloomAmount;
uniform float aaDisable; // 0 (default) = AA on, 1 = AA off (set from Lua)

#define res (openfl_TextureSize.xy / PIXEL_SCALE)

float ToLinear1(float c)
{
    return c <= 0.04045
        ? c / 12.92
        : pow((c + 0.055) / 1.055, 2.4);
}

vec3 ToLinear(vec3 c)
{
    return vec3(
        ToLinear1(c.r),
        ToLinear1(c.g),
        ToLinear1(c.b)
    );
}

float ToSrgb1(float c)
{
    return c < 0.0031308
        ? c * 12.92
        : 1.055 * pow(max(c, 0.0), 0.41666) - 0.055;
}

vec3 ToSrgb(vec3 c)
{
    return vec3(
        ToSrgb1(c.r),
        ToSrgb1(c.g),
        ToSrgb1(c.b)
    );
}

float Luma(vec3 c)
{
    return dot(c, vec3(0.2126, 0.7152, 0.0722));
}

// Read the centre of one emulated pixel, given its integer cell coordinate.
vec3 FetchCell(vec2 cell)
{
    vec2 pos = (cell + 0.5) / res;

    if (pos.x < 0.0 || pos.x > 1.0 ||
        pos.y < 0.0 || pos.y > 1.0)
        return vec3(0.0);

    return ToLinear(
        texture2D(bitmap, pos).rgb * brightBoost
    );
}

// Hard (nearest) sample of an emulated pixel. This is the original Fetch.
vec3 FetchPoint(vec2 pos, vec2 offset)
{
    return FetchCell(floor(pos * res + offset));
}

// Source pixel with anti-aliasing. Each emulated pixel is blended with its
// four neighbours using FIXED weights (about what bilinear filtering averages
// to on scaled pixel art). The result depends only on which cell we are in,
// never on the position inside the cell, so the beam / scanline / mask math
// that follows still sees clean per-pixel values and stays crisp.
// Blending happens in linear light, so edges don't darken.
vec3 Fetch(vec2 pos, vec2 offset)
{
    vec2 cell = floor(pos * res + offset);
    vec3 centre = FetchCell(cell);

    if (aaDisable > 0.5 || AA_AMOUNT <= 0.001)
        return centre;

    float w = AA_AMOUNT * 0.1;

    vec3 sides = FetchCell(cell + vec2( 1.0,  0.0))
               + FetchCell(cell + vec2(-1.0,  0.0))
               + FetchCell(cell + vec2( 0.0,  1.0))
               + FetchCell(cell + vec2( 0.0, -1.0));

    return centre * (1.0 - 4.0 * w) + sides * w;
}

vec2 Dist(vec2 pos)
{
    pos *= res;
    return -((pos - floor(pos)) - vec2(0.5));
}

float Gaus(float pos, float scale)
{
    return exp2(scale * pos * pos);
}

// Three-tap horizontal reconstruction.
vec3 Horz3(vec2 pos, float offset)
{
    vec3 a = Fetch(pos, vec2(-1.0, offset));
    vec3 b = Fetch(pos, vec2( 0.0, offset));
    vec3 c = Fetch(pos, vec2( 1.0, offset));

    float d = Dist(pos).x;

    float wa = Gaus(d - 1.0, hardPix);
    float wb = Gaus(d, hardPix);
    float wc = Gaus(d + 1.0, hardPix);

    return (a * wa + b * wb + c * wc)
        / max(wa + wb + wc, 0.0001);
}

// Five-tap horizontal reconstruction.
vec3 Horz5(vec2 pos, float offset)
{
    vec3 a = Fetch(pos, vec2(-2.0, offset));
    vec3 b = Fetch(pos, vec2(-1.0, offset));
    vec3 c = Fetch(pos, vec2( 0.0, offset));
    vec3 d = Fetch(pos, vec2( 1.0, offset));
    vec3 e = Fetch(pos, vec2( 2.0, offset));

    float x = Dist(pos).x;

    float wa = Gaus(x - 2.0, hardPix);
    float wb = Gaus(x - 1.0, hardPix);
    float wc = Gaus(x, hardPix);
    float wd = Gaus(x + 1.0, hardPix);
    float we = Gaus(x + 2.0, hardPix);

    return (a * wa + b * wb + c * wc + d * wd + e * we)
        / max(wa + wb + wc + wd + we, 0.0001);
}

// Bright scanlines widen like an electron beam.
float Scan(vec2 pos, float offset, float lum)
{
    float beam = hardScan + 3.0 * clamp(lum, 0.0, 1.0);
    return Gaus(Dist(pos).y + offset, beam);
}

vec3 Tri(vec2 pos)
{
    vec3 a = Horz3(pos, -1.0);
    vec3 b = Horz5(pos,  0.0);
    vec3 c = Horz3(pos,  1.0);

    float wa = Scan(pos, -1.0, Luma(a));
    float wb = Scan(pos,  0.0, Luma(b));
    float wc = Scan(pos,  1.0, Luma(c));

    return max(a * wa + b * wb + c * wc, 0.0);
}

// Barrel distortion.
vec2 Warp(vec2 pos)
{
    pos = pos * 2.0 - 1.0;

    pos *= vec2(
        1.0 + pos.y * pos.y * warpX,
        1.0 + pos.x * pos.x * warpY
    );

    return pos * 0.5 + 0.5;
}

// RGB phosphor shadow mask.
vec3 Mask(vec2 pos)
{
    vec3 mask = vec3(maskDark);

    if (MASK_TYPE == 2.0)
        return vec3(1.0);

    if (MASK_TYPE == 0.0)
        pos.x += pos.y * 3.0;

    pos.x = fract(pos.x / 6.0);

    if (pos.x < 0.333)
        mask.r = maskLight;
    else if (pos.x < 0.666)
        mask.g = maskLight;
    else
        mask.b = maskLight;

    return mask;
}

// Lightweight bloom from neighboring bright samples.
// Uses hard samples on purpose: glow is blurry anyway, and this saves reads.
vec3 Bloom(vec2 pos)
{
    vec3 sum = vec3(0.0);
    float weights = 0.0;

    for (int y = -1; y <= 1; y++)
    {
        for (int x = -2; x <= 2; x++)
        {
            vec2 offset = vec2(float(x), float(y));
            float weight = exp2(
                -0.7 * dot(offset, offset)
            );

            vec3 sampleColor = FetchPoint(pos, offset);
            sum += max(sampleColor - vec3(0.65), 0.0) * weight;
            weights += weight;
        }
    }

    return sum / max(weights, 0.0001);
}

void main()
{
    vec2 uv = openfl_TextureCoordv;
    vec2 pos = Warp(uv);

    vec3 color = Tri(pos);

    color *= Mask(uv * openfl_TextureSize.xy);
    color += Bloom(pos) * bloomAmount;

    color = ToSrgb(max(color, 0.0));

    vec4 original = flixel_texture2D(bitmap, uv);
    gl_FragColor = vec4(clamp(color, 0.0, 1.0), original.a);
}
