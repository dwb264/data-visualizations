# scraper.py

import urllib
import urllib2
from bs4 import BeautifulSoup

url = "https://www.ssa.gov/OACT/babynames/state/"
response = urllib2.urlopen(url).read()
html = BeautifulSoup(response, 'html.parser')

state_list = []
year_list = []
dataset = []

# Get list of states and years from search form
states = html.find(id="state")
for option in states.find_all("option"):
	state_list.append(option.get("value"))

years = html.find(id="year")
for option in years.find_all("option"):
	year_list.append(option.get("value"))

# Do a search for each state and year and get the names
url = 'https://www.ssa.gov/cgi-bin/namesbystate.cgi'

for state in state_list:
	for year in year_list:
		print "Getting " + state + ", " + year

		values = {'state' : state, 'year' : year }
		data = urllib.urlencode(values)
		req = urllib2.Request(url, data)
		response = urllib2.urlopen(req).read()

		html = BeautifulSoup(response, 'html.parser')

		name_table = html.find_all("tbody")[1]

		rows = name_table.find_all("tr")
		for i in range(1, len(rows)):
			table_data = rows[i].find_all("td")
			if (len(table_data) == 5):
				dataset.append({ 
					"state" : state,
					"year" : year,
					"rank" : table_data[0].string,
					"name" : table_data[1].string,
					"num_births" : table_data[2].string,
					"sex": "male"
				})
				dataset.append({ 
					"state" : state,
					"year" : year,
					"rank" : table_data[0].string,
					"name" : table_data[3].string,
					"num_births" : table_data[4].string,
					"sex": "female"
				})

# Write name data to tsv file
with open("babynamesbystate.tsv", "w") as record_file:
	record_file.write("state\tyear\trank\tname\tnum_births\tsex\n")
	for row in dataset:
		record_file.write("%s\t%s\t%s\t%s\t%s\t%s\n" % (row["state"], row["year"], row["rank"], row["name"], row["num_births"], row["sex"]))
