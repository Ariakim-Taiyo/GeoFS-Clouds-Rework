geofs = geofs || {};

geofs["atmosphereCommon.glsl"] = "" + "precision highp float;\n\nuniform float planetRadius;\n#ifdef VOLUMETRIC_CLOUDS\nconst float windSpeedRatio = 0.0002;\nuniform float cloudCover;\nuniform float cloudBase;\nuniform float cloudTop;\nuniform vec3 windVector;\n#ifdef REALTIME_CLOUDS\nuniform sampler2D coverageTexture;\n#endif\n#endif\n\n/*\n* Configuration\n*/\n#ifdef QUALITY_7\n\n#define PRIMARY_STEPS 16\n#define LIGHT_STEPS 4\n\n// This is only accessible from advanced settings\n#define CLOUDS_MAX_LOD 3\n#define MAXIMUM_CLOUDS_STEPS 100\n#define DISTANCE_QUALITY_RATIO 0.00003\n#define LIT_CLOUD\n#define CLOUD_SHADOWS\n\n#elif defined QUALITY_6\n\n#define PRIMARY_STEPS 16\n#define LIGHT_STEPS 4\n\n#define CLOUDS_MAX_LOD 3\n#define MAXIMUM_CLOUDS_STEPS 100\n#define DISTANCE_QUALITY_RATIO 0.00004\n#define LIT_CLOUD\n#define CLOUD_SHADOWS\n\n#elif defined QUALITY_5\n\n//#define PRIMARY_STEPS 12\n//#define LIGHT_STEPS 4\n#define PRIMARY_STEPS 9\n#define LIGHT_STEPS 3\n\n#define CLOUDS_MAX_LOD 3\n#define MAXIMUM_CLOUDS_STEPS 70\n#define DISTANCE_QUALITY_RATIO 0.00005\n#define LIT_CLOUD\n#define CLOUD_SHADOWS\n\n#elif defined QUALITY_4\n\n#define PRIMARY_STEPS 9\n#define LIGHT_STEPS 3\n\n#define CLOUDS_MAX_LOD 3\n#define MAXIMUM_CLOUDS_STEPS 50\n#define DISTANCE_QUALITY_RATIO 0.00007\n#define LIT_CLOUD\n#define CLOUD_SHADOWS\n\n#elif defined QUALITY_3\n\n#define PRIMARY_STEPS 6\n#define LIGHT_STEPS 2\n\n#define CLOUDS_MAX_LOD 2\n#define MAXIMUM_CLOUDS_STEPS 40\n#define DISTANCE_QUALITY_RATIO 0.0001\n#define CLOUD_SHADOWS\n\n#elif defined QUALITY_2\n\n#define PRIMARY_STEPS 4\n#define LIGHT_STEPS 1\n\n#define CLOUDS_MAX_LOD 2\n#define MAXIMUM_CLOUDS_STEPS 30\n#define DISTANCE_QUALITY_RATIO 0.0002\n#define CLOUD_SHADOWS\n\n#elif defined QUALITY_1\n\n#define PRIMARY_STEPS 3\n#define LIGHT_STEPS 1\n\n#define CLOUDS_MAX_LOD 2\n#define MAXIMUM_CLOUDS_STEPS 20\n#define DISTANCE_QUALITY_RATIO 0.0004\n\n#elif defined QUALITY_0\n\n#define PRIMARY_STEPS 0\n#define LIGHT_STEPS 0\n\n#define CLOUDS_MAX_LOD 0\n#define MAXIMUM_CLOUDS_STEPS 0\n#define DISTANCE_QUALITY_RATIO 0\n\n#else //DEFAULT\n\n#define PRIMARY_STEPS 9\n#define LIGHT_STEPS 2\n\n#define CLOUDS_MAX_LOD 2\n#define MAXIMUM_CLOUDS_STEPS 40\n#define DISTANCE_QUALITY_RATIO 0.0002\n#define CLOUD_SHADOWS\n\n#endif\n\n#define CLOUDS_DENS_MARCH_STEP 100.0\n#define CLOUDS_MAX_VIEWING_DISTANCE 250000.0\n\n/*\n* Utilities\n*/\n\n\n\n\n\nvec2 raySphereIntersect(vec3 r0, vec3 rd, float sr) {\nfloat a = dot(rd, rd);\nfloat b = 2.0 * dot(rd, r0);\nfloat c = dot(r0, r0) - (sr * sr);\nfloat d = (b * b) - 4.0 * a * c;\n\n// stop early if there is no intersect\nif (d < 0.0) return vec2(-1.0, -1.0);\n\n// calculate the ray length\nfloat squaredD = sqrt(d);\nreturn vec2(\n(-b - squaredD) / (2.0 * a),\n(-b + squaredD) / (2.0 * a)\n);\n}\n\n/*\n* Atmosphere scattering\n*/\n// Atmosphere by Dimas Leenman, Shared under the MIT license\n//https://github.com/Dimev/Realistic-Atmosphere-Godot-and-UE4/blob/master/godot/shader/atmosphere.shader\nvec3 light_intensity = vec3(100.0);//vec3(100.0); // how bright the light is, affects the brightness of the atmosphere\n//float planetRadius = 6361e3; // the radius of the planet\n//float atmo_radius = 6471e3; // the radius of the atmosphere\nfloat atmo_radius = planetRadius + 111e3;\nfloat realPlanetRadius = planetRadius + 10000.0;\nfloat atmo_radius_squared = atmo_radius * atmo_radius; // the radius of the atmosphere\nvec3 beta_ray = vec3(5.5e-6, 13.0e-6, 22.4e-6);//vec3(5.5e-6, 13.0e-6, 22.4e-6); // the amount rayleigh scattering scatters the colors (for earth: causes the blue atmosphere)\nvec3 beta_mie = vec3(21e-6); // vec3(21e-6);// the amount mie scattering scatters colors\nvec3 beta_ambient = vec3(0.0); // the amount of scattering that always occurs, can help make the back side of the atmosphere a bit brighter\nfloat g = 0.9; // the direction mie scatters the light in (like a cone). closer to -1 means more towards a single direction\nfloat height_ray = 10e3; // how high do you have to go before there is no rayleigh scattering?\nfloat height_mie = 3.2e3; // the same, but for mie\nfloat density_multiplier = 1.0; // how much extra the atmosphere blocks light\n\n#ifdef ADVANCED_ATMOSPHERE\nvec4 calculate_scattering(\nvec3 start, \t\t\t// the start of the ray (the camera position)\nvec3 dir, \t\t\t\t// the direction of the ray (the camera vector)\nfloat maxDistance, \t\t// the maximum distance the ray can travel (because something is in the way, like an object)\nvec3 light_dir\n) {\n\n// calculate the start and end position of the ray, as a distance along the ray\n// we do this with a ray sphere intersect\nfloat a = dot(dir, dir);\nfloat b = 2.0 * dot(dir, start);\nfloat c = dot(start, start) - atmo_radius_squared;\nfloat d = (b * b) - 4.0 * a * c;\n\n// stop early if there is no intersect\nif (d < 0.0) return vec4(0.0);\n\n// calculate the ray length\nfloat squaredD = sqrt(d);\nvec2 ray_length = vec2(\nmax((-b - squaredD) / (2.0 * a), 0.0),\nmin((-b + squaredD) / (2.0 * a), maxDistance)\n);\n\n// if the ray did not hit the atmosphere, return a black color\nif (ray_length.x > ray_length.y) return vec4(0.0);\n\n// prevent the mie glow from appearing if there's an object in front of the camera\nbool allow_mie = maxDistance > ray_length.y;\n// make sure the ray is no longer than allowed\n//ray_length.y = min(ray_length.y, maxDistance);\n//ray_length.x = max(ray_length.x, 0.0);\n\n// get the step size of the ray\nfloat step_size_i = (ray_length.y - ray_length.x) / float(PRIMARY_STEPS);\n\n// next, set how far we are along the ray, so we can calculate the position of the sample\n// if the camera is outside the atmosphere, the ray should start at the edge of the atmosphere\n// if it's inside, it should start at the position of the camera\n// the min statement makes sure of that\nfloat ray_pos_i = ray_length.x;\n\n// these are the values we use to gather all the scattered light\nvec3 total_ray = vec3(0.0); // for rayleigh\nvec3 total_mie = vec3(0.0); // for mie\n\n// initialize the optical depth. This is used to calculate how much air was in the ray\nvec2 opt_i = vec2(0.0);\n\n// also init the scale height, avoids some vec2's later on\nvec2 scale_height = vec2(height_ray, height_mie);\n\n// Calculate the Rayleigh and Mie phases.\n// This is the color that will be scattered for this ray\n// mu, mumu and gg are used quite a lot in the calculation, so to speed it up, precalculate them\nfloat mu = dot(dir, light_dir);\nfloat mumu = mu * mu;\nfloat gg = g * g;\nfloat phase_ray = 3.0 / (50.2654824574 ) * (1.0 + mumu);\n//float phase_mie = allow_mie ? 3.0 / (25.1327412287 ) * ((1.0 - gg) * (mumu + 1.0)) / (pow(1.0 + gg - 2.0 * mu * g, 1.5) * (2.0 + gg)) : 0.0;\n// allow some mie glow in front of horizon\n// this can be wierd looking through some mountains\nfloat phase_mie = (allow_mie ? 3.0 : 0.5 ) / (25.1327412287 ) * ((1.0 - gg) * (mumu + 1.0)) / (pow(1.0 + gg - 2.0 * mu * g, 1.5) * (2.0 + gg));\n\n// now we need to sample the 'primary' ray. this ray gathers the light that gets scattered onto it\nfor (int i = 0; i < PRIMARY_STEPS; ++i) {\n\n// calculate where we are along this ray\nvec3 pos_i = start + dir * (ray_pos_i + step_size_i);\n\n// and how high we are above the surface\nfloat height_i = length(pos_i) - planetRadius;\n\n// now calculate the density of the particles (both for rayleigh and mie)\nvec2 density = exp(-height_i / scale_height) * step_size_i;\n\n// Add these densities to the optical depth, so that we know how many particles are on this ray.\nopt_i += density;\n\n// Calculate the step size of the light ray.\n// again with a ray sphere intersect\n// a, b, c and d are already defined\na = dot(light_dir, light_dir);\nb = 2.0 * dot(light_dir, pos_i);\nc = dot(pos_i, pos_i) - atmo_radius_squared;\nd = (b * b) - 4.0 * a * c;\n\nif (d <= 0.0) d = 1.0; // not supposed to be required but this avoids the black singularity line at dusk and dawn\n\n// no early stopping, this one should always be inside the atmosphere\n// calculate the ray length\nfloat step_size_l = (-b + sqrt(d)) / (2.0 * a * float(LIGHT_STEPS));\n\n// and the position along this ray\n// this time we are sure the ray is in the atmosphere, so set it to 0\nfloat ray_pos_l = 0.0;\n\n// and the optical depth of this ray\nvec2 opt_l = vec2(0.0);\n\n// now sample the light ray\n// this is similar to what we did before\nfor (int l = 0; l < LIGHT_STEPS; ++l) {\n\n// calculate where we are along this ray\nvec3 pos_l = pos_i + light_dir * (ray_pos_l + step_size_l * 0.5);\n\n// the heigth of the position\nfloat height_l = length(pos_l) - planetRadius;\n\n// calculate the particle density, and add it\nopt_l += exp(-height_l / scale_height) * step_size_l;\n\n// and increment where we are along the light ray.\nray_pos_l += step_size_l;\n}\n\n// Now we need to calculate the attenuation\n// this is essentially how much light reaches the current sample point due to scattering\nvec3 attn = exp(-((beta_mie * (opt_i.y + opt_l.y)) + (beta_ray * (opt_i.x + opt_l.x))));\n\n// accumulate the scattered light (how much will be scattered towards the camera)\ntotal_ray += density.x * attn;\ntotal_mie += density.y * attn;\n\n// and increment the position on this ray\nray_pos_i += step_size_i;\n}\n\n// calculate how much light can pass through the atmosphere\nfloat opacity = length(exp(-((beta_mie * opt_i.y) + (beta_ray * opt_i.x)) * density_multiplier));\n\nreturn vec4((\nphase_ray * beta_ray * total_ray // rayleigh color\n+ phase_mie * beta_mie * total_mie // mie\n+ opt_i.x * beta_ambient // and ambient\n) * light_intensity, 1.0 - opacity);\n}\n#endif\n\n/*\n* Clouds rendering\n*/\n#ifdef VOLUMETRIC_CLOUDS\nfloat cloudBase_radius = (realPlanetRadius + cloudBase);\nfloat cloudBase_radius2 = (realPlanetRadius + cloudBase) + 5.0;\n\nfloat cloudThickness = (cloudTop - cloudBase);\nfloat cloudTop_radius = (cloudBase_radius + cloudThickness);\nfloat cloudTop_radius2 = (cloudBase_radius + cloudThickness) + 5.0;\n\nfloat layerPosition = 0.3; // set the layer base to 10% of the cloud height\nfloat baseThickness = cloudThickness * layerPosition;\n\nfloat layer = cloudBase + baseThickness;\n\n\nfloat twoPi = 6.2831853071795864769252;\n\nfloat hash(float p)\n{\n    p = fract(p * .1031);\n    p *= p + 33.33;\n    p *= p + p;\n    return fract(p);\n}\n\nfloat noise(in vec3 x) {\nvec3 p = floor(x);\nvec3 f = fract(x);\nf = f*f*(3.0 - 2.0*f);\n\nfloat n = p.x + p.y*157.0 + 113.0*p.z;\nreturn mix(mix(mix( hash(n+ 0.0), hash(n+ 1.0),f.x),\nmix( hash(n+157.0), hash(n+158.0),f.x),f.y),\nmix(mix( hash(n+113.0), hash(n+114.0),f.x),\nmix( hash(n+270.0), hash(n+271.0),f.x),f.y),f.z);\n}\n\n//no real reason to these values, just arbitrary numbers to add texture to clouds\nfloat noise2(in vec3 x) {\nvec3 p = floor(x);\nvec3 f = fract(x);\nf = f*f*(3.0 - 2.0*f);\n\nfloat n = p.x + p.y*157.0 + 113.0*p.z;\nreturn mix(mix(mix( hash(n+ 0.0), hash(n+ 1.0),f.x),\nmix( hash(n+147.0), hash(n+114.0),f.x),f.y),\nmix(mix( hash(n+123.0), hash(n+133.0),f.x),\nmix( hash(n+252.0), hash(n+212.0),f.x),f.y),f.z);\n}\n\nfloat fbm(\n\tvec3 pos,\n\tfloat lacunarity\n){\n\tvec3 p = pos;\n\tfloat\n\tt  = 0.51749673 * noise(p); p *= lacunarity;\n\tt += 0.25584929 * noise(p); p *= lacunarity;\n\tt += 0.12527603 * noise(p); p *= lacunarity;\n\tt += 0.06255931 * noise(p);\n\t\n\treturn t;\n}\n\n\nint lastFlooredPosition;\nfloat lastLiveCoverageValue = 0.0;\n\nfloat cloudDensity(vec3 p, vec3 offset, int lod) {\nfloat finalCoverage = cloudCover / 1.25;\n#ifdef REALTIME_CLOUDS\n\n//            //int flooredPosition = int(floor(dot(p, vec3(1.0)) / 10000.0));\n//            float factor = 50000.0;\n//            int flooredPosition = int(floor(p.x / factor)) + int(floor(p.y / factor)) + int(floor(p.z / factor));\n//            if (flooredPosition != lastFlooredPosition) {\n//                lastFlooredPosition = flooredPosition;\nvec3 sphericalNormal = normalize(p);\nvec2 positionSurfaceC = czm_ellipsoidWgs84TextureCoordinates(sphericalNormal);\nfloat sampledValue = texture2D(coverageTexture, positionSurfaceC).r;\nlastLiveCoverageValue = clamp((sampledValue - 0.3) * 10.0, 0.8, 1.0);\n//            }\n\n//float colpos = float(lastLiveCoverageValue);\n//loudBright = vec3(colpos, 0.0, 0.0);\n//cloudBright = vec3(noise(vec3(colpos)), noise(vec3(colpos * 0.1)), noise(vec3(colpos * 0.01)));\n\nfinalCoverage *= lastLiveCoverageValue;\n#endif\n\nif (finalCoverage <= 0.1) return 0.0;\n\nfloat height = length(p) - realPlanetRadius;\nfloat heightRatio;\nfloat positionResolution = 0.002;\np = p * positionResolution + offset;\n\nfloat shape = clamp(finalCoverage, 0.0, 10.0) + clamp(finalCoverage, 0.0, 10.0) * noise(p * 0.3);\n\nif (height > layer) {\nheightRatio = (height - layer) / (cloudThickness * (1.0 - layerPosition));\n}\nelse {\nheightRatio = (layer - height) / (cloudThickness * layerPosition);\n}\n\n//heightRatio *= noise(p * 0.1);\n\n// brownian noise\nfloat bn = fbm(p, 3.0);\nbn = mix(-1.5, bn, shape * shape) + 0.1;\n  \nif (height > 10000.0 && height < 10100.0) {\n  float dens = (bn / clamp(finalCoverage, 0.0, 10.0)) - (clamp(heightRatio,0.0, 1.0) * 0.01 * clamp(finalCoverage, 0.0, 10.0));\n  return sin(clamp((dens + bn), 0.0, 0.15) / finalCoverage);\n}\n\nfloat dens = (bn / finalCoverage) - (heightRatio * 4.2 * finalCoverage); // steepness of cloud border\n\n  \nreturn clamp(0.5 * (dens + bn), 0.0, 1.0);\n}\n#endif\n";

