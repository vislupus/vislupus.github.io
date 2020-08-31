---
layout: post
title:  "Sudoku generator"
tags: [sudoku, python, algorithm]
excerpt: This is my awesome writeup of this fantastic thing
---

# Introduction
As a many scientist I've always been fascinated with the solving puzzles. One of my favorite is **sudoku**, which is strangely complicated. 
Before we start with the coding, it'll be interesting to look of a peculiar origin of the puzzle. Modern sudoku became popular after it was published in magazine Nikoli by Maki Kaji in year 1984. The name of the puzzle is abbreviation of "the digits must be single" or "the digits are limited to one occurrence". It sounds vary familiar, right. However, the real origin in the late 19th century where version of the puzzle was published as type of magic square, but in reality is a Latin square. The possible combination of which is astonishingly big number **5,524,751,496,156,892,842,531,225,600** or **5.5e+27**, which is a huge number. However, the difference between the latin square and the sudoku is in that sudoku has additional property of no repeated values in any of the nine blocks (or boxes of 3×3 cells). Because of this new condition the possible combination drop down to only **6,670,903,752,021,072,936,960** or **6.6e+21** which is still a huge but it is a lot smaller then the previous number. 
Why am I talking so much about numbers? It is because we will see that there are too many possible combination of latin squares but not enough of valid sudoku boards, and a lot of the time we will have problem with creating not valid sudoku boards. 

# Planing the algorithm


# First step

{% highlight python %}

def print_hi(name)
	print("Hi",name)

{% endhighlight %}

# Second step

# Evaluation

{% highlight python %}

{% endhighlight %}

worked: 193
wrong: 807
time: 0.011415155440414508

max time: 0.171875
min time: 0.0
average time: 0.0313125

time: 0.015625

3 1 5 | 9 8 4 | 2 7 6 
7 2 6 | 5 1 3 | 4 8 9 
8 4 9 | 6 7 2 | 1 5 3 
---------------------
4 6 2 | 3 5 9 | 8 1 7 
5 7 8 | 2 6 1 | 3 9 4 
1 9 3 | 7 4 8 | 6 2 5 
---------------------
2 3 1 | 4 9 7 | 5 6 8 
6 8 7 | 1 3 5 | 9 4 2 
9 5 4 | 8 2 6 | 7 3 1 

{% highlight python %}
import random
import time

data = {}

def sudoku():
    for i in range(100):
        try:
            for i in range(81):
                data[i]={'index':i,
                         'col':i%9,
                         'row':i//9,
                         'value':0,
                         'box':i//3 - 3*(i//9 - (i//9)//3),
                         'pos':[1,2,3,4,5,6,7,8,9],
                         'state':'ready'}


            def removeOther(r,c,b,n):
                for i in range(81):
                    if (len(data[i]['pos']) > 0) and (n in data[i]['pos']):
                        if(data[i]['row']==r) or (data[i]['col']==c) or (data[i]['box']==b):
                            data[i]['pos'].remove(n)

            def check():
                for i in range(81):
                    if (len(data[i]['pos']) < 2) and (len(data[i]['pos']) > 0) and (data[i]['state'] == 'ready'):
                        data[i]['value']=random.choice(data[i]['pos'])
                        data[i]['state']='checked'
                        removeOther(data[i]['row'], data[i]['col'], data[i]['box'], data[i]['value'])


            for i in range(81):
                if data[i]['state'] == 'ready':
                    data[i]['value']=random.choice(data[i]['pos'])
                    data[i]['state']='checked'
                    removeOther(data[i]['row'], data[i]['col'], data[i]['box'], data[i]['value'])
                    check()

            break

        except:
            pass


        
start = time.process_time()
sudoku()
end=(time.process_time() - start)
print(f"\ntime: {end}\n")
    

def draw(text):
    demo=''
    m=0
    for r in range(9):
        for n in range(9):
            m=f"{str(data[n+9*r][text])}"
            if n%3==2 and n%9!=8:
                demo += m+" | "
            else:
                demo += m+" "

        demo += "\n"
        if r%3==2 and r%9!=8:
            demo += "---------------------\n"

    return print(demo)

draw('value')
{% endhighlight %}


1: 0.0 s
50: 0.421875 s
100: 1.0 s
300: 2.546875 s
500: 4.34375 s
700: 5.9375 s
1000: 8.4375 s

![](/assets/sudoku.png)

# Sources
[Sudoku](https://en.wikipedia.org/wiki/Sudoku)
[Mathematics of Sudoku](https://en.wikipedia.org/wiki/Mathematics_of_Sudoku)
[Latin square](https://en.wikipedia.org/wiki/Latin_square)
[The Science behind Sudoku](https://www.cs.utexas.edu/~kuipers/readings/Sudoku-sciam-06.pdf)
['Father of Sudoku' puzzles next move](http://news.bbc.co.uk/2/hi/asia-pacific/6745433.stm)

