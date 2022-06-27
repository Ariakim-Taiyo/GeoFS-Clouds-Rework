# GeoFS-Clouds-Rework
Experimental clouds shader for GeoFS 3.3, still not entirely finished. <br>
**Features**:<br>
Reworked shading: *Self-shadowing, Ambient occlusion, Object occlusion, experimental cloud layers, modified noise functions.*<br>


**Known Bugs**:<br>
Upper cloud layer does not render when aircraft is below horizon,<br>
Depth buffer is blurred by a previous shader, causing a "halo" around aircraft,<br>
Cloud volume penetrates the cockpit view,<br>
Fake light scattering looks fake,<br>
Clouds "glow" at night.


**IMPORTANT!!**<br>
Although I have tried to optimize the shaders, The nature of some of the effects can cause significant lag on lower end devices. I would not recommend setting the volumetric quality past 3 on Chromebooks, mobile devices, and low end integrated gpus. These shaders have been tested with AMD, NVIDIA, and Apple M1 devices and are compatible with them. The shaders will likely break on mobile devices such as smartphones and possibly tablets. Most of the shader code is still very similar to the original, with minor changes. It is also very messy, so good luck reading through it.