geofs['atmosphereOnlyFS.glsl'] = "" + 'precision highp float;\n\nuniform sampler2D colorTexture;\nuniform sampler2D depthTexture;\n#ifdef VOLUMETRIC_CLOUDS\nuniform sampler2D volumetricCloudsTexture;\n#endif\nuniform float backgroundFogDensity;\nuniform vec4 backgroundFogColor;\nuniform float volumetricFogDensity;\nuniform float volumetricFogBottom;\nuniform float volumetricFogTop;\nvarying vec2 v_textureCoordinates;\n\n//const float sunAngularDiameterCos = 0.99995;\n\nvoid main() {\n\nvec4 color = texture2D(colorTexture, v_textureCoordinates);\nvec4 rawDepthColor = texture2D(depthTexture, v_textureCoordinates);\n\n// lousy mobile GPU detection\n//#if !defined(GL_EXT_frag_depth)\nfloat depth = rawDepthColor.r;// depth packing algo appears to be buggy on mobile so only use the most significant element for now\n//#else\n//    float depth = czm_unpackDepth(rawDepthColor);\n//#endif\n\nvec4 positionEC = czm_windowToEyeCoordinates(gl_FragCoord.xy, depth);\nvec4 worldCoordinate = czm_inverseView * positionEC;\nvec3 vWorldPosition = worldCoordinate.xyz / worldCoordinate.w;\n\nvec3 posToEye = vWorldPosition - czm_viewerPositionWC;\nvec3 direction = normalize(posToEye);\nvec3 lightDirection = normalize(czm_sunPositionWC);\nfloat distance = length(posToEye);\n\nfloat elevation;\n//float sundisk = 0.0;\n\n#ifdef RETRO\n\n// preserve retro sun\nif (depth >= 0.9) {\n\ngl_FragColor = color;\nreturn;\n}\n#endif\n\nif (depth >= 1.0) {\n\n// out of earth surface\n/*\nfloat cosTheta = dot(direction, normalize(czm_sunPositionWC));\nsundisk = smoothstep(sunAngularDiameterCos, sunAngularDiameterCos + 0.02, cosTheta) * 500000.0;\ncolor += vec4(clamp(vec3(sundisk) * czm_lightColor, 0.0, 1.0), sundisk);\n*/\nelevation = length(czm_viewerPositionWC) - (realPlanetRadius);\n\n//distance = max(distance, 10000000.0); // max out the distance when looking at the sky to avoid clamp/arc artefact\n\n// try to simulate bilboard clouds depth mask based on color intensity\ndistance = 10000000.0 * (1.0 - min(0.5, length(color.rgb)));\n\n//color = clamp(color - vec4(czm_lightColor.z), 0.0, 1.0); // darken night sky proportionaly to sun intensity\n}\nelse {\nelevation = length(vWorldPosition) - (realPlanetRadius);\n}\n\n// Volumetric Fog\nfloat fragFogDensity;\nfragFogDensity = clamp((volumetricFogTop - elevation) / (volumetricFogTop - volumetricFogBottom), 0.0, 1.0) * volumetricFogDensity * depth; // volumetric\ncolor = mix(color, vec4(czm_lightColor, 1.0), clamp(fragFogDensity, 0.0, 1.0));\n\n#if defined(VOLUMETRIC_CLOUDS)\n\n\n\n#if defined(CLOUD_SHADOWS)\nfloat dens;\n  float dens2;\n// if this is ground and sun is up and ground is below cloud base\nif (depth < 1.0 && czm_lightColor.z > 0.15 && length(vWorldPosition) < cloudBase_radius + baseThickness) {\nvec3 wind = windVector * czm_frameNumber * windSpeedRatio;\nfloat mask = 1.0;\nvec2 toClouds = raySphereIntersect(vWorldPosition, -lightDirection, cloudBase_radius + baseThickness);\nvec3 position = vWorldPosition + (-lightDirection * toClouds.x);\n\n dens = cloudDensity(position, wind, 1);\n  dens2 = cloudDensity(czm_viewerPositionWC, wind, 1);\nmask = clamp(1.0 - dens, 0.4, 1.0);\ncolor *= mask;\n}\n\n// this whole section is not needed\n  /*\nfloat depthMaskDistance = 0.5 / clamp(dens2 * 2.25, 1.0, 1000.0);\nif (length(czm_viewerPositionWC) < cloudBase_radius) {\ndepthMaskDistance = 0.9 / clamp(dens2 * 2.2, 1.0, 1000.0); // try to include distant trees and object in the mask\n\n}\n  */\n#endif\n#endif\n\n#ifdef ADVANCED_ATMOSPHERE\n\n// atmosphere scattering\nvec4 atmosphereColor = calculate_scattering(\nczm_viewerPositionWC,\ndirection,\ndistance,\nlightDirection\n);\n/*\nif (color.r < 0.5 && color.g > 0.5 && color.b < 0.5) {\ncolor = (atmosphereColor * (1.0 - color.g)) + color;\n}\nelse {\n*/\n\ncolor = atmosphereColor + color * (1.0 - atmosphereColor.a);\n\n// tone mapping\nfloat exposure = 1.0;\ncolor = vec4(1.0 - exp(-exposure * color));\nfloat gamma = 0.8;\ncolor = pow(color, vec4(1.0 / gamma));\n\n#endif\n\n#ifdef VOLUMETRIC_CLOUDS\n// mix in scene+atmosphere and clouds\nvec4 clouds = texture2D(volumetricCloudsTexture, v_textureCoordinates);\n//color = mix(color, clouds, clouds.a * clouds.a * clamp((depth - depthMaskDistance) * 100.0, 0.0, 1.0));\n  color = mix(color, clouds, clouds.a);\n#endif\n\n// background fog (used for precipitation)\nfloat backFogDensity;\nbackFogDensity += backgroundFogDensity * depth;\ncolor = mix(color, vec4(backgroundFogColor.rgb, 1.0), clamp(backFogDensity, 0.0, 1.0));\n\ngl_FragColor = color;\n}\n';

