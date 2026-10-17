#pragma header

//=====================================================================
//  CRT shader, extended from Timothy Lottes' public domain CRT shader
//
//  Original: curved screen, beam scanlines, phosphor shadow mask.
//  Added:    phosphor bloom, brightness-dependent beam width,
//            composite colour bleed, rounded glass, vignette, glass
//            reflection, black level, and optional analog instability.
//
//  Everything is tweakable through the #defines below. The only uniform
//  is `time` (seconds). Feed it every frame, e.g. in Lua:
//      setShaderFloat('crtController', 'time', os.clock())
//  Without it the picture still works, the animated effects just freeze.
//=====================================================================

uniform float time;

// One CRT "pixel" is this many real pixels. Bigger number = chunkier.
#define res (openfl_TextureSize.xy / 6.0)

//---------------------------------------------------------------------
// SCREEN SHAPE
//---------------------------------------------------------------------
vec2 warp = vec2(1.0 / 32.0, 1.0 / 24.0);   // barrel curvature (x, y)
#define CORNER_RADIUS 0.035                // rounded glass corners, 0 = square
#define VIGNETTE      0.35                 // dark corners, 0 = off

//---------------------------------------------------------------------
// ELECTRON BEAM
//---------------------------------------------------------------------
float hardScan = -8.0;    // scanline sharpness (more negative = thinner lines)
float hardPix  = -5.5;    // horizontal sharpness (-3 = soft, -8 = razor sharp)
// Bright beams are fatter: at full white the scanlines nearly merge, dark
// areas keep thin lines. 0 = every scanline has the same thickness.
#define BEAM_BLOOM    4.0

//---------------------------------------------------------------------
// PHOSPHOR MASK
//---------------------------------------------------------------------
float maskDark  = 0.5;
float maskLight = 1.5;
// 0 = shadow mask (original), 1 = aperture grille (Trinitron stripes), 2 = off
#define MASK_TYPE 0

//---------------------------------------------------------------------
// GLOW. This is what turns a lone red pixel into a glowing eye.
//---------------------------------------------------------------------
#define BLOOM_STRENGTH  1.3     // glow of small, isolated lights. 0 = no glow at all
#define BLOOM_AREA_STRENGTH 0.45 // glow around big bright areas
#define BLOOM_THRESHOLD 0.25    // only light brighter than this blooms (linear)
#define BLOOM_WIDTH     0.2     // how fast the glow fades sideways (smaller = wider glow)

//---------------------------------------------------------------------
// COMPOSITE VIDEO. Colour is lower resolution than brightness and smears
// slightly to the right, like on a real TV / console cable.
//---------------------------------------------------------------------
#define CHROMA_BLEED    0.5     // 0 = off, 1 = full
#define SATURATION      1.15

//---------------------------------------------------------------------
// GLASS AND ANALOG
//---------------------------------------------------------------------
#define BRIGHTNESS      1.1
#define BLACK_LEVEL     0.002   // blacks are never quite black on a CRT
#define REFLECTION      0.0    // soft glare on the glass, 0 = off
#define FLICKER         0.012   // tiny brightness pulsing, 0 = off
#define HUM_BAR         0.04    // slow rolling brightness band, 0 = off
#define GRAIN           0.025   // signal noise, 0 = off
#define GLITCH          1   // rare horizontal wobble, 0 = off

//=====================================================================

float ToLinear1(float c)
{
    return c <= 0.04045 ? c / 12.92
        : pow((c + 0.055) / 1.055, 2.4);
}

vec3 ToLinear(vec3 c)
{
    return vec3(ToLinear1(c.r), ToLinear1(c.g), ToLinear1(c.b));
}

float ToSrgb1(float c)
{
    return c < 0.0031308 ? c * 12.92
        : 1.055 * pow(max(c, 0.0), 0.41666) - 0.055;
}

vec3 ToSrgb(vec3 c)
{
    return vec3(ToSrgb1(c.r), ToSrgb1(c.g), ToSrgb1(c.b));
}

float Luma(vec3 c)
{
    return dot(c, vec3(0.2126, 0.7152, 0.0722));
}

vec3 ToYIQ(vec3 c)
{
    return vec3(
        dot(c, vec3(0.299,  0.587,  0.114)),
        dot(c, vec3(0.596, -0.274, -0.322)),
        dot(c, vec3(0.211, -0.523,  0.312))
    );
}

