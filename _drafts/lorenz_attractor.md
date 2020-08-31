---
layout: post
title:  "Lorenz attractor with Python"
tags: [chaos, complex systems, complexity, data, math, matplotlib, modeling, numpy, python, science, theory, visualization]
excerpt: Our world is strange but if we look into some mathematical problems we can find that is even stranger than we thought before. One of this strange mathematical problems is the Lorenz system which we will solve using Euler method. 
---

{% include math-jax.html %}

Imagen a world were even the smallest butterfly can destroy the whole planet, it sounds ridicules, right. However, there may be some truth in that and in the mid-twentieth century, mathematician Edward Lorenz developed a simple mathematical model for describing atmospheric convection. The model contain a system of three ordinary differential equations which we now know as the Lorenz equations:

$$\begin{alignedat}{2}
    &\frac{dx}{dt} = \sigma (y - x)\\
    \\
    &\frac{dy}{dt} = x (\rho - z) - y\\
    \\
    &\frac{dz}{dt} = x y - \beta z
\end{alignedat}$$

These equations show us that if we change the initial conditions even a little bit, we will get a different output. Here is the tricky part the output will be fundamentally different not just closely related to the previews one. This behavior is called chaotic and this is the reason why many physical systems are fundamentally unpredictable. 

# Solving the Lorenz system
There are many methods to solve this system, some of them are easy other are extremely difficult. We will use the easiest one the Euler method. First we need to understand how the method is working. We'll use the equation: 

$$y'=y, \quad y(0)=1$$

The formula to solve this equation: 

$$y_{n+1} = y_n + hf(t_n,y_n)$$

where the step is equal to 1 $(h=1)$

$y_1 = y_0 + hf(y_0) = 1 + 1 \cdot 1 = 2$

$y_2 = y_1 + hf(y_1) = 2 + 1 \cdot 2 = 4$

$y_3 = y_2 + hf(y_2) = 4 + 1 \cdot 4 = 8$

$y_4 = y_3 + hf(y_3) = 8 + 1 \cdot 8 = 16$

Now we can apply the same method to the Lorenz system and find the numerical solution of the system.

{% highlight python %}
import numpy as np
import matplotlib.pyplot as plt
from mpl_toolkits.mplot3d import Axes3D
%matplotlib inline

sigma = 10
rho = 28
beta = 8/3

h = 0.01
t = 10000

x = np.empty(t+1)
y = np.empty(t+1)
z = np.empty(t+1)

x[0]=10
y[0]=10
z[0]=10

for i in range(t):        
    x[i+1] = x[i] + h*(sigma*(y[i] - x[i]))
    y[i+1] = y[i] + h*(x[i]*(rho - z[i]) - y[i])
    z[i+1] = z[i] + h*(x[i]*y[i] - beta*z[i])


fig = plt.figure(figsize=(12, 9))
ax = fig.gca(projection='3d')
ax.xaxis.set_pane_color((1,1,1,1))
ax.yaxis.set_pane_color((1,1,1,1))
ax.zaxis.set_pane_color((1,1,1,1))
ax.plot(x, y, z, color='g', alpha=0.7, linewidth=0.5)
ax.set_xlabel("X Axis")
ax.set_ylabel("Y Axis")
ax.set_zlabel("Z Axis")
{% endhighlight %}
![](/assets/lorenz_attractor.png)

It looks amazing and it wasn't so difficult. This looks great, however, it is static but we want to have some movement. Fortunately we can do it relatively easy and the result is astonishing.

![](/assets/lorenz_attractor_animation.gif)

To produce this gif image we needed 500 images which we combine with [Ezgif](https://ezgif.com/maker).

We saw that if we change the initial conditions we will get different output. If we play with $\rho$ and change the values we can produce many different outputs. Now you can understand why is chaotic, right.
![](/assets/lorenz_attractor_many.png)

# Sources:
[Lorenz system in Wikipedia](https://en.wikipedia.org/wiki/Lorenz_system)

[Lorenz Attractor in MathWorld](https://mathworld.wolfram.com/LorenzAttractor.html#:~:text=The%20Lorenz%20attractor%20is%20an,(1))

[Euler method](https://en.wikipedia.org/wiki/Euler_method#:~:text=In%20mathematics%20and%20computational%20science,with%20a%20given%20initial%20value.)