geofs['volumetricCloudsFS.glsl'] = "" + "precision highp float;\n\nuniform sampler2D colorTexture;\nuniform sampler2D depthTexture;\nuniform sampler2D noiseTexture;\nvarying vec2 v_textureCoordinates;\n\n/*\n* Volumetric clouds\n* inspired by works from\n* https://www.iquilezles.org/www/articles/derivative/derivative.htm\n* https://www.shadertoy.com/view/XtBXDw\n* https://blog.uhawkvr.com/rendering/rendering-volumetric-clouds-using-signed-distance-fields/\n* https://shaderbits.com/blog/creating-volumetric-ray-marcher\n*/\nvec3 cloudDark = vec3(0.4,0.6,0.8); //vec3(0.25,0.3,0.35)\nvec3 cloudBright = vec3(0.9, 0.95, 1.0); //vec3(1.0,0.95,0.8)\nfloat distanceQualityR = 0.00005; // LOD/quality ratio\nfloat minDistance = 10.0; // avoid cloud in cockpit\n/*\nvec4 white = vec4(1.0, 1.0, 1.0, 1.0);\nvec4 red = vec4(1.0, 0.0, 0.0, 1.0);\nvec4 green = vec4(0.0, 1.0, 0.0, 1.0);\nvec4 blue = vec4(0.0, 0.0, 1.0, 1.0);\n*/\nvec4 calculate_clouds(\nvec3 start,\nvec3 dir,\nfloat maxDistance,\nvec3 light_dir,\nfloat depth,\nvec3 wind,\nvec4 atmosphereAtDistance\n) {\n\nvec4 cloud = vec4(0.0, 0.0, 0.0, 1.0);\n\nvec2 toTop = raySphereIntersect(start, dir, cloudTop_radius);\nvec2 toCloudBase = raySphereIntersect(start, dir, cloudBase_radius);\n\nfloat startHeight = length(start) - realPlanetRadius;\n\n// limit viewing distance based on height from cloud top\nfloat absoluteMaxDistance = CLOUDS_MAX_VIEWING_DISTANCE;\n\nif (startHeight > layer) {\nabsoluteMaxDistance = clamp(5000.0 + pow(startHeight - layer, 1.5), 5000.0, CLOUDS_MAX_VIEWING_DISTANCE);\n}\nelse {\nabsoluteMaxDistance = clamp(5000.0 + pow(layer - startHeight, 1.9), 5000.0, CLOUDS_MAX_VIEWING_DISTANCE);\n//absoluteMaxDistance = CLOUDS_MAX_VIEWING_DISTANCE;\n}\n\nfloat tmin = minDistance;\nfloat tmax = maxDistance;\n\nif (startHeight > cloudTop) {\n// above clouds\n//cloudBright = vec3(1.0, 0.0, 0.0);\n//if (toTop.x < 0.0) return vec4(0.0); // no intersection with cloud layer\n// there is a result error in depth/distance calculation at high POV\n// which makes tmax to be lower than expected\n//tmin = toTop.x;\n\n\n}\nelse if (startHeight < cloudBase) {\n// below clouds\n//cloudBright = vec3(0.0, 0.0, 1.0);\ntmin = toCloudBase.y;\ntmax = min(toTop.y, maxDistance);\n\n//absoluteMaxDistance = CLOUDS_MAX_VIEWING_DISTANCE;\n}\nelse {\n// inside clouds\n//cloudBright = vec3(0.0, 1.0, 0.0);\nif (toCloudBase.x > 0.0) {\ntmax = min(toCloudBase.x, maxDistance);\n}\nelse {\ntmax = min(toTop.y, maxDistance);\n}\n}\n\ntmin = 0.0;\ntmax = min(tmax, absoluteMaxDistance);\n\nif (tmax < tmin) return vec4(0.0); // object obstruction\n\nfloat rayLength = tmax - tmin;\n\nfloat minMarchStep = rayLength / float(MAXIMUM_CLOUDS_STEPS);\nminMarchStep = max(minMarchStep, CLOUDS_DENS_MARCH_STEP);\n\nfloat ditherAmount = texture2D(noiseTexture, mod(gl_FragCoord.xy / 512.0, 1.0)).r;\nfloat ditherDistance = ditherAmount * minMarchStep;\n\nfloat distance = tmin + ditherDistance;\nfloat dens = 0.0;\nfloat marchStep;\n\nfor (int i = 0; i < MAXIMUM_CLOUDS_STEPS; i++) {\nvec3 position = start + dir * distance;\nint qualityRatio = int(distance * distanceQualityR);\nint lod = CLOUDS_MAX_LOD - qualityRatio;\n\ndens = cloudDensity(position, wind, lod);\n/*\nif (lod <= 1) {\ncloudBright = vec3(1.0, 0.0, 0.0);\n}\nif (lod == 2) {\ncloudBright = vec3(0.0, 1.0, 0.0);\n}\nif (lod == 3) {\ncloudBright = vec3(0.0, 0.0, 1.0);\n}\nif (lod == 4) {\ncloudBright = vec3(0.0, 0.5, 1.0);\n}\n*/\n\nmarchStep = minMarchStep;\n\nif(dens > 0.0) {\n\nmarchStep = CLOUDS_DENS_MARCH_STEP;\n\n#ifdef LIT_CLOUD\n// lit\nfloat dist = 100.0;\nfloat lightColor = clamp((dens - (cloudDensity(position + dist * light_dir, wind, lod))) / dist, 0.0, 1.0) * 250.0 + 0.7;\nvec4 densColor = vec4(mix(cloudDark, cloudBright, 0.1), dens);\ndensColor.xyz *= lightColor;\n#else\n/*\n// An attempt at continuous surface normal integration\nfloat lighting = 0.8 - clamp((dens - lastDensity) * 10.0, 0.0, 1.0) * dot(dir, light_dir);\n//vec4 densColor = vec4(lighting, 0.0, 0.0, 1.0);\nvec4 densColor = vec4(mix(cloudDark, cloudBright, lighting), dens);\nlastDensity = dens;\n*/\n\n// unlit\nvec4 densColor = vec4(mix(cloudDark + czm_lightColor, cloudBright, dens), dens);\n#endif\n\n  //self shadowing\n float shadowMp;\nfloat SHADOW_STEP_SIZE = 20.0;\nconst int SHADOW_STEPS = 2;\nfloat shadowDist = 150.0; // offset so clouds don't detect themselves\n  for (int S = 0; S < SHADOW_STEPS; ++S) {\n    vec3 sp = position + shadowDist * light_dir;\n    if (cloudDensity(sp, wind, lod) > 0.0) {\n      shadowMp = 1.0;\n      break;\n    }\n    else {\n      shadowMp = 0.1;\n    }\n    shadowDist += SHADOW_STEP_SIZE;\n  }\n  float opacityMp;\n  if (position.z - realPlanetRadius > 1000.0) {\n    opacityMp = 0.1;\n  }\n  else {\n    opacityMp = 1.0;\n  }\ndensColor.rgb *= densColor.a;\ncloud.rgb += (densColor.rgb * cloud.a) / shadowMp;\ncloud.a *= 1.05 - densColor.a;\n\n//rough AO approximation\nfloat ao = 1.0 - float(i) / (float(distance) - 1.0);\ncloud.rgb *= ao * 0.99;\ncloud.a *= ao;\ncloud.rgb *= opacityMp;\ncloud.a *= opacityMp;\n\n/*\n//Phys based integration\n//float dist = 100.0;\nfloat deltaNorm = clamp((dens - (cloudDensity(position + dist * light_dir, wind, lod))) / dist, 0.0, 1.0) * 1000.0;\nlightColor = mix(cloudDark, cloudBright, deltaNorm);\n\ndens *= 0.01;\nvec3 light = czm_lightColor * lightColor * 1.0;\ncloud.a *= exp(-dens * marchStep);\ndensColor = dens * light * cloud.a * marchStep;\ndensColor = mix(densColor, atmosphereAtDistance.rgb, distance / 250000.0);\ncloud.rgb += densColor;\n*/\n// stop marching when fully opaque\nif (cloud.a < 0.1) {\ncloud.a = 0.0;\nbreak;\n}\n}\n\ndistance += marchStep;\n\n  if (distance > tmax) {\n    break;\n  }\n}\n\ncloud.a = (1.0 - cloud.a);\nreturn cloud;\n}\n\nvoid main() {\n\nvec4 color = vec4(0.0);\n\nif (cloudCover < 0.1) {\ngl_FragColor = color;\nreturn;\n}\n\n//vec4 rawDepthColor = texture2D(depthTexture, v_textureCoordinates);\nvec4 rawDepthColor = texture2D(depthTexture, v_textureCoordinates);\n\n// lousy mobile GPU detection\n\n#if !defined(GL_EXT_frag_depth)\nfloat depth = rawDepthColor.r; // depth packing algo appears to be buggy on mobile so only use the most significant element for now\n#else\nfloat depth = czm_unpackDepth(rawDepthColor);\n#endif\n/* not needed, using integrated depth tex\n// czm_globeDepthTexture is 0 above horizon\nif (depth == 0.0) {\ndepth = 1.0;\n}\n*/\n\n#ifdef VOLUMETRIC_CLOUDS\n\nvec4 positionEC = czm_windowToEyeCoordinates(gl_FragCoord.xy, depth);\nvec4 worldCoordinate = czm_inverseView * positionEC;\nvec3 vWorldPosition = worldCoordinate.xyz / worldCoordinate.w;\n\nvec3 posToEye = vWorldPosition - czm_viewerPositionWC;\nvec3 direction = normalize(posToEye);\nvec3 lightDirection = normalize(czm_sunPositionWC);\nfloat distance = length(posToEye);\n/*\n// fix rounding errors in distance calculation above horizon\nif (depth == 1.0) {\ndistance = CLOUDS_MAX_VIEWING_DISTANCE;\n}\n*/\nvec3 wind = windVector * czm_frameNumber * windSpeedRatio;\n\n// compute a generic atmosphere color to blend in along distance\nvec4 atmosphereAtDistance = calculate_scattering(\nczm_viewerPositionWC, // the position of the camera\ndirection, // the camera vector (ray direction of this pixel)\n250000.0, // > 250000 creates a singularity at vertical down view\nlightDirection\n);\n\n// render clouds\nvec4 cloudColor = calculate_clouds(\nczm_viewerPositionWC, // the position of the camera\ndirection, // the camera vector (ray direction of this pixel)\ndistance, // max dist, essentially the scene depth\nlightDirection, // light direction\ndepth,\nwind,\natmosphereAtDistance\n);\n\nfloat toneMappingFix = 3.0; // compensate for tone mapping\n\ncolor = vec4(sqrt(cloudColor.rgb) * toneMappingFix * czm_lightColor, cloudColor.a);\n//color.rgb += atmosphereAtDistance.rgb * (1.0 - color.a);\ncolor.rgb = mix(atmosphereAtDistance.rgb, color.rgb, cloudColor.a);\n\n// tone mapping (mecessary for atmosphere correction\nfloat exposure = 1.0;\ncolor.rgb = vec3(1.0 - exp(-exposure * color.rgb));\nfloat gamma = 0.8;\ncolor.rgb = pow(color.rgb, vec3(1.0 / gamma));\n\n#endif\ngl_FragColor = color;\n}\n";