vec3 FromYIQ(vec3 c)
{
    return vec3(
        c.x + 0.956 * c.y + 0.621 * c.z,
        c.x - 0.272 * c.y - 0.647 * c.z,
        c.x - 1.106 * c.y + 1.703 * c.z
    );
}

float Hash(vec2 p)
{
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
}

vec3 Fetch(vec2 pos, vec2 off)
{
    pos = (floor(pos * res + off) + 0.5) / res;   // sample the cell CENTRE (was the corner, which blurred by blending two texels)

    if (max(abs(pos.x - 0.5), abs(pos.y - 0.5)) > 0.5)
        return vec3(0.0);

    return ToLinear(texture2D(bitmap, pos).rgb);
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

vec3 Horz3(vec2 pos, float off)
{
    vec3 b = Fetch(pos, vec2(-1.0, off));
    vec3 c = Fetch(pos, vec2( 0.0, off));
    vec3 d = Fetch(pos, vec2( 1.0, off));

    float dst = Dist(pos).x;

    float wb = Gaus(dst - 1.0, hardPix);
    float wc = Gaus(dst, hardPix);
    float wd = Gaus(dst + 1.0, hardPix);

    return (b * wb + c * wc + d * wd) / (wb + wc + wd);
}

vec3 Horz5(vec2 pos, float off)
{
    vec3 a = Fetch(pos, vec2(-2.0, off));
    vec3 b = Fetch(pos, vec2(-1.0, off));
    vec3 c = Fetch(pos, vec2( 0.0, off));
    vec3 d = Fetch(pos, vec2( 1.0, off));
    vec3 e = Fetch(pos, vec2( 2.0, off));

    float dst = Dist(pos).x;

    float wa = exp2(-2.0 * (dst - 2.0) * (dst - 2.0));
    float wb = exp2(-2.0 * (dst - 1.0) * (dst - 1.0));
    float wc = exp2(-2.0 * dst * dst);
    float wd = exp2(-2.0 * (dst + 1.0) * (dst + 1.0));
    float we = exp2(-2.0 * (dst + 2.0) * (dst + 2.0));

    return (a * wa + b * wb + c * wc + d * wd + e * we)
        / max(wa + wb + wc + wd + we, 0.0001);
}

// Scanline weight. Brighter rows get a wider beam.
float Scan(vec2 pos, float off, float lum)
{
    float brightness = clamp(lum, 0.0, 1.0);
    float beam = hardScan + BEAM_BLOOM * sqrt(brightness);

    return Gaus(Dist(pos).y + off, beam);
}

// Soft, delayed chroma (I and Q) of the current row.
vec2 ChromaRow(vec2 pos)
{
    float dx = Dist(pos).x;
    vec2 iq = vec2(0.0);
    float wsum = 0.0;

    for (int k = -2; k <= 2; k++)
    {
        float x = float(k);
        float w = exp2(-2.0 * (dx + x) * (dx + x));
        // x - 1.0: the colour signal arrives a pixel late and lands to the right
        iq += ToYIQ(Fetch(pos, vec2(x - 1.0, 0.0))).yz * w;
        wsum += w;
    }

    return iq / wsum;
}

vec3 Tri(vec2 pos)
{
    vec3 a = Horz3(pos, -1.0);
    vec3 b = Horz5(pos,  0.0);
    vec3 c = Horz3(pos,  1.0);

    float wa = Scan(pos, -1.0, Luma(a));
    float wb = Scan(pos,  0.0, Luma(b));
    float wc = Scan(pos,  1.0, Luma(c));

    vec3 col = a * wa + b * wb + c * wc;

    // composite colour bleed: keep the sharp brightness, smear the colour
    vec3 yiq = ToYIQ(col);
    vec2 bleed = ChromaRow(pos) - ToYIQ(b).yz;
    yiq.yz += bleed * CHROMA_BLEED * wb;

    return max(FromYIQ(yiq), 0.0);
}

// Halo of light around bright things: light scattering in the glass and
// the phosphor glow. It spreads far sideways and a little vertically, and
// only light brighter than BLOOM_THRESHOLD takes part.
// It is a "brightest neighbour, faded by distance" filter minus the pixel
// itself, so a bright pixel gets a halo but the inside of a big bright
// area is not made brighter. Small, isolated lights (glowing eyes, stars,
// lamps) glow harder than big filled areas.
// Cost: 39 texture reads per pixel. Shrink the loops (e.g. -4..4 and 0..0)
// for a cheaper, smaller glow.
vec3 Bloom(vec2 pos)
{
    vec2 d = Dist(pos);
    vec3 centre = max(Fetch(pos, vec2(0.0)) - BLOOM_THRESHOLD, 0.0);
    vec3 glow = vec3(0.0);
    vec3 mean = vec3(0.0);
    float wsum = 0.0;

    for (int j = -1; j <= 1; j++)
    {
        for (int k = -6; k <= 6; k++)
        {
            vec2 o = vec2(float(k), float(j));
            vec2 p = d + o;
            float w = exp2(-(BLOOM_WIDTH * p.x * p.x + 1.5 * p.y * p.y));

            vec3 c = max(Fetch(pos, o) - BLOOM_THRESHOLD, 0.0);
            glow += c * w;
            mean += c * w;
            wsum += w;
        }
    }

    glow /= max(wsum, 0.0001);
    // how crowded with light is the neighbourhood? 0 = one lonely pixel, 1 = solid area
    float fill = smoothstep(0.05, 0.5, dot(mean / wsum, vec3(1.0)) / max(dot(glow, vec3(1.0)), 0.0001));

    return max(glow - centre, 0.0) * mix(BLOOM_STRENGTH, BLOOM_AREA_STRENGTH, fill);
}

vec2 Warp(vec2 pos)
{
    pos = pos * 2.0 - 1.0;

    pos *= vec2(
        1.0 + pos.y * pos.y * warp.x,
        1.0 + pos.x * pos.x * warp.y
    );

    return pos * 0.5 + 0.5;
}

vec3 Mask(vec2 pos)
{
#if MASK_TYPE == 2
    return vec3(1.0);
#else
    #if MASK_TYPE == 0
        pos.x += pos.y * 3.0;
    #endif

    vec3 mask = vec3(maskDark);

    pos.x = fract(pos.x / 6.0);

    if (pos.x < 0.333)
        mask.r = maskLight;
    else if (pos.x < 0.666)
        mask.g = maskLight;
    else
        mask.b = maskLight;

    return mask;
#endif
}

// 1 inside the rounded glass, 0 outside, with a soft edge
float Glass(vec2 pos)
{
    vec2 p = abs(pos - 0.5) - (0.5 - CORNER_RADIUS);
    float d = length(max(p, 0.0)) + min(max(p.x, p.y), 0.0) - CORNER_RADIUS;
    return 1.0 - smoothstep(-0.003, 0.003, d);
}

void main()
{
    vec2 uv = openfl_TextureCoordv;
    float t = mod(time, 1000.0);

    vec2 pos = Warp(uv);

    // rare analog wobble: a short burst of wavy scanlines
    float burst = step(0.985, Hash(vec2(floor(t * 12.0), 3.7)));
    pos.x += GLITCH * burst * sin(pos.y * 500.0 + t * 30.0);

    // the picture itself
    vec3 color = Tri(pos) * Mask(uv * openfl_TextureSize.xy) * BRIGHTNESS;

    // glow goes on top of the mask, because it happens in the glass
    color += Bloom(pos);

    // analog instability
    color *= 1.0 + HUM_BAR * sin((pos.y - t * 0.15) * 6.2831853 * 2.0);
    color *= 1.0 + FLICKER * sin(t * 47.0) * sin(t * 13.0);

    // glass: black level, soft reflection, vignette, rounded corners
    color += BLACK_LEVEL * vec3(0.8, 0.9, 1.0);
    color += REFLECTION * vec3(0.9, 0.95, 1.0)
        * smoothstep(0.55, 0.0, length((pos - vec2(0.22, 0.18)) * vec2(1.0, 1.6)));

    vec2 q = pos - 0.5;
    color *= (1.0 - VIGNETTE * dot(q, q) * 2.0) * Glass(pos);

    color = ToSrgb(max(color, 0.0));

    // a little extra colour, like the vivid phosphors of the time
    color = mix(vec3(dot(color, vec3(0.299, 0.587, 0.114))), color, SATURATION);

    // signal noise
    color += (Hash(uv * openfl_TextureSize.xy + fract(t) * 91.7) - 0.5) * GRAIN;

    vec4 source = flixel_texture2D(bitmap, uv);

    gl_FragColor = vec4(clamp(color, 0.0, 1.0), source.a);
}
