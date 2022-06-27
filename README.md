# GeoFS-Clouds-Rework
Experimental clouds shader for GeoFS 3.3, still not entirely finished. <br>


**Installation**:<br>
Copy the contents of `index.js` into the console and press enter. You may have to adjust a setting on the graphic panel to initialize the shaders.



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


Also, it's kind of obvious, but this only works on 3.3 beta.


**Gallery**:

<img width="1358" alt="Screen Shot 2022-06-27 at 5 39 42 PM" src="https://user-images.githubusercontent.com/79466778/176040802-d439dbbd-17cf-48c1-b871-cf9aca3c1b1f.png">
<img width="824" alt="Screen Shot 2022-06-27 at 5 40 51 PM" src="https://user-images.githubusercontent.com/79466778/176040830-d1edd1b3-c1d0-43c7-be30-7301a3c29fce.png">
<img width="765" alt="Screen Shot 2022-06-27 at 5 41 29 PM" src="https://user-images.githubusercontent.com/79466778/176040840-602a9989-9f68-4c56-b213-2d9d14913542.png">