geofs["denoise.glsl"] = "" + 'uniform sampler2D colorTexture;\nvarying vec2 v_textureCoordinates;\n#define SAMPLES 80  // HIGHER = NICER = SLOWER\n#define DISTRIBUTION_BIAS 0.6 // between 0. and 1.\n#define PIXEL_MULTIPLIER  1.5 // between 1. and 3. (keep low)\n#define INVERSE_HUE_TOLERANCE 20.0 // (2. - 30.)\n\n#define GOLDEN_ANGLE 2.3999632 //3PI-sqrt(5)PI\n\n#define pow(a,b) pow(max(a,0.),b) // @morimea\n\nmat2 sample2D = mat2(cos(GOLDEN_ANGLE),sin(GOLDEN_ANGLE),-sin(GOLDEN_ANGLE),cos(GOLDEN_ANGLE));\n\nvec3 sirBirdDenoise(sampler2D imageTexture, in vec2 uv, in vec2 imageResolution) {\n    \n    vec3 denoisedColor           = vec3(0.0);\n    \n    const float sampleRadius     = sqrt(float(SAMPLES));\n    const float sampleTrueRadius = 0.5/(sampleRadius*sampleRadius);\n    vec2        samplePixel      = vec2(1.0/imageResolution.x,1.0/imageResolution.y); \n    vec3        sampleCenter     = texture2D(imageTexture, uv).rgb;\n    vec3        sampleCenterNorm = normalize(sampleCenter);\n    float       sampleCenterSat  = length(sampleCenter);\n    \n    float  influenceSum = 0.0;\n    float brightnessSum = 0.0;\n    \n    vec2 pixelRotated = vec2(0.,1.);\n    \n    for (float x = 0.0; x <= float(SAMPLES); x++) {\n        \n        pixelRotated *= sample2D;\n        \n        vec2  pixelOffset    = PIXEL_MULTIPLIER*pixelRotated*sqrt(x)*0.5;\n        float pixelInfluence = 1.0-sampleTrueRadius*pow(dot(pixelOffset,pixelOffset),DISTRIBUTION_BIAS);\n        pixelOffset *= samplePixel;\n            \n        vec3 thisDenoisedColor = \n            texture2D(imageTexture, uv + pixelOffset).rgb;\n\n        pixelInfluence      *= pixelInfluence*pixelInfluence;\n        /*\n            HUE + SATURATION FILTER\n        */\n        pixelInfluence      *=   \n            pow(0.5+0.5*dot(sampleCenterNorm,normalize(thisDenoisedColor)),INVERSE_HUE_TOLERANCE)\n            * pow(1.0 - abs(length(thisDenoisedColor)-length(sampleCenterSat)),8.);\n            \n        influenceSum += pixelInfluence;\n        denoisedColor += thisDenoisedColor*pixelInfluence;\n    }\n    \n    return denoisedColor/influenceSum;\n    \n}\n\nvoid main() {\n  gl_FragColor = vec4(sirBirdDenoise(colorTexture, v_textureCoordinates, vec2(czm_viewport.z, czm_viewport.w)), 1.0);\n}';

geofs.fx.atmosphere.destroy();
geofs.fx.atmosphere.create();
