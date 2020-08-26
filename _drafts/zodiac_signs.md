---
layout: post
title:  "Zodiac signs on astronaut"
tags: [zodiac sign, python, pandas, matplotlib, ]
---

Ones, I've disused with a friend, possibility of predicting parson occupation only by his zodiac sign. I've already knew that there is correlation between birth month and the characteristic of a parson and probably there will be some connection between sign a occupation, but I need data to see that. My expectation was that every zodiac sign is randomly distributed and there will be no connection between them.

# Collecting data
I knew that, to accomplish my goal, I'll need the date of the birth and also the occupation. The perfect place for this kind of data is Wikipedia and more specifically Wikidata. Because, there I can search like in normal SQL database and get some data in perfect for analyzing format. I decided that the coolest occupation to play with it, is that of astronauts, so I searched for them.
	
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

I used the code above and get some data about some astronauts. Unfortunately the data from Wikidata not always is clean and I need some time to cleaned and prepared it for the next step.


