---
layout: post
title:  "Distribution of astronauts among zodiac signs"
tags: [zodiac sign, python, analyses]
excerpt: This is my awesome writeup of this fantastic thing
---

Ones, I've disused with a friend, possibility of predicting parson occupation only by his zodiac sign. I've already knew that there is correlation between birth month and the characteristic of a parson and probably there will be some connection between sign a occupation, but I need data to see that. My expectation was that every zodiac sign is randomly distributed and there will be no connection between them. I'll show you how to make it yourself.

# Collecting data
First we need some data which must contain the date of the birth and also the occupation of some people. The perfect place for this kind of data is [Wikipedia](https://www.wikipedia.org/) and more specifically [Wikidata](https://www.wikidata.org/wiki/Wikidata:Main_Page). Because, the data there is free and also is very easy to search with they're tool, called [Wikidata Query Service](https://query.wikidata.org/). The language that is used there is very similar to the normal SQL. Typically the data is well organized and with almost no effort is ready to use. I'll search for astronauts which id is Q11631 with the example code below. 
	
{% highlight sparql %}

SELECT ?personLabel ?birth ?death ?age ?genderLabel WHERE {
	?person wdt:P31 wd:Q5.
	?person wdt:P106 wd:Q11631.
	?person wdt:P569 ?birth.
	?person wdt:P21 ?gender
	
	OPTIONAL {?person wdt:P570 ?death.}
	
	BIND((YEAR(?death)) - (YEAR(?birth)) AS ?age)
	
	SERVICE wikibase:label { bd:serviceParam wikibase:language "en". } 
}

{% endhighlight %}

Unfortunately the data from Wikidata is not always as clean as it should be and we need some time to cleaned and prepared it for the next step.

# Cleaning the data

First we need to import some libraries like *pandas*, *numpy*, *matplotlib*, and *seaborn*. After that is time for the dataset which name is **cosmonauts.csv**.  

{% highlight python %}
import matplotlib.pyplot as plt
import seaborn as sns
import pandas as pd
import numpy as np
import re

%matplotlib inline
sns.set(style="whitegrid")
sns.set_color_codes("pastel")

occupation_data = pd.read_csv('cosmonauts.csv', parse_dates=True)
occupation_data.head()
{% endhighlight %}

We know that the rows are 749, however, the unique values are only 741, so there are 8 duplicated values. We can see them with the code below:

{% highlight python %}
occupation_data[occupation_data['personLabel'].duplicated() == True]
{% endhighlight %}

To drop the unnecessary rows we can use the code:

{% highlight python %}
occupation_data = occupation_data.drop([290, 291, 292, 589, 631, 729, 490, 484])
occupation_data.reset_index(drop=True, inplace=True)
{% endhighlight %}

Now we are ready with this step and we can continue with the analyses.

# Analysing the data

We know that the dataset squaed and the most of the people are men. To see exactly how many men and women are in the dataset we must group them to gender column.
{% highlight python %}
gender_data=occupation_data.groupby('genderLabel').count().reset_index()

f, ax = plt.subplots(figsize=(16, 6))

ax = sns.barplot(x='genderLabel', y='personLabel', data=gender_data, color="b", ci=None)

ax.set_xlabel('Gender')
ax.set_ylabel('Count')
{% endhighlight %}
![](/assets/gender.png)

The result is not unexpected, because of the job nature:
* male astronauts are 649 or 87.58%
* female astronauts are 91 or 12.28%
* other astronauts are 1 or 0.13%

We can continue by dividing the date of the birth to three separate columns *Day*, *Month* and *Year*, which we'll use to determinate the zodiac sign.

{% highlight python %}
for i in range(occupation_data.shape[0]):
	try:
		matches = re.match(r"(\d{4})-(\d{2})-(\d{2})", occupation_data.loc[i,'birth'])
		occupation_data.loc[i,'Day']=int(matches[3])
		occupation_data.loc[i,'Month']=int(matches[2])
		occupation_data.loc[i,'Year']=int(matches[1])
	except:
		pass
	
occupation_data[['Day', 'Month', 'Year']] = occupation_data[['Day', 'Month', 'Year']].astype('int32')
{% endhighlight %}

Columns are ready and we can proceed with adding two columns *SignLabel* and *SignN* which will be very useful when we start making graphics. Also is important to follow the periods of every sign.
* ♈	Aries - March 21 – April 20
* ♉	Taurus - April 21 – May 21
* ♊	Gemini - May 22 – June 21
* ♋	Cancer - June 22 – July 22
* ♌	Leo - July 23 – August 22
* ♍	Virgo - August 23 – September 23
* ♎	Libra - September 24 – October 23
* ♏	Scorpio - October 24 – November 22
* ♐	Sagittarius - November 23 – December 21
* ♑ Capricorn - December 22 – January 20
* ♒ Aquarius - January 21 – February 19
* ♓	Pisces - February 20 – March 20

{% highlight python %}
for i in range(occupation_data.shape[0]):
	if occupation_data.loc[i,'Month']==1:
		if occupation_data.loc[i,'Day']>=21:
			occupation_data.loc[i,'SignLabel']='Aquarius'
			occupation_data.loc[i,'SignN']=11
		else:
			occupation_data.loc[i,'SignLabel']='Capricorn'
			occupation_data.loc[i,'SignN']=10

	elif occupation_data.loc[i,'Month']==2:
		if occupation_data.loc[i,'Day']>=20:
			occupation_data.loc[i,'SignLabel']='Pisces'
			occupation_data.loc[i,'SignN']=12
		else:
			occupation_data.loc[i,'SignLabel']='Aquarius'
			occupation_data.loc[i,'SignN']=11

	elif occupation_data.loc[i,'Month']==3:
		if occupation_data.loc[i,'Day']>=21:
			occupation_data.loc[i,'SignLabel']='Aries'
			occupation_data.loc[i,'SignN']=1
		else:
			occupation_data.loc[i,'SignLabel']='Pisces'
			occupation_data.loc[i,'SignN']=12

	elif occupation_data.loc[i,'Month']==4:
		if occupation_data.loc[i,'Day']>=21:
			occupation_data.loc[i,'SignLabel']='Taurus'
			occupation_data.loc[i,'SignN']=2
		else:
			occupation_data.loc[i,'SignLabel']='Aries'
			occupation_data.loc[i,'SignN']=1

	elif occupation_data.loc[i,'Month']==5:
		if occupation_data.loc[i,'Day']>=22:
			occupation_data.loc[i,'SignLabel']='Gemini'
			occupation_data.loc[i,'SignN']=3
		else:
			occupation_data.loc[i,'SignLabel']='Taurus'
			occupation_data.loc[i,'SignN']=2
			
	elif occupation_data.loc[i,'Month']==6:
		if occupation_data.loc[i,'Day']>=22:
			occupation_data.loc[i,'SignLabel']='Cancer'
			occupation_data.loc[i,'SignN']=4
		else:
			occupation_data.loc[i,'SignLabel']='Gemini'
			occupation_data.loc[i,'SignN']=3
			
	elif occupation_data.loc[i,'Month']==7:
		if occupation_data.loc[i,'Day']>=23:
			occupation_data.loc[i,'SignLabel']='Leo'
			occupation_data.loc[i,'SignN']=5
		else:
			occupation_data.loc[i,'SignLabel']='Cancer'
			occupation_data.loc[i,'SignN']=4
			
	elif occupation_data.loc[i,'Month']==8:
		if occupation_data.loc[i,'Day']>=23:
			occupation_data.loc[i,'SignLabel']='Virgo'
			occupation_data.loc[i,'SignN']=6
		else:
			occupation_data.loc[i,'SignLabel']='Leo'
			occupation_data.loc[i,'SignN']=5
			
	elif occupation_data.loc[i,'Month']==9:
		if occupation_data.loc[i,'Day']>=24:
			occupation_data.loc[i,'SignLabel']='Libra'
			occupation_data.loc[i,'SignN']=5
		else:
			occupation_data.loc[i,'SignLabel']='Virgo'
			occupation_data.loc[i,'SignN']=6
			
	elif occupation_data.loc[i,'Month']==10:
		if occupation_data.loc[i,'Day']>=24:
			occupation_data.loc[i,'SignLabel']='Scorpio'
			occupation_data.loc[i,'SignN']=8
		else:
			occupation_data.loc[i,'SignLabel']='Libra'
			occupation_data.loc[i,'SignN']=7
			
	elif occupation_data.loc[i,'Month']==11:
		if occupation_data.loc[i,'Day']>=23:
			occupation_data.loc[i,'SignLabel']='Sagittarius'
			occupation_data.loc[i,'SignN']=9
		else:
			occupation_data.loc[i,'SignLabel']='Scorpio'
			occupation_data.loc[i,'SignN']=8
			
	elif occupation_data.loc[i,'Month']==12:
		if occupation_data.loc[i,'Day']>=21:
			occupation_data.loc[i,'SignLabel']='Capricorn'
			occupation_data.loc[i,'SignN']=10
		else:
			occupation_data.loc[i,'SignLabel']='Sagittarius'
			occupation_data.loc[i,'SignN']=9

occupation_data["SignN"] = occupation_data['SignN'].astype('int32')
{% endhighlight %}

Before we continue with the plotting the zodiac signs it's important to stop and think for a moment about the distribution. We can see from the graphic below that distribution is Gaussian and with this we can expect that there won't be any significant difference between this and day or month distribution.

{% highlight python %}
f, ax = plt.subplots(figsize=(16, 6))

sns.distplot(sign_data['SignN'], bins=5, kde=True, rug=True)
{% endhighlight %}
![](/assets/sign_his.png)

We can see how are distributed the people among the zodiac signs with this code below.

{% highlight python %}
f, ax = plt.subplots(figsize=(16, 6))

ax = sns.barplot(x='SignLabel', y='SignN', data=sign_data, color="b", ci=None)
ax.set_xticklabels(sign_data['SignLabel'], rotation = 45, ha="right")

mean=sign_data['SignN'].mean()
ax.axhline(mean, color='k', linestyle='--')

median=sign_data['SignN'].median()
ax.axhline(median, color='g', linestyle='--')

mode=sign_data['SignN'].mode()[0]
ax.axhline(mode, color='r', linestyle='--')

plt.legend({f'Mean - {mean:.1f}':mean, f'Median - {median:.1f}':median, f'Mode - {mode:.1f}':mode})

ax.set_xlabel('Sign')
ax.set_ylabel('Score')

for i,v in enumerate(round(sign_data['SignN'],2)):
	plt.text(i-.1, 5, str(v), color='black', fontweight='bold')
{% endhighlight %}
![](/assets/sign.png)



The Most Adventurous Zodiac Signs
Sagittarius - 7
Aquarius - 6
Aries - 5
Gemini - 4
Libra - 3
Scorpio - 3

{% highlight python %}
clrs=['r', 'b', 'b', 'b', 'b', 'b', 'b', 'b', 'r', 'b', 'r', 'b']
f, ax = plt.subplots(figsize=(16, 6))

ax = sns.barplot(x='SignLabel', y='SignN', data=sign_data, color="b", ci=None, palette=clrs)
ax.set_xticklabels(sign_data['SignLabel'], rotation = 45, ha="right")

mean=sign_data['SignN'].mean()
ax.axhline(mean, color='k', linestyle='--')

ax.set_xlabel('Sign')
ax.set_ylabel('Score')
{% endhighlight %}
![](/assets/sign_adventur.png)


![](/assets/sign_day.png)


![](/assets/sign_month.png)