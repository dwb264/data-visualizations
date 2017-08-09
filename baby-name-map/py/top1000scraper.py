# top1000scraper.py

import urllib
import urllib2
from bs4 import BeautifulSoup

url = "https://www.ssa.gov/OACT/babynames/index.html"
response = urllib2.urlopen(url).read()
html = BeautifulSoup(response, 'html.parser')

year_list = [str(i) for i in range(1880, 2017)]
dataset = []

# Do a search for each year and get the names
url = 'https://www.ssa.gov/cgi-bin/popularnames.cgi'

for year in year_list:
	print "Getting " + year

	values = {'year' : year, 'top' : '1000', 'number' : 'n'}
	data = urllib.urlencode(values)
	req = urllib2.Request(url, data)
	response = urllib2.urlopen(req).read()

	html = BeautifulSoup(response, 'html.parser')

	name_table = html.find_all("table")[1]

	rows = name_table.find_all("tr")
	for i in range(1, len(rows)):
		table_data = rows[i].find_all("td")
		if (len(table_data) == 5):
			dataset.append({ 
				"year" : year,
				"rank" : table_data[0].string,
				"name" : table_data[1].string,
				"num_births" : table_data[2].string,
				"sex": "male"
			})
			dataset.append({ 
				"year" : year,
				"rank" : table_data[0].string,
				"name" : table_data[3].string,
				"num_births" : table_data[4].string,
				"sex": "female"
			})

# Write name data to tsv file
with open("top1000babynames.tsv", "w") as record_file:
	record_file.write("year\trank\tname\tnum_births\tsex\n")
	for row in dataset:
		record_file.write("%s\t%s\t%s\t%s\t%s\n" % (row["year"], row["rank"], row["name"], row["num_births"], row["sex"]))
